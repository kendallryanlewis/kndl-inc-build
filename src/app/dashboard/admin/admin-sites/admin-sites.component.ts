import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { StripeService } from '../../../services/stripe.service';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OverviewTabComponent } from './overview-tab/overview-tab.component';
import { BillingTabComponent } from './billing-tab/billing-tab.component';
import { SubscriptionTabComponent } from './subscription-tab/subscription-tab.component';
import { AddonsTabComponent } from './addons-tab/addons-tab.component';
import { SettingsTabComponent } from './settings-tab/settings-tab.component';

interface Company {
  id: string; // Stripe customer ID
  name: string;
  domain: string;
  logo?: string;
  contactEmail: string;
  phone?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  subscriptionPlan: 'basic' | 'professional' | 'enterprise';
  monthlyAmount: number;
  userCount: number;
  lastBilling: Date;
  nextBilling: Date;
  createdDate: Date;
  billingCycle: 'monthly' | 'yearly';
  lastFourDigits: string;
  autoRenewal: boolean;
  monthlyPageViews: number;
  activeAddons: number[];
  // Stripe-related fields
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePaymentMethodId?: string;
  stripeSubscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  stripeMetadata?: Record<string, string>;
  stripeSyncStatus?: 'synced' | 'pending' | 'error';
  lastStripeSyncDate?: Date;
}

interface Addon {
  id: number;
  name: string;
  description: string;
  monthlyPrice: number;
  setupFee?: number;
  features: string[];
  category?: 'hosting' | 'security' | 'analytics' | 'support' | 'custom';
  isActive?: boolean;
  createdDate?: Date;
  updatedDate?: Date;
  stripeProductId?: string;
  stripePriceId?: string;
}

interface ServiceAssignment {
  id: string;
  companyId: string;
  addonId: number;
  assignedDate: Date;
  assignedBy: string;
  quantity: number;
  customPrice?: number; // For custom pricing
  notes?: string;
  status: 'active' | 'paused' | 'cancelled';
  stripeSubscriptionId?: string;
}

interface ServiceTemplate {
  id: number;
  name: string;
  description: string;
  category: 'hosting' | 'security' | 'analytics' | 'support' | 'custom';
  basePrice: number;
  setupFee?: number;
  features: string[];
  isCustomizable: boolean;
  allowCustomPricing: boolean;
  isActive: boolean;
  createdBy: string;
  createdDate: Date;
  updatedDate: Date;
}

interface ServiceUsageStats {
  addonId: number;
  addonName: string;
  totalCustomers: number;
  monthlyRevenue: number;
  averagePrice: number;
  category: string;
}

interface BillingRecord {
  id: number;
  date: Date;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'overdue';
  invoiceUrl?: string;
}

interface Activity {
  id: number;
  type: 'payment' | 'login' | 'update' | 'support' | 'service';
  icon: string;
  description: string;
  date: Date;
}

@Component({
  selector: 'app-admin-sites',
  templateUrl: './admin-sites.component.html',
  styleUrls: ['./admin-sites.component.scss']
})
export class AdminSitesComponent implements OnInit {
  @Input() subTab: string = 'Sites';
  @Output() childTabs = new EventEmitter<string[]>();
  sectionIds: string[] = ['Sites'];
  @Input() selectedTab: any = 'client-companies';
  @Output() selectedTabChange = new EventEmitter<any>();
  selectedCompany: Company | null = null;
  activeTab: string = 'overview';
  searchQuery: string = '';
  statusFilter: string = '';
  subscriptionFilter: string = '';
  showAddCompanyModal: boolean = false;

  // Available tabs for navigation
  availableTabs = [
    { id: 'overview', label: 'Overview', icon: 'fa-chart-line' },
    { id: 'billing', label: 'Billing', icon: 'fa-credit-card' },
    { id: 'subscription', label: 'Subscription', icon: 'fa-box' },
    { id: 'addons', label: 'Add-ons & Services', icon: 'fa-puzzle-piece' },
    { id: 'settings', label: 'Settings', icon: 'fa-cog' }
  ];

  // Filtered data
  filteredCompanies: Company[] = [];
  selectedAddons: Addon[] = [];

  // New company form
  newCompany: Partial<Company> = {
    subscriptionPlan: 'basic'
  };

  // Stripe integration status
  stripeLoading: boolean = false;
  stripeSyncErrors: string[] = [];

  stripeCustomers: any[] = [];
  importLoading: boolean = false;
  customerSearchQuery: string = '';
  selectedCustomers: any[] = [];
  importResults: { success: any[], errors: any[] } = { success: [], errors: [] };

  exportLoading: boolean = false;
  selectedCompaniesForExport: Company[] = [];
  exportResults: { success: any[], errors: any[] } = { success: [], errors: [] };
  exportAll: boolean = false;

  // Add-ons & Services management
  showAddAddonModal: boolean = false;
  showCreateSubscriptionModal: boolean = false;
  currentCustomerAddons: any[] = [];
  currentCustomerSubscriptions: any[] = [];
  addonLoading: boolean = false;

  // Comprehensive Stripe data for overview
  stripeCustomerData: any = null;
  stripeSubscriptionsData: any[] = [];
  stripeInvoicesData: any[] = [];
  stripePaymentMethodsData: any[] = [];
  stripeChargesData: any[] = [];
  stripeOverviewLoading: boolean = false;
  subscriptionLoading: boolean = false;
  newAddonAssignment = {
    addonId: null,
    quantity: 1,
    startDate: new Date(),
    prorate: true
  };
  newSubscription = {
    plan: 'basic',
    priceId: '',
    quantity: 1,
    trialDays: 0,
    startDate: new Date()
  };

  // Enhanced Service Management Properties
  serviceManagementView: 'templates' | 'assignments' | 'analytics' | 'bulk' = 'templates';

  // Service Template Management
  serviceTemplates: ServiceTemplate[] = [];
  showServiceTemplateModal: boolean = false;
  selectedServiceTemplate: Partial<ServiceTemplate> | null = null;
  serviceTemplateLoading: boolean = false;

  // Service Assignment History
  serviceAssignments: ServiceAssignment[] = [];
  serviceAssignmentHistory: ServiceAssignment[] = [];

  // Service Analytics
  serviceUsageStats: ServiceUsageStats[] = [];
  serviceAnalyticsLoading: boolean = false;

  // Bulk Operations
  showBulkServiceModal: boolean = false;
  bulkOperationType: 'add' | 'remove' = 'add';
  bulkSelectedCompanies: Company[] = [];
  bulkSelectedServices: number[] = [];
  bulkOperationLoading: boolean = false;

  // Service Categories
  serviceCategories = [
    { id: 'hosting', label: 'Hosting & Infrastructure', icon: 'fa-server' },
    { id: 'security', label: 'Security & SSL', icon: 'fa-shield-alt' },
    { id: 'analytics', label: 'Analytics & Reporting', icon: 'fa-chart-bar' },
    { id: 'support', label: 'Support & Maintenance', icon: 'fa-life-ring' },
    { id: 'custom', label: 'Custom Services', icon: 'fa-cogs' }
  ];

  constructor(private stripeService: StripeService) { }

  availableAddons: Addon[] = [
    {
      id: 1,
      name: 'Premium Support',
      description: '24/7 priority support with dedicated account manager',
      monthlyPrice: 25,
      features: ['24/7 Phone Support', 'Dedicated Account Manager', 'Priority Ticket Queue'],
      category: 'support',
      isActive: true,
      createdDate: new Date('2024-01-01'),
      updatedDate: new Date()
    },
    {
      id: 2,
      name: 'Advanced Analytics',
      description: 'Detailed traffic analytics and reporting dashboard',
      monthlyPrice: 15,
      setupFee: 50,
      features: ['Custom Reports', 'Real-time Analytics', 'Data Export'],
      category: 'analytics',
      isActive: true,
      createdDate: new Date('2024-01-15'),
      updatedDate: new Date()
    },
    {
      id: 3,
      name: 'SSL Certificate',
      description: 'Wildcard SSL certificate for enhanced security',
      monthlyPrice: 10,
      features: ['Wildcard SSL', 'Auto-renewal', 'Installation Support'],
      category: 'security',
      isActive: true,
      createdDate: new Date('2024-02-01'),
      updatedDate: new Date()
    },
    {
      id: 4,
      name: 'CDN Service',
      description: 'Global content delivery network for faster loading',
      monthlyPrice: 20,
      features: ['Global CDN', 'Image Optimization', 'Bandwidth Monitoring'],
      category: 'hosting',
      isActive: true,
      createdDate: new Date('2024-02-15'),
      updatedDate: new Date()
    },
    {
      id: 5,
      name: 'Database Backup',
      description: 'Automated daily database backups with 30-day retention',
      monthlyPrice: 12,
      features: ['Daily Automated Backups', '30-day Retention', 'One-click Restore'],
      category: 'hosting',
      isActive: true,
      createdDate: new Date('2024-03-01'),
      updatedDate: new Date()
    },
    {
      id: 6,
      name: 'SEO Optimization',
      description: 'Monthly SEO audits and optimization recommendations',
      monthlyPrice: 35,
      setupFee: 100,
      features: ['Monthly SEO Audit', 'Keyword Research', 'Content Recommendations'],
      category: 'analytics',
      isActive: true,
      createdDate: new Date('2024-03-15'),
      updatedDate: new Date()
    },
    {
      id: 7,
      name: 'Malware Protection',
      description: 'Real-time malware scanning and removal service',
      monthlyPrice: 18,
      features: ['Real-time Scanning', 'Automatic Malware Removal', 'Security Reports'],
      category: 'security',
      isActive: true,
      createdDate: new Date('2024-04-01'),
      updatedDate: new Date()
    },
    {
      id: 8,
      name: 'Load Balancing',
      description: 'High-availability load balancing for enterprise clients',
      monthlyPrice: 75,
      setupFee: 200,
      features: ['Multiple Server Support', 'Auto-failover', 'Traffic Distribution'],
      category: 'hosting',
      isActive: true,
      createdDate: new Date('2024-04-15'),
      updatedDate: new Date()
    }
  ];

  companies: Company[] = [];

