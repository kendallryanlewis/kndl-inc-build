import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { SubscriptionPlan } from '../admin-landing-editor.component';

@Component({
  selector: 'app-subscription-editor',
  templateUrl: './subscription-editor.component.html',
  styleUrls: ['./subscription-editor.component.scss']
})
export class SubscriptionEditorComponent implements OnInit, OnDestroy {
  // Input from parent admin-landing-editor
  @Input() subscriptionPlans: SubscriptionPlan[] = [];
  @Input() isLoading: boolean = false;
  @Output() dataChange = new EventEmitter<any>();
  @Output() toggleArchiveFilter = new EventEmitter<void>();
  filteredSubscriptionPlans: SubscriptionPlan[] = [];
  private destroy$ = new Subject<void>();

  // Modal and form properties
  showSubscriptionModal = false;
  showDeleteModal = false;
  selectedPlan: SubscriptionPlan | null = null;
  deletingPlan: SubscriptionPlan | null = null;
  syncingWithStripe = false;
  successMessage = '';
  errorMessage = '';
  showingArchivedPlans = false;

  ngOnInit(): void {
    this.filterSubscriptionPlans();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Modal Management
  openSubscriptionModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      // Edit existing plan
      this.selectedPlan = { ...plan };
    } else {
      // Create new plan
      this.selectedPlan = {
        stripeProductId: '',
        stripePriceId: '',
        name: '',
        description: '',
        active: true,
        price: 0,
        currency: 'usd',
        features: [''],
        isPopular: false,
        category: 'Business',
        created: new Date(),
        updated: new Date(),
        status: 'Active',
        lastModified: new Date().toISOString().split('T')[0],
        stripeMonthlyPriceId: '',
        stripeYearlyPriceId: '',
        monthlyPrice: 0,
        yearlyPrice: 0,
        maxUsers: 999999,
        storageLimit: '',
        supportLevel: 'Basic',
        trialDays: 0,
        planType: 'Business'
      } as SubscriptionPlan;
    }
    this.showSubscriptionModal = true;
    this.clearMessages();
  }

  closeSubscriptionModal(): void {
    this.showSubscriptionModal = false;
    this.selectedPlan = null;
    this.clearMessages();
  }

  confirmDeleteSubscription(plan: SubscriptionPlan): void {
    this.deletingPlan = plan;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deletingPlan = null;
  }

  // CRUD Operations
  async saveSubscription(): Promise<void> {
    if (!this.selectedPlan) return;

    this.syncingWithStripe = true;
    this.clearMessages();

    try {
      // Validate form
      if (!this.selectedPlan.name || !this.selectedPlan.description) {
        this.errorMessage = 'Please fill in all required fields (Name and Description)';
        return;
      }

      if (!this.selectedPlan.monthlyPrice && !this.selectedPlan.yearlyPrice) {
        this.errorMessage = 'Please enter at least a monthly or yearly price';
        return;
      }

      // Clean up features array
      this.selectedPlan.features = this.selectedPlan.features.filter(f => f.trim() !== '');
      if (this.selectedPlan.features.length === 0) {
        this.selectedPlan.features = [''];
      }

      // Update timestamp
      this.selectedPlan.updated = new Date();
      this.selectedPlan.lastModified = new Date().toISOString().split('T')[0];

      // Emit save request to parent
      const isUpdate = !!this.selectedPlan.stripeProductId;
      this.dataChange.emit({
        action: isUpdate ? 'update' : 'create',
        type: 'subscription',
        data: this.selectedPlan
      });

      this.successMessage = isUpdate ? 'Subscription plan updated successfully!' : 'Subscription plan created successfully!';

      // Close modal after short delay to show success message
      setTimeout(() => {
        this.filterSubscriptionPlans();
        this.closeSubscriptionModal();
      }, 1500);

    } catch (error) {
      console.error('Error saving subscription plan:', error);
      this.errorMessage = 'Failed to save subscription plan. Please try again.';
    } finally {
      this.syncingWithStripe = false;
    }
  }

  async deleteSubscription(): Promise<void> {
    if (!this.deletingPlan) return;

    this.syncingWithStripe = true;
    this.clearMessages();

    try {
      // Validate that the plan has a Stripe Product ID
      if (!this.deletingPlan.stripeProductId) {
        this.errorMessage = 'Cannot delete plan: Missing Stripe Product ID. This plan may not be synced with Stripe.';
        return;
      }

      console.log('🗑️ Starting deletion for plan:', this.deletingPlan.name, 'with Stripe ID:', this.deletingPlan.stripeProductId);

      // Store the plan name before closing modal (since closeDeleteModal sets deletingPlan to null)
      const planName = this.deletingPlan.name;

      // Emit delete request to parent
      this.dataChange.emit({
        action: 'delete',
        type: 'subscription',
        data: this.deletingPlan
      });

      // Wait a bit longer for the operation to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      this.closeDeleteModal();
      this.successMessage = `Subscription plan "${planName}" has been deactivated successfully.`;

      // Clear success message after delay
      setTimeout(() => {
        this.successMessage = '';
        this.filterSubscriptionPlans();
      }, 5000);

    } catch (error) {
      console.error('Error deleting subscription plan:', error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('No Stripe Product ID')) {
          this.errorMessage = 'Cannot delete plan: Plan is not properly synced with Stripe.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          this.errorMessage = 'Network error: Please check your connection and try again.';
        } else {
          this.errorMessage = `Delete failed: ${error.message}`;
        }
      } else {
        this.errorMessage = 'Failed to delete subscription plan. Please try again or contact support.';
      }
    } finally {
      this.syncingWithStripe = false;
    }
  }

  // Method to get the toggle button text
  get toggleButtonText(): string {
    return this.showingArchivedPlans ? 'Hide Subscription Archives' : 'Show All Subscriptions';
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
      this.filteredSubscriptionPlans = this.subscriptionPlans;
    } else {
      // Show only non-archived plans
      this.filteredSubscriptionPlans = this.subscriptionPlans.filter(plan => !plan.isArchived);
    }
  }

  // Method to get the current filter status
  get currentFilterStatus(): string {
    const activeCount = this.subscriptionPlans.filter(plan => !plan.isArchived).length;
    const totalCount = this.subscriptionPlans.length;
    const archivedCount = totalCount - activeCount;

    return this.showingArchivedPlans
      ? `Showing all ${totalCount} plans (${archivedCount} archived)`
      : `Showing ${activeCount} active plans`;
  }

  // Event handlers for subscription card interactions
  onEditPlan(product: any): void {
    const plan = product as SubscriptionPlan;
    this.openSubscriptionModal(plan);
  }

  onDeletePlan(product: any): void {
    const plan = product as SubscriptionPlan;
    this.confirmDeleteSubscription(plan);
  }

  onToggleStatus(product: any): void {
    const plan = product as SubscriptionPlan;

    // Handle archive/unarchive functionality based on current status
    if (plan.isArchived) {
      this.recyclePlan(plan);
    } else {
      this.archivePlan(plan);
    }
    this.filterSubscriptionPlans();
  }

  // Get custom actions for subscription plan cards
  getSubscriptionActions(plan: SubscriptionPlan): any[] {
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
    const plan = product as SubscriptionPlan;

    switch (action) {
      case 'archive':
        this.archivePlan(plan);
        break;
      case 'recycle':
        this.recyclePlan(plan);
        break;
      case 'delete':
        this.onDeletePlan(plan);
        break;
      case 'toggleStatus':
        this.onToggleStatus(plan);
        break;
      default:
        console.warn('Unknown action:', action);
    }

  }

  // Archive subscription plan with data sanitization
  async archivePlan(plan: SubscriptionPlan): Promise<void> {
    try {
      // Create a clean copy and sanitize data
      let cleanedPlan = {
        ...plan,
        isArchived: !plan.isArchived,
        status: plan.isArchived ? 'Active' : 'Deprecated' // Set proper status for archive/unarchive
      };

      // Handle corrupted fields using sanitization (similar to addons)
      cleanedPlan.features = this.sanitizeArrayField(plan.features, 'features', []);

      this.dataChange.emit({
        action: 'archive',
        type: 'subscription',
        data: cleanedPlan
      });
      this.filterSubscriptionPlans();
    } catch (error) {
      console.error('❌ Error archiving subscription plan:', error);
    }
  }

  // Restore archived subscription plan with data sanitization
  async recyclePlan(plan: SubscriptionPlan): Promise<void> {
    try {
      // Create a clean copy and reset any corrupted data
      let cleanedPlan = {
        ...plan,
        isArchived: false,
        status: 'Active' // Explicitly set status to Active for unarchiving
      };

      // Handle corrupted features field
      cleanedPlan.features = this.sanitizeArrayField(plan.features, 'features', ['Enhanced features']);

      this.dataChange.emit({
        action: 'archive',
        type: 'subscription',
        data: cleanedPlan
      });
      this.filterSubscriptionPlans();
    } catch (error) {
      console.error('❌ Error restoring subscription plan:', error);
    }
  }

  // Utility method to sanitize array fields (similar to addons editor)
  private sanitizeArrayField(value: any, fieldName: string, defaultValue: string[] = []): string[] {
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

    console.log(`🔄 Using default value for ${fieldName}`);
    return defaultValue;
  }

  // Feature Management
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

  // Utility methods
  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  // Getter for displaying unlimited users
  get maxUsersDisplay(): string {
    if (!this.selectedPlan || !this.selectedPlan.maxUsers) return 'Unlimited';
    return this.selectedPlan.maxUsers >= 999999 ? 'Unlimited' : this.selectedPlan.maxUsers.toString();
  }
}
