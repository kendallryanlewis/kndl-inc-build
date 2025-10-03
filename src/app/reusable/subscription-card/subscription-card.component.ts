import { Component, Input, Output, EventEmitter } from '@angular/core';

// Import the interfaces from the admin-landing-editor
import {
  BaseProduct,
  SubscriptionPlan,
  AddonProduct,
  OneTimeProduct
} from '../../dashboard/admin/admin-landing-editor/admin-landing-editor.component';

// Import ServicePlan from service-plans-editor
interface ServicePlan {
  id?: string;
  stripeProductId?: string;
  stripePriceId?: string;
  name: string;
  description: string;
  monthlyPrice: number;
  features: string[];
  status: 'Active' | 'Inactive' | 'Deprecated';
  lastModified?: string;
  isPopular?: boolean;
  totalSubscriptions?: number;
  monthlyRevenue?: number;
}

// Import Addon from addons-editor
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

type CategorizedProduct = SubscriptionPlan | AddonProduct | OneTimeProduct;
type AnyProduct = CategorizedProduct | ServicePlan | Addon;

export interface CardAction {
  icon: string;
  label: string;
  class: string;
  action: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-subscription-card',
  templateUrl: './subscription-card.component.html',
  styleUrls: ['./subscription-card.component.scss']
})
export class SubscriptionCardComponent {
  @Input() product!: AnyProduct;
  @Input() cardType: 'subscription' | 'addon' | 'onetime' | 'service' | 'legacy-addon' = 'subscription';
  @Input() showActions: boolean = false;
  @Input() showEdit: boolean = false;
  @Input() showDelete: boolean = false;
  @Input() customActions: CardAction[] = [];

  // Events
  @Output() editClicked = new EventEmitter<AnyProduct>();
  @Output() deleteClicked = new EventEmitter<AnyProduct>();
  @Output() statusToggled = new EventEmitter<AnyProduct>();
  @Output() stripeViewClicked = new EventEmitter<string>();
  @Output() customActionClicked = new EventEmitter<{ action: string, product: AnyProduct }>();

  // Type guard functions
  isSubscriptionPlan(product: AnyProduct): product is SubscriptionPlan {
    return 'planType' in product;
  }

  isAddonProduct(product: AnyProduct): product is AddonProduct {
    return 'addonType' in product;
  }

  isOneTimeProduct(product: AnyProduct): product is OneTimeProduct {
    return 'productType' in product;
  }

  isServicePlan(product: AnyProduct): product is ServicePlan {
    return 'monthlyPrice' in product && !('planType' in product) && !('addonType' in product) && !('productType' in product) && !('oneTimePrice' in product);
  }

  isAddon(product: AnyProduct): product is Addon {
    return 'oneTimePrice' in product && 'category' in product && 'featured' in product;
  }

  // Get card-specific CSS classes
  getCardClass(): string {
    const baseClasses = 'subscription-card h-100';
    const statusClass = this.product.status === 'Active' ? '' : 'inactive';
    const typeClass = `${this.cardType}-card`;

    return `${baseClasses} ${typeClass} ${statusClass}`.trim();
  }

  // Get appropriate icon for product type
  getProductIcon(): string {
    switch (this.cardType) {
      case 'subscription': return 'fas fa-sync-alt';
      case 'addon': return 'fas fa-puzzle-piece';
      case 'onetime': return 'fas fa-shopping-cart';
      default: return 'fas fa-box';
    }
  }

  // Format currency
  formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  // Get support level icon
  getSupportLevelIcon(supportLevel: string): string {
    switch (supportLevel) {
      case 'Basic': return 'fa-user';
      case 'Priority': return 'fa-user-plus';
      case 'Premium': return 'fa-crown';
      default: return 'fa-user';
    }
  }

  // Get category badge class
  getCategoryClass(category: string): string {
    const categoryClasses: { [key: string]: string } = {
      'Starter': 'text-success',
      'Business': 'text-primary',
      'Enterprise': 'text-dark',
      'addon': 'bg-secondary',
      'service': 'bg-success'
    };
    return categoryClasses[category] || 'bg-secondary';
  }

