import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Company } from '../../../../models/User';
import { StripeService, StripeProduct, StripePrice } from '../../../../services/stripe.service';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Add-on Product interface for Stripe categorization
interface AddonProduct {
    id: string;
    name: string;
    description?: string;
    features: string[];
    price: {
        id: string;
        unit_amount: number;
        recurring?: {
            interval: string;
        };
    };
    compatibility: string[];
    active: boolean;
    isArchived: boolean;
    stripePriceId: string;
}

@Component({
    selector: 'app-addons-tab',
    templateUrl: './addons-tab.component.html',
    styleUrls: ['./addons-tab.component.scss']
})
export class AddonsTabComponent implements OnInit, OnDestroy, OnChanges {
    @Input() selectedCompany: any;
    @Input() serviceManagementView: string = 'templates';
    @Input() serviceTemplates: any[] = [];
    @Input() serviceAssignmentHistory: any[] = [];
    @Input() serviceUsageStats: any[] = [];
    @Input() currentCustomerAddons: any[] = [];
    @Input() serviceCategories: any[] = [];
    @Input() availableAddons: any[] = [];
    @Input() addonLoading: boolean = false;
    @Input() serviceTemplateLoading: boolean = false;
    @Input() bulkOperationLoading: boolean = false;
    @Input() stripeLoading: boolean = false;

    @Output() setServiceManagementView = new EventEmitter<string>();
    @Output() openServiceTemplateModal = new EventEmitter<any>();
    @Output() deleteServiceTemplate = new EventEmitter<any>();
    @Output() openAddAddonModal = new EventEmitter<void>();
    @Output() removeAddonFromCustomer = new EventEmitter<any>();
    @Output() openBulkServiceModal = new EventEmitter<string>();
    @Output() createStripeSubscriptionForCompany = new EventEmitter<{ company: any, priceId: string }>();

    // Stripe add-on categorization properties
    stripeProducts: StripeProduct[] = [];
    stripePrices: StripePrice[] = [];
    addonProducts: AddonProduct[] = [];
    isLoadingStripeProducts: boolean = false;
    isCreatingSubscription: boolean = false;

    private destroy$ = new Subject<void>();

    constructor(private stripeService: StripeService) { }

