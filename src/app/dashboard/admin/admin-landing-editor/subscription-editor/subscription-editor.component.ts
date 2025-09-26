import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  isPopular: boolean;
  status: 'Active' | 'Inactive' | 'Deprecated';
  maxUsers?: number;
  storageLimit?: string;
  supportLevel: 'Basic' | 'Priority' | 'Premium';
  trialDays?: number;
  category: 'Starter' | 'Business' | 'Enterprise';
  lastModified: string;
}

@Component({
  selector: 'app-subscription-editor',
  templateUrl: './subscription-editor.component.html',
  styleUrls: ['./subscription-editor.component.scss']
})
export class SubscriptionEditorComponent implements OnInit {
  @Output() dataChange = new EventEmitter<any>();

  subscriptionPlans: SubscriptionPlan[] = [];
  selectedPlan: SubscriptionPlan | null = null;
  showPlanModal: boolean = false;
  showDeleteModal: boolean = false;
  deletingPlan: SubscriptionPlan | null = null;
  isDeleting: boolean = false;

  // Firebase
  private firestore = getFirestore();
  private plansCollection = 'subscriptionPlans';

  ngOnInit(): void {
    this.loadSubscriptionPlans();
  }

  async loadSubscriptionPlans(): Promise<void> {
    try {
      const querySnapshot = await getDocs(collection(this.firestore, this.plansCollection));
      this.subscriptionPlans = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<SubscriptionPlan, 'id'>;
        const plan = {
          id: doc.id,
          ...data
        };

        // Debug logging for each plan loaded
        console.log('📄 Loaded plan:', plan.name, 'ID:', doc.id, 'Type:', typeof doc.id);

        this.subscriptionPlans.push(plan);
      });

      // Sort by category and name
      this.subscriptionPlans.sort((a, b) => {
        if (a.category !== b.category) {
          const categoryOrder = { 'Starter': 1, 'Business': 2, 'Enterprise': 3 };
          return categoryOrder[a.category] - categoryOrder[b.category];
        }
        return a.name.localeCompare(b.name);
      });

      console.log('✅ Loaded', this.subscriptionPlans.length, 'subscription plans');
      console.log('All plan IDs:', this.subscriptionPlans.map(p => ({ name: p.name, id: p.id })));

      // Emit data change for change tracking
      this.dataChange.emit({
        subscriptionPlans: this.subscriptionPlans,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error loading subscription plans:', error);
    }
  }

  // Subscription plan management methods
  openPlanModal(plan?: SubscriptionPlan): void {
    if (plan && plan.id) {
      // Editing existing plan - create a deep copy and ensure ID is preserved
      this.selectedPlan = {
        id: plan.id, // Explicitly preserve the ID
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        features: [...plan.features],
        isPopular: plan.isPopular,
        status: plan.status,
        maxUsers: plan.maxUsers,
        storageLimit: plan.storageLimit,
        supportLevel: plan.supportLevel,
        trialDays: plan.trialDays,
        category: plan.category,
        lastModified: plan.lastModified
      };
      console.log('Editing plan with ID:', plan.id, 'Selected plan:', this.selectedPlan);
    } else {
      // Creating new plan
      this.selectedPlan = {
        id: '', // Empty ID for new plans
        name: '',
        description: '',
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: [''],
        isPopular: false,
        status: 'Active',
        maxUsers: undefined,
        storageLimit: '',
        supportLevel: 'Basic',
        trialDays: 0,
        category: 'Starter',
        lastModified: new Date().toISOString()
      };
      console.log('Creating new plan');
    }
    this.showPlanModal = true;
  }

  closePlanModal(): void {
    this.showPlanModal = false;
    this.selectedPlan = null;
  }

  async savePlan(): Promise<void> {
    if (!this.selectedPlan) {
      console.error('No selected plan to save');
      return;
    }

    console.log('Saving plan:', this.selectedPlan);
    console.log('Plan ID check:', this.selectedPlan.id, 'Type:', typeof this.selectedPlan.id, 'Length:', this.selectedPlan.id?.length);

    try {
      const now = new Date().toISOString();

      // Determine if this is an update or create operation
      const isUpdate = this.selectedPlan.id && this.selectedPlan.id.trim().length > 0;

      console.log('Operation type:', isUpdate ? 'UPDATE' : 'CREATE');

      if (isUpdate) {
        // UPDATE EXISTING PLAN
        console.log('Updating existing plan with ID:', this.selectedPlan.id);

        const updatedPlan = this.cleanFirebaseData({
          name: this.selectedPlan.name,
          description: this.selectedPlan.description,
          monthlyPrice: this.selectedPlan.monthlyPrice,
          yearlyPrice: this.selectedPlan.yearlyPrice,
          features: this.selectedPlan.features,
          isPopular: this.selectedPlan.isPopular,
          status: this.selectedPlan.status,
          maxUsers: this.selectedPlan.maxUsers,
          storageLimit: this.selectedPlan.storageLimit,
          supportLevel: this.selectedPlan.supportLevel,
          trialDays: this.selectedPlan.trialDays,
          category: this.selectedPlan.category,
          lastModified: now
        });

        await updateDoc(doc(this.firestore, this.plansCollection, this.selectedPlan.id), updatedPlan);
        console.log('✅ Plan UPDATED successfully with ID:', this.selectedPlan.id);

      } else {
        // CREATE NEW PLAN
        console.log('Creating new plan');

        const newPlan = this.cleanFirebaseData({
          name: this.selectedPlan.name,
          description: this.selectedPlan.description,
          monthlyPrice: this.selectedPlan.monthlyPrice,
          yearlyPrice: this.selectedPlan.yearlyPrice,
          features: this.selectedPlan.features,
          isPopular: this.selectedPlan.isPopular,
          status: this.selectedPlan.status,
          maxUsers: this.selectedPlan.maxUsers,
          storageLimit: this.selectedPlan.storageLimit,
          supportLevel: this.selectedPlan.supportLevel,
          trialDays: this.selectedPlan.trialDays,
          category: this.selectedPlan.category,
          lastModified: now
        });

        const docRef = await addDoc(collection(this.firestore, this.plansCollection), newPlan);
        console.log('✅ Plan CREATED successfully with ID:', docRef.id);
      }

      this.closePlanModal();
      await this.loadSubscriptionPlans();

    } catch (error) {
      console.error('❌ Error saving plan:', error);
      alert('Error saving plan: ' + error);
    }
  }