  // Event handlers
  onEdit(): void {
    this.editClicked.emit(this.product);
  }

  onDelete(): void {
    this.deleteClicked.emit(this.product);
  }

  onToggleStatus(): void {
    this.statusToggled.emit(this.product);
  }

  onCustomAction(actionType: string): void {
    this.customActionClicked.emit({ action: actionType, product: this.product });
  }

  // Get pricing display text
  getPriceDisplay(): string {
    // Check for custom price display first (for user cards, etc.)
    if ((this.product as any).customPriceDisplay) {
      return (this.product as any).customPriceDisplay;
    }

    if (this.isSubscriptionPlan(this.product)) {
      return `${this.formatCurrency(this.product.monthlyPrice)}/month`;
    } else if (this.isAddonProduct(this.product)) {
      return `${this.formatCurrency(this.product.price)} ${this.getPaymentType()}`;
    } else if (this.isOneTimeProduct(this.product)) {
      return `${this.formatCurrency(this.product.price)} one-time`;
    } else if (this.isServicePlan(this.product)) {
      return `${this.formatCurrency(this.product.monthlyPrice)} one-time`;
    } else if (this.isAddon(this.product)) {
      if (this.product.oneTimePrice > 0 && this.product.monthlyPrice > 0) {
        return `${this.formatCurrency(this.product.oneTimePrice)} one-time or ${this.formatCurrency(this.product.monthlyPrice)}/month`;
      } else if (this.product.oneTimePrice > 0) {
        return `${this.formatCurrency(this.product.oneTimePrice)} one-time`;
      } else if (this.product.monthlyPrice > 0) {
        return `${this.formatCurrency(this.product.monthlyPrice)}/month`;
      }
    }
    return 'N/A';
  }

  // Get payment type for display
  getPaymentType(): string {
    if (this.isSubscriptionPlan(this.product)) {
      return 'monthly';
    } else if (this.isAddonProduct(this.product)) {
      return this.product.isRecurring ? 'monthly' : 'one-time';
    } else {
      return 'one-time';
    }
  }

  // Get product-specific details
  getProductDetails(): Array<{ icon: string, text: string }> {
    const details: Array<{ icon: string, text: string }> = [];

    if (this.isSubscriptionPlan(this.product)) {
      const plan = this.product as SubscriptionPlan;

      if (plan.storageLimit) {
        details.push({ icon: 'fa-hdd', text: `${plan.storageLimit} storage` });
      }
      if (plan.supportLevel) {
        details.push({
          icon: this.getSupportLevelIcon(plan.supportLevel),
          text: `${plan.supportLevel} support`
        });
      }
      if (plan.trialDays) {
        details.push({ icon: 'fa-calendar-check', text: `${plan.trialDays}-day trial` });
      }
    } else if (this.isAddonProduct(this.product)) {
      const addon = this.product as AddonProduct;
      details.push({ icon: 'fa-puzzle-piece', text: `${addon.addonType} addon` });
      details.push({
        icon: addon.isRecurring ? 'fa-sync' : 'fa-shopping-cart',
        text: addon.isRecurring ? 'Recurring billing' : 'One-time payment'
      });
    } else if (this.isOneTimeProduct(this.product)) {
      const service = this.product as OneTimeProduct;
      details.push({ icon: 'fa-cog', text: `${service.productType} service` });
      if (service.deliveryTimeframe) {
        details.push({ icon: 'fa-clock', text: service.deliveryTimeframe });
      }
    }

    return details;
  }

  // Get product badges
  getBadges(): Array<{ text: string, class: string }> {
    const badges: Array<{ text: string, class: string }> = [];

    // Add category badge if available
    if (this.isSubscriptionPlan(this.product) || this.isAddonProduct(this.product) || this.isOneTimeProduct(this.product)) {
      badges.push({
        text: (this.product as any).category || 'General',
        class: this.getCategoryClass((this.product as any).category || 'General')
      });
    } else if (this.isAddon(this.product)) {
      badges.push({
        text: this.product.category,
        class: this.getCategoryClass(this.product.category)
      });
    }

    // Add popular/featured badge
    if ((this.product as any).isPopular) {
      badges.push({
        text: 'Popular',
        class: 'bg-warning text-dark'
      });
    } else if (this.isAddon(this.product) && this.product.featured) {
      badges.push({
        text: 'Featured',
        class: 'bg-warning text-dark'
      });
    }

    // Add status badge  
    badges.push({
      text: this.product.status,
      class: this.getStatusBadgeClass(this.product.status)
    });

    return badges;
  }

