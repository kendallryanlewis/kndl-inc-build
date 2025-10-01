import { Component, OnInit, Input, Output, EventEmitter, OnChanges, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { LandingLayoutService } from '../../../services/landing-layout.service';
import { StripeService, StripeProduct, StripePrice } from '../../../services/stripe.service';
import { AboutUsContent } from 'src/app/models/about-us-content';
import { DetailedServicesContent } from 'src/app/models/detailed-service-content';
import { AddOnsContent } from 'src/app/models/AddOnsContent';
import { CallToActionContent } from 'src/app/models/CallToActionContent';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { AboutHeader } from 'src/app/models/AboutHeader';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
    DEFAULT_SITE_CONTENT,
    DEFAULT_ABOUT_DATA,
    DEFAULT_ABOUT_US_DATA,
    DEFAULT_DETAILED_SERVICES_DATA,
    DEFAULT_ADDONS_DATA,
    DEFAULT_CALL_TO_ACTION_DATA,
    DEFAULT_HEADER_SUB_TEXT
} from '../../../config/default-site-content';

// Product interfaces for Stripe categorization
export interface BaseProduct {
    stripeProductId: string;
    stripePriceId?: string;
    name: string;
    description: string;
    active: boolean;
    price: number;
    currency: string;
    features: string[];
    isPopular: boolean;
    category: string;
    created: Date;
    updated: Date;
    status: 'Active' | 'Inactive' | 'Deprecated';
    lastModified: string;
    isArchived?: boolean;
}

export interface SubscriptionPlan extends BaseProduct {
    stripeMonthlyPriceId?: string;
    stripeYearlyPriceId?: string;
    monthlyPrice: number;
    yearlyPrice?: number;
    maxUsers?: number;
    storageLimit?: string;
    supportLevel: 'Basic' | 'Priority' | 'Premium';
    trialDays?: number;
    planType: 'Starter' | 'Business' | 'Enterprise';
}

export interface AddonProduct extends BaseProduct {
    addonType: 'feature' | 'storage' | 'support' | 'integration';
    compatiblePlans?: string[];
    isRecurring: boolean;
}

export interface OneTimeProduct extends BaseProduct {
    productType: 'service' | 'consultation' | 'setup' | 'training';
    deliveryTimeframe?: string;
}

type CategorizedProduct = SubscriptionPlan | AddonProduct | OneTimeProduct;

interface PreviewSection {
    key: string;
    title: string;
    component: string;
}

