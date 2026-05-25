import { Injectable } from '@angular/core';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { KndlProductApp } from '../models/kndl-product-app';

const COLLECTION = 'appleAppPageApps';

@Injectable({ providedIn: 'root' })
export class AppleAppCatalogService {
    private functions = getFunctions();
    private db = getFirestore();
    private cachedApps: KndlProductApp[] | null = null;
    private cachedById = new Map<string, KndlProductApp>();

    async getApps(): Promise<KndlProductApp[]> {
        if (this.cachedApps) return this.cachedApps;
        try {
            const getAppleApps = httpsCallable<void, { data: { apps: KndlProductApp[] } }>(
                this.functions,
                'getAppleAppsCatalog'
            );
            const result = await getAppleApps();
            this.cachedApps = result.data?.data?.apps ?? [];
            // Populate per-id cache so getAppById hits instantly after a full load
            this.cachedApps.forEach(a => this.cachedById.set(a.id, a));
            return this.cachedApps;
        } catch (error) {
            console.error('Failed to load Apple app catalog:', error);
            this.cachedApps = [];
            return [];
        }
    }

    async getAppById(id: string): Promise<KndlProductApp | null> {
        if (!id) return null;

        // 1. In-memory cache hit (set from either path below)
        if (this.cachedById.has(id)) return this.cachedById.get(id)!;

        // 2. Direct Firestore document fetch — fast single-document read,
        //    works even when the full catalog hasn't been loaded yet (direct links).
        try {
            const snap = await getDoc(doc(this.db, COLLECTION, id));
            if (snap.exists()) {
                const app = { id: snap.id, ...snap.data() } as KndlProductApp;
                this.cachedById.set(id, app);
                return app;
            }
        } catch (err) {
            console.warn('Direct Firestore lookup failed, falling back to catalog:', err);
        }

        // 3. Full catalog fallback (covers cases where doc id differs from app id)
        const apps = await this.getApps();
        return apps.find(a => a.id === id) ?? null;
    }

    /** @deprecated use getApps() */
    async loadAppPageApps(): Promise<KndlProductApp[]> {
        return this.getApps();
    }
}