  async loadSitesFromDb() {
    console.log('🔍 Loading all companies from Stripe...');

    try {
      // Fetch all Stripe customers (without startingAfter parameter)
      console.log('📡 Calling getAllStripeCustomers service...');
      const response = await this.stripeService.getAllStripeCustomers(100).toPromise();

      console.log('📋 Raw response from getAllStripeCustomers:', response);

      // The Stripe service now unwraps the Firebase response, so we should get:
      // { success: true, data: [...customers], hasMore: false, count: 6 }
      let customers = [];

      if (response && response.data && Array.isArray(response.data)) {
        customers = response.data;
        console.log(`🎯 Successfully extracted ${customers.length} customers from response.data`);
      } else if (Array.isArray(response)) {
        // If response is directly an array (fallback)
        customers = response;
        console.log(`🎯 Response is directly an array with ${customers.length} customers`);
      } else {
        console.error('❌ Could not extract customers array from response');
        console.error('Response structure:', {
          hasResponse: !!response,
          responseType: typeof response,
          hasData: !!(response?.data),
          dataType: typeof response?.data,
          dataIsArray: Array.isArray(response?.data),
          responseKeys: response ? Object.keys(response) : 'no response',
          fullResponse: response
        });
        this.applyFilters();
        return;
      }

      // Ensure customers is always an array
      if (!Array.isArray(customers)) {
        console.error('❌ customers is not an array after parsing:', customers);
        this.applyFilters();
        return;
      }

      console.log(`📋 Found ${customers.length} customers in Stripe`);

      // Transform Stripe customers into Company objects
      const companiesFromStripe = await Promise.all(
        customers.map(async (stripeCustomer: any) => {
          try {
            // Fetch additional Stripe data for each customer
            const [subscriptions, paymentMethods, invoices] = await Promise.all([
              this.stripeService.getSubscriptions(stripeCustomer.id).toPromise().catch(() => []),
              this.stripeService.getPaymentMethods(stripeCustomer.id).toPromise().catch(() => []),
              this.stripeService.getInvoices(stripeCustomer.id).toPromise().catch(() => [])
            ]);

            // Get the active subscription if available
            const activeSubscription = subscriptions?.find((sub: any) => sub.status === 'active') || null;

            // Get the most recent payment method
            const defaultPaymentMethod = paymentMethods?.[0] || null;

            // Calculate billing information from invoices
            const paidInvoices = invoices?.filter((inv: any) => inv.status === 'paid') || [];
            const lastPaidInvoice = paidInvoices.sort((a: any, b: any) => b.created - a.created)[0];

            // Determine subscription plan from Stripe metadata or price
            let subscriptionPlan: 'basic' | 'professional' | 'enterprise' = 'basic';
            let monthlyAmount = 0;

            if (activeSubscription?.items?.data?.[0]?.price) {
              const price = activeSubscription.items.data[0].price;
              monthlyAmount = price.unit_amount / 100; // Convert from cents

              // Determine plan based on amount or metadata
              if (price.metadata?.plan) {
                subscriptionPlan = price.metadata.plan as 'basic' | 'professional' | 'enterprise';
              } else if (monthlyAmount <= 50) {
                subscriptionPlan = 'basic';
              } else if (monthlyAmount <= 150) {
                subscriptionPlan = 'professional';
              } else {
                subscriptionPlan = 'enterprise';
              }
            }

            // Extract domain from metadata or email
            const domain = stripeCustomer.metadata?.domain ||
              stripeCustomer.email?.split('@')[1] ||
              `${stripeCustomer.name?.toLowerCase().replace(/\s+/g, '')}.com` ||
              'example.com';

            // Create Company object from Stripe data
            const company: Company = {
              id: stripeCustomer.id, // Use Stripe customer ID as company ID
              name: stripeCustomer.name || stripeCustomer.email || 'Unnamed Company',
              domain: domain,
              logo: stripeCustomer.metadata?.logo || '',
              contactEmail: stripeCustomer.email || '',
              phone: stripeCustomer.phone || '',
              status: activeSubscription ?
                (activeSubscription.status === 'active' ? 'active' : 'pending') :
                'inactive',
              subscriptionPlan: subscriptionPlan,
              monthlyAmount: monthlyAmount,
              userCount: parseInt(stripeCustomer.metadata?.userCount || '1'),
              lastBilling: lastPaidInvoice ? new Date(lastPaidInvoice.created * 1000) : new Date(),
              nextBilling: activeSubscription?.current_period_end ?
                new Date(activeSubscription.current_period_end * 1000) :
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              createdDate: new Date(stripeCustomer.created * 1000),
              billingCycle: activeSubscription?.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
              lastFourDigits: defaultPaymentMethod?.card?.last4 || '0000',
              autoRenewal: activeSubscription?.cancel_at_period_end === false,
              monthlyPageViews: parseInt(stripeCustomer.metadata?.monthlyPageViews || '0'),
              activeAddons: stripeCustomer.metadata?.activeAddons ?
                JSON.parse(stripeCustomer.metadata.activeAddons) : [],
              // Stripe-related fields
              stripeCustomerId: stripeCustomer.id,
              stripeSubscriptionId: activeSubscription?.id,
              stripePaymentMethodId: defaultPaymentMethod?.id,
              stripeSubscriptionStatus: activeSubscription?.status as any,
              stripeMetadata: stripeCustomer.metadata || {},
              stripeSyncStatus: 'synced',
              lastStripeSyncDate: new Date()
            };

            console.log(`✅ Processed customer: ${company.name} (${company.stripeCustomerId})`);
            return company;

          } catch (error) {
            console.error(`❌ Error processing customer ${stripeCustomer.id}:`, error);

            // Return minimal company object on error
            return {
              id: stripeCustomer.id,
              name: stripeCustomer.name || stripeCustomer.email || 'Error Loading',
              domain: 'unknown.com',
              contactEmail: stripeCustomer.email || '',
              phone: stripeCustomer.phone || '',
              status: 'inactive' as const,
              subscriptionPlan: 'basic' as const,
              monthlyAmount: 0,
              userCount: 1,
              lastBilling: new Date(),
              nextBilling: new Date(),
              createdDate: new Date(stripeCustomer.created * 1000),
              billingCycle: 'monthly' as const,
              lastFourDigits: '0000',
              autoRenewal: false,
              monthlyPageViews: 0,
              activeAddons: [],
              stripeCustomerId: stripeCustomer.id,
              stripeSyncStatus: 'error' as const,
              lastStripeSyncDate: new Date()
            } as Company;
          }
        })
      );

      this.companies = companiesFromStripe;
      console.log(`📊 Loaded ${this.companies.length} companies from Stripe`);

      this.applyFilters();

    } catch (error) {
      console.error('❌ Critical error loading companies from Stripe:', error);
      this.applyFilters();

      // Show user-friendly error message
      alert(`Unable to load live data from Stripe at the moment. Showing demo data.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try refreshing the page or contact support if the issue persists.`);
    }
  }

  async addSiteToDb(company: Company) {
    try {
      console.log(`📝 Creating new Stripe customer for: ${company.name}`);

      // Create Stripe customer
      const stripeCustomer = await this.stripeService.createCustomer({
        name: company.name,
        email: company.contactEmail,
        phone: company.phone,
        companyId: company.id,
        metadata: {
          domain: company.domain,
          plan: company.subscriptionPlan,
          userCount: company.userCount.toString(),
          monthlyPageViews: company.monthlyPageViews.toString(),
          activeAddons: JSON.stringify(company.activeAddons || [])
        }
      }).toPromise();

      // Update company with Stripe customer ID
      company.stripeCustomerId = stripeCustomer.id;
      company.stripeSyncStatus = 'synced';
      company.lastStripeSyncDate = new Date();

      console.log(`✅ Successfully created Stripe customer: ${stripeCustomer.id}`);

      // Reload the companies list to include the new company
      await this.loadSitesFromDb();

    } catch (error) {
      console.error('❌ Error creating Stripe customer:', error);
      company.stripeSyncStatus = 'error';
      throw error;
    }
  }

  async editSiteInDb(company: Company) {
    try {
      if (!company.stripeCustomerId) {
        console.warn(`⚠️ No Stripe customer ID for ${company.name}, creating new customer`);
        await this.addSiteToDb(company);
        return;
      }

      console.log(`📝 Updating Stripe customer: ${company.stripeCustomerId}`);

      // Update Stripe customer
      const updatedCustomer = await this.stripeService.updateCustomer(company.stripeCustomerId, {
        name: company.name,
        email: company.contactEmail,
        phone: company.phone,
        metadata: {
          domain: company.domain,
          plan: company.subscriptionPlan,
          userCount: company.userCount.toString(),
          monthlyPageViews: company.monthlyPageViews.toString(),
          activeAddons: JSON.stringify(company.activeAddons || []),
          status: company.status,
          lastUpdated: new Date().toISOString()
        }
      }).toPromise();

      // Update sync status
      company.stripeSyncStatus = 'synced';
      company.lastStripeSyncDate = new Date();

      console.log(`✅ Successfully updated Stripe customer: ${company.stripeCustomerId}`);

      // Reload the companies list to reflect changes
      await this.loadSitesFromDb();

    } catch (error) {
      console.error('❌ Error updating Stripe customer:', error);
      company.stripeSyncStatus = 'error';
      throw error;
    }
  }

  async softDeleteSite(company: Company) {
    try {
      console.log(`🗑️ Soft deleting company: ${company.name}`);

      // Update status to inactive
      company.status = 'inactive';

      // Cancel any active subscriptions in Stripe
      if (company.stripeSubscriptionId) {
        await this.stripeService.cancelSubscription(company.stripeSubscriptionId, false).toPromise();
        console.log(`🛑 Cancelled subscription for ${company.name}`);
      }

      // Update the customer in Stripe with inactive status
      await this.editSiteInDb(company);

    } catch (error) {
      console.error('❌ Error soft deleting company:', error);
      throw error;
    }
  }

  async ngOnInit(): Promise<void> {
    // Ensure subTab defaults to 'Home' if not provided
    if (!this.subTab || this.subTab.trim() === '') {
      this.subTab = 'Home';
    }
    // Load data asynchronously and emit child tabs
    await Promise.all([
      this.emitChildTabs()
    ]);
    this.loadSitesFromDb();

    // Initialize Stripe metadata for existing companies
    this.initializeStripeMetadata();
  }

  private initializeStripeMetadata(): void {
    // Ensure all existing companies have the new Stripe fields initialized
    this.companies.forEach(company => {
      if (!company.stripeSyncStatus) {
        company.stripeSyncStatus = 'pending';
      }
      if (!company.stripeMetadata) {
        company.stripeMetadata = {
          companyId: company.id.toString(),
          plan: company.subscriptionPlan,
          domain: company.domain
        };
      }
    });
  }

  private async emitChildTabs(): Promise<void> {
    // Emit available section IDs to parent components
    this.childTabs.emit(this.sectionIds);
  }


  // Tab Management Methods
  setActiveTab(tabId: string): void {
    if (this.availableTabs.find(tab => tab.id === tabId)) {
      console.log('🔄 Switching to tab:', tabId);
      this.activeTab = tabId;

      // If switching to subscription tab, ensure subscription data is loaded
      if (tabId === 'subscription' && this.selectedCompany?.stripeCustomerId) {
        console.log('📊 Loading subscriptions for subscription tab');
        this.loadCustomerSubscriptions(this.selectedCompany);
      }
    }
  }

