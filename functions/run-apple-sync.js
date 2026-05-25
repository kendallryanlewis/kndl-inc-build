/**
 * Local admin runner — calls Apple ASC + iTunes APIs directly and writes to
 * Firestore. Run once to force a full catalog refresh:
 *   node functions/run-apple-sync.js
 */
'use strict';

require('dotenv').config({ path: __dirname + '/.env' });
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');

// Use Firebase CLI stored OAuth access token for Firestore REST writes
const fbConfig = JSON.parse(fs.readFileSync(os.homedir() + '/.config/configstore/firebase-tools.json', 'utf8'));
const ACCESS_TOKEN = (fbConfig.tokens || {}).access_token;
if (!ACCESS_TOKEN) throw new Error('No Firebase access_token in firebase-tools.json — run: firebase login');

const PROJECT_ID = 'kndl-3663b';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── re-used helpers from stripe-products.js ──────────────────────────────────
const APPLE_API_BASE = 'https://api.appstoreconnect.apple.com/v1';
const APPLE_APP_COLLECTION = 'appleAppPageApps';

const toBase64Url = (v) => Buffer.from(v).toString('base64url');

function createToken() {
    const keyId = process.env.APPLE_ASC_KEY_ID;
    const issuerId = process.env.APPLE_ASC_ISSUER_ID;
    const privateKey = (process.env.APPLE_ASC_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    if (!keyId || !issuerId || !privateKey) {
        throw new Error('Missing APPLE_ASC_KEY_ID / APPLE_ASC_ISSUER_ID / APPLE_ASC_PRIVATE_KEY in .env');
    }
    const now = Math.floor(Date.now() / 1000);
    const hdr = toBase64Url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
    const pld = toBase64Url(JSON.stringify({ iss: issuerId, exp: now + 1200, aud: 'appstoreconnect-v1' }));
    const unsigned = `${hdr}.${pld}`;
    const sig = crypto.sign('sha256', Buffer.from(unsigned), { key: privateKey, dsaEncoding: 'ieee-p1363' });
    return `${unsigned}.${sig.toString('base64url')}`;
}

async function appleGet(path, token, params) {
    const qs = params ? `?${params}` : '';
    const url = `${APPLE_API_BASE}${path}${qs}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Apple API ${res.status} → ${path}`);
    return res.json();
}

async function appleGetAll(path, token, params) {
    const rows = [];
    let nextPath = path, nextParams = params;
    while (nextPath) {
        const page = await appleGet(nextPath, token, nextParams);
        rows.push(...(page.data || []));
        const next = page?.links?.next;
        if (!next) break;
        const u = new URL(next);
        nextPath = u.pathname.startsWith('/v1') ? u.pathname.slice(3) : u.pathname;
        nextParams = u.search ? new URLSearchParams(u.search.slice(1)) : null;
    }
    return rows;
}

function pickLocale(list, preferred) {
    if (!list?.length) return null;
    return list.find((l) => l.attributes?.locale === preferred)
        || list.find((l) => l.attributes?.locale?.startsWith('en'))
        || list[0];
}

const toSlug = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/, '').slice(0, 80);

async function fetchScreenshots(vLocId, token) {
    if (!vLocId) return [];
    try {
        const sets = (await appleGet(`/appStoreVersionLocalizations/${vLocId}/appScreenshotSets`, token, new URLSearchParams({ limit: '50' }))).data || [];
        const urls = [];
        for (const set of sets) {
            const shots = (await appleGet(`/appScreenshotSets/${set.id}/appScreenshots`, token, new URLSearchParams({ limit: '50' }))).data || [];
            for (const s of shots) {
                const tmpl = s?.attributes?.imageAsset?.templateUrl;
                if (tmpl) urls.push(tmpl.replace('{w}', '750').replace('{h}', '1334').replace('{c}', 'bb'));
            }
        }
        return [...new Set(urls)].slice(0, 12);
    } catch { return []; }
}