    ngOnInit(): void {
        this.initializeStripeProducts();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['selectedCompany'] && changes['selectedCompany'].currentValue) {
            this.initializeStripeProducts();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ============================================================================
    // STRIPE ADD-ON CATEGORIZATION METHODS
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
                this.categorizeAddonProducts();
                this.isLoadingStripeProducts = false;
            });
    }

    // Main categorization method for add-ons
    private categorizeAddonProducts(): void {
        this.addonProducts = [];

        // Process each product and categorize it
        this.stripeProducts.forEach(product => {
            const categorizedProduct = this.categorizeStripeProduct(product, this.stripePrices);
            if (categorizedProduct) {
                this.addonProducts.push(categorizedProduct);
            }
        });

        console.log('Categorized add-on products:', this.addonProducts.length);
    }

    // Categorize a single Stripe product as add-on
    private categorizeStripeProduct(product: StripeProduct, prices: StripePrice[]): AddonProduct | null {
        const productPrices = prices.filter(price => price.product === product.id);
        if (productPrices.length === 0) return null;

        const isAddOn = product.metadata?.['type'] === 'addon' || product.metadata?.['category'] === 'addon';

        if (isAddOn) {
            return this.convertToAddonProduct(product, productPrices);
        }

        return null;
    }

    // Convert Stripe product to AddonProduct
    private convertToAddonProduct(product: any, price: any): AddonProduct {
        const features = product.metadata?.features ?
            product.metadata.features.split(',').map((f: string) => f.trim()) : [];

        const compatibility = product.metadata?.compatibility ?
            product.metadata.compatibility.split(',').map((c: string) => c.trim()) : [];

        return {
            id: product.id,
            name: product.name,
            description: product.description,
            features: features,
            price: {
                id: price.id,
                unit_amount: price.unit_amount,
                recurring: price.recurring
            },
            compatibility: compatibility,
            active: product.active,
            isArchived: product.metadata?.archived === 'true',
            stripePriceId: price.id
        };
    }

    // Helper method to parse features from JSON string
    private parseFeatures(featuresStr: string | undefined): string[] {
        if (!featuresStr) return [];
        try {
            const parsed = JSON.parse(featuresStr);
            return Array.isArray(parsed) ? parsed : [featuresStr];
        } catch {
            return [featuresStr];
        }
    }

    // Getter for available add-on products
    get availableAddonProducts(): AddonProduct[] {
        return this.addonProducts.filter(addon => addon.active && !addon.isArchived);
    }

    // ============================================================================
    // ADD-ON SUBSCRIPTION CREATION METHODS
    // ============================================================================

    onCreateAddonSubscription(addon: AddonProduct): void {
        if (!addon.stripePriceId) {
            console.error('No price ID found for addon:', addon);
            return;
        }

        this.isCreatingSubscription = true;

        this.createStripeSubscriptionForCompany.emit({
            company: this.selectedCompany,
            priceId: addon.stripePriceId
        });

        // Reset loading state after a delay (parent component should handle success/error)
        setTimeout(() => {
            this.isCreatingSubscription = false;
        }, 3000);
    }

    onSetServiceManagementView(view: string): void {
        this.setServiceManagementView.emit(view);
    }

    onOpenServiceTemplateModal(template?: any): void {
        this.openServiceTemplateModal.emit(template);
    }

    onDeleteServiceTemplate(template: any): void {
        this.deleteServiceTemplate.emit(template);
    }

    onOpenAddAddonModal(): void {
        this.openAddAddonModal.emit();
    }

    onRemoveAddonFromCustomer(addon: any): void {
        this.removeAddonFromCustomer.emit(addon);
    }

    onOpenBulkServiceModal(type: string): void {
        this.openBulkServiceModal.emit(type);
    }

    getCategoryIcon(category: string): string {
        const icons: { [key: string]: string } = {
            'hosting': 'fa-server',
            'design': 'fa-palette',
            'marketing': 'fa-bullhorn',
            'analytics': 'fa-chart-bar',
            'security': 'fa-shield-alt',
            'custom': 'fa-cog'
        };
        return icons[category] || 'fa-cog';
    }

    getCategoryLabel(category: string): string {
        const labels: { [key: string]: string } = {
            'hosting': 'Hosting',
            'design': 'Design',
            'marketing': 'Marketing',
            'analytics': 'Analytics',
            'security': 'Security',
            'custom': 'Custom'
        };
        return labels[category] || 'Custom';
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    getActiveServicesCount(): number {
        return this.availableAddons.filter(addon => addon.isActive !== false).length;
    }

    getTotalServicesRevenue(): number {
        return this.serviceUsageStats.reduce((total, stat) => total + stat.monthlyRevenue, 0);
    }

    getAddonTotalCost(): number {
        return this.currentCustomerAddons.reduce((total, addon) =>
            total + (addon.monthlyPrice * addon.quantity), 0);
    }

    getTotalServiceRevenue(): number {
        return this.serviceUsageStats.reduce((total, stat) => total + stat.monthlyRevenue, 0);
    }

    getTotalActiveServices(): number {
        return this.serviceUsageStats.reduce((total, stat) => total + stat.totalCustomers, 0);
    }

    getMostPopularService(): any {
        if (this.serviceUsageStats.length === 0) return null;
        return this.serviceUsageStats.reduce((prev, current) =>
            (prev.totalCustomers > current.totalCustomers) ? prev : current);
    }

    getCompanyNameById(companyId: string): string {
        return 'Company'; // This should be replaced with actual company lookup
    }

    getServiceNameById(addonId: string): string {
        const addon = this.availableAddons.find(a => a.id === addonId);
        return addon ? addon.name : 'Unknown Service';
    }
}