  isTabActive(tabId: string): boolean {
    return this.activeTab === tabId;
  }

  getTabLabel(tabId: string): string {
    const tab = this.availableTabs.find(t => t.id === tabId);
    return tab ? tab.label : tabId;
  }

  getTabIcon(tabId: string): string {
    const tab = this.availableTabs.find(t => t.id === tabId);
    return tab ? tab.icon : 'fa-file';
  }

  navigateToNextTab(): void {
    const currentIndex = this.availableTabs.findIndex(tab => tab.id === this.activeTab);
    const nextIndex = (currentIndex + 1) % this.availableTabs.length;
    this.setActiveTab(this.availableTabs[nextIndex].id);
  }

  navigateToPreviousTab(): void {
    const currentIndex = this.availableTabs.findIndex(tab => tab.id === this.activeTab);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : this.availableTabs.length - 1;
    this.setActiveTab(this.availableTabs[prevIndex].id);
  }

  // Search and filter methods
  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredCompanies = this.companies.filter(company => {
      const matchesSearch = !this.searchQuery ||
        company.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        company.domain.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        company.contactEmail.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesStatus = !this.statusFilter || company.status === this.statusFilter;
      const matchesSubscription = !this.subscriptionFilter || company.subscriptionPlan === this.subscriptionFilter;

      return matchesSearch && matchesStatus && matchesSubscription;
    });
  }
  closeModal() {
    this.showAddCompanyModal = false;
    this.newCompany = { subscriptionPlan: 'basic' };
    this.stripeSyncErrors = [];
    this.stripeLoading = false;
    this.selectedTab = 'client-companies';
    this.selectedTabChange.emit(this.selectedTab);
  }

  // Company selection and management
  selectCompany(company: Company): void {
    this.selectedCompany = company;
    this.activeTab = 'overview';
    this.selectedAddons = [];

    // Load customer's add-ons and subscriptions for the new tab
    this.loadCustomerAddons(company);
    this.loadCustomerSubscriptions(company);

    // Load comprehensive Stripe data for overview if customer has Stripe ID
    if (company.stripeCustomerId) {
      this.loadStripeOverviewData(company);
    } else {
      // Clear previous Stripe data if no customer ID
      this.stripeCustomerData = null;
      this.stripeSubscriptionsData = [];
      this.stripeInvoicesData = [];
      this.stripePaymentMethodsData = [];
      this.stripeChargesData = [];
    }
  }

  closeDetails(): void {
    this.selectedCompany = null;
    this.selectedTab = 'client-companies';
    this.selectedTabChange.emit(this.selectedTab);
  }

  // Utility methods
  getCompanyInitials(name: string): string {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  }

  getRelativeDate(date: Date): string {
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    return this.formatDate(date);
  }

  formatDate(date: Date | string | number): string {
    if (!date) return 'N/A';

    let dateObj: Date;
    if (typeof date === 'number') {
      // Handle Unix timestamp (Stripe format)
      dateObj = new Date(date * 1000);
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }

    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatStripeTimestamp(timestamp: number): string {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getMonthsActive(createdDate: Date): number {
    const months = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    return Math.max(1, months);
  }

  getTotalRevenue(company: Company): number {
    const monthsActive = this.getMonthsActive(company.createdDate);
    return company.monthlyAmount * monthsActive;
  }

  // Action methods
  viewSite(company: Company): void {
    window.open(`https://${company.domain}`, '_blank');
  }

  manageBilling(company: Company): void {
    this.selectCompany(company);
    this.activeTab = 'billing';
  }

  editCompany(company: Company): void {
    const updatedInfo = prompt(`Edit company name (current: ${company.name}):`, company.name);
    if (updatedInfo && updatedInfo.trim() !== company.name) {
      company.name = updatedInfo.trim();
      this.editSiteInDb(company);
      alert(`Company "${company.name}" has been updated successfully!`);
    }
  }

  // Overview tab methods
  getRecentActivity(company: Company): Activity[] {
    // Mock recent activity data
    return [
      {
        id: 1,
        type: 'payment',
        icon: 'fa fa-credit-card',
        description: `Payment of $${company.monthlyAmount} received`,
        date: company.lastBilling
      },
      {
        id: 2,
        type: 'login',
        icon: 'fa fa-sign-in-alt',
        description: 'Admin user logged in',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 3,
        type: 'update',
        icon: 'fa fa-edit',
        description: 'Website content updated',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    ];
  }

  // Billing tab methods
  getTotalPaid(company: Company): number {
    return this.getTotalRevenue(company);
  }

  getOutstanding(company: Company): number {
    // Mock outstanding amount
    return company.status === 'suspended' ? company.monthlyAmount : 0;
  }

  getBillingHistory(company: Company): BillingRecord[] {
    const history: BillingRecord[] = [];
    const monthsActive = this.getMonthsActive(company.createdDate);

    for (let i = 0; i < Math.min(monthsActive, 12); i++) {
      const date = new Date(company.lastBilling);
      date.setMonth(date.getMonth() - i);

      history.push({
        id: i + 1,
        date: date,
        description: `Monthly subscription - ${company.subscriptionPlan} plan`,
        amount: company.monthlyAmount,
        status: i === 0 && company.status === 'suspended' ? 'failed' : 'paid'
      });
    }

    return history;
  }

  viewInvoice(bill: BillingRecord): void {
    // Simulate opening invoice in new tab
    const invoiceData = {
      id: bill.id,
      date: bill.date,
      amount: bill.amount,
      description: bill.description,
      status: bill.status
    };

    console.log('Opening invoice:', invoiceData);

    // Create a simple invoice display
    const invoiceWindow = window.open('', '_blank', 'width=800,height=600');
    if (invoiceWindow) {
      invoiceWindow.document.write(`
        <html>
          <head>
            <title>Invoice #${bill.id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
              .invoice-details { margin: 20px 0; }
              .status { padding: 5px 10px; border-radius: 5px; font-weight: bold; }
              .paid { background: #d4edda; color: #155724; }
              .pending { background: #fff3cd; color: #856404; }
              .failed { background: #f8d7da; color: #721c24; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Invoice #${bill.id}</h1>
              <p>Date: ${this.formatDate(bill.date)}</p>
            </div>
            <div class="invoice-details">
              <h3>Service Details</h3>
              <p><strong>Description:</strong> ${bill.description}</p>
              <p><strong>Amount:</strong> $${bill.amount}</p>
              <p><strong>Status:</strong> 
                <span class="status ${bill.status}">${bill.status.toUpperCase()}</span>
              </p>
            </div>
            <div style="margin-top: 40px;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Print Invoice
              </button>
            </div>
          </body>
        </html>
      `);
      invoiceWindow.document.close();
    }
  }

  // Subscription tab methods
  getPlanFeatures(plan: string): string[] {
    const features = {
      basic: [
        'Up to 10 users',
        'Basic support',
        '1GB storage',
        'Standard templates'
      ],
      professional: [
        'Up to 50 users',
        'Priority support',
        '10GB storage',
        'Premium templates',
        'Custom domain'
      ],
      enterprise: [
        'Unlimited users',
        '24/7 support',
        'Unlimited storage',
        'Custom development',
        'Advanced analytics'
      ]
    };
    return features[plan as keyof typeof features] || [];
  }

  changePlan(company: Company): void {
    const plans = [
      { name: 'Basic', value: 'basic', price: 29 },
      { name: 'Professional', value: 'professional', price: 79 },
      { name: 'Enterprise', value: 'enterprise', price: 199 }
    ];

    const currentPlan = company.subscriptionPlan;
    const availablePlans = plans.filter(p => p.value !== currentPlan);

    let planOptions = `Current plan: ${currentPlan} ($${company.monthlyAmount}/month)\n\nSelect new plan:\n`;
    availablePlans.forEach((plan, index) => {
      planOptions += `${index + 1}. ${plan.name} - $${plan.price}/month\n`;
    });

    const choice = prompt(planOptions + '\nEnter plan number (1-' + availablePlans.length + '):');

    if (choice && !isNaN(Number(choice))) {
      const selectedIndex = Number(choice) - 1;
      if (selectedIndex >= 0 && selectedIndex < availablePlans.length) {
        const newPlan = availablePlans[selectedIndex];

        // Calculate prorated amount
        const oldAmount = company.monthlyAmount;
        const newAmount = newPlan.price;
        const difference = newAmount - oldAmount;

        if (confirm(`Change plan from ${currentPlan} to ${newPlan.value}?\n\nNew monthly amount: $${newAmount}\nDifference: ${difference > 0 ? '+' : ''}$${difference}`)) {
          company.subscriptionPlan = newPlan.value as 'basic' | 'professional' | 'enterprise';
          company.monthlyAmount = newAmount;

          alert(`Plan changed successfully!\nNew plan: ${newPlan.name}\nNew monthly amount: $${newAmount}`);
          console.log('Plan changed for:', company);
        }
      }
    }
  }

  // Add-ons tab methods
  isAddonActive(company: Company, addonId: number): boolean {
    return company.activeAddons.includes(addonId);
  }

  addAddon(company: Company, addon: Addon): void {
    if (!this.selectedAddons.find(a => a.id === addon.id)) {
      this.selectedAddons.push(addon);

      // Show immediate feedback
      const setupFeeText = addon.setupFee ? ` (+ $${addon.setupFee} setup fee)` : '';
      alert(`Added "${addon.name}" to your plan!\n\nMonthly cost: $${addon.monthlyPrice}${setupFeeText}\n\nClick "Apply Changes" to confirm.`);
    }
  }

  removeAddon(company: Company, addon: Addon): void {
    // Remove from active addons if currently active
    if (company.activeAddons.includes(addon.id)) {
      if (confirm(`Remove "${addon.name}" from your plan?\n\nThis will reduce your monthly bill by $${addon.monthlyPrice}.`)) {
        company.activeAddons = company.activeAddons.filter(id => id !== addon.id);
        company.monthlyAmount -= addon.monthlyPrice;
        alert(`"${addon.name}" has been removed from your plan.`);
      }
    } else {
      // Remove from selected addons if pending
      this.selectedAddons = this.selectedAddons.filter(a => a.id !== addon.id);
    }
  }

  getNewMonthlyTotal(company: Company): number {
    const addonTotal = this.selectedAddons.reduce((sum, addon) => sum + addon.monthlyPrice, 0);
    return company.monthlyAmount + addonTotal;
  }

  getSetupFees(): number {
    return this.selectedAddons.reduce((sum, addon) => sum + (addon.setupFee || 0), 0);
  }

  confirmAddonChanges(company: Company): void {
    if (this.selectedAddons.length === 0) {
      alert('No addon changes to apply.');
      return;
    }

    const totalMonthlyIncrease = this.selectedAddons.reduce((sum, addon) => sum + addon.monthlyPrice, 0);
    const totalSetupFees = this.getSetupFees();
    const newMonthlyTotal = company.monthlyAmount + totalMonthlyIncrease;

    let confirmMessage = `Confirm addon changes:\n\n`;
    this.selectedAddons.forEach(addon => {
      const setupFee = addon.setupFee ? ` + $${addon.setupFee} setup` : '';
      confirmMessage += `• ${addon.name}: $${addon.monthlyPrice}/month${setupFee}\n`;
    });
    confirmMessage += `\nNew monthly total: $${newMonthlyTotal}`;
    if (totalSetupFees > 0) {
      confirmMessage += `\nOne-time setup fees: $${totalSetupFees}`;
    }
    confirmMessage += `\n\nProceed with changes?`;

    if (confirm(confirmMessage)) {
      // Apply addon changes
      this.selectedAddons.forEach(addon => {
        if (!company.activeAddons.includes(addon.id)) {
          company.activeAddons.push(addon.id);
          company.monthlyAmount += addon.monthlyPrice;
        }
      });

      // Create billing record for setup fees if any
      if (totalSetupFees > 0) {
        console.log(`Setup fees charged: $${totalSetupFees}`);
      }

      const addedAddons = this.selectedAddons.map(a => a.name).join(', ');
      alert(`Addon changes applied successfully!\n\nAdded: ${addedAddons}\nNew monthly total: $${company.monthlyAmount}`);

      this.selectedAddons = [];
      console.log('Applied addon changes to:', company);
    }
  }

  // Settings tab methods
  suspendCompany(company: Company): void {
    if (company.status === 'suspended') {
      alert('Company is already suspended.');
      return;
    }

    const reason = prompt('Reason for suspension (optional):') || 'Administrative action';

    if (confirm(`Suspend ${company.name}?\n\nThis will:\n• Stop billing\n• Disable website access\n• Prevent user logins\n\nReason: ${reason}`)) {
      company.status = 'suspended';
      alert(`${company.name} has been suspended.`);
      console.log('Suspended company:', company, 'Reason:', reason);
    }
  }

  reactivateCompany(company: Company): void {
    if (company.status === 'active') {
      alert('Company is already active.');
      return;
    }

    if (confirm(`Reactivate ${company.name}?\n\nThis will:\n• Resume billing\n• Restore website access\n• Allow user logins`)) {
      company.status = 'active';
      alert(`${company.name} has been reactivated.`);
      console.log('Reactivated company:', company);
    }
  }

  deleteCompany(company: Company): void {
    if (confirm(`Soft delete ${company.name}? This will set status to 'inactive'.`)) {
      this.softDeleteSite(company);
      alert(`${company.name} has been soft deleted (status set to inactive).`);
    }
  }

  // Modal methods
  addNewCompany(): void {
    // Validate required fields
    if (!this.newCompany.name?.trim()) {
      alert('Company name is required.');
      return;
    }

    if (!this.newCompany.domain?.trim()) {
      alert('Domain is required.');
      return;
    }

    if (!this.newCompany.contactEmail?.trim()) {
      alert('Contact email is required.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newCompany.contactEmail)) {
      alert('Please enter a valid email address.');
      return;
    }

    // Check for duplicate domain
    if (this.companies.some(c => c.domain.toLowerCase() === this.newCompany.domain?.toLowerCase())) {
      alert('A company with this domain already exists.');
      return;
    }

    const planPricing = {
      basic: 29,
      professional: 79,
      enterprise: 199
    };
    const selectedPlan = this.newCompany.subscriptionPlan || 'basic';
    const monthlyAmount = planPricing[selectedPlan as keyof typeof planPricing];

    // Generate a safe company ID - use a timestamp-based ID for uniqueness
    const companyId = Date.now().toString(); // Simple unique ID generation

    const company: Company = {
      id: companyId,
      name: this.newCompany.name.trim(),
      domain: this.newCompany.domain.trim().toLowerCase(),
      contactEmail: this.newCompany.contactEmail.trim().toLowerCase(),
      phone: this.newCompany.phone?.trim(),
      status: 'active', // Set to active instead of pending since we're not creating Stripe customer
      subscriptionPlan: selectedPlan as 'basic' | 'professional' | 'enterprise',
      monthlyAmount: monthlyAmount,
      userCount: 1,
      lastBilling: new Date(),
      nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdDate: new Date(),
      billingCycle: 'monthly',
      lastFourDigits: '0000',
      autoRenewal: true,
      monthlyPageViews: 0,
      activeAddons: [],
      // Stripe fields - left empty for manual creation later
      stripeSyncStatus: 'pending',
      stripeMetadata: {
        plan: selectedPlan,
        companyId: companyId.toString()
      }
    };

    // Create company locally without Stripe integration
    this.createCompanyLocally(company);
  }

  private createCompanyLocally(company: Company): void {
    // Create company in Stripe (which will automatically reload the companies list)
    this.addSiteToDb(company);

    // Close modal and reset form
    this.showAddCompanyModal = false;
    this.newCompany = { subscriptionPlan: 'basic' };

    // Show success message
    alert(`${company.name} has been added successfully!\n\nPlan: ${company.subscriptionPlan}\nMonthly amount: $${company.monthlyAmount}\n\nStripe customer created automatically.`);

    // Select the new company after a brief delay to allow for reload
    setTimeout(() => {
      const createdCompany = this.companies.find(c => c.name === company.name && c.contactEmail === company.contactEmail);
      if (createdCompany) {
        this.selectCompany(createdCompany);
      }
    }, 1000);
  }

  private createCompanyWithStripe(company: Company): void {
    this.stripeLoading = true;
    this.stripeSyncErrors = [];

    // Use the same Stripe-first approach as createCompanyLocally
    this.addSiteToDb(company).then(() => {
      // Close modal and reset form
      this.showAddCompanyModal = false;
      this.newCompany = { subscriptionPlan: 'basic' };
      this.stripeLoading = false;

      // Show success message
      alert(`${company.name} has been created successfully in Stripe!\n\nPlan: ${company.subscriptionPlan}\nMonthly amount: $${company.monthlyAmount}`);

      // Select the new company after reload
      setTimeout(() => {
        const createdCompany = this.companies.find(c => c.name === company.name && c.contactEmail === company.contactEmail);
        if (createdCompany) {
          this.selectCompany(createdCompany);
        }
      }, 1000);
    }).catch((error) => {
      console.error('Error creating Stripe customer:', error);
      this.stripeLoading = false;
      this.stripeSyncErrors.push(`Failed to create Stripe customer: ${error.message || 'Unknown error'}`);

      // Close modal and reset form
      this.showAddCompanyModal = false;
      this.newCompany = { subscriptionPlan: 'basic' };

      // Show error message
      alert(`Failed to create ${company.name} in Stripe.\n\nError: ${error.message || 'Unknown error'}\n\nPlease try again.`);
    });
  }

  // Additional utility methods for enhanced functionality
  saveCompanySettings(): void {
    if (this.selectedCompany) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.selectedCompany.contactEmail)) {
        alert('Please enter a valid email address.');
        return;
      }

      // Validate domain format
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(this.selectedCompany.domain)) {
        alert('Please enter a valid domain name (e.g., example.com).');
        return;
      }

      // Save to Stripe
      this.editSiteInDb(this.selectedCompany);

      alert('Company settings saved successfully!');
    }
  }

  // Form field update methods for settings tab
  updateCompanyName(name: string): void {
    if (this.selectedCompany) {
      this.selectedCompany.name = name.trim();
    }
  }

  updateCompanyDomain(domain: string): void {
    if (this.selectedCompany) {
      this.selectedCompany.domain = domain.trim().toLowerCase();
    }
  }

  updateCompanyEmail(email: string): void {
    if (this.selectedCompany) {
      this.selectedCompany.contactEmail = email.trim().toLowerCase();
    }
  }

  updateCompanyPhone(phone: string): void {
    if (this.selectedCompany) {
      this.selectedCompany.phone = phone.trim();
    }
  }

  updateCompanyStatus(status: string): void {
    if (this.selectedCompany && this.selectedCompany.status !== status) {
      const validStatuses: ('active' | 'inactive' | 'pending' | 'suspended')[] = ['active', 'inactive', 'pending', 'suspended'];
      if (validStatuses.includes(status as any)) {
        const confirmMessage = `Change status from "${this.selectedCompany.status}" to "${status}"?`;
        if (confirm(confirmMessage)) {
          this.selectedCompany.status = status as 'active' | 'inactive' | 'pending' | 'suspended';
          console.log(`Company status updated to: ${status}`);
        }
      }
    }
  }

  cancelSettingsChanges(): void {
    if (confirm('Cancel all unsaved changes?')) {
      // Reload company data from the original source
      this.loadSitesFromDb();
      console.log('Settings changes cancelled');
    }
  }

  exportBillingData(company: Company): void {
    const billingHistory = this.getBillingHistory(company);
    const csvContent = [
      ['Date', 'Description', 'Amount', 'Status'],
      ...billingHistory.map(bill => [
        this.formatDate(bill.date),
        bill.description,
        bill.amount.toString(),
        bill.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${company.name}_billing_history.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  sendPaymentReminder(company: Company): void {
    if (company.status === 'suspended') {
      const confirmSend = confirm(`Send payment reminder to ${company.contactEmail}?\n\nThis will notify them about their outstanding balance of $${this.getOutstanding(company)}.`);

      if (confirmSend) {
        // Simulate sending email
        alert(`Payment reminder sent to ${company.contactEmail}!`);
        console.log('Payment reminder sent to:', company);
      }
    } else {
      alert('No outstanding payments for this company.');
    }
  }

  toggleAutoRenewal(company: Company): void {
    const action = company.autoRenewal ? 'disable' : 'enable';

    if (confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} auto-renewal for ${company.name}?`)) {
      company.autoRenewal = !company.autoRenewal;
      alert(`Auto-renewal has been ${company.autoRenewal ? 'enabled' : 'disabled'}.`);
      console.log('Auto-renewal toggled for:', company);
    }
  }

  generateInvoice(company: Company): void {
    const nextBilling = company.nextBilling;
    const amount = company.monthlyAmount;

    const confirmGenerate = confirm(`Generate invoice for ${company.name}?\n\nAmount: $${amount}\nDue date: ${this.formatDate(nextBilling)}`);

    if (confirmGenerate) {
      // Create new billing record
      const newInvoice: BillingRecord = {
        id: Date.now(),
        date: nextBilling,
        description: `Monthly subscription - ${company.subscriptionPlan} plan`,
        amount: amount,
        status: 'pending'
      };

      alert(`Invoice generated for ${company.name}!\n\nInvoice #${newInvoice.id}\nAmount: $${amount}`);
      console.log('Generated invoice:', newInvoice);
    }
  }

  // Stripe Management Methods
  syncCompanyWithStripe(company: Company): void {
    if (!company.stripeCustomerId) {
      this.createStripeCustomerForExistingCompany(company);
      return;
    }

    this.stripeLoading = true;
    this.stripeSyncErrors = [];

    // Get latest data from Stripe
    forkJoin({
      customer: this.stripeService.getCustomer(company.stripeCustomerId),
      subscriptions: this.stripeService.getSubscriptions(company.stripeCustomerId)
    }).subscribe({
      next: (result) => {
        console.log('Stripe sync data:', result);

        // Update company with Stripe data
        if (result.customer) {
          company.stripeSyncStatus = 'synced';
          company.lastStripeSyncDate = new Date();

          // Sync subscription data if available
          if (result.subscriptions && result.subscriptions.length > 0) {
            const activeSubscription = result.subscriptions.find(sub => sub.status === 'active');
            if (activeSubscription) {
              company.stripeSubscriptionId = activeSubscription.id;
              company.stripeSubscriptionStatus = activeSubscription.status;

              // Update billing amounts from Stripe
              if (activeSubscription.items?.data?.[0]?.price) {
                const stripeAmount = activeSubscription.items.data[0].price.unit_amount / 100;
                company.monthlyAmount = stripeAmount;
              }
            }
          }
        }

        this.stripeLoading = false;
        alert(`Successfully synced ${company.name} with Stripe!`);
      },
      error: (error) => {
        console.error('Error syncing with Stripe:', error);
        this.stripeLoading = false;
        this.stripeSyncErrors.push(`Sync failed: ${error.message || 'Unknown error'}`);
        company.stripeSyncStatus = 'error';
        alert(`Failed to sync ${company.name} with Stripe. Check console for details.`);
      }
    });
  }

  createStripeCustomerForExistingCompany(company: Company): void {
    this.stripeLoading = true;

    this.stripeService.createCustomer({
      name: company.name,
      email: company.contactEmail,
      phone: company.phone,
      companyId: company.id.toString(),
      metadata: {
        companyId: company.id.toString(),
        domain: company.domain,
        plan: company.subscriptionPlan,
        migratedFromLocal: 'true'
      }
    }).subscribe({
      next: (stripeCustomer) => {
        console.log('Stripe customer created for existing company:', stripeCustomer);

        company.stripeCustomerId = stripeCustomer.id;
        company.stripeSyncStatus = 'synced';
        company.lastStripeSyncDate = new Date();

        // Update company in Stripe
        this.editSiteInDb(company).then(() => {
          console.log('Company updated in Stripe with customer ID');
        }).catch((updateError) => {
          console.error('Failed to update company in Stripe:', updateError);
        });

        this.stripeLoading = false;
        alert(`Successfully created Stripe customer for ${company.name}!\n\nCustomer ID: ${stripeCustomer.id}`);
      },
      error: (error) => {
        console.error('Error creating Stripe customer for existing company:', error);
        this.stripeLoading = false;
        this.stripeSyncErrors.push(`Failed to create customer: ${error.message || 'Unknown error'}`);
        company.stripeSyncStatus = 'error';
        alert(`Failed to create Stripe customer for ${company.name}. Check console for details.`);
      }
    });
  }

  createStripeSubscriptionForCompany(company: Company, priceId: string): void {
    console.log('createStripeSubscriptionForCompany called with:', { company: company.name, customerId: company.stripeCustomerId, priceId });

    if (!company.stripeCustomerId) {
      console.error('Company missing stripeCustomerId:', company);
      alert('Company must have a Stripe customer before creating subscription.');
      return;
    }

    if (!priceId) {
      console.error('Missing priceId for subscription creation');
      alert('Invalid price ID for subscription creation.');
      return;
    }

    // First, check if the customer has payment methods
    this.stripeLoading = true;

    this.stripeService.getPaymentMethods(company.stripeCustomerId!).subscribe({
      next: (paymentMethods) => {
        console.log('Payment methods for customer:', paymentMethods);

        if (!paymentMethods || paymentMethods.length === 0) {
          this.stripeLoading = false;
          alert(`Cannot create subscription for ${company.name}.\n\nReason: No payment method attached to customer.\n\nPlease add a payment method in the Billing tab first, then try creating the subscription again.`);
          return;
        }

        // Payment methods exist, proceed with subscription creation
        this.proceedWithSubscriptionCreation(company, priceId);
      },
      error: (error) => {
        console.error('Error checking payment methods:', error);
        this.stripeLoading = false;
        alert(`Failed to verify payment methods for ${company.name}. Please check the Billing tab and ensure a payment method is configured.`);
      }
    });
  }

  private proceedWithSubscriptionCreation(company: Company, priceId: string): void {
    console.log('Creating subscription with data:', {
      customerId: company.stripeCustomerId,
      priceId: priceId,
      metadata: {
        companyId: company.id.toString(),
        plan: company.subscriptionPlan
      }
    });

    this.stripeService.createSubscription({
      customerId: company.stripeCustomerId!,
      priceId: priceId,
      metadata: {
        companyId: company.id.toString(),
        plan: company.subscriptionPlan
      }
    }).subscribe({
      next: (subscription) => {
        console.log('=== SUBSCRIPTION CREATION DEBUG ===');
        console.log('Raw subscription response:', subscription);
        console.log('Subscription type:', typeof subscription);
        console.log('Subscription keys:', subscription ? Object.keys(subscription) : 'null/undefined');
        console.log('Subscription.id:', subscription?.id);
        console.log('Subscription.id type:', typeof subscription?.id);
        console.log('JSON stringified:', JSON.stringify(subscription, null, 2));
        console.log('=== END DEBUG ===');

        if (!subscription || !subscription.id) {
          console.error('❌ Subscription object is missing or has no ID');
          this.stripeLoading = false;
          alert(`Failed to create subscription for ${company.name}.\n\nReason: Invalid subscription response (missing ID)`);
          return;
        }

        company.stripeSubscriptionId = subscription.id;
        company.stripeSubscriptionStatus = subscription.status;
        company.status = subscription.status === 'active' ? 'active' : 'pending';

        this.stripeLoading = false;
        alert(`Successfully created subscription for ${company.name}!\n\nSubscription ID: ${subscription.id}`);

        // Refresh subscription data by reloading the overview data
        this.loadStripeOverviewData(company);
      },
      error: (error) => {
        console.error('Error creating Stripe subscription:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        this.stripeLoading = false;

        // Provide specific error messages based on the error type
        let errorMessage = `Failed to create subscription for ${company.name}.`;

        if (error.message && error.message.includes('payment source')) {
          errorMessage += '\n\nReason: No payment method attached to customer.\nPlease add a payment method in the Billing tab first.';
        } else if (error.message && error.message.includes('payment method')) {
          errorMessage += '\n\nReason: Invalid or missing payment method.\nPlease check the Billing tab and ensure a valid payment method is configured.';
        } else if (error.message) {
          errorMessage += `\n\nDetails: ${error.message}`;
        } else {
          errorMessage += '\n\nCheck the browser console for more details.';
        }

        this.stripeSyncErrors.push(`Failed to create subscription: ${error.message || 'Unknown error'}`);
        alert(errorMessage);
      }
    });
  }

  cancelStripeSubscription(company: Company, immediate: boolean = false): void {
    if (!company.stripeSubscriptionId) {
      alert('No active subscription found for this company.');
      return;
    }

    const confirmMessage = immediate
      ? `Cancel subscription immediately for ${company.name}? This cannot be undone.`
      : `Cancel subscription for ${company.name} at the end of the current billing period?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    this.stripeLoading = true;

    this.stripeService.cancelSubscription(company.stripeSubscriptionId, !immediate).subscribe({
      next: (subscription) => {
        console.log('Stripe subscription cancelled:', subscription);

        company.stripeSubscriptionStatus = subscription.status;
        if (immediate) {
          company.status = 'inactive';
        }

        this.stripeLoading = false;
        const message = immediate
          ? `Subscription cancelled immediately for ${company.name}.`
          : `Subscription scheduled for cancellation at period end for ${company.name}.`;
        alert(message);
      },
      error: (error) => {
        console.error('Error cancelling Stripe subscription:', error);
        this.stripeLoading = false;
        this.stripeSyncErrors.push(`Failed to cancel subscription: ${error.message || 'Unknown error'}`);
        alert(`Failed to cancel subscription for ${company.name}. Check console for details.`);
      }
    });
  }

  changeStripeSubscription(company: Company, newPriceId: string): void {
    if (!company.stripeSubscriptionId) {
      alert('No active subscription found for this company.');
      return;
    }

    if (!newPriceId) {
      alert('Please select a new subscription plan.');
      return;
    }

    const confirmMessage = `Change subscription plan for ${company.name}? This will take effect immediately.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    this.stripeLoading = true;

    // Check if StripeService has updateSubscription method, otherwise use createSubscription after canceling
    if (this.stripeService.updateSubscription) {
      this.stripeService.updateSubscription(company.stripeSubscriptionId, {
        priceId: newPriceId,
        metadata: {
          companyId: company.id.toString(),
          plan: company.subscriptionPlan
        }
      }).subscribe({
        next: (subscription) => {
          console.log('Stripe subscription updated:', subscription);
          company.stripeSubscriptionStatus = subscription.status;
          this.stripeLoading = false;
          alert(`Successfully changed subscription plan for ${company.name}!`);
        },
        error: (error) => {
          console.error('Error updating Stripe subscription:', error);
          this.stripeLoading = false;
          alert(`Failed to change subscription plan for ${company.name}. Check console for details.`);
        }
      });
    } else {
      // Fallback: Cancel current subscription and create new one
      this.stripeService.cancelSubscription(company.stripeSubscriptionId, true).subscribe({
        next: () => {
          // Create new subscription with new price
          this.createStripeSubscriptionForCompany(company, newPriceId);
        },
        error: (error) => {
          console.error('Error changing subscription:', error);
          this.stripeLoading = false;
          alert(`Failed to change subscription plan for ${company.name}. Check console for details.`);
        }
      });
    }
  }

  getStripeCustomerData(company: Company): void {
    if (!company.stripeCustomerId) {
      alert('No Stripe customer ID found for this company.');
      return;
    }

    this.stripeLoading = true;

    this.stripeService.getCustomer(company.stripeCustomerId).subscribe({
      next: (customer) => {
        console.log('Stripe customer data:', customer);
        this.stripeLoading = false;

        // Display customer data in a more user-friendly way
        const customerInfo = `
Stripe Customer Information for ${company.name}:

Customer ID: ${customer.id}
Email: ${customer.email || 'Not set'}
Name: ${customer.name || 'Not set'}
Phone: ${customer.phone || 'Not set'}
Created: ${new Date(customer.created * 1000).toLocaleDateString()}
        `;

        alert(customerInfo);
      },
      error: (error) => {
        console.error('Error getting Stripe customer data:', error);
        this.stripeLoading = false;
        alert(`Failed to retrieve Stripe customer data for ${company.name}.`);
      }
    });
  }

  // Debug method to refresh company data from Stripe
  refreshCompanyData(): void {
    this.loadSitesFromDb().then(() => {
      console.log('Company data refreshed from Stripe');
      alert('Company data refreshed successfully!');
    }).catch((error) => {
      console.error('Failed to refresh company data:', error);
      alert('Failed to refresh company data. Check console for details.');
    });
  }

  // Load comprehensive Stripe data for overview
  loadStripeOverviewData(company: Company): void {
    if (!company.stripeCustomerId || company.stripeCustomerId.trim() === '' || company.stripeCustomerId === 'undefined') {
      console.warn('🚫 DEBUG: No valid Stripe customer ID found for overview data loading:', {
        companyName: company.name,
        customerId: company.stripeCustomerId,
        customerIdType: typeof company.stripeCustomerId
      });
      return;
    }

    console.log('🔍 DEBUG: Starting comprehensive Stripe data load for company:', {
      companyName: company.name,
      customerId: company.stripeCustomerId,
      customerIdLength: company.stripeCustomerId.length,
      environment: environment.useRealStripe ? 'LIVE' : 'TEST'
    });

    // Validate Stripe customer ID format - but allow the call to proceed with logging
    const isValidFormat = this.isValidStripeCustomerId(company.stripeCustomerId);
    console.log('🔍 DEBUG: Customer ID validation:', {
      customerId: company.stripeCustomerId,
      isValid: isValidFormat,
      pattern: 'cus_[A-Za-z0-9]{10,24}',
      actualLength: company.stripeCustomerId.replace('cus_', '').length
    });

    if (!isValidFormat) {
      console.warn('⚠️ DEBUG: Customer ID format appears invalid, but proceeding with API call to verify...');
    }

    this.stripeOverviewLoading = true;
    this.stripeCustomerData = null;
    this.stripeSubscriptionsData = [];
    this.stripeInvoicesData = [];
    this.stripePaymentMethodsData = [];
    this.stripeChargesData = [];

    console.log('🚀 DEBUG: Making parallel Stripe API calls...');

    // Load all Stripe data in parallel - proceed even with "invalid" format to test actual API
    forkJoin({
      customer: this.stripeService.getCustomer(company.stripeCustomerId),
      subscriptions: this.stripeService.getSubscriptions(company.stripeCustomerId),
      paymentMethods: this.stripeService.getPaymentMethods(company.stripeCustomerId),
      invoices: this.stripeService.getInvoices(company.stripeCustomerId),
      charges: this.stripeService.getTransactions(company.stripeCustomerId)
    }).subscribe({
      next: (stripeData) => {
        console.log('✅ DEBUG: Comprehensive Stripe data loaded successfully:', {
          customer: stripeData.customer ? 'LOADED' : 'NULL',
          customerId: stripeData.customer?.id,
          customerEmail: stripeData.customer?.email,
          subscriptionsCount: stripeData.subscriptions?.length || 0,
          invoicesCount: stripeData.invoices?.length || 0,
          paymentMethodsCount: stripeData.paymentMethods?.length || 0,
          chargesCount: stripeData.charges?.length || 0
        });

        this.stripeCustomerData = stripeData.customer;
        this.stripeSubscriptionsData = stripeData.subscriptions || [];
        this.stripeInvoicesData = stripeData.invoices || [];
        this.stripePaymentMethodsData = stripeData.paymentMethods || [];
        this.stripeChargesData = stripeData.charges || [];

        this.stripeOverviewLoading = false;

        // If we got here successfully, the customer ID is actually valid despite format check
        if (!isValidFormat && stripeData.customer) {
          console.log('🎉 DEBUG: Customer ID worked despite format validation! Updating validation...');
          this.updateCustomerSyncStatus(company, 'synced');
        }
      },
      error: (error) => {
        console.error('❌ DEBUG: Error loading comprehensive Stripe data:', {
          error: error.message,
          errorType: error.type,
          errorCode: error.code,
          customerId: company.stripeCustomerId,
          fullError: error
        });

        this.stripeOverviewLoading = false;

        // Handle specific customer not found errors
        if (error.message && error.message.includes('No such customer')) {
          console.log('🧹 DEBUG: Confirmed customer does not exist in Stripe, cleaning up...');
          this.handleInvalidCustomerId(company);
          this.stripeSyncErrors.push(`Customer not found in Stripe: ${company.stripeCustomerId}`);
        } else {
          console.log('⚠️ DEBUG: Other error occurred, not cleaning customer ID');
          this.stripeSyncErrors.push(`Failed to load Stripe data: ${error.message || 'Unknown error'}`);
        }
      }
    });
  }

  // Validate Stripe customer ID format
  private isValidStripeCustomerId(customerId: string): boolean {
    // Stripe customer IDs: 'cus_' + 10-24 alphanumeric characters (relaxed validation)
    // Examples: cus_1759171642858 (13 chars), cus_T94TNbpYCqW2S (14 chars)
    return /^cus_[A-Za-z0-9]{10,24}$/.test(customerId);
  }

  // Update customer sync status
  private updateCustomerSyncStatus(company: Company, status: 'synced' | 'pending' | 'error'): void {
    company.stripeSyncStatus = status;
    company.lastStripeSyncDate = new Date();

    this.editSiteInDb(company).then(() => {
      console.log(`Updated sync status to ${status} for ${company.name}`);
    }).catch((error) => {
      console.error('Failed to update sync status:', error);
    });
  }

  // Test specific customer ID directly with comprehensive logging
  testStripeCustomerId(customerId: string): void {
    console.log('🧪 DEBUG: Testing Stripe customer ID directly:', customerId);

    this.stripeLoading = true;
    this.stripeSyncErrors = [];

    this.stripeService.getCustomer(customerId).subscribe({
      next: (customer) => {
        console.log('✅ DEBUG: Direct customer test SUCCESS:', {
          customerId,
          customerData: customer,
          exists: !!customer
        });

        this.stripeLoading = false;
        alert(`✅ Customer ID Test SUCCESS!\n\nCustomer ID: ${customer.id}\nName: ${customer.name || 'N/A'}\nEmail: ${customer.email || 'N/A'}\nCreated: ${new Date(customer.created * 1000).toLocaleDateString()}`);
      },
      error: (error) => {
        console.error('❌ DEBUG: Direct customer test FAILED:', {
          customerId,
          error: error.message,
          errorCode: error.code,
          fullError: error
        });

        this.stripeLoading = false;
        alert(`❌ Customer ID Test FAILED!\n\nCustomer ID: ${customerId}\nError: ${error.message || 'Unknown error'}\n\nCheck browser console for full details.`);
      }
    });
  }

  // Debug method to test the current selected company's customer ID
  debugCurrentCustomer(): void {
    if (!this.selectedCompany) {
      alert('No company selected');
      return;
    }

    if (!this.selectedCompany.stripeCustomerId) {
      alert('Selected company has no Stripe customer ID');
      return;
    }

    this.testStripeCustomerId(this.selectedCompany.stripeCustomerId);
  }

  // Method to log all customers from Stripe
  logAllStripeCustomers(): void {
    console.log('🔍 Fetching all customers from Stripe...');

    this.stripeService.getAllCustomers().subscribe({
      next: (customers: any[]) => {
        console.log(`✅ Found ${customers.length} customers in Stripe:`);
        console.table(customers.map((customer: any) => ({
          id: customer.id,
          email: customer.email,
          name: customer.name || 'No name',
          created: new Date(customer.created * 1000).toLocaleString(),
          description: customer.description || 'No description'
        })));

        // Also log the raw data for detailed inspection
        console.log('📋 Raw customer data:', customers);
      },
      error: (error: any) => {
        console.error('❌ Failed to fetch customers from Stripe:', error);
      }
    });
  }

  // Handle invalid customer ID by clearing it and updating sync status
  private handleInvalidCustomerId(company: Company): void {
    console.warn(`Clearing invalid Stripe customer ID for ${company.name}:`, company.stripeCustomerId);

    try {
      // Clear the invalid customer ID
      company.stripeCustomerId = undefined;
      company.stripeSyncStatus = 'error';

      // Ensure we set a valid date
      const now = new Date();
      if (!isNaN(now.getTime())) {
        company.lastStripeSyncDate = now;
      } else {
        // Fallback to undefined if date creation fails
        company.lastStripeSyncDate = undefined;
        console.warn('Failed to create valid date, setting lastStripeSyncDate to undefined');
      }

      // Update in Stripe
      this.editSiteInDb(company).then(() => {
        console.log('✅ Successfully cleared invalid customer ID from Stripe');
      }).catch((error) => {
        console.error('❌ Failed to update company in Stripe:', error);
        // Try to update without the problematic date field
        const companyWithoutDate = { ...company };
        delete companyWithoutDate.lastStripeSyncDate;
        this.editSiteInDb(companyWithoutDate).then(() => {
          console.log('✅ Successfully updated company without date field');
        }).catch((retryError) => {
          console.error('❌ Retry also failed:', retryError);
        });
      });
    } catch (error) {
      console.error('❌ Error in handleInvalidCustomerId:', error);
    }
  }

  // Load all Stripe customers
  loadStripeCustomers(): void {
    this.importLoading = true;
    this.stripeService.getAllStripeCustomers(50).subscribe({
      next: (response) => {
        if (response.success) {
          this.stripeCustomers = response.data;
          console.log('Loaded Stripe customers:', this.stripeCustomers);
        } else {
          console.error('Failed to load customers:', response.message);
          alert('Failed to load Stripe customers');
        }
        this.importLoading = false;
      },
      error: (error) => {
        console.error('Error loading Stripe customers:', error);
        alert('Error loading Stripe customers: ' + (error.message || 'Unknown error'));
        this.importLoading = false;
      }
    });
  }

  // Search Stripe customers
  searchStripeCustomers(): void {
    if (!this.customerSearchQuery.trim()) {
      this.loadStripeCustomers();
      return;
    }

    this.importLoading = true;
    this.stripeService.searchStripeCustomers(this.customerSearchQuery.trim()).subscribe({
      next: (response) => {
        if (response.success) {
          this.stripeCustomers = response.data;
          console.log('Search results:', this.stripeCustomers);
        } else {
          console.error('Search failed:', response.message);
          alert('Search failed');
        }
        this.importLoading = false;
      },
      error: (error) => {
        console.error('Error searching customers:', error);
        alert('Error searching customers: ' + (error.message || 'Unknown error'));
        this.importLoading = false;
      }
    });
  }

  // Toggle customer selection
  toggleCustomerSelection(customer: any): void {
    const index = this.selectedCustomers.findIndex(c => c.id === customer.id);
    if (index > -1) {
      this.selectedCustomers.splice(index, 1);
    } else {
      this.selectedCustomers.push(customer);
    }
  }

  // Check if customer is selected
  isCustomerSelected(customer: any): boolean {
    return this.selectedCustomers.some(c => c.id === customer.id);
  }

  // Format customer display name
  getCustomerDisplayName(customer: any): string {
    return customer.name || customer.email || 'Unnamed Customer';
  }

  // Format customer creation date
  formatCustomerDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString();
  }

  // Toggle company selection for export
  toggleCompanyForExport(company: Company): void {
    const index = this.selectedCompaniesForExport.findIndex(c => c.id === company.id);
    if (index > -1) {
      this.selectedCompaniesForExport.splice(index, 1);
    } else {
      this.selectedCompaniesForExport.push(company);
    }
  }

  // Check if company is selected for export
  isCompanySelectedForExport(company: Company): boolean {
    return this.selectedCompaniesForExport.some(c => c.id === company.id);
  }

  // Get companies that can be exported (don't have Stripe customer ID)
  getExportableCompanies(): Company[] {
    return this.companies.filter(company => {
      const hasStripeId = company.stripeCustomerId && company.stripeCustomerId.trim() !== '';
      return !hasStripeId;
    });
  }

  // Get company display name for export results
  getCompanyDisplayName(company: any): string {
    return company.name || 'Unnamed Company';
  }

  // ============================================================================
  // PAYMENT METHOD MANAGEMENT METHODS
  // ============================================================================

  onAddPaymentMethod(company: Company): void {
    if (!company.stripeCustomerId) {
      alert('Company must have a Stripe customer before adding payment methods.');
      return;
    }

    // For now, show instructions to add payment method manually
    // In a full implementation, you would integrate with Stripe Elements or redirect to Stripe Checkout
    const message = `To add a payment method for ${company.name}:\n\n` +
      `1. Use Stripe Dashboard to add payment methods\n` +
      `2. Or integrate Stripe Elements for customer self-service\n` +
      `3. Or use Stripe Checkout for payment method collection\n\n` +
      `Customer ID: ${company.stripeCustomerId}`;

    alert(message);

    // TODO: Implement actual payment method addition
    // This could involve:
    // - Opening a modal with Stripe Elements
    // - Redirecting to Stripe Checkout in setup mode
    // - Creating a setup intent for customer payment method collection
  }

  onSetDefaultPaymentMethod(event: { customerId: string, paymentMethodId: string }): void {
    console.log('Setting default payment method:', event);

    this.stripeLoading = true;

    this.stripeService.setDefaultPaymentMethod(event.customerId, event.paymentMethodId).subscribe({
      next: (result) => {
        console.log('Default payment method set successfully:', result);
        this.stripeLoading = false;
        alert('Default payment method updated successfully!');

        // Refresh the stripe overview data to get updated payment method info
        if (this.selectedCompany) {
          this.loadStripeOverviewData(this.selectedCompany);
        }
      },
      error: (error) => {
        console.error('Error setting default payment method:', error);
        this.stripeLoading = false;
        alert(`Failed to set default payment method: ${error.message || 'Unknown error'}`);
      }
    });
  }

  onRemovePaymentMethod(event: { customerId: string, paymentMethodId: string }): void {
    console.log('Removing payment method:', event);

    this.stripeLoading = true;

    this.stripeService.detachPaymentMethod(event.paymentMethodId).subscribe({
      next: (result) => {
        console.log('Payment method removed successfully:', result);
        this.stripeLoading = false;
        alert('Payment method removed successfully!');

        // Refresh the stripe overview data to get updated payment method list
        if (this.selectedCompany) {
          this.loadStripeOverviewData(this.selectedCompany);
        }
      },
      error: (error) => {
        console.error('Error removing payment method:', error);
        this.stripeLoading = false;
        alert(`Failed to remove payment method: ${error.message || 'Unknown error'}`);
      }
    });
  }

  // Add-ons & Services Management Methods
  loadCustomerAddons(company: Company): void {
    if (!company.stripeCustomerId) {
      this.currentCustomerAddons = [];
      return;
    }

    this.addonLoading = true;
    // In a real implementation, you would call a service to get customer's add-ons
    // For now, we'll simulate this based on the activeAddons array
    this.currentCustomerAddons = this.availableAddons.filter(addon =>
      company.activeAddons?.includes(addon.id)
    ).map(addon => ({
      ...addon,
      addedDate: new Date(),
      status: 'active',
      quantity: 1
    }));
    this.addonLoading = false;
  }

  loadCustomerSubscriptions(company: Company): void {
    if (!company.stripeCustomerId) {
      this.currentCustomerSubscriptions = [];
      this.stripeSubscriptionsData = [];
      return;
    }

    this.subscriptionLoading = true;

    this.stripeService.getSubscriptions(company.stripeCustomerId).subscribe({
      next: (subscriptions) => {
        this.currentCustomerSubscriptions = subscriptions;
        this.stripeSubscriptionsData = subscriptions; // This is the key fix!
        this.subscriptionLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading subscriptions:', error);
        this.currentCustomerSubscriptions = [];
        this.stripeSubscriptionsData = [];
        this.subscriptionLoading = false;
      }
    });
  }

  openAddAddonModal(): void {
    this.showAddAddonModal = true;
    this.newAddonAssignment = {
      addonId: null,
      quantity: 1,
      startDate: new Date(),
      prorate: true
    };
  }

  closeAddAddonModal(): void {
    this.showAddAddonModal = false;
  }

  addAddonToCustomer(): void {
    if (!this.selectedCompany || !this.newAddonAssignment.addonId) {
      return;
    }

    this.addonLoading = true;
    const selectedAddon = this.availableAddons.find(a => a.id === this.newAddonAssignment.addonId);

    if (selectedAddon) {
      // Add to local activeAddons array
      if (!this.selectedCompany.activeAddons) {
        this.selectedCompany.activeAddons = [];
      }

      if (!this.selectedCompany.activeAddons.includes(selectedAddon.id)) {
        this.selectedCompany.activeAddons.push(selectedAddon.id);

        // Update in database
        this.editSiteInDb(this.selectedCompany).then(() => {
          // Create Stripe subscription for the addon if customer has Stripe ID
          if (this.selectedCompany!.stripeCustomerId) {
            this.createStripeSubscriptionForAddon(selectedAddon);
          }

          this.loadCustomerAddons(this.selectedCompany!);
          this.closeAddAddonModal();
          alert(`Successfully added ${selectedAddon.name} to ${this.selectedCompany!.name}`);
          this.addonLoading = false;
        }).catch(error => {
          console.error('Error adding addon:', error);
          this.addonLoading = false;
        });
      } else {
        alert('This add-on is already assigned to the customer');
        this.addonLoading = false;
      }
    }
  }

  removeAddonFromCustomer(addon: any): void {
    if (!this.selectedCompany || !confirm(`Remove ${addon.name} from ${this.selectedCompany.name}?`)) {
      return;
    }

    this.addonLoading = true;

    // Remove from activeAddons array
    if (this.selectedCompany.activeAddons) {
      const index = this.selectedCompany.activeAddons.indexOf(addon.id);
      if (index > -1) {
        this.selectedCompany.activeAddons.splice(index, 1);

        // Update in database
        this.editSiteInDb(this.selectedCompany).then(() => {
          this.loadCustomerAddons(this.selectedCompany!);
          alert(`Successfully removed ${addon.name} from ${this.selectedCompany!.name}`);
          this.addonLoading = false;
        }).catch(error => {
          console.error('Error removing addon:', error);
          this.addonLoading = false;
        });
      }
    }
  }

  openCreateSubscriptionModal(): void {
    this.showCreateSubscriptionModal = true;
    this.newSubscription = {
      plan: 'basic',
      priceId: '',
      quantity: 1,
      trialDays: 0,
      startDate: new Date()
    };
  }

  closeCreateSubscriptionModal(): void {
    this.showCreateSubscriptionModal = false;
  }

  createSubscriptionForCustomer(): void {
    if (!this.selectedCompany || !this.selectedCompany.stripeCustomerId) {
      alert('Customer must have a Stripe customer ID to create subscriptions');
      return;
    }

    this.subscriptionLoading = true;

    const subscriptionData = {
      customerId: this.selectedCompany.stripeCustomerId,
      priceId: this.newSubscription.priceId,
      quantity: this.newSubscription.quantity,
      trialPeriodDays: this.newSubscription.trialDays,
      metadata: {
        companyId: this.selectedCompany.id,
        plan: this.newSubscription.plan
      }
    };

    this.stripeService.createSubscription(subscriptionData).subscribe({
      next: (result) => {
        console.log('Subscription created:', result);
        this.loadCustomerSubscriptions(this.selectedCompany!);
        this.closeCreateSubscriptionModal();
        alert(`Successfully created subscription for ${this.selectedCompany!.name}`);
        this.subscriptionLoading = false;
      },
      error: (error) => {
        console.error('Error creating subscription:', error);
        alert('Error creating subscription: ' + (error.message || 'Unknown error'));
        this.subscriptionLoading = false;
      }
    });
  }

  private createStripeSubscriptionForAddon(addon: Addon): void {
    // This would create a Stripe subscription for the specific addon
    // For now, we'll just log it - you can implement this based on your Stripe setup
    console.log('Would create Stripe subscription for addon:', addon);
  }

  getAddonTotalCost(): number {
    return this.currentCustomerAddons.reduce((total, addon) => {
      return total + (addon.monthlyPrice * addon.quantity);
    }, 0);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getAddonById(id: number): Addon | undefined {
    return this.availableAddons.find(addon => addon.id === id);
  }

  // =============================================
  // ENHANCED SERVICE MANAGEMENT METHODS
  // =============================================

  // Service Management View Control
  setServiceManagementView(view: 'templates' | 'assignments' | 'analytics' | 'bulk'): void {
    this.serviceManagementView = view;

    switch (view) {
      case 'templates':
        this.loadServiceTemplates();
        break;
      case 'assignments':
        this.loadServiceAssignmentHistory();
        break;
      case 'analytics':
        this.loadServiceAnalytics();
        break;
      case 'bulk':
        this.loadBulkOperationData();
        break;
    }
  }

  // =============================================
  // SERVICE TEMPLATE MANAGEMENT
  // =============================================

  loadServiceTemplates(): void {
    // Convert existing addons to service templates format
    this.serviceTemplates = this.availableAddons.map(addon => ({
      id: addon.id,
      name: addon.name,
      description: addon.description,
      category: addon.category || 'custom',
      basePrice: addon.monthlyPrice,
      setupFee: addon.setupFee,
      features: addon.features,
      isCustomizable: true,
      allowCustomPricing: false,
      isActive: addon.isActive || true,
      createdBy: 'system',
      createdDate: addon.createdDate || new Date(),
      updatedDate: addon.updatedDate || new Date()
    }));
  }

  openServiceTemplateModal(template?: ServiceTemplate): void {
    this.showServiceTemplateModal = true;
    this.selectedServiceTemplate = template ? { ...template } : {
      name: '',
      description: '',
      category: 'custom',
      basePrice: 0,
      setupFee: 0,
      features: [''],
      isCustomizable: true,
      allowCustomPricing: false,
      isActive: true,
      createdBy: 'admin',
      createdDate: new Date(),
      updatedDate: new Date()
    };
  }

  closeServiceTemplateModal(): void {
    this.showServiceTemplateModal = false;
    this.selectedServiceTemplate = null;
  }

  saveServiceTemplate(): void {
    if (!this.selectedServiceTemplate || !this.selectedServiceTemplate.name) return;

    this.serviceTemplateLoading = true;

    // If editing existing template
    if (this.selectedServiceTemplate.id) {
      const index = this.serviceTemplates.findIndex(t => t.id === this.selectedServiceTemplate!.id);
      if (index !== -1) {
        this.serviceTemplates[index] = {
          ...this.selectedServiceTemplate as ServiceTemplate,
          updatedDate: new Date()
        };
      }
    } else {
      // Creating new template
      const newTemplate: ServiceTemplate = {
        ...this.selectedServiceTemplate as ServiceTemplate,
        id: Date.now(), // Simple ID generation
        createdDate: new Date(),
        updatedDate: new Date()
      };
      this.serviceTemplates.push(newTemplate);

      // Also add to availableAddons for backwards compatibility
      const newAddon: Addon = {
        id: newTemplate.id,
        name: newTemplate.name,
        description: newTemplate.description,
        monthlyPrice: newTemplate.basePrice,
        setupFee: newTemplate.setupFee,
        features: newTemplate.features,
        category: newTemplate.category,
        isActive: newTemplate.isActive,
        createdDate: newTemplate.createdDate,
        updatedDate: newTemplate.updatedDate
      };
      this.availableAddons.push(newAddon);
    }

    this.serviceTemplateLoading = false;
    this.closeServiceTemplateModal();
    alert('Service template saved successfully!');
  }

  deleteServiceTemplate(template: ServiceTemplate): void {
    if (!confirm(`Delete service template "${template.name}"? This action cannot be undone.`)) return;

    // Remove from service templates
    this.serviceTemplates = this.serviceTemplates.filter(t => t.id !== template.id);

    // Remove from available addons
    this.availableAddons = this.availableAddons.filter(a => a.id !== template.id);

    alert('Service template deleted successfully!');
  }

  addFeatureToTemplate(): void {
    if (this.selectedServiceTemplate?.features) {
      this.selectedServiceTemplate.features.push('');
    }
  }

  removeFeatureFromTemplate(index: number): void {
    if (this.selectedServiceTemplate?.features && this.selectedServiceTemplate.features.length > 1) {
      this.selectedServiceTemplate.features.splice(index, 1);
    }
  }

  trackFeatureByIndex(index: number): number {
    return index;
  }

  // =============================================
  // SERVICE ASSIGNMENT HISTORY
  // =============================================

  loadServiceAssignmentHistory(): void {
    // Generate mock service assignment history
    this.serviceAssignmentHistory = [];

    this.companies.forEach(company => {
      if (company.activeAddons && company.activeAddons.length > 0) {
        company.activeAddons.forEach(addonId => {
          const addon = this.availableAddons.find(a => a.id === addonId);
          if (addon) {
            this.serviceAssignmentHistory.push({
              id: `${company.id}-${addonId}-${Date.now()}`,
              companyId: company.id,
              addonId: addonId,
              assignedDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date in last 90 days
              assignedBy: 'admin',
              quantity: 1,
              status: 'active',
              notes: `Assigned ${addon.name} to ${company.name}`
            });
          }
        });
      }
    });

    // Sort by date (newest first)
    this.serviceAssignmentHistory.sort((a, b) => b.assignedDate.getTime() - a.assignedDate.getTime());
  }

  getCompanyNameById(companyId: string): string {
    const company = this.companies.find(c => c.id === companyId);
    return company ? company.name : 'Unknown Company';
  }

  getServiceNameById(addonId: number): string {
    const addon = this.availableAddons.find(a => a.id === addonId);
    return addon ? addon.name : 'Unknown Service';
  }

  // =============================================
  // SERVICE ANALYTICS
  // =============================================

  loadServiceAnalytics(): void {
    this.serviceAnalyticsLoading = true;

    // Calculate usage statistics for each service
    this.serviceUsageStats = this.availableAddons.map(addon => {
      const customersUsingService = this.companies.filter(company =>
        company.activeAddons && company.activeAddons.includes(addon.id)
      );

      const totalCustomers = customersUsingService.length;
      const monthlyRevenue = totalCustomers * addon.monthlyPrice;

      return {
        addonId: addon.id,
        addonName: addon.name,
        totalCustomers: totalCustomers,
        monthlyRevenue: monthlyRevenue,
        averagePrice: addon.monthlyPrice,
        category: addon.category || 'custom'
      };
    });

    // Sort by revenue (highest first)
    this.serviceUsageStats.sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);

    this.serviceAnalyticsLoading = false;
  }

  getTotalServiceRevenue(): number {
    return this.serviceUsageStats.reduce((total, stat) => total + stat.monthlyRevenue, 0);
  }

  getTotalActiveServices(): number {
    return this.serviceUsageStats.filter(stat => stat.totalCustomers > 0).length;
  }

  getMostPopularService(): ServiceUsageStats | null {
    return this.serviceUsageStats.reduce((most, current) =>
      current.totalCustomers > (most?.totalCustomers || 0) ? current : most, null as ServiceUsageStats | null
    );
  }

  getServicesByCategory(category: string): ServiceUsageStats[] {
    return this.serviceUsageStats.filter(stat => stat.category === category);
  }

  // =============================================
  // BULK OPERATIONS
  // =============================================

  loadBulkOperationData(): void {
    // Reset bulk selections
    this.bulkSelectedCompanies = [];
    this.bulkSelectedServices = [];
  }

  openBulkServiceModal(operation: 'add' | 'remove'): void {
    this.showBulkServiceModal = true;
    this.bulkOperationType = operation;
    this.bulkSelectedCompanies = [];
    this.bulkSelectedServices = [];
  }

  closeBulkServiceModal(): void {
    this.showBulkServiceModal = false;
  }

  toggleBulkCompanySelection(company: Company): void {
    const index = this.bulkSelectedCompanies.findIndex(c => c.id === company.id);
    if (index > -1) {
      this.bulkSelectedCompanies.splice(index, 1);
    } else {
      this.bulkSelectedCompanies.push(company);
    }
  }

  toggleBulkServiceSelection(serviceId: number): void {
    const index = this.bulkSelectedServices.indexOf(serviceId);
    if (index > -1) {
      this.bulkSelectedServices.splice(index, 1);
    } else {
      this.bulkSelectedServices.push(serviceId);
    }
  }

  isBulkCompanySelected(company: Company): boolean {
    return this.bulkSelectedCompanies.some(c => c.id === company.id);
  }

  isBulkServiceSelected(serviceId: number): boolean {
    return this.bulkSelectedServices.includes(serviceId);
  }

  selectAllCompaniesForBulk(): void {
    this.bulkSelectedCompanies = [...this.filteredCompanies];
  }

  deselectAllCompaniesForBulk(): void {
    this.bulkSelectedCompanies = [];
  }

  executeBulkServiceOperation(): void {
    if (this.bulkSelectedCompanies.length === 0 || this.bulkSelectedServices.length === 0) {
      alert('Please select at least one company and one service.');
      return;
    }

    const operationText = this.bulkOperationType === 'add' ? 'add to' : 'remove from';
    const confirmMessage = `${operationText} ${this.bulkSelectedServices.length} service(s) ${this.bulkOperationType === 'add' ? 'to' : 'from'} ${this.bulkSelectedCompanies.length} company(ies)?`;

    if (!confirm(confirmMessage)) return;

    this.bulkOperationLoading = true;

    // Simulate bulk operation
    setTimeout(() => {
      let successCount = 0;
      let errorCount = 0;

      this.bulkSelectedCompanies.forEach(company => {
        this.bulkSelectedServices.forEach(serviceId => {
          try {
            if (this.bulkOperationType === 'add') {
              if (!company.activeAddons) company.activeAddons = [];
              if (!company.activeAddons.includes(serviceId)) {
                company.activeAddons.push(serviceId);
                successCount++;
              }
            } else {
              if (company.activeAddons) {
                const index = company.activeAddons.indexOf(serviceId);
                if (index > -1) {
                  company.activeAddons.splice(index, 1);
                  successCount++;
                }
              }
            }
          } catch (error) {
            errorCount++;
          }
        });
      });

      this.bulkOperationLoading = false;
      this.closeBulkServiceModal();

      alert(`Bulk operation completed!\nSuccessful operations: ${successCount}\nFailed operations: ${errorCount}`);

      // Refresh data if we have a selected company
      if (this.selectedCompany) {
        this.loadCustomerAddons(this.selectedCompany);
      }
    }, 2000); // Simulate network delay
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  getCategoryIcon(category: string): string {
    const categoryData = this.serviceCategories.find(c => c.id === category);
    return categoryData ? categoryData.icon : 'fa-cogs';
  }

  getCategoryLabel(category: string): string {
    const categoryData = this.serviceCategories.find(c => c.id === category);
    return categoryData ? categoryData.label : 'Custom';
  }

  getAvailableServicesByCategory(category: string): Addon[] {
    return this.availableAddons.filter(addon => addon.category === category);
  }

  getActiveServicesCount(): number {
    return this.availableAddons.filter(addon => addon.isActive).length;
  }

  getTotalServicesRevenue(): number {
    let total = 0;
    this.companies.forEach(company => {
      if (company.activeAddons) {
        company.activeAddons.forEach(addonId => {
          const addon = this.availableAddons.find(a => a.id === addonId);
          if (addon) {
            total += addon.monthlyPrice;
          }
        });
      }
    });
    return total;
  }
}