async function fetchItunes(appId) {
    try {
        const r = await fetch(`https://itunes.apple.com/lookup?id=${appId}&country=us&entity=software`);
        if (!r.ok) return {};
        const j = await r.json();
        const x = Array.isArray(j.results) ? j.results[0] : null;
        if (!x) return {};
        return {
            averageUserRating: typeof x.averageUserRating === 'number' ? x.averageUserRating : undefined,
            userRatingCount: typeof x.userRatingCount === 'number' ? x.userRatingCount : undefined,
            fileSizeBytes: x.fileSizeBytes ? String(x.fileSizeBytes) : undefined,
            minimumOsVersion: x.minimumOsVersion,
            genres: Array.isArray(x.genres) ? x.genres : [],
            appStoreUrl: x.trackViewUrl,
            releaseDate: x.releaseDate || x.currentVersionReleaseDate,
            contentAdvisoryRating: x.contentAdvisoryRating,
            price: typeof x.price === 'number' ? x.price : undefined,
            formattedPrice: x.formattedPrice || undefined,
            currency: x.currency || undefined,
            primaryGenreName: x.primaryGenreName || undefined,
            advisories: Array.isArray(x.advisories) ? x.advisories.filter(Boolean) : [],
            languageCodes: Array.isArray(x.languageCodesISO2A) ? x.languageCodesISO2A.filter(Boolean) : []
        };
    } catch { return {}; }
}

function mapStatus(state) {
    if (['READY_FOR_SALE', 'READY_FOR_DISTRIBUTION'].includes(state)) return 'Live';
    if (['WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_DEVELOPER_RELEASE', 'PREPARE_FOR_SUBMISSION',
        'PROCESSING_FOR_APP_STORE', 'METADATA_REJECTED', 'REJECTED', 'DEVELOPER_REJECTED'].includes(state)) return 'In Progress';
    return 'Planned';
}

