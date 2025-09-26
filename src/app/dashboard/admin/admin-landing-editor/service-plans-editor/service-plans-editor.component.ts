import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

interface ServicePlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  status: 'Active' | 'Inactive' | 'Deprecated';
  lastModified: string;
  isPopular?: boolean;
  totalSubscriptions?: number;
  monthlyRevenue?: number;
}

@Component({
  selector: 'app-service-plans-editor',
  templateUrl: './service-plans-editor.component.html',
  styleUrls: ['./service-plans-editor.component.scss']
})
export class ServicePlansEditorComponent implements OnInit {
  @Output() dataChange = new EventEmitter<any>();

  servicePlans: ServicePlan[] = [];
  showServicePlanModal: boolean = false;
  showDeleteModal: boolean = false;
  selectedServicePlan: ServicePlan | null = null;
  deletingPlan: ServicePlan | null = null;
  private servicePlansCollection = 'servicePlans';

  ngOnInit(): void {
    this.loadServicePlansFromDb();
  }

  async loadServicePlansFromDb() {
    try {
      const db = getFirestore();
      const querySnapshot = await getDocs(collection(db, this.servicePlansCollection));
      this.servicePlans = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data['name'] || '',
          description: data['description'] || '',
          monthlyPrice: data['monthlyPrice'] || 0,
          yearlyPrice: data['yearlyPrice'] || 0,
          features: data['features'] || [],
          status: data['status'] || 'Active',
          isPopular: data['isPopular'] || false,
          totalSubscriptions: data['totalSubscriptions'] || 0,
          monthlyRevenue: data['monthlyRevenue'] || 0,
          lastModified: data['lastModified'] || new Date().toISOString().split('T')[0]
        };
      }) as ServicePlan[];
      console.log('Loaded service plans:', this.servicePlans);

      // Emit data change for change tracking
      this.dataChange.emit({
        type: 'servicePlans',
        data: this.servicePlans
      });
    } catch (error) {
      console.error('Error loading service plans:', error);
    }
  }

  openServicePlanModal(servicePlan?: ServicePlan): void {
    if (servicePlan) {
      this.selectedServicePlan = { ...servicePlan };
    } else {
      this.selectedServicePlan = {
        id: '',
        name: '',
        description: '',
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: [''],
        status: 'Active',
        lastModified: new Date().toISOString().split('T')[0],
        isPopular: false,
        totalSubscriptions: 0,
        monthlyRevenue: 0
      };
    }
    this.showServicePlanModal = true;
  }

  closeServicePlanModal(): void {
    this.showServicePlanModal = false;
    this.selectedServicePlan = null;
  }

  async saveServicePlan(): Promise<void> {
    if (!this.selectedServicePlan) return;

    try {
      const db = getFirestore();
      const now = new Date().toISOString().split('T')[0];
      const servicePlanData = {
        ...this.selectedServicePlan,
        lastModified: now
      };

      if (this.selectedServicePlan.id) {
        // Update existing service plan
        await updateDoc(doc(db, this.servicePlansCollection, this.selectedServicePlan.id), servicePlanData);
        console.log('Service plan updated:', this.selectedServicePlan.id);
      } else {
        // Create new service plan
        const docRef = await addDoc(collection(db, this.servicePlansCollection), {
          ...servicePlanData,
          id: undefined // Remove id field for new documents
        });
        console.log('Service plan created with ID:', docRef.id);
      }

      this.closeServicePlanModal();
      await this.loadServicePlansFromDb();
    } catch (error) {
      console.error('Error saving service plan:', error);
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

  async deleteServicePlan(): Promise<void> {
    if (!this.deletingPlan) return;

    try {
      const db = getFirestore();
      await deleteDoc(doc(db, this.servicePlansCollection, this.deletingPlan.id));
      console.log('Service plan deleted:', this.deletingPlan.id);
      this.closeDeleteModal();
      await this.loadServicePlansFromDb();
    } catch (error) {
      console.error('Error deleting service plan:', error);
    }
  }

  async toggleServicePlanStatus(plan: ServicePlan): Promise<void> {
    try {
      const db = getFirestore();
      const newStatus = plan.status === 'Active' ? 'Inactive' : 'Active';
      const updatedPlan = {
        ...plan,
        status: newStatus,
        lastModified: new Date().toISOString().split('T')[0]
      };

      await updateDoc(doc(db, this.servicePlansCollection, plan.id), {
        status: newStatus,
        lastModified: updatedPlan.lastModified
      });

      console.log(`Service plan ${plan.name} status changed to ${newStatus}`);
      await this.loadServicePlansFromDb();
    } catch (error) {
      console.error('Error toggling service plan status:', error);
    }
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
}