  // Type-specific getter methods for template
  getPlanType(): string {
    if (this.isSubscriptionPlan(this.product)) {
      return (this.product as SubscriptionPlan).planType || 'Standard';
    }
    return 'Standard';
  }

  getAddonType(): string {
    if (this.isAddonProduct(this.product)) {
      return (this.product as AddonProduct).addonType.charAt(0).toUpperCase() +
        (this.product as AddonProduct).addonType.slice(1);
    }
    return 'Feature';
  }

  getServiceType(): string {
    if (this.isOneTimeProduct(this.product)) {
      return (this.product as OneTimeProduct).productType.charAt(0).toUpperCase() +
        (this.product as OneTimeProduct).productType.slice(1);
    }
    return 'Service';
  }

  hasStripeProduct(): boolean {
    return !!(this.product as any).stripeProductId;
  }

  hasFeatures(): boolean {
    return !!(this.product as any).features && (this.product as any).features.length > 0 && (this.product as any).features[0] !== '';
  }

  getFeatures(): string[] {
    return (this.product as any).features || [];
  }

  getStripeProductId(): string {
    return (this.product as any).stripeProductId || '';
  }

  getPricingText(): string {
    return this.getPriceDisplay();
  }

  getProductBadges(): Array<{ text: string, class: string }> {
    return this.getBadges();
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Active':
        return 'bg-success';
      case 'Inactive':
        return 'bg-secondary';
      case 'Deprecated':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  // Additional methods needed by template
  getProductTypeLabel(): string {
    switch (this.cardType) {
      case 'subscription': return 'Subscription Plan';
      case 'addon': return 'Add-on';
      case 'onetime': return 'One-Time Product';
      case 'service': return 'Service Plan';
      case 'legacy-addon': return 'Legacy Add-on';
      default: return 'Product';
    }
  }

  getProductCategory(): string {
    if (this.isAddonProduct(this.product)) {
      return (this.product as AddonProduct).addonType;
    } else if (this.isSubscriptionPlan(this.product)) {
      return (this.product as SubscriptionPlan).planType || 'Standard';
    } else if (this.isOneTimeProduct(this.product)) {
      return (this.product as OneTimeProduct).productType;
    } else if (this.isAddon(this.product)) {
      return (this.product as Addon).category;
    }
    return this.cardType;
  }

  showPopularityBadge(): boolean {
    return (this.product as any).isPopular !== undefined || (this.product as any).featured !== undefined;
  }

  getPopularityClass(): string {
    if ((this.product as any).isPopular || (this.product as any).featured) {
      return 'bg-warning text-dark';
    }
    return 'bg-secondary';
  }

  getPopularityText(): string {
    if ((this.product as any).isPopular) {
      return 'Popular';
    } else if ((this.product as any).featured) {
      return 'Featured';
    }
    return 'Standard';
  }

  hasStripeIntegration(): boolean {
    return !!(this.product as any).stripeProductId;
  }

  getStripePriceId(): string {
    return (this.product as any).stripePriceId || (this.product as any).stripeMonthlyPriceId || '';
  }

  onViewStripe(): void {
    const productId = this.getStripeProductId();
    if (productId) {
      this.stripeViewClicked.emit(productId);
    }
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  }

  getDetailValue(detailText: string): string {
    // Extract the value part from detail text like "Up to 5 users"
    const match = detailText.match(/(\d+)/);
    return match ? match[1] : '';
  }

  getDetailLabel(detailText: string): string {
    // Extract the label part from detail text
    if (detailText.includes('users')) return 'Users';
    if (detailText.includes('storage')) return 'Storage';
    if (detailText.includes('support')) return 'Support';
    if (detailText.includes('trial')) return 'Trial Days';
    return 'Detail';
  }
}
