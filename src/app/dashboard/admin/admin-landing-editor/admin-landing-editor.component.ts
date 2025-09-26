import { Component, OnInit, Input, Output, EventEmitter, OnChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { LandingLayoutService } from '../../../services/landing-layout.service';
import { AboutUsContent } from 'src/app/models/about-us-content';
import { DetailedServicesContent } from 'src/app/models/detailed-service-content';
import { AddOnsContent } from 'src/app/models/AddOnsContent';
import { CallToActionContent } from 'src/app/models/CallToActionContent';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { AboutHeader } from 'src/app/models/AboutHeader';
import {
    DEFAULT_SITE_CONTENT,
    DEFAULT_ABOUT_DATA,
    DEFAULT_ABOUT_US_DATA,
    DEFAULT_DETAILED_SERVICES_DATA,
    DEFAULT_ADDONS_DATA,
    DEFAULT_CALL_TO_ACTION_DATA,
    DEFAULT_HEADER_SUB_TEXT
} from '../../../config/default-site-content';

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
export class AdminLandingEditorComponent implements OnInit, OnChanges {
    @Input() subTab: string = 'Home';
    sectionIds: string[] = ['Home', 'About Us', 'Services', 'Enhancements', 'Call to Action', '|', 'Add-Ons', 'Service Plans', 'Subscriptions'];
    @Output() childTabs = new EventEmitter<string[]>();
    @Input() content: string = '';

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
        private cdr: ChangeDetectorRef
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

        // Load data asynchronously and emit child tabs
        await Promise.all([
            this.loadSiteLayout(),
            this.emitChildTabs()
        ]);

        this.updateCachedProperties();
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

                console.log('Site layout loaded successfully');
            } else {
                console.log('No site layout found in Firebase, using defaults');
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
        console.log('About data has changed:', data);
        this.aboutData = data;
        this.changedFields.add('aboutData');
        this.updateCachedProperties();
    }

    onAboutUsDataChange(data: AboutUsContent) {
        console.log('About Us data has changed:', data);
        this.aboutUsData = data;
        this.changedFields.add('aboutUsData');
        this.updateCachedProperties();
    }

    onDetailedServicesDataChange(data: DetailedServicesContent) {
        console.log('Detailed Services data has changed:', data);
        this.detailedServicesData = data;
        this.changedFields.add('detailedServicesData');
        this.updateCachedProperties();
    }

    onAddOnsDataChange(data: AddOnsContent): void {
        console.log('Add-ons content changed:', data);
        this.addOnsData = data;
        this.changedFields.add('addOnsData');
        this.updateCachedProperties();
    }

    onCallToActionDataChange(data: CallToActionContent): void {
        console.log('Call to Action data has changed:', data);
        this.callToActionData = data;
        this.changedFields.add('callToActionData');
        this.updateCachedProperties();
    }

    onHeaderSubTextChange(data: string): void {
        console.log('Header subtext has changed:', data);
        this.headerSubText = data;
        this.changedFields.add('headerSubText');
        this.updateCachedProperties();
    }

    // New change handlers for additional components
    onSubscriptionDataChange(data: any): void {
        console.log('Subscription data has changed:', data);
        this.subscriptionData = data;
        // Note: Not tracking changes for subscriptions
        // this.changedFields.add('subscriptionData');
        // this.updateCachedProperties();
    }

    onAddonEditorDataChange(data: any): void {
        console.log('Addon editor data has changed:', data);
        this.addonEditorData = data;
        // Note: Not tracking changes for addons
        // this.changedFields.add('addonEditorData');
        // this.updateCachedProperties();
    }

    onServicePlansDataChange(data: any): void {
        console.log('Service plans data has changed:', data);
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
}