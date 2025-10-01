import { Component, OnInit, OnChanges, SimpleChanges, Output, EventEmitter, Input } from '@angular/core';
import { AddonProduct } from '../admin-landing-editor.component';

@Component({
  selector: 'app-addons-editor',
  templateUrl: './addons-editor.component.html',
  styleUrls: ['./addons-editor.component.scss']
})
export class AddonsEditorComponent implements OnInit, OnChanges {
  @Output() dataChange = new EventEmitter<any>();
  @Output() toggleArchiveFilter = new EventEmitter<void>();

  // Input from parent admin-landing-editor
  @Input() addonProducts: AddonProduct[] = [];
  @Input() isLoading: boolean = false;
  @Input() operationSuccess: string = '';
  @Input() operationError: string = '';
  filteredAddonProducts: AddonProduct[] = [];
  showingArchivedPlans: boolean = false;
  showAddonModal: boolean = false;
  selectedAddon: AddonProduct | null = null;

  // Message properties for user feedback
  successMessage: string = '';
  errorMessage: string = '';
  isSaving: boolean = false;

  ngOnInit(): void {
    this.filterSubscriptionPlans();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Handle operation success/error messages from parent
    if (changes['operationSuccess'] && changes['operationSuccess'].currentValue) {
      this.successMessage = changes['operationSuccess'].currentValue;
      this.isSaving = false;

      // Auto-close modal after showing success message
      setTimeout(() => {
        this.closeAddonModal();
      }, 1500);
    }

    if (changes['operationError'] && changes['operationError'].currentValue) {
      this.errorMessage = changes['operationError'].currentValue;
      this.isSaving = false;
    }

    // Update filtered products when addon products change
    if (changes['addonProducts']) {
      this.filterSubscriptionPlans();
    }

    // Update the view when data changes
    if (changes['addonProducts'] || changes['operationSuccess'] || changes['operationError']) {
      // Force refresh the filtered view to ensure cards reflect latest data
      setTimeout(() => {
        this.filterSubscriptionPlans();
      }, 100);
    }
  }