@Component({
    selector: 'app-admin-landing-editor',
    templateUrl: './admin-landing-editor.component.html',
    styleUrls: ['./admin-landing-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLandingEditorComponent implements OnInit, OnChanges, OnDestroy {
    @Input() subTab: string = 'Home';
    sectionIds: string[] = ['Home', 'About Us', 'Services', 'Enhancements', 'Call to Action', '|', 'Service Plans', 'Subscriptions', 'Add-Ons'];
    @Output() childTabs = new EventEmitter<string[]>();
    @Input() content: string = '';

    // RxJS cleanup
    private destroy$ = new Subject<void>();

    // Stripe product categorization properties
    stripeProducts: StripeProduct[] = [];
    stripePrices: StripePrice[] = [];

    // Categorized products
    subscriptionPlans: SubscriptionPlan[] = [];
    addonProducts: AddonProduct[] = [];
    oneTimeProducts: OneTimeProduct[] = [];
    allCategorizedProducts: CategorizedProduct[] = [];

    // Filtering properties for subscription plans
    filteredSubscriptionPlans: SubscriptionPlan[] = [];
    showingArchivedPlans: boolean = false;

    // Filtering properties for addon products  
    showingArchivedAddons: boolean = false;

    // Filtering properties for one-time products
    filteredOneTimeProducts: OneTimeProduct[] = [];
    showingArchivedOneTimeProducts: boolean = false;

    // Loading states
    isLoadingStripeProducts: boolean = false;

    // Optimized preview sections configuration
    readonly previewSections: PreviewSection[] = [
        { key: 'aboutUs', title: 'About Us Preview', component: 'app-kndl-about-us' },
        { key: 'detailedServices', title: 'Detailed Services Preview', component: 'app-kndl-detailed-services' },
        { key: 'addOns', title: 'Add-ons Preview', component: 'app-kndl-add-ons' },
        { key: 'callToAction', title: 'Call to Action Preview', component: 'app-kndl-call-to-action' }
    ];

    // Cached computed properties
    private _hasUnsavedChanges: boolean = false;
    private _changedSectionsList: string[] = [];
    private _saveButtonClass: string = 'btn-success';
    private _saveButtonText: string = 'No Changes';

    subscription: any;
    // Firebase
    private firestore = getFirestore();
    // Save status
    isSaving: boolean = false;
    lastSaved: Date | null = null;

    private previousSubTab: string = '';

    // Content objects for child components
    isLoading = true;
    aboutData: AboutHeader = { ...DEFAULT_ABOUT_DATA };
    aboutUsData: AboutUsContent = { ...DEFAULT_ABOUT_US_DATA };
    detailedServicesData: DetailedServicesContent = { ...DEFAULT_DETAILED_SERVICES_DATA };
    addOnsData: AddOnsContent = { ...DEFAULT_ADDONS_DATA };
    callToActionData: CallToActionContent = { ...DEFAULT_CALL_TO_ACTION_DATA };
    headerSubText: string = DEFAULT_HEADER_SUB_TEXT;

    // Additional content objects for new components
    subscriptionData: any = {};
    addonEditorData: any = {};
    servicePlansData: any = {};

    // Enhanced change tracking with detailed section mapping
    private sectionDisplayNames: { [key: string]: string } = {
        'aboutData': 'Main Header',
        'aboutUsData': 'About Us Section',
        'detailedServicesData': 'Services Section',
        'addOnsData': 'Add-ons Section',
        'callToActionData': 'Call to Action Section',
        'headerSubText': 'Sub Header Text'
        // Note: subscriptionData, addonEditorData, servicePlansData excluded from change tracking
    };

    // Original data for change tracking
    private originalData: {
        aboutData: AboutHeader;
        aboutUsData: AboutUsContent;
        detailedServicesData: DetailedServicesContent;
        addOnsData: AddOnsContent;
        callToActionData: CallToActionContent;
        headerSubText: string;
        subscriptionData: any;
        addonEditorData: any;
        servicePlansData: any;
    } = {
            aboutData: { ...DEFAULT_ABOUT_DATA },
            aboutUsData: { ...DEFAULT_ABOUT_US_DATA },
            detailedServicesData: { ...DEFAULT_DETAILED_SERVICES_DATA },
            addOnsData: { ...DEFAULT_ADDONS_DATA },
            callToActionData: { ...DEFAULT_CALL_TO_ACTION_DATA },
            headerSubText: DEFAULT_HEADER_SUB_TEXT,
            subscriptionData: {},
            addonEditorData: {},
            servicePlansData: {}
        };

    // Track which fields have changed
    private changedFields = new Set<string>();

    constructor(
        private landingLayoutService: LandingLayoutService,
        private cdr: ChangeDetectorRef,
        private stripeService: StripeService
    ) {
        // Ensure critical properties are initialized to prevent undefined values
        this.subscriptionData = this.subscriptionData || {};
        this.addonEditorData = this.addonEditorData || {};
        this.servicePlansData = this.servicePlansData || {};
    }

    ngOnChanges(): void {
        if (this.subTab !== this.previousSubTab) {
            // DON'T reset changed fields when switching tabs - preserve changes across views
            // Only update the cached properties to reflect current state
            this.previousSubTab = this.subTab;
            this.updateCachedProperties();
        }
    }

    async ngOnInit(): Promise<void> {
        // Ensure subTab defaults to 'Home' if not provided
        if (!this.subTab || this.subTab.trim() === '') {
            this.subTab = 'Home';
        }

        // Initialize Stripe product loading
        this.initializeStripeProducts();

        // Load data asynchronously and emit child tabs
        await Promise.all([
            this.loadSiteLayout(),
            this.emitChildTabs()
        ]);

        this.updateCachedProperties();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
    // Computed properties with caching for performance
    get hasUnsavedChanges(): boolean {
        return this._hasUnsavedChanges;
    }

    get changedSectionsList(): string[] {
        return this._changedSectionsList;
    }

    get saveButtonClass(): string {
        return this._saveButtonClass;
    }

    get saveButtonText(): string {
        return this._saveButtonText;
    }

    // TrackBy functions for performance optimization
    trackBySection = (index: number, section: string): string => section;
    trackByPreview = (index: number, preview: PreviewSection): string => preview.key;

    // Optimized method to determine if a preview should be shown
    shouldShowPreview(key: string): boolean {
        const dataMap: { [key: string]: any } = {
            'aboutUs': this.aboutUsData,
            'detailedServices': this.detailedServicesData,
            'addOns': this.addOnsData,
            'callToAction': this.callToActionData
        };
        return !!dataMap[key];
    }

    private updateCachedProperties(): void {
        const hasChanges = this.changedFields.size > 0;

        if (this._hasUnsavedChanges !== hasChanges) {
            this._hasUnsavedChanges = hasChanges;
        }

        const newChangedSectionsList = Array.from(this.changedFields);
        if (JSON.stringify(this._changedSectionsList) !== JSON.stringify(newChangedSectionsList)) {
            this._changedSectionsList = newChangedSectionsList;
        }

        const newButtonClass = this.isSaving ? 'btn-secondary' : (hasChanges ? 'btn-warning' : 'btn-success');
        if (this._saveButtonClass !== newButtonClass) {
            this._saveButtonClass = newButtonClass;
        }

        const newButtonText = this.isSaving ? 'Saving Changes...' : (hasChanges ? 'Save Changes' : 'No Changes');
        if (this._saveButtonText !== newButtonText) {
            this._saveButtonText = newButtonText;
        }

        this.cdr.markForCheck();
    }

    private async emitChildTabs(): Promise<void> {
        // Emit available section IDs to parent components
        this.childTabs.emit(this.sectionIds);
    }

    async loadSiteLayout(): Promise<void> {
        try {
            const docRef = doc(this.firestore, 'siteLayout', 'main');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // Load content for each component, using defaults as fallbacks
                this.aboutData = data['aboutData'] || { ...DEFAULT_ABOUT_DATA };
                this.aboutUsData = data['aboutUsData'] || this.deepClone(DEFAULT_ABOUT_US_DATA);
                this.detailedServicesData = data['detailedServicesData'] || this.deepClone(DEFAULT_DETAILED_SERVICES_DATA);
                this.addOnsData = data['addOnsData'] || this.deepClone(DEFAULT_ADDONS_DATA);
                this.callToActionData = data['callToActionData'] || { ...DEFAULT_CALL_TO_ACTION_DATA };
                this.headerSubText = data['headerSubText'] || DEFAULT_HEADER_SUB_TEXT;
                this.subscriptionData = data['subscriptionData'] || {};
                this.addonEditorData = data['addonEditorData'] || {};
                this.servicePlansData = data['servicePlansData'] || {};

                // Store original data for change tracking (use efficient deep cloning)
                this.originalData = {
                    aboutData: { ...this.aboutData },
                    aboutUsData: this.deepClone(this.aboutUsData),
                    detailedServicesData: this.deepClone(this.detailedServicesData),
                    addOnsData: this.deepClone(this.addOnsData),
                    callToActionData: { ...this.callToActionData },
                    headerSubText: this.headerSubText,
                    subscriptionData: this.deepClone(this.subscriptionData),
                    addonEditorData: this.deepClone(this.addonEditorData),
                    servicePlansData: this.deepClone(this.servicePlansData)
                };
            } else {
                // Initialize with default data
                const defaultData = this.initializeDefaultData();
                Object.assign(this, defaultData);
                this.originalData = this.deepClone(defaultData);
            }
        } catch (error) {
            console.error('Error loading site layout:', error);
            // Fallback to defaults on error
            const defaultData = this.initializeDefaultData();
            Object.assign(this, defaultData);
            this.originalData = this.deepClone(defaultData);
        } finally {
            this.isLoading = false;
            this.updateCachedProperties();
            this.cdr.markForCheck();
        }
    }

    // Optimized deep comparison using a more efficient method
    private deepEqual(obj1: any, obj2: any): boolean {
        if (obj1 === obj2) return true;
        if (obj1 == null || obj2 == null) return false;
        if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;

        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        if (keys1.length !== keys2.length) return false;

        for (let key of keys1) {
            if (!keys2.includes(key) || !this.deepEqual(obj1[key], obj2[key])) {
                return false;
            }
        }

        return true;
    }

    // Memoized data initialization to avoid repeated object creation
    private initializeDefaultData() {
        return {
            aboutData: { ...DEFAULT_ABOUT_DATA },
            aboutUsData: this.deepClone(DEFAULT_ABOUT_US_DATA),
            detailedServicesData: this.deepClone(DEFAULT_DETAILED_SERVICES_DATA),
            addOnsData: this.deepClone(DEFAULT_ADDONS_DATA),
            callToActionData: { ...DEFAULT_CALL_TO_ACTION_DATA },
            headerSubText: DEFAULT_HEADER_SUB_TEXT,
            subscriptionData: {},
            addonEditorData: {},
            servicePlansData: {}
        };
    }

    // More efficient deep cloning for complex objects
    private deepClone<T>(obj: T): T {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime()) as any;
        if (Array.isArray(obj)) return obj.map(item => this.deepClone(item)) as any;

        const cloned = {} as T;
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    // Clean data for Firebase by removing undefined values
    private cleanFirebaseData(data: any): any {
        if (data === null || data === undefined) {
            return null;
        }

        if (typeof data !== 'object') {
            return data;
        }

        if (Array.isArray(data)) {
            return data.map(item => this.cleanFirebaseData(item)).filter(item => item !== undefined);
        }

        const cleaned: any = {};
        for (const key in data) {
            if (data.hasOwnProperty(key) && data[key] !== undefined) {
                cleaned[key] = this.cleanFirebaseData(data[key]);
            }
        }
        return cleaned;
    }

    private buildUpdateObject(): any {
        const updates: any = {};
        const changesSummary: string[] = [];

        // Check each field for changes with detailed logging
        if (!this.deepEqual(this.aboutData, this.originalData.aboutData)) {
            updates['aboutData'] = this.cleanFirebaseData(this.aboutData) || {};
            changesSummary.push(this.sectionDisplayNames['aboutData']);
            console.log('About data changed');
        }

        if (!this.deepEqual(this.aboutUsData, this.originalData.aboutUsData)) {
            updates['aboutUsData'] = this.cleanFirebaseData(this.aboutUsData) || {};
            changesSummary.push(this.sectionDisplayNames['aboutUsData']);
            console.log('About Us data changed');
        }

        if (!this.deepEqual(this.detailedServicesData, this.originalData.detailedServicesData)) {
            updates['detailedServicesData'] = this.cleanFirebaseData(this.detailedServicesData) || {};
            changesSummary.push(this.sectionDisplayNames['detailedServicesData']);
            console.log('Detailed Services data changed');
        }

        if (!this.deepEqual(this.addOnsData, this.originalData.addOnsData)) {
            updates['addOnsData'] = this.cleanFirebaseData(this.addOnsData) || {};
            changesSummary.push(this.sectionDisplayNames['addOnsData']);
            console.log('Add-ons data changed');
        }

        if (!this.deepEqual(this.callToActionData, this.originalData.callToActionData)) {
            updates['callToActionData'] = this.cleanFirebaseData(this.callToActionData) || {};
            changesSummary.push(this.sectionDisplayNames['callToActionData']);
            console.log('Call to Action data changed');
        }

        if (this.headerSubText !== this.originalData.headerSubText) {
            updates['headerSubText'] = this.headerSubText || '';
            changesSummary.push(this.sectionDisplayNames['headerSubText']);
            console.log('Header sub text changed');
        }

        // Note: subscriptionData, addonEditorData, servicePlansData are always saved but not tracked for changes
        updates['subscriptionData'] = this.cleanFirebaseData(this.subscriptionData) || {};
        updates['addonEditorData'] = this.cleanFirebaseData(this.addonEditorData) || {};
        updates['servicePlansData'] = this.cleanFirebaseData(this.servicePlansData) || {};

        // Always update these metadata fields
        updates['lastUpdated'] = new Date().toISOString();
        updates['version'] = '1.0';

        // Store changes summary for user feedback
        updates['_changesSummary'] = changesSummary;

        return updates;
    }

    async saveSiteLayout(): Promise<void> {
        if (this.isSaving) return;

        this.isSaving = true;
        this.updateCachedProperties();

        try {
            const updates = this.buildUpdateObject();

            // Check if there are any actual changes (excluding metadata)
            const hasChanges = Object.keys(updates).some(key =>
                key !== 'lastUpdated' && key !== 'version'
            );

            if (!hasChanges) {
                console.log('No changes detected, skipping save');
                return;
            }

            console.log('Updating fields:', Object.keys(updates));

            // Use updateDoc to only update changed fields
            await updateDoc(doc(this.firestore, 'siteLayout', 'main'), updates);

            // Update original data to reflect saved state using efficient cloning
            this.originalData = {
                aboutData: { ...this.aboutData },
                aboutUsData: this.deepClone(this.aboutUsData),
                detailedServicesData: this.deepClone(this.detailedServicesData),
                addOnsData: this.deepClone(this.addOnsData),
                callToActionData: { ...this.callToActionData },
                headerSubText: this.headerSubText,
                subscriptionData: this.deepClone(this.subscriptionData),
                addonEditorData: this.deepClone(this.addonEditorData),
                servicePlansData: this.deepClone(this.servicePlansData)
            };

            // Clear changed fields tracking
            this.changedFields.clear();
            this.lastSaved = new Date();

            console.log('Site layout updated successfully with only changed fields');

        } catch (error) {
            console.error('Error saving site layout:', error);
            // If document doesn't exist, create it with all data
            if (error instanceof Error && error.message.includes('No document to update')) {
                try {
                    const siteLayoutData = {
                        aboutData: this.cleanFirebaseData(this.aboutData) || {},
                        aboutUsData: this.cleanFirebaseData(this.aboutUsData) || {},
                        detailedServicesData: this.cleanFirebaseData(this.detailedServicesData) || {},
                        addOnsData: this.cleanFirebaseData(this.addOnsData) || {},
                        callToActionData: this.cleanFirebaseData(this.callToActionData) || {},
                        headerSubText: this.headerSubText || '',
                        subscriptionData: this.cleanFirebaseData(this.subscriptionData) || {},
                        addonEditorData: this.cleanFirebaseData(this.addonEditorData) || {},
                        servicePlansData: this.cleanFirebaseData(this.servicePlansData) || {},
                        lastUpdated: new Date().toISOString(),
                        version: '1.0'
                    };

                    await setDoc(doc(this.firestore, 'siteLayout', 'main'), siteLayoutData);
                    this.changedFields.clear();
                    this.lastSaved = new Date();
                    console.log('Created new document with all data');
                } catch (createError) {
                    console.error('Error creating document:', createError);
                }
            }
        } finally {
            this.isSaving = false;
            this.updateCachedProperties();
            this.cdr.markForCheck();
        }
    }

    onAboutDataChange(data: { headerText: string }): void {
        this.aboutData = data;
        this.changedFields.add('aboutData');
        this.updateCachedProperties();
    }

    onAboutUsDataChange(data: AboutUsContent) {
        this.aboutUsData = data;
        this.changedFields.add('aboutUsData');
        this.updateCachedProperties();
    }

    onDetailedServicesDataChange(data: DetailedServicesContent) {
        this.detailedServicesData = data;
        this.changedFields.add('detailedServicesData');
        this.updateCachedProperties();
    }

    onAddOnsDataChange(data: AddOnsContent): void {
        this.addOnsData = data;
        this.changedFields.add('addOnsData');
        this.updateCachedProperties();
    }

    onCallToActionDataChange(data: CallToActionContent): void {
        this.callToActionData = data;
        this.changedFields.add('callToActionData');
        this.updateCachedProperties();
    }

    onHeaderSubTextChange(data: string): void {
        this.headerSubText = data;
        this.changedFields.add('headerSubText');
        this.updateCachedProperties();
    }

    // New change handlers for additional components
    async onSubscriptionDataChange(data: any): Promise<void> {
        try {
            console.log('🔄 Handling subscription data change:', data.action, 'for', data.data?.name);

            if (data.action === 'create') {
                await this.createSubscriptionPlan(data.data);
            } else if (data.action === 'update') {
                await this.updateSubscriptionPlan(data.data);
            } else if (data.action === 'delete') {
                await this.deleteSubscriptionPlan(data.data);
            } else if (data.action === 'toggleStatus') {
                await this.toggleSubscriptionStatus(data.data);
            } else if (data.action === 'archive') {
                await this.updateSubscriptionPlan(data.data);
            }
        } catch (error) {
            console.error('❌ Error handling subscription data change:', error);

            // More detailed error information
            if (error instanceof Error) {
                console.error('Error details:', {
                    message: error.message,
                    action: data.action,
                    productName: data.data?.name,
                    stripeProductId: data.data?.stripeProductId
                });
            }

            // Re-throw to ensure errors are not silently swallowed
            throw error;
        }
    }

    // Addon data change handler with CRUD operations
    async onAddonDataChange(data: any): Promise<void> {
        try {
            if (data.action === 'create') {
                await this.createAddonProduct(data.data);
            } else if (data.action === 'update') {
                await this.updateAddonProduct(data.data);
            } else if (data.action === 'delete') {
                await this.deleteAddonProduct(data.data);
            } else if (data.action === 'toggleStatus') {
                await this.toggleAddonStatus(data.data);
            } else if (data.action === 'archive') {
                await this.updateAddonProduct(data.data);
            }
        } catch (error) {
            console.error('❌ Error handling addon data change:', error);

            // More detailed error information
            if (error instanceof Error) {
                console.error('Error details:', {
                    message: error.message,
                    action: data.action,
                    productName: data.data?.name,
                    stripeProductId: data.data?.stripeProductId
                });
            }

            // Re-throw to ensure errors are not silently swallowed
            throw error;
        }
    }

    onAddonEditorDataChange(data: any): void {
        this.addonEditorData = data;
        // Note: Not tracking changes for addons
        // this.changedFields.add('addonEditorData');
        // this.updateCachedProperties();
    }

    onServicePlansDataChange(data: any): void {
        this.servicePlansData = data;
        // Note: Not tracking changes for service plans
        // this.changedFields.add('servicePlansData');
        // this.updateCachedProperties();
    }

    // Enhanced method to get user-friendly section names
    getChangedSectionNames(): string[] {
        return Array.from(this.changedFields).map(field =>
            this.sectionDisplayNames[field] || field
        );
    }

    // Method to check if a specific section has changes
    hasSectionChanged(sectionKey: string): boolean {
        return this.changedFields.has(sectionKey);
    }

    // Method to clear specific section changes (useful for granular control)
    clearSectionChanges(sectionKey: string): void {
        this.changedFields.delete(sectionKey);
        this.updateCachedProperties();
    }

    // Method to get tab-specific change indicators
    getTabChangeIndicator(tabName: string): { hasChanges: boolean, changedSections: string[] } {
        const tabSectionMap: { [key: string]: string[] } = {
            'Home': ['aboutData', 'headerSubText'],
            'About Us': ['aboutUsData'],
            'Services': ['detailedServicesData'],
            'Enhancements': ['addOnsData'],
            'Call to Action': ['callToActionData']
        };

        const sectionsForTab = tabSectionMap[tabName] || [];
        const changedSections = sectionsForTab.filter(section => this.changedFields.has(section));

        return {
            hasChanges: changedSections.length > 0,
            changedSections: changedSections.map(section => this.sectionDisplayNames[section] || section)
        };
    }

    // Convenience method to check if a specific tab has changes
    hasTabChanges(tabName: string): boolean {
        return this.getTabChangeIndicator(tabName).hasChanges;
    }

    // ============================================================================
    // STRIPE PRODUCT CATEGORIZATION METHODS
    // ============================================================================

    // Initialize Stripe products loading
    private initializeStripeProducts(): void {
        this.isLoadingStripeProducts = true;
        this.stripeService.initializeProductsAndPrices();

        // Subscribe to Stripe products and prices
        combineLatest([
            this.stripeService.getProducts(),
            this.stripeService.getPrices()
        ])
            .pipe(takeUntil(this.destroy$))
            .subscribe(([products, prices]) => {
                this.stripeProducts = Array.isArray(products) ? products : [];
                this.stripePrices = Array.isArray(prices) ? prices : [];
                this.categorizeAllStripeProducts();
                this.isLoadingStripeProducts = false;
                this.cdr.detectChanges();
            });
    }

    // Main categorization method
    private categorizeAllStripeProducts(): void {
        // Clear existing categories
        this.subscriptionPlans = [];
        this.addonProducts = [];
        this.oneTimeProducts = [];
        this.allCategorizedProducts = [];
        // Process each product and categorize it
        this.stripeProducts.forEach(product => {
            const categorizedProduct = this.categorizeStripeProduct(product, this.stripePrices);
            if (categorizedProduct) {
                this.allCategorizedProducts.push(categorizedProduct);

                // Add to specific category arrays
                if (this.isSubscriptionPlan(categorizedProduct)) {
                    this.subscriptionPlans.push(categorizedProduct);
                } else if (this.isAddonProduct(categorizedProduct)) {
                    this.addonProducts.push(categorizedProduct);
                } else if (this.isOneTimeProduct(categorizedProduct)) {
                    this.oneTimeProducts.push(categorizedProduct);
                }
            }
        });

        console.log('📊 Admin Landing Editor - Categorization results:');
        console.log('- Subscription Plans:', this.subscriptionPlans.length);
        console.log('- Add-ons:', this.addonProducts.length);
        console.log('- One-time Products:', this.oneTimeProducts);
    }

    // Categorize a single Stripe product based on its metadata and pricing
    private categorizeStripeProduct(product: StripeProduct, prices: StripePrice[]): CategorizedProduct | null {
        const productPrices = prices.filter(p => p.product === product.id && p.active);

        if (productPrices.length === 0) {
            console.warn(`⚠️ No active prices found for product: ${product.name}`);
            return null;
        }

        // Determine category based on metadata and pricing
        const isRecurring = productPrices.some(p => p.recurring);
        const isAddOn = product.metadata?.['isAddOn'] === 'true' || product.metadata?.['type'] === 'addon';
        const productType = product.metadata?.['type'] || '';
        const paymentType = product.metadata?.['paymentType'] || '';

        if (isRecurring && !isAddOn) {
            // This is a subscription plan
            return this.convertToSubscriptionPlan(product, productPrices);
        } else if (isAddOn) {
            // This is an add-on (can be one-time or recurring)
            return this.convertToAddonProduct(product, productPrices);
        } else {
            // This is a one-time payment product
            return this.convertToOneTimeProduct(product, productPrices);
        }
    }

    // Convert Stripe product to SubscriptionPlan
    private convertToSubscriptionPlan(product: StripeProduct, prices: StripePrice[]): SubscriptionPlan {
        const monthlyPrice = prices.find(p => p.recurring?.interval === 'month');
        const yearlyPrice = prices.find(p => p.recurring?.interval === 'year');

        return {
            stripeProductId: product.id,
            stripePriceId: monthlyPrice?.id || prices[0]?.id,
            stripeMonthlyPriceId: monthlyPrice?.id,
            stripeYearlyPriceId: yearlyPrice?.id,
            name: product.name,
            description: product.description || '',
            active: product.active,
            price: monthlyPrice ? monthlyPrice.unit_amount / 100 : 0,
            monthlyPrice: monthlyPrice ? monthlyPrice.unit_amount / 100 : 0,
            yearlyPrice: yearlyPrice ? yearlyPrice.unit_amount / 100 : undefined,
            currency: monthlyPrice?.currency || prices[0]?.currency || 'usd',
            features: this.parseFeatures(product.metadata?.['features']),
            isPopular: product.metadata?.['isPopular'] === 'true',
            category: product.metadata?.['category'] || 'Business',
            maxUsers: product.metadata?.['maxUsers'] ? parseInt(product.metadata['maxUsers']) : undefined,
            storageLimit: product.metadata?.['storageLimit'],
            supportLevel: (product.metadata?.['supportLevel'] as 'Basic' | 'Priority' | 'Premium') || 'Basic',
            trialDays: product.metadata?.['trialDays'] ? parseInt(product.metadata['trialDays']) : undefined,
            planType: (product.metadata?.['planType'] as 'Starter' | 'Business' | 'Enterprise') || 'Business',
            created: new Date(product.created * 1000),
            updated: new Date(product.updated * 1000),
            status: product.active ? 'Active' : 'Inactive' as 'Active' | 'Inactive' | 'Deprecated',
            lastModified: new Date(product.updated * 1000).toISOString().split('T')[0],
            isArchived: product.metadata?.['status'] === 'Deprecated' || !product.active
        };
    }

    // Convert Stripe product to AddonProduct
    private convertToAddonProduct(product: StripeProduct, prices: StripePrice[]): AddonProduct {
        const price = prices[0]; // Use first available price
        const isRecurring = !!price.recurring;

        return {
            stripeProductId: product.id,
            stripePriceId: price.id,
            name: product.name,
            description: product.description || '',
            active: product.active,
            price: price.unit_amount / 100,
            currency: price.currency,
            features: this.parseFeatures(product.metadata?.['features']),
            isPopular: product.metadata?.['isPopular'] === 'true',
            category: product.metadata?.['category'] || 'addon',
            addonType: (product.metadata?.['addonType'] as 'feature' | 'storage' | 'support' | 'integration') || 'feature',
            compatiblePlans: product.metadata?.['compatiblePlans']?.split(',') || [],
            isRecurring: isRecurring,
            created: new Date(product.created * 1000),
            updated: new Date(product.updated * 1000),
            status: product.active ? 'Active' : 'Inactive' as 'Active' | 'Inactive' | 'Deprecated',
            lastModified: new Date(product.updated * 1000).toISOString().split('T')[0],
            isArchived: product.metadata?.['status'] === 'Deprecated' || !product.active
        };
    }

    // Convert Stripe product to OneTimeProduct
    private convertToOneTimeProduct(product: StripeProduct, prices: StripePrice[]): OneTimeProduct {
        const price = prices[0]; // Use first available price

        return {
            stripeProductId: product.id,
            stripePriceId: price.id,
            name: product.name,
            description: product.description || '',
            active: product.active,
            price: price.unit_amount / 100,
            currency: price.currency,
            features: this.parseFeatures(product.metadata?.['features']),
            isPopular: product.metadata?.['isPopular'] === 'true',
            category: product.metadata?.['category'] || 'service',
            productType: (product.metadata?.['productType'] as 'service' | 'consultation' | 'setup' | 'training') || 'service',
            deliveryTimeframe: product.metadata?.['deliveryTimeframe'],
            created: new Date(product.created * 1000),
            updated: new Date(product.updated * 1000),
            status: product.active ? 'Active' : 'Inactive' as 'Active' | 'Inactive' | 'Deprecated',
            lastModified: new Date(product.updated * 1000).toISOString().split('T')[0],
            isArchived: product.metadata?.['status'] === 'Deprecated' || !product.active
        };
    }

    // Type guard functions
    private isSubscriptionPlan(product: CategorizedProduct): product is SubscriptionPlan {
        return 'planType' in product;
    }

    private isAddonProduct(product: CategorizedProduct): product is AddonProduct {
        return 'addonType' in product;
    }

    private isOneTimeProduct(product: CategorizedProduct): product is OneTimeProduct {
        return 'productType' in product;
    }

    // Helper method to parse features from JSON string
    private parseFeatures(featuresStr: string | undefined): string[] {
        if (!featuresStr) return [''];

        try {
            const parsed = JSON.parse(featuresStr);
            return Array.isArray(parsed) ? parsed : [''];
        } catch (error) {
            console.warn('Failed to parse features:', featuresStr);
            return [''];
        }
    }

    // Getter methods for template access
    get categorizedProducts() {
        return {
            subscriptions: this.subscriptionPlans,
            addons: this.addonProducts,
            oneTimeProducts: this.oneTimeProducts,
            all: this.allCategorizedProducts,
            counts: {
                subscriptions: this.subscriptionPlans.length,
                addons: this.addonProducts.length,
                oneTime: this.oneTimeProducts.length,
                total: this.allCategorizedProducts.length
            }
        };
    }

    // Subscription CRUD Methods
    private async createSubscriptionPlan(plan: SubscriptionPlan): Promise<void> {
        try {
            console.log('🚀 Creating subscription plan:', plan.name);

            // Prepare metadata for Stripe
            const metadata = {
                type: 'subscription',
                category: 'subscription',
                planType: plan.planType,
                maxUsers: plan.maxUsers?.toString() || '999999',
                storageLimit: plan.storageLimit || '',
                supportLevel: plan.supportLevel,
                trialDays: plan.trialDays?.toString() || '0',
                features: JSON.stringify(plan.features),
                status: plan.status,
                isPopular: plan.isPopular?.toString() || 'false',
                lastModified: new Date().toISOString().split('T')[0]
            };

            // Create product in Stripe
            const productResult = await this.stripeService.createProduct({
                name: plan.name,
                description: plan.description,
                active: plan.status === 'Active',
                metadata: metadata
            }).toPromise();

            const product = (productResult as any)?.data || productResult;
            if (product && product.id) {
                console.log('✅ Product created successfully:', product.id);

                // Create recurring prices
                const promises = [];

                if (plan.monthlyPrice > 0) {
                    const monthlyPriceData = {
                        productId: product.id,
                        unitAmount: Math.round(plan.monthlyPrice * 100),
                        currency: 'usd',
                        recurring: { interval: 'month' as 'month' },
                        nickname: `${plan.name} - Monthly`
                    };
                    promises.push(this.stripeService.createPrice(monthlyPriceData).toPromise());
                }

                if (plan.yearlyPrice && plan.yearlyPrice > 0) {
                    const yearlyPriceData = {
                        productId: product.id,
                        unitAmount: Math.round(plan.yearlyPrice * 100),
                        currency: 'usd',
                        recurring: { interval: 'year' as 'year' },
                        nickname: `${plan.name} - Yearly`
                    };
                    promises.push(this.stripeService.createPrice(yearlyPriceData).toPromise());
                }

                await Promise.all(promises);
                console.log('✅ Subscription plan created successfully!');

                // Refresh products after creation
                setTimeout(async () => {
                    await this.stripeService.initializeProductsAndPrices();
                    this.initializeStripeProducts();
                }, 500);
            }
        } catch (error) {
            console.error('❌ Error creating subscription plan:', error);
            throw error;
        }
    }

    private async updateSubscriptionPlan(plan: SubscriptionPlan): Promise<void> {
        try {
            console.log('🔄 Updating subscription plan:', plan.name);

            if (!plan.stripeProductId) {
                throw new Error('No Stripe Product ID found for update');
            }

            // Prepare updated metadata
            const metadata = {
                type: 'subscription',
                category: 'subscription',
                planType: plan.planType,
                maxUsers: plan.maxUsers?.toString() || '999999',
                storageLimit: plan.storageLimit || '',
                supportLevel: plan.supportLevel,
                trialDays: plan.trialDays?.toString() || '0',
                features: JSON.stringify(plan.features),
                status: plan.status,
                isPopular: plan.isPopular?.toString() || 'false',
                lastModified: new Date().toISOString().split('T')[0]
            };

            // Update product in Stripe
            await this.stripeService.updateProduct(plan.stripeProductId, {
                name: plan.name,
                description: plan.description,
                active: plan.status === 'Active',
                metadata: metadata
            }).toPromise();

            console.log('✅ Subscription plan updated successfully!');

            // Refresh products after update
            setTimeout(async () => {
                await this.stripeService.initializeProductsAndPrices();
                this.initializeStripeProducts();
            }, 500);
        } catch (error) {
            console.error('❌ Error updating subscription plan:', error);
            throw error;
        }
    }

    private async deleteSubscriptionPlan(plan: SubscriptionPlan): Promise<void> {
        try {
            console.log('🗑️ Deleting subscription plan:', plan.name);

            if (!plan.stripeProductId) {
                throw new Error('No Stripe Product ID found for deletion');
            }

            // Deactivate the product in Stripe (Stripe doesn't allow true deletion)
            await this.stripeService.updateProduct(plan.stripeProductId, {
                active: false,
                metadata: {
                    type: 'subscription',
                    category: 'subscription',
                    planType: plan.planType,
                    maxUsers: plan.maxUsers?.toString() || '999999',
                    storageLimit: plan.storageLimit || '',
                    supportLevel: plan.supportLevel,
                    trialDays: plan.trialDays?.toString() || '0',
                    features: JSON.stringify(plan.features),
                    status: 'Deprecated',
                    isPopular: plan.isPopular?.toString() || 'false',
                    lastModified: new Date().toISOString().split('T')[0]
                }
            }).toPromise();

            console.log('✅ Subscription plan deactivated successfully!');

            // Refresh products after deletion
            setTimeout(async () => {
                await this.stripeService.initializeProductsAndPrices();
                this.initializeStripeProducts();
            }, 500);
        } catch (error) {
            console.error('❌ Error deleting subscription plan:', error);

            // More detailed error logging
            if (error instanceof Error) {
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            } else {
                console.error('Unknown error type:', typeof error, error);
            }

            throw error;
        }
    }

    private async toggleSubscriptionStatus(plan: SubscriptionPlan): Promise<void> {
        try {
            console.log('🔄 Toggling subscription plan status:', plan.name);

            if (!plan.stripeProductId) {
                throw new Error('No Stripe Product ID found for status toggle');
            }

            const newStatus = plan.status === 'Active' ? 'Inactive' : 'Active';

            await this.stripeService.updateProduct(plan.stripeProductId, {
                active: newStatus === 'Active',
                metadata: {
                    type: 'subscription',
                    category: 'subscription',
                    planType: plan.planType,
                    maxUsers: plan.maxUsers?.toString() || '999999',
                    storageLimit: plan.storageLimit || '',
                    supportLevel: plan.supportLevel,
                    trialDays: plan.trialDays?.toString() || '0',
                    features: JSON.stringify(plan.features),
                    status: newStatus,
                    isPopular: plan.isPopular?.toString() || 'false',
                    lastModified: new Date().toISOString().split('T')[0]
                }
            }).toPromise();

            console.log('✅ Subscription plan status toggled successfully!');

            // Refresh products after status change
            setTimeout(async () => {
                await this.stripeService.initializeProductsAndPrices();
                this.initializeStripeProducts();
            }, 500);
        } catch (error) {
            console.error('❌ Error toggling subscription plan status:', error);
            throw error;
        }
    }

    // CRUD operations for addon products
    private async createAddonProduct(addon: AddonProduct): Promise<void> {
        try {
            console.log('🚀 Creating addon product:', addon.name);

            // Prepare metadata for Stripe - ensure features and compatiblePlans are properly sanitized

            // Sanitize features data to prevent corruption
            let cleanFeatures: string[] = [];
            if (Array.isArray(addon.features)) {
                cleanFeatures = addon.features.filter(f => typeof f === 'string');
            } else if (typeof addon.features === 'string') {
                // Handle deeply nested JSON corruption by repeatedly parsing until we get an array
                let current: any = addon.features;
                let maxAttempts = 10; // Prevent infinite loops

                while (typeof current === 'string' && maxAttempts > 0) {
                    try {
                        const parsed = JSON.parse(current);
                        if (Array.isArray(parsed)) {
                            cleanFeatures = parsed.filter(f => typeof f === 'string');
                            break;
                        } else {
                            current = parsed;
                        }
                    } catch (e) {
                        console.warn('Could not parse features at attempt', 11 - maxAttempts, 'using empty array');
                        cleanFeatures = [];
                        break;
                    }
                    maxAttempts--;
                }

                if (maxAttempts === 0) {
                    console.warn('Max parsing attempts reached for features, using empty array');
                    cleanFeatures = [];
                }
            }

            // Sanitize compatiblePlans data to prevent corruption
            let cleanCompatiblePlans: string[] = [];
            if (Array.isArray(addon.compatiblePlans)) {
                cleanCompatiblePlans = addon.compatiblePlans.filter(p => typeof p === 'string');
            } else if (typeof addon.compatiblePlans === 'string') {
                // Handle deeply nested JSON corruption by repeatedly parsing until we get an array
                let current: any = addon.compatiblePlans;
                let maxAttempts = 10; // Prevent infinite loops

                while (typeof current === 'string' && maxAttempts > 0) {
                    try {
                        const parsed = JSON.parse(current);
                        if (Array.isArray(parsed)) {
                            cleanCompatiblePlans = parsed.filter(p => typeof p === 'string');
                            break;
                        } else {
                            current = parsed;
                        }
                    } catch (e) {
                        console.warn('Could not parse compatiblePlans at attempt', 11 - maxAttempts, 'using empty array');
                        cleanCompatiblePlans = [];
                        break;
                    }
                    maxAttempts--;
                }

                if (maxAttempts === 0) {
                    console.warn('Max parsing attempts reached for compatiblePlans, using empty array');
                    cleanCompatiblePlans = [];
                }
            }

            const metadata = {
                type: 'addon',
                category: 'addon',
                addonType: addon.addonType,
                compatiblePlans: JSON.stringify(cleanCompatiblePlans),
                features: JSON.stringify(cleanFeatures),
                isRecurring: addon.isRecurring?.toString() || 'false',
                isPopular: addon.isPopular?.toString() || 'false',
                status: addon.status || 'Active',
                lastModified: new Date().toISOString().split('T')[0]
            };

            // Create product in Stripe
            const productResult = await this.stripeService.createProduct({
                name: addon.name,
                description: addon.description,
                active: addon.status === 'Active',
                metadata: metadata
            }).toPromise();

            const product = (productResult as any)?.data || productResult;
            if (product && product.id) {
                console.log('✅ Addon product created successfully:', product.id);

                // Create price for addon
                const priceData: any = {
                    productId: product.id,
                    unitAmount: Math.round(addon.price * 100),
                    currency: addon.currency || 'usd',
                    nickname: `${addon.name} - Price`
                };

                if (addon.isRecurring) {
                    priceData.recurring = { interval: 'month' };
                }

                await this.stripeService.createPrice(priceData).toPromise();
                console.log('✅ Addon product created successfully!');

                // Refresh products after creation
                setTimeout(async () => {
                    await this.stripeService.initializeProductsAndPrices();
                    this.initializeStripeProducts();
                }, 500);
            }
        } catch (error) {
            console.error('❌ Error creating addon product:', error);
            throw error;
        }
    }

    private async updateAddonProduct(addon: AddonProduct): Promise<void> {
        try {
            console.log('🔄 Updating addon product:', addon.name);

            if (!addon.stripeProductId) {
                throw new Error('No Stripe Product ID found for update');
            }

            // Sanitize features data to prevent corruption - handle deeply nested JSON
            let cleanFeatures: string[] = [];
            if (Array.isArray(addon.features)) {
                cleanFeatures = addon.features.filter(f => typeof f === 'string');
            } else if (typeof addon.features === 'string') {
                // Handle deeply nested JSON corruption by repeatedly parsing until we get an array
                let current: any = addon.features;
                let maxAttempts = 10; // Prevent infinite loops

                while (typeof current === 'string' && maxAttempts > 0) {
                    try {
                        const parsed = JSON.parse(current);
                        if (Array.isArray(parsed)) {
                            cleanFeatures = parsed.filter(f => typeof f === 'string');
                            break;
                        } else {
                            current = parsed;
                        }
                    } catch (e) {
                        console.warn('Could not parse features at attempt', 11 - maxAttempts, 'using empty array');
                        cleanFeatures = [];
                        break;
                    }
                    maxAttempts--;
                }

                if (maxAttempts === 0) {
                    console.warn('Max parsing attempts reached for features, using empty array');
                    cleanFeatures = [];
                }
            }

            // Sanitize compatiblePlans data to prevent corruption - handle deeply nested JSON
            let cleanCompatiblePlans: string[] = [];
            if (Array.isArray(addon.compatiblePlans)) {
                cleanCompatiblePlans = addon.compatiblePlans.filter(p => typeof p === 'string');
            } else if (typeof addon.compatiblePlans === 'string') {
                // Handle deeply nested JSON corruption by repeatedly parsing until we get an array
                let current: any = addon.compatiblePlans;
                let maxAttempts = 10; // Prevent infinite loops

                while (typeof current === 'string' && maxAttempts > 0) {
                    try {
                        const parsed = JSON.parse(current);
                        if (Array.isArray(parsed)) {
                            cleanCompatiblePlans = parsed.filter(p => typeof p === 'string');
                            break;
                        } else {
                            current = parsed;
                        }
                    } catch (e) {
                        console.warn('Could not parse compatiblePlans at attempt', 11 - maxAttempts, 'using empty array');
                        cleanCompatiblePlans = [];
                        break;
                    }
                    maxAttempts--;
                }

                if (maxAttempts === 0) {
                    console.warn('Max parsing attempts reached for compatiblePlans, using empty array');
                    cleanCompatiblePlans = [];
                }
            }

            // Prepare updated metadata - ensure features is properly handled
            const metadata = {
                type: 'addon',
                category: 'addon',
                addonType: addon.addonType,
                compatiblePlans: JSON.stringify(cleanCompatiblePlans),
                features: JSON.stringify(cleanFeatures),
                isRecurring: addon.isRecurring?.toString() || 'false',
                isPopular: addon.isPopular?.toString() || 'false',
                status: addon.status || 'Active',
                lastModified: new Date().toISOString().split('T')[0]
            };

            // Validate metadata lengths to prevent Stripe errors
            Object.entries(metadata).forEach(([key, value]) => {
                if (typeof value === 'string' && value.length > 500) {
                    console.error(`Metadata field ${key} is too long (${value.length} chars):`, value.substring(0, 100) + '...');
                    throw new Error(`Metadata field ${key} exceeds 500 character limit`);
                }
            });

            console.log('📄 Updating with metadata:', metadata);

            // Update product in Stripe
            await this.stripeService.updateProduct(addon.stripeProductId, {
                name: addon.name,
                description: addon.description,
                active: addon.status === 'Active',
                metadata: metadata
            }).toPromise();

            console.log('✅ Addon product updated successfully!');

            // Refresh products after update
            setTimeout(async () => {
                await this.stripeService.initializeProductsAndPrices();
                this.initializeStripeProducts();
            }, 500);
        } catch (error) {
            console.error('❌ Error updating addon product:', error);
            throw error;
        }
    }

    private async deleteAddonProduct(addon: AddonProduct): Promise<void> {
        try {
            console.log('🗑️ Deleting addon product:', addon.name);

            if (!addon.stripeProductId) {
                throw new Error('No Stripe Product ID found for deletion');
            }

            // Deactivate the product in Stripe (Stripe doesn't allow true deletion)
            await this.stripeService.updateProduct(addon.stripeProductId, {
                active: false,
                metadata: {
                    type: 'addon',
                    category: 'addon',
                    addonType: addon.addonType,
                    compatiblePlans: JSON.stringify(addon.compatiblePlans || []),
                    features: JSON.stringify(addon.features),
                    isRecurring: addon.isRecurring?.toString() || 'false',
                    isPopular: addon.isPopular?.toString() || 'false',
                    status: 'Deprecated',
                    lastModified: new Date().toISOString().split('T')[0]
                }
            }).toPromise();

            console.log('✅ Addon product deactivated successfully!');

            // Refresh products after deletion
            setTimeout(async () => {
                await this.stripeService.initializeProductsAndPrices();
                this.initializeStripeProducts();
            }, 500);
        } catch (error) {
            console.error('❌ Error deleting addon product:', error);

            // More detailed error logging
            if (error instanceof Error) {
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            } else {
                console.error('Unknown error type:', typeof error, error);
            }

            throw error;
        }
    }

    private async toggleAddonStatus(addon: AddonProduct): Promise<void> {
        try {
            console.log('🔄 Toggling addon product status:', addon.name);

            if (!addon.stripeProductId) {
                throw new Error('No Stripe Product ID found for status toggle');
            }

            const newStatus = addon.status === 'Active' ? 'Inactive' : 'Active';

            await this.stripeService.updateProduct(addon.stripeProductId, {
                active: newStatus === 'Active',
                metadata: {
                    type: 'addon',
                    category: 'addon',
                    addonType: addon.addonType,
                    compatiblePlans: JSON.stringify(addon.compatiblePlans || []),
                    features: JSON.stringify(addon.features),
                    isRecurring: addon.isRecurring?.toString() || 'false',
                    isPopular: addon.isPopular?.toString() || 'false',
                    status: newStatus,
                    lastModified: new Date().toISOString().split('T')[0]
                }
            }).toPromise();

            console.log('✅ Addon product status toggled successfully!');

            // Refresh products after status change
            setTimeout(async () => {
                await this.stripeService.initializeProductsAndPrices();
                this.initializeStripeProducts();
            }, 500);
        } catch (error) {
            console.error('❌ Error toggling addon product status:', error);
            throw error;
        }
    }
}