  confirmDeletePlan(plan: SubscriptionPlan): void {
    console.log('🗑️ Confirming delete for plan:', plan);
    console.log('Plan ID:', plan.id, 'Type:', typeof plan.id, 'Length:', plan.id?.length);

    if (!plan.id || plan.id.trim() === '') {
      console.error('❌ Cannot delete plan - invalid ID:', plan);
      alert('Error: Cannot delete plan - invalid ID');
      return;
    }

    this.deletingPlan = plan;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deletingPlan = null;
  }

  openDeleteModal(plan: SubscriptionPlan): void {
    console.log('🗑️ Opening delete modal for plan:', plan);
    console.log('Plan ID:', plan.id, 'Type:', typeof plan.id);

    if (!plan || !plan.id) {
      console.error('❌ Invalid plan object:', plan);
      alert('Error: Invalid plan selected for deletion');
      return;
    }

    // Validate plan ID format
    if (typeof plan.id !== 'string' || plan.id.trim() === '') {
      console.error('❌ Invalid plan ID:', plan.id);
      alert('Error: Invalid plan ID');
      return;
    }

    this.deletingPlan = plan;
    this.showDeleteModal = true;
  }

  async deletePlan(): Promise<void> {
    if (!this.deletingPlan) {
      console.error('❌ No plan selected for deletion');
      return;
    }

    if (!this.deletingPlan.id || this.deletingPlan.id.trim() === '') {
      console.error('❌ Invalid plan ID for deletion:', this.deletingPlan);
      alert('Error: Invalid plan ID. Cannot delete plan.');
      return;
    }

    console.log('🗑️ Deleting plan:', this.deletingPlan.name, 'with ID:', this.deletingPlan.id);
    console.log('Collection:', this.plansCollection);
    console.log('Full document path:', `${this.plansCollection}/${this.deletingPlan.id}`);

    this.isDeleting = true;

    try {
      await deleteDoc(doc(this.firestore, this.plansCollection, this.deletingPlan.id));
      console.log('✅ Plan deleted successfully:', this.deletingPlan.id);
      this.closeDeleteModal();
      await this.loadSubscriptionPlans();
    } catch (error) {
      console.error('❌ Error deleting plan:', error);
      alert('Error deleting plan: ' + error);
    } finally {
      this.isDeleting = false;
    }
  }

  async togglePlanStatus(plan: SubscriptionPlan): Promise<void> {
    try {
      const newStatus = plan.status === 'Active' ? 'Inactive' : 'Active';
      const updatedData = this.cleanFirebaseData({
        status: newStatus,
        lastModified: new Date().toISOString().split('T')[0]
      });

      await updateDoc(doc(this.firestore, this.plansCollection, plan.id), updatedData);

      console.log(`Subscription plan ${plan.name} status changed to ${newStatus}`);
      await this.loadSubscriptionPlans();
    } catch (error) {
      console.error('Error toggling subscription plan status:', error);
    }
  }

  // Helper method to clean Firebase data by removing undefined values
  private cleanFirebaseData(data: any): any {
    const cleaned: any = {};
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        cleaned[key] = data[key];
      }
    }
    return cleaned;
  }

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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  // Utility method for status badges
  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'badge bg-success';
      case 'inactive': return 'badge bg-secondary';
      case 'deprecated': return 'badge bg-danger';
      default: return 'badge bg-primary';
    }
  }

  getCategoryClass(category: string): string {
    switch (category.toLowerCase()) {
      case 'starter': return 'text-success';
      case 'business': return 'text-primary';
      case 'enterprise': return 'text-warning';
      default: return 'text-muted';
    }
  }

  getSupportLevelIcon(supportLevel: string): string {
    switch (supportLevel.toLowerCase()) {
      case 'basic': return 'fa fa-chat';
      case 'priority': return 'fa fa-chat-dots';
      case 'premium': return 'fa fa-headset';
      default: return 'fa fa-question-circle';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