// ── main ───────────────────────────────────────────────────────────────────────
async function run() {
    console.log('Creating Apple token...');
    const token = createToken();

    console.log('Fetching app list from ASC...');
    const apps = await appleGetAll('/apps', token, new URLSearchParams({
        limit: '200',
        'fields[apps]': 'name,bundleId,sku,primaryLocale'
    }));
    console.log(`Found ${apps.length} apps in ASC.`);

    const mappedApps = [];
    const allAppleIds = new Set(apps.map((a) => a.attributes?.bundleId ? toSlug(a.attributes.bundleId) : a.id));

    for (const appRecord of apps) {
        const appId = appRecord.id;
        const appAttrs = appRecord.attributes || {};
        const primaryLocale = appAttrs.primaryLocale || 'en-US';
        console.log(`\nProcessing app ${appId} (${appAttrs.name || 'unknown'})...`);

        try {
            let versions = [];
            try {
                const vr = await appleGet(`/apps/${appId}/appStoreVersions`, token, new URLSearchParams({
                    limit: '20', 'fields[appStoreVersions]': 'versionString,appVersionState,platform,earliestReleaseDate,createdDate'
                }));
                versions = vr.data || [];
                console.log(`  versions: ${versions.length}`);
            } catch (e) { console.warn(`  appStoreVersions failed: ${e.message}`); }

            const preferredVersion = versions.find((v) => v.attributes?.platform === 'IOS') || versions[0] || null;

            let appInfo = null;
            try {
                const air = await appleGet(`/apps/${appId}/appInfos`, token, new URLSearchParams({ limit: '10', 'fields[appInfos]': 'appStoreState,contentRightsDeclaration' }));
                appInfo = (air.data || [])[0] || null;
                console.log(`  appInfo: ${appInfo ? 'found' : 'none'}`);
            } catch (e) { console.warn(`  appInfos failed: ${e.message}`); }

            let infoLoc = null;
            if (appInfo?.id) {
                try {
                    const ilr = await appleGet(`/appInfos/${appInfo.id}/appInfoLocalizations`, token, new URLSearchParams({
                        limit: '50', 'fields[appInfoLocalizations]': 'locale,name,subtitle,privacyPolicyUrl,keywords,supportUrl'
                    }));
                    infoLoc = pickLocale(ilr.data || [], primaryLocale);
                    console.log(`  infoLoc: ${infoLoc?.attributes?.locale || 'none'}`);
                } catch (e) { console.warn(`  appInfoLocalizations failed: ${e.message}`); }
            }

            let versionLoc = null;
            if (preferredVersion?.id) {
                try {
                    const vlr = await appleGet(`/appStoreVersions/${preferredVersion.id}/appStoreVersionLocalizations`, token, new URLSearchParams({
                        limit: '50', 'fields[appStoreVersionLocalizations]': 'locale,description,promotionalText,whatsNew'
                    }));
                    versionLoc = pickLocale(vlr.data || [], primaryLocale);
                    console.log(`  versionLoc: ${versionLoc?.attributes?.locale || 'none'}`);
                } catch (e) { console.warn(`  appStoreVersionLocalizations failed: ${e.message}`); }
            }

            const screenshotUrls = await fetchScreenshots(versionLoc?.id, token);
            console.log(`  screenshots: ${screenshotUrls.length}`);

            const itunes = await fetchItunes(appId);
            console.log(`  iTunes rating: ${itunes.averageUserRating ?? 'n/a'}, price: ${itunes.formattedPrice ?? 'n/a'}`);

            // Customer reviews
            let customerReviews = [];
            try {
                const rr = await appleGet(`/apps/${appId}/customerReviews`, token, new URLSearchParams({
                    limit: '5', sort: '-createdDate',
                    'fields[customerReviews]': 'rating,title,body,reviewerNickname,createdDate,territory'
                }));
                customerReviews = (rr.data || []).map((r) => ({
                    rating: r.attributes?.rating ?? null,
                    title: r.attributes?.title || '',
                    body: r.attributes?.body || '',
                    nickname: r.attributes?.reviewerNickname || 'Anonymous',
                    createdDate: r.attributes?.createdDate || '',
                    territory: r.attributes?.territory || ''
                }));
                console.log(`  customerReviews: ${customerReviews.length}`);
            } catch (e) { console.warn(`  customerReviews failed: ${e.message}`); }

            // EULA
            let eulaText = '';
            try {
                const er = await appleGet(`/apps/${appId}/endUserLicenseAgreement`, token);
                eulaText = er.data?.attributes?.agreementText || '';
                console.log(`  eula: ${eulaText ? 'yes' : 'none'}`);
            } catch (e) { console.warn(`  endUserLicenseAgreement failed: ${e.message}`); }

            // In-app purchases
            let inAppPurchases = [];
            try {
                const ir = await appleGet(`/apps/${appId}/inAppPurchasesV2`, token, new URLSearchParams({
                    limit: '50', 'fields[inAppPurchases]': 'productId,referenceName,inAppPurchaseType,state,familySharable'
                }));
                inAppPurchases = (ir.data || []).map((i) => ({
                    productId: i.attributes?.productId || '',
                    name: i.attributes?.referenceName || '',
                    type: i.attributes?.inAppPurchaseType || '',
                    state: i.attributes?.state || '',
                    familySharable: i.attributes?.familySharable || false
                }));
                console.log(`  inAppPurchases: ${inAppPurchases.length}`);
            } catch (e) { console.warn(`  inAppPurchasesV2 failed: ${e.message}`); }

            // Subscription groups
            let subscriptionGroups = [];
            try {
                const sgr = await appleGet(`/apps/${appId}/subscriptionGroups`, token, new URLSearchParams({
                    limit: '10', 'fields[subscriptionGroups]': 'referenceName'
                }));
                for (const group of (sgr.data || [])) {
                    let subs = [];
                    try {
                        const sr = await appleGet(`/subscriptionGroups/${group.id}/subscriptions`, token, new URLSearchParams({
                            limit: '20', 'fields[subscriptions]': 'productId,name,state,subscriptionPeriod,familySharable'
                        }));
                        subs = (sr.data || []).map((s) => ({
                            productId: s.attributes?.productId || '',
                            name: s.attributes?.name || '',
                            state: s.attributes?.state || '',
                            period: s.attributes?.subscriptionPeriod || '',
                            familySharable: s.attributes?.familySharable || false
                        }));
                    } catch (e) { console.warn(`  subscriptions for group ${group.id} failed: ${e.message}`); }
                    subscriptionGroups.push({ id: group.id, name: group.attributes?.referenceName || '', subscriptions: subs });
                }
                console.log(`  subscriptionGroups: ${subscriptionGroups.length}`);
            } catch (e) { console.warn(`  subscriptionGroups failed: ${e.message}`); }

            // Territory availability count
            let availableTerritoryCount = null;
            try {
                const avr = await appleGet(`/apps/${appId}/appAvailabilityV2`, token);
                availableTerritoryCount = avr.data?.relationships?.territories?.meta?.total ?? null;
                console.log(`  territories: ${availableTerritoryCount ?? 'n/a'}`);
            } catch (e) { console.warn(`  appAvailabilityV2 failed: ${e.message}`); }

            // Pricing
            let hasPriceSchedule = false;
            try {
                const pr = await appleGet(`/apps/${appId}/appPriceSchedule`, token, new URLSearchParams({
                    'fields[appPriceSchedules]': 'manualPrices,automaticPrices'
                }));
                hasPriceSchedule = !!pr.data;
                console.log(`  priceSchedule: ${hasPriceSchedule ? 'yes' : 'none'}`);
            } catch (e) { console.warn(`  appPriceSchedule failed: ${e.message}`); }

            const contentRightsDeclaration = appInfo?.attributes?.contentRightsDeclaration || '';

            const displayName = infoLoc?.attributes?.name || appAttrs.name || `Apple App ${appId}`;
            const nameSlug = toSlug(displayName);
            const docId = nameSlug || appId;

            const summarySource = infoLoc?.attributes?.subtitle
                || versionLoc?.attributes?.promotionalText
                || versionLoc?.attributes?.description
                || `App Store listing for ${displayName}`;
            const summary = summarySource.length > 180 ? `${summarySource.slice(0, 177)}...` : summarySource;

            console.log(`  ✅ Mapped → docId="${docId}" name="${displayName}"`);
            mappedApps.push({
                id: docId, provider: 'apple', appleAppId: appId, name: displayName, type: 'iOS App',
                status: mapStatus(preferredVersion?.attributes?.appVersionState), summary,
                stack: 'Apple App Store',
                portfolioIntro: versionLoc?.attributes?.description || versionLoc?.attributes?.promotionalText || summary,
                services: [],
                galleryLabels: [
                    `Bundle ${appAttrs.bundleId || 'N/A'}`,
                    preferredVersion?.attributes?.versionString ? `Version ${preferredVersion.attributes.versionString}` : 'Version N/A',
                    preferredVersion?.attributes?.platform || 'IOS'
                ],
                screenImageUrl: screenshotUrls[0] || '', screenshotUrls,
                bundleId: appAttrs.bundleId || '', sku: appAttrs.sku || '',
                locale: versionLoc?.attributes?.locale || infoLoc?.attributes?.locale || primaryLocale,
                appVersionState: preferredVersion?.attributes?.appVersionState || '',
                versionString: preferredVersion?.attributes?.versionString || '',
                whatsNew: versionLoc?.attributes?.whatsNew || '',
                privacyPolicyUrl: infoLoc?.attributes?.privacyPolicyUrl || '',
                supportUrl: infoLoc?.attributes?.supportUrl || '',
                averageUserRating: itunes.averageUserRating ?? null,
                userRatingCount: itunes.userRatingCount ?? null,
                fileSizeBytes: itunes.fileSizeBytes || '',
                minimumOsVersion: itunes.minimumOsVersion || '',
                genres: itunes.genres || [],
                appStoreUrl: itunes.appStoreUrl || '',
                releaseDate: itunes.releaseDate || preferredVersion?.attributes?.earliestReleaseDate || '',
                contentAdvisoryRating: itunes.contentAdvisoryRating || '',
                price: itunes.price ?? null,
                formattedPrice: itunes.formattedPrice || '',
                currency: itunes.currency || '',
                primaryGenreName: itunes.primaryGenreName || '',
                advisories: itunes.advisories || [],
                languageCodes: itunes.languageCodes || [],
                contentRightsDeclaration,
                customerReviews,
                eulaText,
                inAppPurchases,
                subscriptionGroups,
                availableTerritoryCount,
                hasPriceSchedule
            });
        } catch (err) {
            console.error(`  ❌ Failed app ${appId}: ${err.message}`);
        }
    }

    console.log(`\nWriting ${mappedApps.length} / ${apps.length} apps to Firestore via REST API...`);

    // Convert a JS value to a Firestore REST API field value
    function toFirestoreValue(v) {
        if (v === null || v === undefined) return { nullValue: null };
        if (typeof v === 'boolean') return { booleanValue: v };
        if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
        if (typeof v === 'string') return { stringValue: v };
        if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
        if (typeof v === 'object') {
            const fields = {};
            for (const [k, val] of Object.entries(v)) fields[k] = toFirestoreValue(val);
            return { mapValue: { fields } };
        }
        return { stringValue: String(v) };
    }

    for (const app of mappedApps) {
        const { id, ...data } = app;
        data.syncedAt = new Date().toISOString(); // use ISO string since we can't use FieldValue here
        const fields = {};
        for (const [k, v] of Object.entries(data)) fields[k] = toFirestoreValue(v);
        fields.id = { stringValue: id };

        const url = `${FIRESTORE_BASE}/${APPLE_APP_COLLECTION}/${encodeURIComponent(id)}`;
        const res = await fetch(url + '?updateMask.fieldPaths=' + Object.keys(fields).join('&updateMask.fieldPaths='), {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields })
        });
        if (!res.ok) {
            const err = await res.text();
            console.error(`  ❌ Firestore write failed for ${id}: ${res.status} ${err.slice(0, 200)}`);
        } else {
            console.log(`  ✅ Written: ${id}`);
        }
    }

    // Delete stale docs whose IDs are no longer in the new set
    const newIds = new Set(mappedApps.map((a) => a.id));
    console.log('\nChecking for stale docs to delete...');
    const listUrl = `${FIRESTORE_BASE}/${APPLE_APP_COLLECTION}?pageSize=200`;
    const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } });
    if (listRes.ok) {
        const listJson = await listRes.json();
        const existingDocs = listJson.documents || [];
        for (const doc of existingDocs) {
            const existingId = doc.name.split('/').pop();
            const providerField = doc.fields?.provider?.stringValue;
            if (providerField !== 'apple') continue;
            if (!newIds.has(existingId)) {
                const delRes = await fetch(`${FIRESTORE_BASE}/${APPLE_APP_COLLECTION}/${encodeURIComponent(existingId)}`, {
                    method: 'DELETE', headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
                });
                console.log(`  ${delRes.ok ? '🗑️  Deleted stale' : '❌ Failed to delete'}: ${existingId}`);
            }
        }
    }

    console.log(`\n✅ Done. ${mappedApps.length} apps written to Firestore collection "${APPLE_APP_COLLECTION}".`);
    console.log('App IDs:', mappedApps.map((a) => a.id).join(', '));
    process.exit(0);
}

run().catch((err) => { console.error('Sync failed:', err); process.exit(1); });
