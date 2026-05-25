import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { KndlProductApp } from '../../models/kndl-product-app';
import { AppleAppCatalogService } from '../../services/apple-app-catalog.service';
import { SEOService } from '../../services/seo.service';
import { BackgroundService } from '../../services/background.service';

interface DetailFeature {
    title: string;
    body: string;
    icon: string;
}

interface DetailStat {
    label: string;
    value: string;
}

interface DetailFaq {
    question: string;
    answer: string;
}

@Component({
    selector: 'app-kndl-product-detail',
    templateUrl: './kndl-product-detail.component.html',
    styleUrls: ['./kndl-product-detail.component.scss']
})
export class KndlProductDetailComponent implements OnInit, OnDestroy {
    app: KndlProductApp | null = null;
    isLoading = true;
    notFound = false;
    activePanelScreenIdx = 1;
    legalPanelType: 'privacy' | 'terms' | 'support' | null = null;
    readonly currentYear = new Date().getFullYear();
    private _revealObserver?: IntersectionObserver;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private catalog: AppleAppCatalogService,
        private seo: SEOService,
        private bg: BackgroundService,
        private location: Location
    ) { }

    async ngOnInit(): Promise<void> {
        // Show video with products-style gradient, no flash
        this.bg.setTab('detail', false);

        const id = this.route.snapshot.paramMap.get('id') ?? '';
        this.app = await this.catalog.getAppById(id);
        this.isLoading = false;

        if (!this.app) {
            this.notFound = true;
            return;
        }

        this.seo.updateSEO({ title: `${this.app.name} — KNDL Inc`, description: this.app.summary });

        // Auto-open legal panel when navigating directly to a legal sub-route
        const legalPage = this.route.snapshot.data['legalPage'] as string | undefined;
        if (legalPage) {
            this.legalPanelType = legalPage as 'privacy' | 'terms' | 'support';
        }

        // Set up scroll-reveal after DOM renders
        setTimeout(() => this.setupRevealObserver(), 60);
    }

    ngOnDestroy(): void {
        this._revealObserver?.disconnect();
    }

    private setupRevealObserver(): void {
        this._revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        e.target.classList.add('is-visible');
                        this._revealObserver?.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.06, rootMargin: '0px 0px -40px 0px' }
        );
        document.querySelectorAll('.kpd-reveal').forEach(el => {
            this._revealObserver!.observe(el);
        });
    }

    get screenshots(): string[] {
        return this.app?.screenshotUrls ?? [];
    }

    get previewScreenshots(): string[] {
        return this.screenshots.slice(0, 5);
    }

    get artworkUrl(): string {
        return this.app?.artworkUrl512 ?? this.app?.artworkUrl100 ?? this.app?.screenImageUrl ?? '';
    }

    get heroDescription(): string {
        if (!this.app) return '';
        return this.app.description ?? this.app.summary;
    }

    get primaryTagline(): string {
        if (!this.app) return '';
        if (this.app.portfolioIntro) return this.app.portfolioIntro;
        return this.app.summary;
    }

    get partnerTags(): string[] {
        if (!this.app) return [];
        const tags = [
            ...(this.app.services ?? []),
            ...(this.app.genres ?? []),
            ...(this.app.galleryLabels ?? [])
        ];
        return this.uniqueText(tags).slice(0, 6);
    }

    get keyFeatures(): DetailFeature[] {
        if (!this.app) return [];

        const features: DetailFeature[] = [];

        if (this.app.averageUserRating) {
            const ratingsText = this.app.userRatingCount
                ? `${this.app.averageUserRating.toFixed(1)} average from ${this.app.userRatingCount.toLocaleString()} ratings.`
                : `${this.app.averageUserRating.toFixed(1)} average user rating.`;
            features.push({ title: 'Trusted By Users', body: ratingsText, icon: 'fa-star' });
        }

        if (this.app.minimumOsVersion) {
            features.push({
                title: 'Built For Modern iOS',
                body: `Optimized for iOS ${this.app.minimumOsVersion}+ with smooth, native performance.`,
                icon: 'fa-mobile-screen-button'
            });
        }

        if (this.app.whatsNew) {
            features.push({
                title: `What’s New in v${this.app.versionString || 'Latest'}`,
                body: this.truncate(this.app.whatsNew, 160),
                icon: 'fa-rotate'
            });
        }

        if (this.app.fileSizeBytes) {
            const size = this.formatFileSize(this.app.fileSizeBytes);
            if (size) features.push({ title: 'Lightweight Download', body: `Install quickly at approximately ${size}.`, icon: 'fa-gauge-high' });
        }

        if (this.app.contentAdvisoryRating) {
            features.push({
                title: `Rated ${this.app.contentAdvisoryRating}`,
                body: `${this.app.advisories?.length ? this.app.advisories.join(', ') + '. ' : ''}Content rating as set by the developer in App Store Connect.`,
                icon: 'fa-shield-halved'
            });
        }

        if (this.app.formattedPrice) {
            const hasSubs = (this.app.subscriptionGroups?.length ?? 0) > 0;
            const hasIAP = (this.app.inAppPurchases?.length ?? 0) > 0;
            const extras = [hasSubs ? 'subscription options' : '', hasIAP ? 'in-app purchases' : ''].filter(Boolean).join(' and ');
            features.push({
                title: `${this.app.formattedPrice} — ${extras ? 'offers ' + extras : 'no extra purchases'}`,
                body: extras ? `Unlock additional value with ${extras} available inside the app.` : 'Download once — everything is included.',
                icon: 'fa-tag'
            });
        }

        for (const service of (this.app.services ?? []).slice(0, 3)) {
            features.push({ title: service, body: `Focused capability delivered inside ${this.app.name}.`, icon: 'fa-check' });
        }

        if (!features.length) {
            features.push({ title: 'Designed For Daily Use', body: this.app.summary, icon: 'fa-bolt' });
        }

        return features.slice(0, 6);
    }

    get detailsStats(): DetailStat[] {
        if (!this.app) return [];
        const stats: DetailStat[] = [];

        if (this.app.versionString) {
            stats.push({ label: 'Version', value: `v${this.app.versionString}` });
        }
        if (this.app.releaseDate) {
            stats.push({ label: 'Released', value: new Date(this.app.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) });
        }
        if (this.app.contentAdvisoryRating) {
            stats.push({ label: 'Age Rating', value: this.app.contentAdvisoryRating });
        }
        if (this.app.minimumOsVersion) {
            stats.push({ label: 'Requires iOS', value: `${this.app.minimumOsVersion}+` });
        }
        if (this.app.fileSizeBytes) {
            const size = this.formatFileSize(this.app.fileSizeBytes);
            if (size) stats.push({ label: 'Size', value: size });
        }
        if (this.app.averageUserRating && this.app.userRatingCount) {
            stats.push({ label: 'Rating', value: `${this.app.averageUserRating.toFixed(1)} ★ (${this.app.userRatingCount.toLocaleString()})` });
        }
        // Pricing
        if (this.app.formattedPrice) {
            stats.push({ label: 'Price', value: this.app.formattedPrice });
        }
        // Availability
        if (this.app.availableTerritoryCount != null) {
            stats.push({ label: 'Availability', value: `${this.app.availableTerritoryCount} countries & regions` });
        }
        // Primary category
        if (this.app.primaryGenreName) {
            stats.push({ label: 'Category', value: this.app.primaryGenreName });
        }
        // Content rights
        if (this.app.contentRightsDeclaration) {
            stats.push({ label: 'Content Rights', value: this.app.contentRightsDeclaration.replace(/_/g, ' ') });
        }
        // Languages
        if (this.app.languageCodes?.length) {
            stats.push({ label: 'Languages', value: this.app.languageCodes.length > 5 ? `${this.app.languageCodes.slice(0, 5).join(', ')} +${this.app.languageCodes.length - 5} more` : this.app.languageCodes.join(', ') });
        }
        if (this.app.bundleId) {
            stats.push({ label: 'Bundle ID', value: this.app.bundleId });
        }

        return stats;
    }

    get powerItems(): string[] {
        if (!this.app) return [];
        const raw = [
            ...(this.app.services ?? []),
            ...(this.app.genres ?? [])
        ];
        const unique = this.uniqueText(raw);
        if (unique.length >= 2) return unique.slice(0, 5);
        return this.keyFeatures.slice(0, 5).map(f => f.title);
    }

    get genres(): string[] {
        return this.uniqueText(this.app?.genres ?? []).slice(0, 4);
    }

    get whatsNewText(): string {
        return this.app?.whatsNew ?? '';
    }

    get ratingStars(): number[] {
        if (!this.app?.averageUserRating) return [];
        return Array.from({ length: 5 }, (_, i) => i);
    }

    get faqItems(): DetailFaq[] {
        if (!this.app) return [];
        const items: DetailFaq[] = [
            {
                question: `What does ${this.app.name} help me do?`,
                answer: this.heroDescription
            }
        ];

        if (this.app.whatsNew) {
            items.push({
                question: `What’s new in version ${this.app.versionString || 'the latest update'}?`,
                answer: this.app.whatsNew
            });
        }

        if (this.app.minimumOsVersion) {
            items.push({
                question: 'What devices are supported?',
                answer: `${this.app.name} requires iOS ${this.app.minimumOsVersion} or later on iPhone or iPad.`
            });
        }

        if (this.app.fileSizeBytes) {
            const size = this.formatFileSize(this.app.fileSizeBytes);
            items.push({
                question: 'How big is the download?',
                answer: `The app is approximately ${size}. Make sure you have enough free storage space before downloading.`
            });
        }

        if (this.app.appStoreUrl) {
            items.push({
                question: 'Where can I download this app?',
                answer: 'Use the App Store button on this page to install the latest version.'
            });
        }

        if (this.app.supportUrl) {
            items.push({
                question: 'How can I get support?',
                answer: 'Use the support link in the legal section below to reach the development team directly.'
            });
        }

        if (this.app.formattedPrice !== undefined) {
            const hasSubs = (this.app.subscriptionGroups?.length ?? 0) > 0;
            const hasIAP = (this.app.inAppPurchases?.length ?? 0) > 0;
            if (hasSubs || hasIAP) {
                const extras = [hasSubs ? 'subscriptions' : '', hasIAP ? 'in-app purchases' : ''].filter(Boolean).join(' and ');
                items.push({
                    question: `Does ${this.app.name} have ${extras}?`,
                    answer: `Yes — ${this.app.name} offers ${extras}. The base download is ${this.app.formattedPrice || 'free'}. Additional content or features may be available as ${extras}.`
                });
            } else {
                items.push({
                    question: `Is ${this.app.name} free?`,
                    answer: `${this.app.name} is available ${this.app.formattedPrice?.toLowerCase() === 'free' ? 'for free' : 'for ' + this.app.formattedPrice} on the App Store with no additional purchases.`
                });
            }
        }

        if (this.app.availableTerritoryCount != null) {
            items.push({
                question: 'Where is this app available?',
                answer: `${this.app.name} is available in ${this.app.availableTerritoryCount} countries and regions on the App Store.`
            });
        }

        if (this.app.eulaText) {
            items.push({
                question: 'Is there a custom End User License Agreement?',
                answer: 'Yes — this app has a custom EULA. View it in the legal section below before downloading.'
            });
        }

        if (this.app.contentRightsDeclaration) {
            items.push({
                question: 'Does this app contain third-party content?',
                answer: this.app.contentRightsDeclaration === 'HAS_RIGHTS_OR_IS_NOT_COPYRIGHTED'
                    ? `${this.app.name} only contains content the developer owns or has rights to use.`
                    : `${this.app.name} may include third-party content under applicable licenses.`
            });
        }

        return items.slice(0, 8);
    }

    get hasMonetization(): boolean {
        return (this.app?.inAppPurchases?.length ?? 0) > 0 ||
            (this.app?.subscriptionGroups?.length ?? 0) > 0;
    }

    get customerReviews() {
        return this.app?.customerReviews ?? [];
    }

    prevScreenshot(): void {
        if (this.activePanelScreenIdx > 0) this.activePanelScreenIdx--;
    }

    nextScreenshot(): void {
        const max = Math.min(this.screenshots.length, 6) - 1;
        if (this.activePanelScreenIdx < max) this.activePanelScreenIdx++;
    }

    getCarouselCardClass(i: number): string {
        const diff = i - this.activePanelScreenIdx;
        if (diff === 0) return 'kpd-carousel__card--active';
        if (diff === -1) return 'kpd-carousel__card--prev';
        if (diff === 1) return 'kpd-carousel__card--next';
        return 'kpd-carousel__card--hidden';
    }

    onCarouselCardClick(i: number): void {
        if (i < this.activePanelScreenIdx) this.prevScreenshot();
        else if (i > this.activePanelScreenIdx) this.nextScreenshot();
    }

    statusClass(status?: string): string {
        return (status ?? 'planned').toLowerCase().replace(/\s+/g, '-');
    }

    getAppInitials(name: string): string {
        return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }

    formatFileSize(bytes?: string): string {
        const n = parseInt(bytes ?? '0', 10);
        if (!n) return '';
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} MB`;
        return `${(n / 1_000).toFixed(0)} KB`;
    }

    goBack(): void {
        this.router.navigate(['/']);
    }

    private truncate(value: string, length: number): string {
        if (value.length <= length) return value;
        return `${value.slice(0, length - 1).trimEnd()}...`;
    }

    private uniqueText(items: string[]): string[] {
        return Array.from(new Set(items.filter(item => item && item.trim().length > 0)));
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.legalPanelType) this.closeLegalPanel();
    }

    openLegalPanel(type: 'privacy' | 'terms' | 'support'): void {
        this.legalPanelType = type;
        const id = this.route.snapshot.paramMap.get('id') ?? '';
        this.location.replaceState(`/products/${id}/${type}`);
    }

    closeLegalPanel(): void {
        this.legalPanelType = null;
        const id = this.route.snapshot.paramMap.get('id') ?? '';
        this.location.replaceState(`/products/${id}`);
    }
}
