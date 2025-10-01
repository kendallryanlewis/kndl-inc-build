import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { StripeService, StripeProduct, StripePrice } from '../../../../services/stripe.service';
import { forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';

interface ServicePlan {
  id?: string; // Optional for new plans
  stripeProductId?: string; // Stripe Product ID
  stripePriceId?: string; // Stripe Price ID
  name: string;
  description: string;
  monthlyPrice: number; // This will be the one-time price
  features: string[];
  status: 'Active' | 'Inactive' | 'Deprecated';
  lastModified?: string;
  isPopular?: boolean;
  totalSubscriptions?: number;
  monthlyRevenue?: number;
  isArchived?: boolean;
}

@Component({
  selector: 'app-service-plans-editor',
  templateUrl: './service-plans-editor.component.html',
  styleUrls: ['./service-plans-editor.component.scss']
})
export class ServicePlansEditorComponent implements OnInit {
  @Output() dataChange = new EventEmitter<any>();

  // Input from parent admin-landing-editor
  @Input() oneTimeProducts: any[] = [];
  @Input() isLoading: boolean = false;

  showServicePlanModal: boolean = false;
  showDeleteModal: boolean = false;
  selectedServicePlan: ServicePlan | null = null;
  deletingPlan: ServicePlan | null = null;
  syncingWithStripe: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  showingArchivedPlans: boolean = false;
  filteredServicePlans: ServicePlan[] = [];

  // Development mode check
  get isTestMode(): boolean {
    return !environment.production && !environment.useRealFirebaseFunctions;
  }

  constructor(private stripeService: StripeService) { }

  ngOnInit(): void {
    this.filterSubscriptionPlans();
  }

  // Method to get the toggle button text
  get toggleButtonText(): string {
    return this.showingArchivedPlans ? 'Hide Archived Services' : 'Show All Services';
  }
  // Toggle between showing all plans and only active (non-archived) plans
  toggleArchivedPlans(): void {
    this.showingArchivedPlans = !this.showingArchivedPlans;
    this.filterSubscriptionPlans();
  }

  // Filter subscription plans based on archive status
  private filterSubscriptionPlans(): void {
    if (this.showingArchivedPlans) {
      // Show all plans (including archived)
      this.filteredServicePlans = this.oneTimeProducts;
    } else {
      // Show only non-archived plans
      this.filteredServicePlans = this.oneTimeProducts.filter(plan => !plan.isArchived);
    }
  }

  // Method to get the current filter status
  get currentFilterStatus(): string {
    const activeCount = this.oneTimeProducts.filter(plan => !plan.isArchived).length;
    const totalCount = this.oneTimeProducts.length;
    const archivedCount = totalCount - activeCount;

    return this.showingArchivedPlans
      ? `Showing all ${totalCount} plans (${archivedCount} archived)`
      : `Showing ${activeCount} active plans`;
  }

  openServicePlanModal = (servicePlan?: ServicePlan): void => {
    if (servicePlan) {
      this.selectedServicePlan = { ...servicePlan };
    } else {
      this.selectedServicePlan = {
        name: '',
        description: '',
        monthlyPrice: 0,
        features: [''],
        status: 'Active',
        lastModified: new Date().toISOString().split('T')[0],
        isPopular: false,
        totalSubscriptions: 0,
        monthlyRevenue: 0
      };
    }
    this.showServicePlanModal = true;
    this.successMessage = '';
    this.errorMessage = '';
  }

  closeServicePlanModal(): void {
    this.showServicePlanModal = false;
    this.selectedServicePlan = null;
  }

  async saveServicePlan() {
    if (!this.selectedServicePlan) return;

    this.syncingWithStripe = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // Validate price amount - Stripe's maximum is $999,999.99 (99,999,999 cents)
      const maxPrice = 999999.99;
      if (this.selectedServicePlan.monthlyPrice > maxPrice) {
        this.errorMessage = `Price cannot exceed $${maxPrice.toLocaleString()}. Please enter a smaller amount.`;
        this.syncingWithStripe = false;
        return;
      }

      const unitAmount = Math.round(this.selectedServicePlan.monthlyPrice * 100);

      const servicePlanData = {
        name: this.selectedServicePlan.name,
        description: this.selectedServicePlan.description,
        unitAmount: unitAmount,
        currency: 'usd',
        metadata: {
          type: 'service-plan',
          category: 'service-plan', // Additional identifier
          isAddOn: 'false', // Explicitly mark as not an add-on
          paymentType: 'one-time', // Explicitly mark as one-time payment
          features: JSON.stringify(this.selectedServicePlan.features),
          status: this.selectedServicePlan.status,
          isPopular: this.selectedServicePlan.isPopular?.toString() || 'false',
          totalSubscriptions: this.selectedServicePlan.totalSubscriptions?.toString() || '0',
          monthlyRevenue: this.selectedServicePlan.monthlyRevenue?.toString() || '0',
          lastModified: new Date().toISOString().split('T')[0]
        }
      };

      if (this.selectedServicePlan.stripeProductId) {
        // Update existing product and price
        const updateProductData = {
          name: servicePlanData.name,
          description: servicePlanData.description,
          active: this.selectedServicePlan.status === 'Active',
          metadata: servicePlanData.metadata
        };

        await this.stripeService.updateProduct(this.selectedServicePlan.stripeProductId, updateProductData).toPromise();

        // Note: Stripe doesn't allow updating price amounts, so we'd need to create a new price if amount changed
        // For now, we'll just update the product metadata
        this.successMessage = 'Service plan updated successfully in Stripe!';

        // Close modal and reload data on success
        this.closeServicePlanModal();
      } else {
        const productResult = await this.stripeService.createProduct({
          name: servicePlanData.name,
          description: servicePlanData.description,
          active: this.selectedServicePlan.status === 'Active',
          metadata: servicePlanData.metadata
        }).toPromise();
        // Handle both possible result structures: direct product or wrapped in data
        const product = (productResult as any)?.data || productResult;
        if (product && product.id) {
          // Create a one-time price for the product
          const priceData = {
            productId: product.id,
            unitAmount: servicePlanData.unitAmount,
            currency: servicePlanData.currency,
            nickname: `${servicePlanData.name} - One-time Payment`
            // Note: No recurring property means one-time payment
            // Note: Environment is automatically added by StripeService
          };
          // Add a timestamp for timing
          const startTime = Date.now();

          try {
            const priceResult = await this.stripeService.createPrice(priceData).toPromise();
            const endTime = Date.now();

            // Handle wrapped response format from Firebase Functions
            const price = (priceResult as any)?.data || priceResult;
            if (price && price.id) {
              this.successMessage = 'Service plan created successfully in Stripe!';

              // Close modal and reload data on success
              this.closeServicePlanModal();

              // Add a small delay to ensure Stripe has processed the new data  
              setTimeout(async () => {
                // Force reload of products and prices from Stripe
                await this.stripeService.initializeProductsAndPrices();
                this.filterSubscriptionPlans();
              }, 500);
            } else {
              console.error('❌ Price creation returned unexpected result:', priceResult);
              console.error('❌ Extracted price object:', price);
              this.errorMessage = 'Product created but failed to create price. Please try again.';
            }
          } catch (priceError: any) {

            // Log the full error structure
            if (priceError) {
              console.error('❌ Full error structure:', JSON.stringify(priceError, null, 2));
            }

            let errorMsg = 'Product created but price creation failed';
            if (priceError?.error?.message) {
              errorMsg += `: ${priceError.error.message}`;
              console.error('❌ Stripe error message:', priceError.error.message);
            } else if (priceError?.message) {
              errorMsg += `: ${priceError.message}`;
              console.error('❌ General error message:', priceError.message);
            } else {
              errorMsg += `: ${JSON.stringify(priceError)}`;
            }

            this.errorMessage = errorMsg;
          }
        } else {
          this.errorMessage = 'Failed to create product in Stripe. Please try again.';
        }
      }

    } catch (error) {
      console.error('Error saving service plan to Stripe:', error);
      this.errorMessage = `Error saving service plan: ${error}`;
    } finally {
      this.syncingWithStripe = false;
    }
  }

  confirmDeleteServicePlan(plan: ServicePlan): void {
    this.deletingPlan = plan;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deletingPlan = null;
  }

  async deleteServicePlan() {
    if (!this.deletingPlan?.stripeProductId) return;

    try {
      // Archive the product in Stripe (safer than deletion)
      await this.stripeService.archiveProduct(this.deletingPlan.stripeProductId).toPromise();
      this.filterSubscriptionPlans();
      this.closeDeleteModal();
    } catch (error) {
      console.error('Error archiving service plan in Stripe:', error);
    }
  }

  async toggleServicePlanStatus(plan: ServicePlan) {
    // Handle archive/unarchive functionality based on current status
    if (plan.isArchived) {
      this.recycleServicePlan(plan);
    } else {
      this.archiveServicePlan(plan);
    }
    this.filterSubscriptionPlans();
  }

  // Get custom actions for service plan cards
  getServicePlanActions(plan: ServicePlan): any[] {
    if (plan.isArchived) {
      // For archived items: show recycle button only
      return [
        {
          action: 'recycle',
          label: 'Restore',
          icon: 'fa-recycle',
          class: 'bg-info bg-opacity-25 text-info border-info border',
          disabled: false
        }
      ];
    } else {
      // For active items: show archive button only  
      return [
        {
          action: 'archive',
          label: 'Archive',
          icon: 'fa-archive',
          class: 'bg-danger bg-opacity-25 text-danger border-danger border',
          disabled: false
        }
      ];
    }
  }
  // Handle custom action clicks
  onCustomAction(event: { action: string, product: any }): void {
    const { action, product } = event;
    const plan = product as ServicePlan;

    switch (action) {
      case 'archive':
        this.archiveServicePlan(plan);
        break;
      case 'recycle':
        this.recycleServicePlan(plan);
        break;
      case 'delete':
        this.confirmDeleteServicePlan(plan);
        break;
      case 'toggleStatus':
        this.toggleServicePlanStatus(plan);
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }

  // Archive service plan with data sanitization and direct Stripe update
  async archiveServicePlan(plan: ServicePlan): Promise<void> {
    if (!plan.stripeProductId) return;

    try {
      // Sanitize data
      const cleanFeatures = this.sanitizeArrayField(plan.features, 'features', []);
      const newStatus = 'Deprecated';

      await this.stripeService.updateProduct(plan.stripeProductId, {
        active: false,
        metadata: {
          type: 'service-plan',
          features: JSON.stringify(cleanFeatures),
          status: newStatus,
          isPopular: plan.isPopular?.toString() || 'false',
          totalSubscriptions: plan.totalSubscriptions?.toString() || '0',
          monthlyRevenue: plan.monthlyRevenue?.toString() || '0',
          lastModified: new Date().toISOString().split('T')[0]
        }
      }).toPromise();

      // Refresh the products list
      setTimeout(async () => {
        await this.stripeService.initializeProductsAndPrices();
        // The parent component will automatically update the data
        this.filterSubscriptionPlans();
      }, 500);

    } catch (error) {
      console.error('❌ Error archiving service plan:', error);
      this.errorMessage = 'Failed to archive service plan. Please try again.';
    }
  }

  // Restore archived service plan with data sanitization and direct Stripe update
  async recycleServicePlan(plan: ServicePlan): Promise<void> {
    if (!plan.stripeProductId) return;

    try {
      console.log('♻️ Recycling service plan:', plan.name);

      // Sanitize data
      const cleanFeatures = this.sanitizeArrayField(plan.features, 'features', ['Enhanced service features']);
      const newStatus = 'Active';

      await this.stripeService.updateProduct(plan.stripeProductId, {
        active: true,
        metadata: {
          type: 'service-plan',
          features: JSON.stringify(cleanFeatures),
          status: newStatus,
          isPopular: plan.isPopular?.toString() || 'false',
          totalSubscriptions: plan.totalSubscriptions?.toString() || '0',
          monthlyRevenue: plan.monthlyRevenue?.toString() || '0',
          lastModified: new Date().toISOString().split('T')[0]
        }
      }).toPromise();

      // Refresh the products list
      setTimeout(async () => {
        await this.stripeService.initializeProductsAndPrices();
        // The parent component will automatically update the data
        this.filterSubscriptionPlans();
      }, 500);

    } catch (error) {
      console.error('❌ Error restoring service plan:', error);
      this.errorMessage = 'Failed to restore service plan. Please try again.';
    }
  }

  // Utility method to sanitize array fields (similar to other editors)
  private sanitizeArrayField(value: any, fieldName: string, defaultValue: string[] = []): string[] {
    console.log(`🔧 Sanitizing ${fieldName}:`, typeof value, value?.toString().substring(0, 100) + '...');

    if (Array.isArray(value)) {
      // Filter out corrupted elements
      const cleanArray = value.filter(item => {
        if (typeof item === 'string') {
          // Check for corruption patterns
          if (item.includes('\\\\') || item.includes('["[') || item.includes('[\"[') || item.length > 100) {
            return false;
          }
          return item.trim().length > 0;
        }
        return false;
      });

      return cleanArray.length > 0 ? cleanArray : defaultValue;
    }

    if (typeof value === 'string') {
      // Check for severe corruption patterns
      if (value.includes('\\\\\\\\') || value.includes('["[') || value.includes('[\"[') ||
        value.includes('\\\\\\\"') || value.length > 500) {
        return defaultValue;
      }

      // Attempt parsing for simple JSON
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => typeof item === 'string' && item.length < 100);
        }
      } catch (e) {
        // If not JSON, treat as single string
        if (value.length < 100 && !value.startsWith('[')) {
          return [value];
        }
      }
    }

    return defaultValue;
  }

  // Feature management methods
  addFeature(): void {
    if (this.selectedServicePlan) {
      this.selectedServicePlan.features.push('');
    }
  }

  removeFeature(index: number): void {
    if (this.selectedServicePlan) {
      this.selectedServicePlan.features.splice(index, 1);
    }
  }

  trackFeature(index: number, feature: string): number {
    return index;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Active':
        return 'text-success';
      case 'Inactive':
        return 'text-warning';
      case 'Deprecated':
        return 'text-danger';
      default:
        return 'text-muted';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Active':
        return 'bi-check-circle-fill';
      case 'Inactive':
        return 'bi-pause-circle-fill';
      case 'Deprecated':
        return 'bi-x-circle-fill';
      default:
        return 'bi-question-circle-fill';
    }
  }

  openStripeProduct(stripeProductId: string): void {
    const mode = this.stripeService.isLiveMode() ? 'live' : 'test';
    const url = `https://dashboard.stripe.com/${mode}/products/${stripeProductId}`;
    window.open(url, '_blank');
  }
}