  // Method to get the toggle button text
  get toggleButtonText(): string {
    return this.showingArchivedPlans ? 'Hide Archived Plans' : 'Show All Plans';
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
      this.filteredAddonProducts = this.addonProducts;
    } else {
      // Show only non-archived plans
      this.filteredAddonProducts = this.addonProducts.filter(plan => !plan.isArchived);
    }
  }

  // Method to get the current filter status
  get currentFilterStatus(): string {
    const activeCount = this.addonProducts.filter(plan => !plan.isArchived).length;
    const totalCount = this.addonProducts.length;
    const archivedCount = totalCount - activeCount;

    return this.showingArchivedPlans
      ? `Showing all ${totalCount} plans (${archivedCount} archived)`
      : `Showing ${activeCount} active plans`;
  }

  // Get custom actions for addon cards
  getAddonActions(addon: AddonProduct): any[] {
    if (addon.isArchived) {
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
    const addon = product as AddonProduct;

    switch (action) {
      case 'archive':
        this.archiveAddon(addon);
        break;
      case 'recycle':
        this.recycleAddon(addon);
        break;
      case 'delete':
        this.onDeleteAddon(addon);
        break;
      case 'toggleStatus':
        this.onToggleStatus(addon);
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }

  // Event handlers for addon card interactions
  onEditAddon(addon: AddonProduct): void {
    // Clear any previous messages
    this.clearMessages();

    // Create a deep copy to ensure all fields are properly populated
    this.selectedAddon = {
      stripeProductId: addon.stripeProductId || '',
      stripePriceId: addon.stripePriceId || '',
      name: addon.name || '',
      description: addon.description || '',
      active: addon.active !== undefined ? addon.active : true,
      price: this.parsePrice(addon.price), // Use special price parsing method
      currency: addon.currency || 'usd',
      features: Array.isArray(addon.features) ? [...addon.features] : [''], // Deep copy array
      isPopular: addon.isPopular || false,
      category: addon.category || 'feature',
      created: addon.created || new Date(),
      updated: addon.updated || new Date(),
      status: addon.status || 'Active',
      lastModified: addon.lastModified || new Date().toISOString().split('T')[0],
      addonType: addon.addonType || 'feature',
      compatiblePlans: Array.isArray(addon.compatiblePlans) ? [...addon.compatiblePlans] : [], // Deep copy array
      isRecurring: addon.isRecurring || false,
      isArchived: addon.isArchived || false
    };

    console.log('📝 Selected addon for editing - parsed price:', {
      name: this.selectedAddon.name,
      price: this.selectedAddon.price,
      priceType: typeof this.selectedAddon.price,
      currency: this.selectedAddon.currency,
      features: this.selectedAddon.features
    });

    this.showAddonModal = true;
  }

  // Helper method to properly parse price values
  private parsePrice(price: any): number {
    console.log('💰 Parsing price:', price, 'Type:', typeof price);

    if (price === null || price === undefined || price === '') {
      console.log('💰 Price is null/undefined/empty, returning 0');
      return 0;
    }

    if (typeof price === 'number') {
      console.log('💰 Price is already a number:', price);
      return price;
    }

    if (typeof price === 'string') {
      // Remove any currency symbols or formatting
      const cleaned = price.replace(/[^0-9.-]/g, '');
      console.log('💰 Cleaned string price:', cleaned);
      const parsed = parseFloat(cleaned);
      const result = isNaN(parsed) ? 0 : parsed;
      console.log('💰 Parsed price result:', result);
      return result;
    }

    console.log('💰 Unexpected price type, returning 0');
    return 0;
  }

  onDeleteAddon(addon: AddonProduct): void {
    // Emit delete request to parent
    this.dataChange.emit({
      action: 'delete',
      type: 'addon',
      data: addon
    });
  }

  onToggleStatus(addon: AddonProduct): void {
    // Handle archive/unarchive functionality based on current status
    if (addon.isArchived) {
      this.recycleAddon(addon);
    } else {
      this.archiveAddon(addon);
    }
  }

  // Modal management
  createNewAddon = (): void => {
    this.selectedAddon = {
      stripeProductId: '',
      stripePriceId: '',
      name: '',
      description: '',
      active: true,
      price: 0,
      currency: 'usd',
      features: [''],
      isPopular: false,
      category: 'feature',
      created: new Date(),
      updated: new Date(),
      status: 'Active',
      lastModified: new Date().toISOString().split('T')[0],
      addonType: 'feature',
      compatiblePlans: [],
      isRecurring: false
    };
    this.showAddonModal = true;
    this.clearMessages();
  }

  closeAddonModal(): void {
    this.showAddonModal = false;
    this.selectedAddon = null;
    this.clearMessages();
  }

  // Clear success and error messages
  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  // Force refresh of component data and view
  public refreshData(): void {
    console.log('🔄 Force refreshing addon data...');
    this.filterSubscriptionPlans();
  }

  // Save addon (create or update)
  async saveAddon(): Promise<void> {
    if (!this.selectedAddon) return;

    // Clear previous messages
    this.clearMessages();
    this.isSaving = true;

    try {
      const isUpdate = !!this.selectedAddon.stripeProductId;

      // Validate required fields
      if (!this.selectedAddon.name || !this.selectedAddon.description || !this.selectedAddon.price) {
        this.errorMessage = 'Please fill in all required fields (Name, Description, Price).';
        this.isSaving = false;
        return;
      }

      // Emit save request to parent
      this.dataChange.emit({
        action: isUpdate ? 'update' : 'create',
        type: 'addon',
        data: this.selectedAddon
      });

      // For updates, immediately update the local data to show changes
      if (isUpdate) {
        this.updateAddonInList(this.selectedAddon);
      }

      this.filterSubscriptionPlans();
      // Success/error handling will be done via ngOnChanges when parent responds

    } catch (error) {
      console.error('Error saving addon:', error);
      this.errorMessage = 'Failed to save add-on. Please try again.';
      this.isSaving = false;
    }
  }

  // Archive/Unarchive addon with aggressive corruption handling
  async archiveAddon(addon: AddonProduct): Promise<void> {
    try {
      // Create a clean copy and sanitize data
      let cleanedAddon = {
        ...addon,
        isArchived: !addon.isArchived,
        status: (addon.isArchived ? 'Active' : 'Deprecated') as 'Active' | 'Inactive' | 'Deprecated'
      };

      // Handle corrupted fields using the utility method
      cleanedAddon.features = this.sanitizeArrayField(addon.features, 'features', []);
      cleanedAddon.compatiblePlans = this.sanitizeArrayField(addon.compatiblePlans, 'compatiblePlans', []);

      this.dataChange.emit({
        action: 'archive',
        type: 'addon',
        data: cleanedAddon
      });

      // Update the card data immediately to reflect changes
      this.updateAddonInList(cleanedAddon);
    } catch (error) {
      console.error('❌ Error archiving addon:', error);
    }
  }  // Restore archived addon with aggressive corruption handling
  async recycleAddon(addon: AddonProduct): Promise<void> {
    try {
      // Create a clean copy and reset any severely corrupted data
      let cleanedAddon = {
        ...addon,
        isArchived: false,
        status: 'Active' as 'Active' | 'Inactive' | 'Deprecated' // Explicitly set status to Active for unarchiving
      };

      // Handle severely corrupted features field
      cleanedAddon.features = this.sanitizeArrayField(addon.features, 'features', ['Enhanced functionality']);

      // Handle severely corrupted compatiblePlans field with nuclear option
      if (this.isFieldSeverelyCorrupted(addon.compatiblePlans)) {
        cleanedAddon.compatiblePlans = [];
      } else {
        cleanedAddon.compatiblePlans = this.sanitizeArrayField(addon.compatiblePlans, 'compatiblePlans', []);
      }

      console.log('✅ Final cleaned addon data:', {
        name: cleanedAddon.name,
        features: cleanedAddon.features,
        compatiblePlans: cleanedAddon.compatiblePlans,
        isArchived: cleanedAddon.isArchived,
        status: cleanedAddon.status
      });

      this.dataChange.emit({
        action: 'archive',
        type: 'addon',
        data: cleanedAddon
      });

      // Update the card data immediately to reflect changes
      this.updateAddonInList(cleanedAddon);
    } catch (error) {
      console.error('❌ Error restoring addon:', error);
    }
  }

  // Check if a field is severely corrupted beyond repair
  private isFieldSeverelyCorrupted(value: any): boolean {
    if (Array.isArray(value)) {
      // Check if any array element contains severe corruption
      return value.some(item => {
        if (typeof item === 'string') {
          return item.includes('\\\\\\\\') || item.includes('["[') || item.length > 200;
        }
        return false;
      });
    }

    if (typeof value === 'string') {
      // Check for multiple corruption indicators
      const corruptionPatterns = [
        '\\\\\\\\\\\\\\\\', // 8+ consecutive backslashes
        '["[\\', // Nested bracket escape pattern
        '[\"[\\\\', // Another nested pattern
        '\\\\\\\\\\\\\\\"' // Complex escape pattern
      ];

      return corruptionPatterns.some(pattern => value.includes(pattern)) || value.length > 1000;
    }

    return false;
  }  // Utility method to sanitize array fields with aggressive corruption handling
  private sanitizeArrayField(value: any, fieldName: string, defaultValue: string[] = []): string[] {
    if (Array.isArray(value)) {
      // Check if array contains corrupted string elements
      const cleanArray = value.filter(item => {
        if (typeof item === 'string') {
          // Check for corruption patterns in array elements
          if (item.includes('\\\\') || item.includes('["[') || item.includes('[\"[') || item.length > 100) {
            return false; // Remove corrupted elements
          }
          return item.trim().length > 0; // Keep non-empty strings
        }
        return false; // Remove non-string elements
      });

      if (cleanArray.length === 0 && value.length > 0) {
        console.log(`🔄 All array elements were corrupted in ${fieldName}, using default`);
        return defaultValue;
      }

      return cleanArray;
    }

    if (typeof value === 'string') {
      // Check for severe corruption patterns first
      if (value.includes('\\\\\\\\') || value.includes('["[') || value.includes('[\"[') ||
        value.includes('\\\\\\\"') || value.length > 500) {
        return defaultValue;
      }

      // Attempt deep parsing for less severe corruption
      let current = value;
      let attempts = 0;
      const maxAttempts = 20; // Increased for very deep nesting

      while (attempts < maxAttempts && typeof current === 'string') {
        try {
          // If string is too long, it's likely corrupted
          if (current.length > 1000) {
            return defaultValue;
          }

          const parsed = JSON.parse(current);

          if (Array.isArray(parsed)) {
            // Filter out any remaining corrupted elements
            const cleanParsed = parsed.filter(item => {
              if (typeof item === 'string') {
                return !item.includes('\\\\') && item.length < 100;
              }
              return false;
            });
            return cleanParsed.length > 0 ? cleanParsed : defaultValue;
          } else if (typeof parsed === 'string') {
            current = parsed;
          } else {
            return defaultValue;
          }
        } catch (e) {
          const error = e as Error;
          console.warn(`❌ Failed to parse ${fieldName} at attempt ${attempts + 1}:`, error.message || e);
          break;
        }
        attempts++;
      }

      // If we still have a string after all attempts and it's reasonable length
      if (typeof current === 'string' && current.length < 100 && !current.startsWith('[')) {
        return [current];
      }
    }

    console.log(`🔄 Using default value for ${fieldName}`);
    return defaultValue;
  }  // Helper methods for form
  addFeature(): void {
    if (this.selectedAddon) {
      this.selectedAddon.features.push('');
    }
  }

  removeFeature(index: number): void {
    if (this.selectedAddon && this.selectedAddon.features.length > 1) {
      this.selectedAddon.features.splice(index, 1);
    }
  }

  trackFeature(index: number, item: string): number {
    return index;
  }

  // Update addon in the local lists and refresh the view
  private updateAddonInList(updatedAddon: AddonProduct): void {
    // Find and update the addon in the main list
    const index = this.addonProducts.findIndex(addon =>
      addon.stripeProductId === updatedAddon.stripeProductId
    );

    if (index !== -1) {
      // Create a complete copy with all fields properly updated
      this.addonProducts[index] = {
        ...this.addonProducts[index], // Keep existing fields
        ...updatedAddon, // Override with updated values
        price: Number(updatedAddon.price), // Ensure price is a number
        updated: new Date(), // Update the timestamp
        lastModified: new Date().toISOString().split('T')[0]
      };
    } else {
      console.warn('⚠️ Addon not found in list for update:', updatedAddon.stripeProductId);
    }

    // Refresh the filtered view to reflect the changes
    this.filterSubscriptionPlans();
  }
}
