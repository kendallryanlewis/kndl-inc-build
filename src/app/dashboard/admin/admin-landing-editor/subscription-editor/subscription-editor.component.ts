import { Component, OnInit, OnDestroy, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { StripeService, StripeProduct, StripePrice } from '../../../../services/stripe.service';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

// Updated interface to work primarily with Stripe data
export interface SubscriptionPlan {
  // Stripe IDs (primary identifiers)
  stripeProductId: string;
  stripeMonthlyPriceId?: string;
  stripeYearlyPriceId?: string;

  // Core plan info (from Stripe Product)
  name: string;
  description: string;
  active: boolean;

  // Pricing (from Stripe Prices)
  monthlyPrice: number;
  yearlyPrice?: number;
  currency: string;

  // Extended metadata (stored in Stripe metadata)
  features: string[];
  isPopular: boolean;
  maxUsers?: number;
  storageLimit?: string;
  supportLevel: 'Basic' | 'Priority' | 'Premium';
  trialDays?: number;
  category: 'Starter' | 'Business' | 'Enterprise';

  // Stripe timestamps
  created: Date;
  updated: Date;

  // Computed properties
  status: 'Active' | 'Inactive' | 'Deprecated';
  lastModified: string;
}

@Component({
  selector: 'app-subscription-editor',
  templateUrl: './subscription-editor.component.html',
  styleUrls: ['./subscription-editor.component.scss']
})
export class SubscriptionEditorComponent implements OnInit, OnDestroy {
  @Output() dataChange = new EventEmitter<any>();

  subscriptionPlans: SubscriptionPlan[] = [];
  selectedPlan: SubscriptionPlan | null = null;
  showPlanModal: boolean = false;
  showDeleteModal: boolean = false;
  deletingPlan: SubscriptionPlan | null = null;
  isDeleting: boolean = false;

  // Stripe integration properties
  stripeProducts: StripeProduct[] = [];
  stripePrices: StripePrice[] = [];
  syncingWithStripe = false;
  stripeSyncStatus: { [planId: string]: 'syncing' | 'synced' | 'error' } = {};
  private destroy$ = new Subject<void>();

  // Loading state
  isLoadingPlans: boolean = false;
  showSyncSection: boolean = false;
  // Message handling
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Development mode check
  get isUsingMockData(): boolean {
    return !environment.production && !environment.useRealFirebaseFunctions;
  }

  constructor(
    public stripeService: StripeService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadPlansFromStripe();
    this.initializeStripeData();

    // Log current state after a short delay to allow data loading
    setTimeout(() => {
      this.logCurrentStripeState();

      // Check if we received data, if not retry
      if (this.stripeProducts.length === 0 && this.stripePrices.length === 0) {
        this.manualDataLoad();
      }

      // Automatically run debug test to see what Firebase functions return
      this.debugFirebaseFunctions();
    }, 3000);

    // Additional check after more time
    setTimeout(() => {
      if (this.stripeProducts.length === 0 && this.stripePrices.length === 0) {
        this.stripeService.forceDataRefresh();
      }
    }, 5000);

    // Expose debug methods to global window object for console access
    if (typeof window !== 'undefined') {
      (window as any).debugSubscriptionEditor = {
        logState: () => this.logCurrentStripeState(),
        debugFunctions: () => this.debugFirebaseFunctions(),
        refreshData: () => this.refreshPlansFromStripe(),
        component: this
      };
      console.log('🛠️ DEBUG HELPER: Use window.debugSubscriptionEditor.* methods for debugging');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeStripeData(): void {
    this.stripeService.products$.pipe(take(1)).subscribe(products => {
      console.log('📦 Current products observable value:', products);
    });
    this.stripeService.prices$.pipe(take(1)).subscribe(prices => {
      console.log('💰 Current prices observable value:', prices);
    });

    // Initialize Stripe products and prices loading
    this.stripeService.initializeProductsAndPrices();

    // Subscribe to products separately
    this.stripeService.products$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          if (products && products.length === 0) {
            console.log('⚠️ Products observable emitted empty array - this indicates the Firebase function might not be returning data properly');
          }
        },
        error: (error) => {
          console.error('❌ ERROR in products observable:', error);
        }
      });

    // Subscribe to prices separately  
    this.stripeService.prices$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (prices) => {
          if (prices && prices.length === 0) {
            console.log('⚠️ Prices observable emitted empty array - this indicates the Firebase function might not be returning data properly');
          }
        },
        error: (error) => {
          console.error('❌ ERROR in prices observable:', error);
        }
      });

    // Subscribe to Stripe products and prices - combine both streams
    combineLatest([
      this.stripeService.products$,
      this.stripeService.prices$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([products, prices]) => {
        this.stripeProducts = Array.isArray(products) ? products : [];
        this.stripePrices = Array.isArray(prices) ? prices : [];

        this.buildSubscriptionPlansFromStripeData(this.stripeProducts, this.stripePrices);

        // Force change detection to update the UI
        this.cdr.detectChanges();
      });
  }

  // Load plans directly from Stripe data
  private loadPlansFromStripe(): void {
    this.isLoadingPlans = true;
    this.stripeService.initializeProductsAndPrices();
  }

  // Build subscription plans from Stripe products and prices
  private buildSubscriptionPlansFromStripeData(products: StripeProduct[], prices: StripePrice[]): void {
    // Prevent building plans if we're in the middle of a sync operation
    if (this.syncingWithStripe) {
      return;
    }

    // Ensure we have arrays to work with
    const safeProducts = Array.isArray(products) ? products : [];
    const safePrices = Array.isArray(prices) ? prices : [];
    this.subscriptionPlans = safeProducts.map(product => this.convertStripeProductToPlan(product, safePrices));
    this.isLoadingPlans = false;
  }

  // Helper method to log current stripe data state
  logCurrentStripeState(): void {
    if (this.subscriptionPlans.length > 0) {
      this.subscriptionPlans.forEach((plan, index) => {
        console.log(`  ${index + 1}. ${plan.name} - $${plan.monthlyPrice}/month (${plan.status})`);
      });
    }
  }

  toggleSyncSection(): void {
    this.showSyncSection = !this.showSyncSection;
  }

  // Manual data loading method to force data retrieval
  async manualDataLoad(): Promise<void> {
    try {
      // Manually get data from BehaviorSubjects current values
      const currentProducts = this.stripeService.products$.pipe(take(1)).toPromise();
      const currentPrices = this.stripeService.prices$.pipe(take(1)).toPromise();

      const [products, prices] = await Promise.all([currentProducts, currentPrices]);
      if (products && products.length > 0) {
        this.stripeProducts = products;
      }

      if (prices && prices.length > 0) {
        this.stripePrices = prices;
      }

      // Force rebuild with any data we got
      this.buildSubscriptionPlansFromStripeData(this.stripeProducts, this.stripePrices);
      this.cdr.detectChanges();

    } catch (error) {
      console.error('❌ Error in manual data load:', error);
    }
  }

  // Debug method to manually test Firebase functions
  async debugFirebaseFunctions(): Promise<void> {
    try {
      await this.stripeService.debugFirebaseFunctions();

      // Test connection first
      const connectionResult = await this.stripeService.testStripeConnection().toPromise();

      // Test the products function directly
      const productsResult = await this.stripeService.getProducts().toPromise();

      // Test the prices function directly
      const pricesResult = await this.stripeService.getPrices().toPromise();

      // Force re-initialize
      this.stripeService.initializeProductsAndPrices();

    } catch (error: any) {
      console.error('❌ Error in manual Firebase function test:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
    }
  }

  // Convert Stripe product + prices to SubscriptionPlan
  private convertStripeProductToPlan(product: StripeProduct, prices: StripePrice[]): SubscriptionPlan {
    // Find prices for this product - ensure prices is an array
    const safePrices = Array.isArray(prices) ? prices : [];
    const productPrices = safePrices.filter(price => price.product === product.id);
    const monthlyPrice = productPrices.find(p => p.recurring?.interval === 'month');
    const yearlyPrice = productPrices.find(p => p.recurring?.interval === 'year');

    // Parse metadata back to structured data
    const metadata = product.metadata || {};

    return {
      // Stripe identifiers
      stripeProductId: product.id,
      stripeMonthlyPriceId: monthlyPrice?.id,
      stripeYearlyPriceId: yearlyPrice?.id,

      // Core info
      name: product.name,
      description: product.description || '',
      active: product.active,

      // Pricing
      monthlyPrice: monthlyPrice ? monthlyPrice.unit_amount / 100 : 0,
      yearlyPrice: yearlyPrice ? yearlyPrice.unit_amount / 100 : undefined,
      currency: monthlyPrice?.currency || 'usd',

      // Extended metadata
      features: this.parseJsonMetadata(metadata['features'], ['']),
      isPopular: metadata['isPopular'] === 'true',
      maxUsers: metadata['maxUsers'] ? parseInt(metadata['maxUsers']) : undefined,
      storageLimit: metadata['storageLimit'] || undefined,
      supportLevel: (metadata['supportLevel'] as any) || 'Basic',
      trialDays: metadata['trialDays'] ? parseInt(metadata['trialDays']) : undefined,
      category: (metadata['category'] as any) || 'Business',

      // Timestamps
      created: new Date(product.created * 1000),
      updated: new Date(product.updated * 1000),

      // Computed
      status: product.active ? 'Active' : 'Inactive',
      lastModified: new Date(product.updated * 1000).toISOString().split('T')[0]
    };
  }

  // Helper to safely parse JSON from metadata
  private parseJsonMetadata(jsonString: string, defaultValue: any): any {
    try {
      return jsonString ? JSON.parse(jsonString) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  // Refresh plans from Stripe
  async refreshPlansFromStripe(): Promise<void> {
    try {
      // Removed debug logs for production
      // Don't set isLoadingPlans here if we're already syncing
      if (!this.syncingWithStripe) {
        this.isLoadingPlans = true;
      }

      // Re-initialize to get fresh data
      this.stripeService.initializeProductsAndPrices();

      // Wait for the data to be fetched (shorter timeout to avoid hanging)
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error('❌ ERROR DURING REFRESH: Error refreshing plans from Stripe:', error);
    } finally {
      // Always reset loading state when not syncing
      if (!this.syncingWithStripe) {
        this.isLoadingPlans = false;
      }
    }
  }
  // Modal Management
  openPlanModal = (plan?: SubscriptionPlan) => {
    // Clear any previous messages
    this.errorMessage = null;
    this.successMessage = null;

    if (plan) {
      // Editing existing plan
      this.selectedPlan = { ...plan };
    } else {
      // Creating new plan
      this.selectedPlan = {
        stripeProductId: '', // Will be set when created
        name: '',
        description: '',
        active: true,
        monthlyPrice: 0,
        currency: 'usd',
        features: [''],
        isPopular: false,
        supportLevel: 'Basic',
        category: 'Business',
        created: new Date(),
        updated: new Date(),
        status: 'Active',
        lastModified: new Date().toISOString().split('T')[0]
      } as SubscriptionPlan;
    }

    // Force modal to show and trigger change detection
    this.showPlanModal = true;
    this.cdr.detectChanges();
  }

  closePlanModal(): void {
    // Force the modal to close immediately
    this.showPlanModal = false;

    // Clear any messages when closing modal
    this.errorMessage = null;
    this.successMessage = null;

    // Reset sync flags to prevent hanging states
    this.syncingWithStripe = false;
    this.isLoadingPlans = false;

    // Force change detection to ensure UI updates immediately
    this.cdr.detectChanges();

    // Clear selected plan after a short delay to ensure smooth transition
    setTimeout(() => {
      this.selectedPlan = null;
      this.cdr.detectChanges();
    }, 100);
  }

  openDeleteModal(plan: SubscriptionPlan): void {
    this.deletingPlan = plan;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deletingPlan = null;
  }

  // Plan Management - Now working with Stripe directly
  async savePlan(): Promise<void> {
    if (!this.selectedPlan) return;

    // Clear previous messages
    this.errorMessage = null;
    this.successMessage = null;

    try {
      this.syncingWithStripe = true;
      const isUpdate = !!this.selectedPlan.stripeProductId;
      const planName = this.selectedPlan.name;

      if (isUpdate) {
        await this.updateStripeProduct(this.selectedPlan);
      } else {
        await this.createStripeProduct(this.selectedPlan);
      }

      // Wait for the data refresh to complete
      await this.refreshPlansFromStripe();

      // Show success message
      this.successMessage = isUpdate
        ? `Plan "${planName}" updated successfully!`
        : `Plan "${planName}" created successfully!`;

      // Close modal after a short delay to show success message
      setTimeout(() => {
        this.closePlanModal();
      }, 1500);

    } catch (error: any) {
      // Only keep error logging, remove debug logs
      console.error('❌ Error saving plan:', error);

      // Extract user-friendly error message
      let errorMsg = 'An unexpected error occurred while saving the plan.';

      if (error.message) {
        if (error.message.includes('validation failed') || error.message.includes('Validation failed')) {
          errorMsg = error.message;
        } else if (error.message.includes('999999')) {
          errorMsg = 'Price exceeds the maximum allowed limit ($999,999.99).';
        } else if (error.message.includes('unit_amount')) {
          errorMsg = 'Invalid price amount. Please check the price and try again.';
        } else {
          errorMsg = `Error: ${error.message}`;
        }
      }

      this.errorMessage = errorMsg;

      // Close modal after showing error for a few seconds
      setTimeout(() => {
        this.closePlanModal();
      }, 3000);

    } finally {
      // Always reset the syncing flag
      this.syncingWithStripe = false;
      this.isLoadingPlans = false;
    }
  }

  // Save plan with Stripe sync (same as savePlan now)
  async savePlanWithStripeSync(): Promise<void> {
    await this.savePlan();
  }

  // Create new product in Stripe
  private async createStripeProduct(plan: SubscriptionPlan): Promise<void> {
    try {
      const unitAmount = Math.round(plan.monthlyPrice * 100);

      // Validate data before sending to Stripe
      const validation = this.stripeService.validateStripeProductData({
        name: plan.name,
        description: plan.description,
        unitAmount: unitAmount,
        currency: plan.currency,
        interval: 'month'
      });

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const result = await this.stripeService.createProductWithPrice({
        name: plan.name,
        description: plan.description,
        unitAmount: unitAmount,
        currency: plan.currency,
        interval: 'month',
        trialDays: plan.trialDays,
        metadata: {
          features: JSON.stringify(plan.features),
          isPopular: plan.isPopular.toString(),
          maxUsers: plan.maxUsers?.toString() || '',
          storageLimit: plan.storageLimit || '',
          supportLevel: plan.supportLevel,
          trialDays: plan.trialDays?.toString() || '',
          category: plan.category
        }
      }).toPromise();
    } catch (error) {
      // Only keep error logging, remove debug logs
      console.error('❌ Error creating plan in Stripe:', error);
      throw error;
    }
  }

  // Update existing product in Stripe
  private async updateStripeProduct(plan: SubscriptionPlan): Promise<void> {
    if (!plan.stripeProductId) return;

    try {
      await this.stripeService.updateProduct(plan.stripeProductId, {
        name: plan.name,
        description: plan.description,
        active: plan.active,
        metadata: {
          features: JSON.stringify(plan.features),
          isPopular: plan.isPopular.toString(),
          maxUsers: plan.maxUsers?.toString() || '',
          storageLimit: plan.storageLimit || '',
          supportLevel: plan.supportLevel,
          trialDays: plan.trialDays?.toString() || '',
          category: plan.category
        }
      }).toPromise();

      // Handle price updates if needed
      const currentPrice = Array.isArray(this.stripePrices)
        ? this.stripePrices.find(p => p.id === plan.stripeMonthlyPriceId)
        : undefined;
      const newPriceAmount = Math.round(plan.monthlyPrice * 100);

      if (currentPrice && currentPrice.unit_amount !== newPriceAmount) {
        // Archive old price and create new one
        if (plan.stripeMonthlyPriceId) {
          await this.stripeService.archivePrice(plan.stripeMonthlyPriceId).toPromise();
        }

        // Validate price data before creating
        const priceValidation = this.stripeService.validateStripeProductData({
          name: `${plan.name} - Monthly`,
          unitAmount: newPriceAmount,
          currency: plan.currency
        });

        if (!priceValidation.isValid) {
          throw new Error(`Price validation failed: ${priceValidation.errors.join(', ')}`);
        }

        const newPrice = await this.stripeService.createPrice({
          productId: plan.stripeProductId,
          unitAmount: newPriceAmount,
          currency: plan.currency,
          recurring: { interval: 'month' },
          nickname: `${plan.name} - Monthly`
        }).toPromise();
      }
    } catch (error) {
      // Only keep error logging, remove debug logs
      console.error('❌ Error updating plan in Stripe:', error);
      throw error;
    }
  }

  // Delete plan from Stripe
  async deletePlan(): Promise<void> {
    if (!this.deletingPlan) return;

    try {
      this.isDeleting = true;

      if (this.deletingPlan.stripeProductId) {
        // Archive the product in Stripe (safer than deletion)
        await this.stripeService.archiveProduct(this.deletingPlan.stripeProductId).toPromise();
      }

      this.closeDeleteModal();
      await this.refreshPlansFromStripe();

    } catch (error) {
      console.error('❌ Error deleting plan:', error);
    } finally {
      this.isDeleting = false;
    }
  }

  // Toggle plan status
  async togglePlanStatus(plan: SubscriptionPlan): Promise<void> {
    try {
      const newStatus = plan.status === 'Active' ? 'Inactive' : 'Active';

      if (plan.stripeProductId) {
        await this.stripeService.updateProduct(plan.stripeProductId, {
          active: newStatus === 'Active'
        }).toPromise();
        await this.refreshPlansFromStripe();
      }
    } catch (error) {
      console.error('Error toggling plan status:', error);
    }
  }

  // Stripe sync methods
  async syncPlanWithStripe(plan: SubscriptionPlan): Promise<void> {
    // Since we're now using Stripe as primary source, this just refreshes data
    await this.refreshPlansFromStripe();
  }

  async syncAllPlansWithStripe(): Promise<void> {
    await this.refreshPlansFromStripe();
  }

  // Utility methods
  addFeature(): void {
    if (this.selectedPlan) {
      this.selectedPlan.features.push('');
    }
  }

  removeFeature(index: number): void {
    if (this.selectedPlan && this.selectedPlan.features.length > 1) {
      this.selectedPlan.features.splice(index, 1);
    }
  }

  trackFeature(index: number, item: string): number {
    return index;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  // Helper methods for template
  getActivePricesCount(): number {
    if (!Array.isArray(this.stripePrices)) {
      return 0;
    }
    return this.stripePrices.filter(p => p?.active).length;
  }

  getSyncedPlansCount(): number {
    return this.subscriptionPlans.length; // All plans are now synced with Stripe
  }

  getCategoryClass(category: string): string {
    const classes = {
      'Starter': 'bg-info',
      'Business': 'bg-primary',
      'Enterprise': 'bg-warning text-dark'
    };
    return classes[category as keyof typeof classes] || 'bg-secondary';
  }

  getStatusBadgeClass(status: string): string {
    const classes = {
      'Active': 'bg-success',
      'Inactive': 'bg-secondary',
      'Deprecated': 'bg-danger'
    };
    return classes[status as keyof typeof classes] || 'bg-secondary';
  }

  getSupportLevelIcon(level: string): string {
    const icons = {
      'Basic': 'fa-envelope',
      'Priority': 'fa-phone',
      'Premium': 'fa-headset'
    };
    return icons[level as keyof typeof icons] || 'fa-envelope';
  }

  // Stripe sync status methods
  getStripeSyncStatus(plan: SubscriptionPlan): string {
    return 'synced'; // All plans are now synced with Stripe
  }

  getStripeSyncIcon(plan: SubscriptionPlan): string {
    return 'fa-check-circle text-success';
  }

  openStripeProduct(productId: string): void {
    // Check if this is a mock product
    if (productId.startsWith('prod_mock_') || productId.startsWith('prod_sample_')) {
      alert(`🧪 Mock Product: ${productId}\n\nThis is a development mock product and doesn't exist in Stripe.\n\nTo see real Stripe products, set 'useRealFirebaseFunctions: true' in environment.ts`);
      return;
    }

    const mode = this.stripeService.isLiveMode() ? 'live' : 'test';
    const url = `https://dashboard.stripe.com/${mode}/products/${productId}`;
    window.open(url, '_blank');
  }
}