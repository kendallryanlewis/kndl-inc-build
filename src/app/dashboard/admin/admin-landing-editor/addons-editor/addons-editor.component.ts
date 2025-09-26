import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

interface Addon {
  id: string;
  name: string;
  description: string;
  category: 'SEO' | 'Analytics' | 'Security' | 'Performance' | 'Content' | 'Marketing' | 'Support';
  oneTimePrice: number;
  monthlyPrice: number;
  yearlyPrice: number;
  status: 'Active' | 'Inactive';
  featured: boolean;
  totalSubscriptions?: number;
  monthlyRevenue?: number;
  lastModified: string;
}

@Component({
  selector: 'app-addons-editor',
  templateUrl: './addons-editor.component.html',
  styleUrls: ['./addons-editor.component.scss']
})
export class AddonsEditorComponent implements OnInit {
  @Output() dataChange = new EventEmitter<any>();

  addons: Addon[] = [];
  showAddonModal: boolean = false;
  selectedAddon: Addon | null = null;
  private addonsCollection = 'addons';

  ngOnInit(): void {
    this.loadAddonsFromDb();
  }

  async loadAddonsFromDb() {
    try {
      const db = getFirestore();
      const querySnapshot = await getDocs(collection(db, this.addonsCollection));
      this.addons = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data['name'] || '',
          description: data['description'] || '',
          category: data['category'] || 'Marketing',
          oneTimePrice: data['oneTimePrice'] || 0,
          monthlyPrice: data['monthlyPrice'] || 0,
          yearlyPrice: data['yearlyPrice'] || 0,
          status: data['status'] || 'Active',
          featured: data['featured'] || false,
          totalSubscriptions: data['totalSubscriptions'] || 0,
          monthlyRevenue: data['monthlyRevenue'] || 0,
          lastModified: data['lastModified'] || new Date().toISOString().split('T')[0]
        };
      }) as Addon[];
      console.log('Loaded add-ons:', this.addons);

      // Emit data change for change tracking
      this.dataChange.emit({
        addons: this.addons,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error loading add-ons:', error);
    }
  }

  async addAddonToDb(addon: Addon) {
    try {
      const db = getFirestore();
      const docRef = await addDoc(collection(db, this.addonsCollection), {
        name: addon.name,
        description: addon.description,
        category: addon.category,
        oneTimePrice: addon.oneTimePrice,
        monthlyPrice: addon.monthlyPrice,
        yearlyPrice: addon.yearlyPrice,
        status: addon.status,
        featured: addon.featured,
        totalSubscriptions: addon.totalSubscriptions || 0,
        monthlyRevenue: addon.monthlyRevenue || 0,
        lastModified: new Date().toISOString().split('T')[0]
      });
      console.log('Add-on added with ID:', docRef.id);
      await this.loadAddonsFromDb(); // Refresh the list and emit changes
    } catch (error) {
      console.error('Error adding add-on:', error);
    }
  }

  async updateAddonInDb(addon: Addon) {
    try {
      const db = getFirestore();
      const docRef = doc(db, this.addonsCollection, addon.id);
      await updateDoc(docRef, {
        name: addon.name,
        description: addon.description,
        category: addon.category,
        oneTimePrice: addon.oneTimePrice,
        monthlyPrice: addon.monthlyPrice,
        yearlyPrice: addon.yearlyPrice,
        status: addon.status,
        featured: addon.featured,
        lastModified: new Date().toISOString().split('T')[0]
      });
      console.log('Add-on updated:', addon.id);
      await this.loadAddonsFromDb(); // Refresh the list and emit changes
    } catch (error) {
      console.error('Error updating add-on:', error);
    }
  }

  async deleteAddonFromDb(addonId: string) {
    try {
      const db = getFirestore();
      const docRef = doc(db, this.addonsCollection, addonId);
      await deleteDoc(docRef);
      console.log('Add-on deleted:', addonId);
      await this.loadAddonsFromDb(); // Refresh the list and emit changes
    } catch (error) {
      console.error('Error deleting add-on:', error);
    }
  }

  // Add-ons UI Methods
  createNewAddon() {
    this.selectedAddon = {
      id: '',
      name: '',
      description: '',
      category: 'Marketing',
      oneTimePrice: 0,
      monthlyPrice: 0,
      yearlyPrice: 0,
      status: 'Active',
      featured: false,
      totalSubscriptions: 0,
      monthlyRevenue: 0,
      lastModified: new Date().toISOString().split('T')[0]
    };
    this.showAddonModal = true;
  }

  editAddon(addon: Addon) {
    this.selectedAddon = { ...addon };
    this.showAddonModal = true;
  }

  async saveAddon() {
    if (this.selectedAddon) {
      if (this.selectedAddon.id === '') {
        // Creating new add-on - Firebase will auto-generate ID
        await this.addAddonToDb(this.selectedAddon);
      } else {
        // Update existing add-on in Firebase
        await this.updateAddonInDb(this.selectedAddon);
      }
      this.closeAddonModal();
    }
  }

  async deleteAddon(addon: Addon) {
    if (confirm(`Are you sure you want to delete the "${addon.name}" add-on? This action cannot be undone.`)) {
      await this.deleteAddonFromDb(addon.id);
    }
  }

  async toggleAddonStatus(addon: Addon) {
    const updatedAddon = { ...addon };
    updatedAddon.status = addon.status === 'Active' ? 'Inactive' : 'Active';
    await this.updateAddonInDb(updatedAddon);
  }

  closeAddonModal() {
    this.showAddonModal = false;
    this.selectedAddon = null;
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      default: return 'status-default';
    }
  }
}
