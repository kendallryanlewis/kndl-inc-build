import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ComponentCommunicationService } from '../../services/component-communication.service';
import { User, UserPlatform, Company, BillingInfo, AttachedSite } from '../../models/User';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { StripeService } from '../../services/stripe.service';
import { timeout, catchError, take, filter } from 'rxjs/operators';
import { of } from 'rxjs';

interface CustomerProject {
  id: string;
  name: string;
  status: 'active' | 'in-progress' | 'completed' | 'on-hold';
  type: 'website' | 'domain' | 'hosting' | 'maintenance';
  lastUpdated: Date;
  nextMilestone?: string;
  progress: number;
  url?: string;
}

interface RecentActivity {
  id: string;
  type: 'payment' | 'update' | 'support' | 'milestone';
  description: string;
  date: Date;
  amount?: number;
  status?: string;
}

interface BillingTransaction {
  id: string;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  lastFour: string; // Last four digits of payment method
  status: 'completed' | 'pending' | 'failed';
  invoiceId?: string;
  paymentMethod?: string;
}

interface ServiceStatus {
  name: string;
  status: 'active' | 'expired' | 'pending' | 'suspended';
  renewalDate?: Date;
  monthlyFee?: number;
  icon: string;
}

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: [
    './overview.component.scss',
    '../dashboard.component.scss',
    '../../shared/styles/modal-styles.scss'
  ]
})
export class OverviewComponent implements OnInit {
  @Input() subTab: string = 'Home';
  @Output() childTabs = new EventEmitter<string[]>();
  @Output() subTabChange = new EventEmitter<string>();
  sectionIds: string[] = ['Dashboard', 'Subscriptions', 'Invoicing'];
  private previousSubTab: string = '';
  activeTab = '';
  user: User | null = null;
  userCompanies: Company[] = [];
  billingTransactions: BillingTransaction[] = [];
  projects: CustomerProject[] = [];
  recentActivities: RecentActivity[] = [];
  services: ServiceStatus[] = [];
  transfers: Array<{
    logo: string;
    company: string;
    description: string;
    lastFour: string;
    date: string;
    amount: number;
  }> = [];
  payments: Array<{
    cardColor: string;
    expiry: string;
    lastFour: string;
    service: string;
    amount: number;
    currency: string;
    icon: string;
  }> = [];
  isLoading = true;
  websites: string[] = [];
  selectedSite: string = "";
  selectedCompany: Company | null = null;
  companyName: string = "";
  stripeCustomerData: Map<string, any> = new Map(); // Store Stripe customer data by companyId

  // Customer details
  selectedCustomerDetails: {
    customer: any;
    subscriptions: any[];
    paymentMethods: any[];
    invoices: any[];
  } | null = null;
  isLoadingCustomerDetails = false;

  // Available Stripe products and prices
  availableProducts: any[] = [];
  availablePrices: any[] = [];

  // Payment Method Management
  showAddPaymentMethodModal = false;
  showCardActionsModal = false;
  selectedCardForActions: any = null;
  newPaymentMethod = {
    customerId: '',
    paymentMethodId: '',
    cardNumber: '',
    expMonth: '',
    expYear: '',
    cvc: ''
  };
  isAddingPaymentMethod = false;
  isSettingDefaultPayment = false;
  isDeletingPaymentMethod = false;

  // Filter Management
  showFilterModal = false;
  filterOptions = {
    minAmount: 100,
    maxAmount: null as number | null,
    dateRange: 'all' as 'all' | '7days' | '30days' | '90days' | 'custom',
    status: 'all' as 'all' | 'completed' | 'pending' | 'failed'
  };

  // Subscription Management
  showAddSubscriptionModal = false;
  newSubscription = {
    customerId: '',
    priceId: '',
    paymentMethodId: '',
    trialPeriodDays: 0
  };
  isCreatingSubscription = false;
  isCancelingSubscription = false;

  // Product Purchase Management
  showPurchaseConfirmationModal = false;
  selectedProductForPurchase: any = null;
  selectedPriceForPurchase: any = null;
  purchaseType: 'subscription' | 'one-time' = 'subscription';
  isPurchasing = false;

  constructor(
    private communicationService: ComponentCommunicationService,
    private stripeService: StripeService
  ) { }

  async ngOnInit(): Promise<void> {
    this.loadUserFromAuth();
    this.loadAvailableProducts();
    this.loadAvailablePrices();
    // Ensure subTab defaults to 'Home' if not provided
    if (!this.subTab || this.subTab.trim() === '') {
      this.subTab = 'Dashboard';
    }
    // Load data asynchronously and emit child tabs
    await Promise.all([
      this.emitChildTabs()
    ]);
  }

  ngOnChanges(): void {
    if (this.subTab !== this.previousSubTab) {
      this.previousSubTab = this.subTab;
      this.activeTab = this.subTab;
    }
  }

  private async emitChildTabs(): Promise<void> {
    // Emit available section IDs to parent components
    this.childTabs.emit(this.sectionIds);
  }


  /**
   * Load available products from Stripe
   */
  async loadAvailableProducts() {
    try {
      this.stripeService.getProducts().pipe(
        // Skip the initial empty array, wait for actual data to load
        filter(products => Array.isArray(products) && products.length > 0),
        take(1), // Complete after first real emission
        timeout(30000), // Increased timeout to 30 seconds for cold starts
        catchError(err => {
          console.error('❌ Failed to load products:', err);
          console.warn('⚠️ Using empty array due to API error');
          // Return empty array instead of throwing - component will handle gracefully
          return of([]);
        })
      ).subscribe({
        next: (products: any) => {
          const resultObj = products as any;
          if (Array.isArray(products)) {
            // Filter to only active products
            this.availableProducts = products.filter((p: any) => p.active !== false);
          } else if (resultObj && Array.isArray(resultObj.data)) {
            // Filter to only active products
            this.availableProducts = resultObj.data.filter((p: any) => p.active !== false);
          }
          console.log('✅ Products loaded (active only):', this.availableProducts.length);
        },
        error: (err) => {
          console.error('❌ Subscription error loading products:', err);
          this.availableProducts = [];
        }
      });
    } catch (error) {
      console.error('Error loading products:', error);
      this.availableProducts = [];
    }
  }

  /**
   * Load available prices from Stripe
   */
  async loadAvailablePrices() {
    try {
      this.stripeService.getPrices().pipe(
        // Skip the initial empty array, wait for actual data to load
        filter(prices => Array.isArray(prices) && prices.length > 0),
        take(1), // Complete after first real emission
        timeout(30000), // Increased timeout to 30 seconds for cold starts
        catchError(err => {
          console.error('❌ Failed to load prices:', err);
          console.warn('⚠️ Using empty array due to API error');
          // Return empty array instead of throwing - component will handle gracefully
          return of([]);
        })
      ).subscribe({
        next: (prices: any) => {
          const resultObj = prices as any;
          if (Array.isArray(prices)) {
            // Filter to only active prices
            this.availablePrices = prices.filter((p: any) => p.active !== false);
          } else if (resultObj && Array.isArray(resultObj.data)) {
            // Filter to only active prices
            this.availablePrices = resultObj.data.filter((p: any) => p.active !== false);
          }
          console.log('✅ Prices loaded (active only):', this.availablePrices.length);
        },
        error: (err) => {
          console.error('❌ Subscription error loading prices:', err);
          this.availablePrices = [];
        }
      });
    } catch (error) {
      console.error('Error loading prices:', error);
      this.availablePrices = [];
    }
  }

  /**
   * Load current authenticated user from Firebase
   */
  async loadUserFromAuth() {
    this.isLoading = true;

    try {
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const auth = getAuth();

      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          await this.loadUserData(firebaseUser.uid);
        } else {
          console.warn('No authenticated user found');
          this.loadCustomerData(); // Fallback to mock data
        }
      });
    } catch (error) {
      console.error('Error loading user from auth:', error);
      this.loadCustomerData(); // Fallback to mock data
    }
  }

  /**
   * Load user data from Firestore
   */
  async loadUserData(userId: string) {
    try {
      const firestore = getFirestore();
      const userDoc = await getDoc(doc(firestore, 'users', userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        this.user = {
          id: userDoc.id,
          ...userData,
          joinDate: userData['joinDate']?.toDate?.() || new Date(),
          lastLogin: userData['lastLogin']?.toDate?.() || new Date()
        } as User;

        console.log('✅ Loaded user data:', this.user);

        // Load user's companies and Stripe data
        await this.loadUserCompaniesAndStripeData();
        await this.loadStripeInvoiceDataForUser();

      } else {
        console.warn('User document not found');
        this.loadCustomerData(); // Fallback to mock data
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.loadCustomerData(); // Fallback to mock data
    }
  }

  /**
   * Load user's companies from attached sites and enrich with Stripe data
   */
  async loadUserCompaniesAndStripeData() {
    if (!this.user?.attachedSites || this.user.attachedSites.length === 0) {
      console.warn('User has no attached sites');
      this.isLoading = false;
      return;
    }

    const firestore = getFirestore();

    // Load all Stripe customers first
    const allStripeCustomers = await this.loadAllStripeCustomers();

    // Load company data for each attached site
    const companyPromises = this.user.attachedSites.map(async (site: AttachedSite) => {
      try {
        // Check if site has a customerId - if so, use it to retrieve Stripe customer
        if (site.customerId) {
          console.log(`🔍 Found customerId in attachedSite:`, {
            customerId: site.customerId,
            companyName: site.companyName || site.companyId
          });

          try {
            // Retrieve the Stripe customer using the customerId
            const stripeCustomer = await this.stripeService.getCustomer(site.customerId).pipe(
              timeout(15000),
              catchError(err => {
                console.error(`❌ Failed to load Stripe customer ${site.customerId}:`, err);
                return of(null);
              })
            ).toPromise();

            if (stripeCustomer) {
              console.log(`✅ Retrieved Stripe customer from attachedSite customerId:`, stripeCustomer);

              // Store it for later use
              allStripeCustomers.push(stripeCustomer);
            }
          } catch (error) {
            console.error(`Error retrieving Stripe customer for ${site.customerId}:`, error);
          }
        }

        // Ensure companyId is a valid string
        const companyId = String(site.companyId || '').trim();

        if (!companyId) {
          console.warn('Invalid company ID in attached site:', site);
          return null;
        }

        console.log(`Loading company: ${companyId}`);

        // Check if this is a Stripe customer ID (starts with 'cus_')
        // If so, try to find the company by stripeCustomerId instead
        let companyDoc;
        let companyData: Company | null = null;

        if (companyId.startsWith('cus_')) {
          // This is a Stripe customer ID - need to find the company by stripeCustomerId
          console.log(`Detected Stripe customer ID: ${companyId}, searching for company...`);

          // Query companies collection for matching stripeCustomerId
          const companiesRef = collection(firestore, 'companies');
          const q = query(companiesRef, where('stripeCustomerId', '==', companyId));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            companyDoc = querySnapshot.docs[0];
            companyData = { id: companyDoc.id, ...companyDoc.data() } as Company;
            console.log(`✅ Found company for Stripe ID ${companyId}:`, companyData.name);
          } else {
            // Company doesn't exist in Firestore, create virtual company from Stripe data
            const stripeCustomer = allStripeCustomers.find(c => c.id === companyId);
            if (stripeCustomer) {
              companyData = {
                id: companyId,
                name: stripeCustomer.name || stripeCustomer.email || 'Unnamed Company',
                status: stripeCustomer.delinquent ? 'Suspended' : 'Active',
                stripeCustomerId: companyId,
                contactEmail: stripeCustomer.email,
                contactPhone: stripeCustomer.phone,
                billing: {
                  billingEmail: stripeCustomer.email,
                  subscriptionStatus: stripeCustomer.subscriptions?.data?.[0]?.status || 'N/A',
                  subscriptionPlan: stripeCustomer.subscriptions?.data?.[0]?.items?.data?.[0]?.price?.product?.name || 'N/A'
                }
              };

              this.stripeCustomerData.set(companyData.id, stripeCustomer);
              console.log(`✅ Created virtual company from Stripe data:`, companyData.name);
            } else {
              console.warn(`No Stripe customer found for ID: ${companyId}`);
            }
          }
        } else {
          // Regular Firestore document ID - try to load it
          try {
            companyDoc = await getDoc(doc(firestore, 'companies', companyId));

            if (companyDoc.exists()) {
              companyData = { id: companyDoc.id, ...companyDoc.data() } as Company;
              console.log(`✅ Loaded company from Firestore:`, companyData.name);
            } else {
              console.warn(`Company document not found: ${companyId}`);

              // If we have the companyName from attachedSite, create a placeholder
              if (site.companyName) {
                companyData = {
                  id: companyId,
                  name: site.companyName,
                  status: 'Active',
                  description: 'Company data not found in Firestore'
                };
                console.log(`✅ Created placeholder company from attachedSite:`, companyData.name);
              }
            }
          } catch (docError) {
            console.error(`Error loading Firestore document for ${companyId}:`, docError);

            // Create placeholder from site data if available
            if (site.companyName) {
              companyData = {
                id: companyId,
                name: site.companyName,
                status: 'Active',
                description: 'Error loading company data'
              };
              console.log(`✅ Created placeholder company after error:`, companyData.name);
            }
          }
        }

        // If we have company data, enrich with Stripe data
        if (companyData) {
          // Prioritize customerId from attachedSites over company's stripeCustomerId
          const stripeCustomerId = site.customerId || companyData.stripeCustomerId;

          if (stripeCustomerId) {
            const stripeCustomer = allStripeCustomers.find(c => c.id === stripeCustomerId);
            if (stripeCustomer) {
              this.stripeCustomerData.set(companyData.id, stripeCustomer);

              // Update company with the customerId if it came from attachedSites
              if (site.customerId && !companyData.stripeCustomerId) {
                companyData.stripeCustomerId = site.customerId;
              }

              // Enrich billing data with Stripe info
              if (!companyData.billing) {
                companyData.billing = {};
              }
              companyData.billing.billingEmail = stripeCustomer.email || companyData.billing.billingEmail;
              companyData.billing.subscriptionStatus = stripeCustomer.subscriptions?.data?.[0]?.status || companyData.billing.subscriptionStatus;
              companyData.billing.subscriptionPlan = stripeCustomer.subscriptions?.data?.[0]?.items?.data?.[0]?.price?.product?.name || companyData.billing.subscriptionPlan;

              console.log(`✅ Enriched ${companyData.name} with Stripe data from customerId: ${stripeCustomerId}`);
            }
          }
        }

        return companyData;
      } catch (error) {
        console.error(`Error loading company ${site.companyId}:`, error);

        // Last resort: create company from site name if available
        if (site.companyName) {
          return {
            id: String(site.companyId),
            name: site.companyName,
            status: 'Active',
            description: 'Fallback company data'
          } as Company;
        }

        return null;
      }
    });

    const companies = await Promise.all(companyPromises);
    this.userCompanies = companies.filter(company => company !== null) as Company[];

    // Populate websites dropdown
    this.websites = this.userCompanies.map(c => c.name);

    // Select first company by default
    if (this.userCompanies.length > 0) {
      this.selectedSite = this.userCompanies[0].name;
      this.selectedCompany = this.userCompanies[0];
      this.companyName = this.userCompanies[0].name;

      // Load customer details for the selected company
      if (this.userCompanies[0].stripeCustomerId) {
        this.loadCustomerDetails(this.userCompanies[0].stripeCustomerId);
      } else {
        console.warn('Selected company has no Stripe customer ID:', this.userCompanies[0]);
      }
    }

    console.log('✅ Loaded companies:', this.userCompanies);
    this.isLoading = false;
  }

  /**
   * Load all Stripe customers
   */
  async loadAllStripeCustomers(): Promise<any[]> {
    try {
      const customers = await this.stripeService.getAllCustomers(100).toPromise();
      return customers || [];
    } catch (error) {
      console.error('Error loading Stripe customers:', error);
      return [];
    }
  }

  /**
   * Handle site selection change
   */
  onSiteChange() {
    const company = this.userCompanies.find(c => c.name === this.selectedSite);
    if (company) {
      this.selectedCompany = company;
      this.companyName = company.name;
      console.log('Selected company:', company);

      // Reload invoice data for this company
      this.loadInvoicesForCompany(company);

      // Load customer details (payment methods, subscriptions)
      if (company.stripeCustomerId) {
        this.loadCustomerDetails(company.stripeCustomerId);
      }
    }
  }

  /**
   * Load detailed customer information from Stripe
   */
  loadCustomerDetails(customerId: string) {
    if (!customerId) return;

    this.isLoadingCustomerDetails = true;

    console.log('📥 Loading customer details for:', customerId);

    // First, try to get the customer object from the map
    let stripeCustomer = this.stripeCustomerData.get(this.selectedCompany?.id || '');

    // If not in map, fetch it from Stripe
    if (!stripeCustomer) {
      console.log('Customer not in cache, fetching from Stripe...');
      this.stripeService.getCustomer(customerId).pipe(
        timeout(15000),
        catchError(err => {
          console.error('Failed to load customer:', err);
          return of(null);
        })
      ).subscribe(customer => {
        if (customer) {
          console.log('✅ Loaded customer from Stripe:', customer);

          // Store in map for future use
          if (this.selectedCompany) {
            this.stripeCustomerData.set(this.selectedCompany.id, customer);
          }

          // Initialize customer details with the customer object
          this.selectedCustomerDetails = {
            customer: customer,
            subscriptions: [],
            paymentMethods: [],
            invoices: []
          };

          // Load additional data
          this.loadCustomerSubscriptions(customerId);
          this.loadCustomerPaymentMethods(customerId);
          this.loadDetailedCustomerInvoices(customerId);
        } else {
          this.isLoadingCustomerDetails = false;
        }
      });
    } else {
      // Customer is in cache, use it
      console.log('✅ Using cached customer:', stripeCustomer);

      this.selectedCustomerDetails = {
        customer: stripeCustomer,
        subscriptions: [],
        paymentMethods: [],
        invoices: []
      };

      // Load all customer data in parallel
      this.loadCustomerSubscriptions(customerId);
      this.loadCustomerPaymentMethods(customerId);
      this.loadDetailedCustomerInvoices(customerId);
    }
  }

  /**
   * Load customer subscriptions
   */
  private loadCustomerSubscriptions(customerId: string) {
    this.stripeService.getSubscriptions(customerId).pipe(
      timeout(15000),
      catchError(err => {
        console.error('Failed to load subscriptions:', err);
        return of([]);
      })
    ).subscribe(result => {
      if (this.selectedCustomerDetails) {
        // Handle different response formats
        const resultObj = result as any;
        if (resultObj && resultObj.data && resultObj.data.data && Array.isArray(resultObj.data.data)) {
          this.selectedCustomerDetails.subscriptions = resultObj.data.data;
        } else if (resultObj && Array.isArray(resultObj.data)) {
          this.selectedCustomerDetails.subscriptions = resultObj.data;
        } else if (Array.isArray(result)) {
          this.selectedCustomerDetails.subscriptions = result;
        }
        console.log('✅ Subscriptions loaded:', this.selectedCustomerDetails.subscriptions.length);
      }
      this.isLoadingCustomerDetails = false;
    });
  }

  /**
   * Load customer payment methods
   */
  private loadCustomerPaymentMethods(customerId: string) {
    this.stripeService.getPaymentMethods(customerId).pipe(
      timeout(15000),
      catchError(err => {
        console.error('❌ Failed to load payment methods:', err);
        return of([]);
      })
    ).subscribe(result => {
      if (this.selectedCustomerDetails) {
        // Handle different response formats
        const resultObj = result as any;
        if (Array.isArray(result)) {
          this.selectedCustomerDetails.paymentMethods = result;
        } else if (resultObj && Array.isArray(resultObj.data)) {
          this.selectedCustomerDetails.paymentMethods = resultObj.data;
        }
        console.log('✅ Payment methods loaded:', this.selectedCustomerDetails.paymentMethods.length);
      }
    });
  }

  /**
   * Load detailed invoices for customer details view
   */
  private loadDetailedCustomerInvoices(customerId: string) {
    this.stripeService.getInvoices(customerId).pipe(
      timeout(15000),
      catchError(err => {
        console.error('❌ Failed to load invoices:', err);
        return of([]);
      })
    ).subscribe(result => {
      if (this.selectedCustomerDetails) {
        // Handle different response formats
        const resultObj = result as any;
        if (Array.isArray(result)) {
          this.selectedCustomerDetails.invoices = result;
        } else if (resultObj && Array.isArray(resultObj.data)) {
          this.selectedCustomerDetails.invoices = resultObj.data;
        }
        console.log('✅ Invoices loaded:', this.selectedCustomerDetails.invoices.length);

        // Debug: Log first invoice structure to see what fields are available
        if (this.selectedCustomerDetails.invoices.length > 0) {
          console.log('📋 Sample invoice structure:', {
            id: this.selectedCustomerDetails.invoices[0].id,
            status: this.selectedCustomerDetails.invoices[0].status,
            amount_paid: this.selectedCustomerDetails.invoices[0].amount_paid,
            amount_due: this.selectedCustomerDetails.invoices[0].amount_due,
            default_payment_method: this.selectedCustomerDetails.invoices[0].default_payment_method,
            payment_method: this.selectedCustomerDetails.invoices[0].payment_method,
            charge: this.selectedCustomerDetails.invoices[0].charge,
            payment_intent: this.selectedCustomerDetails.invoices[0].payment_intent,
            full_invoice: this.selectedCustomerDetails.invoices[0]
          });
        }
      }
    });
  }

  /**
   * Calculate total upcoming recurring charges for a specific payment method
   * @param paymentMethodId The ID of the payment method
   * @returns Total upcoming amount in dollars
   */
  getUpcomingTotalForCard(paymentMethodId: string): number {
    if (!this.selectedCustomerDetails?.subscriptions) {
      return 0;
    }

    const total = this.selectedCustomerDetails.subscriptions
      .filter(sub => {
        // Only count active subscriptions
        if (sub.status !== 'active' && sub.status !== 'trialing') {
          return false;
        }

        // Check if this subscription uses the specified payment method
        const subPaymentMethod = sub.default_payment_method;

        // If subscription has no specific payment method, it uses customer's default
        if (!subPaymentMethod && paymentMethodId === this.selectedCustomerDetails?.customer?.invoice_settings?.default_payment_method) {
          return true;
        }

        return subPaymentMethod === paymentMethodId;
      })
      .reduce((sum, sub) => {
        // Get the subscription amount from the first line item
        const amount = sub.items?.data?.[0]?.price?.unit_amount || 0;
        return sum + amount;
      }, 0);

    // Convert from cents to dollars
    return total / 100;
  }

  getFormattedUpcomingTotal(paymentMethodId: string): string {
    const total = this.getUpcomingTotalForCard(paymentMethodId);
    return this.formatCurrency(total);
  }

  /**
   * Get count of active subscriptions
   * @returns Number of active or trialing subscriptions
   */
  getActiveSubscriptionCount(): number {
    if (!this.selectedCustomerDetails?.subscriptions) {
      return 0;
    }

    return this.selectedCustomerDetails.subscriptions.filter(
      sub => sub.status === 'active' || sub.status === 'trialing'
    ).length;
  }

  /**
   * Get count of active services (products/line items from subscriptions)
   * @returns Number of unique services/products the customer is subscribed to
   */
  getActiveServicesCount(): number {
    if (!this.selectedCustomerDetails?.subscriptions) {
      return 0;
    }

    // Count all line items from active subscriptions
    let serviceCount = 0;
    this.selectedCustomerDetails.subscriptions
      .filter(sub => sub.status === 'active' || sub.status === 'trialing')
      .forEach(sub => {
        serviceCount += sub.items?.data?.length || 0;
      });

    return serviceCount;
  }

  // ===== Filter Management =====

  /**
   * Open filter modal
   */
  openFilterModal = () => {
    this.showFilterModal = true;
  }

  /**
   * Close filter modal
   */
  closeFilterModal = () => {
    this.showFilterModal = false;
  }

  /**
   * Apply filters and refresh data
   */
  applyFilters = () => {
    console.log('Applying filters:', this.filterOptions);
    this.closeFilterModal();
    this.refreshBillingData();
  }

  /**
   * Reset filters to default
   */
  resetFilters = () => {
    this.filterOptions = {
      minAmount: 100,
      maxAmount: null,
      dateRange: 'all',
      status: 'all'
    };
  }

  /**
   * Get filter summary text for display
   */
  getFilterSummary(): string {
    const parts: string[] = [];

    if (this.filterOptions.minAmount) {
      parts.push(`min $${this.filterOptions.minAmount}`);
    }
    if (this.filterOptions.maxAmount) {
      parts.push(`max $${this.filterOptions.maxAmount}`);
    }
    if (this.filterOptions.dateRange !== 'all') {
      const dateMap: any = {
        '7days': 'last 7 days',
        '30days': 'last 30 days',
        '90days': 'last 90 days',
        'custom': 'custom date'
      };
      parts.push(dateMap[this.filterOptions.dateRange] || this.filterOptions.dateRange);
    }
    if (this.filterOptions.status !== 'all') {
      parts.push(this.filterOptions.status);
    }

    return parts.length > 0 ? parts.join(', ') : 'No filters applied';
  }

  // ===== Payment Method Management =====

  /**
   * Open add payment method modal
   */
  openAddPaymentMethodModal = () => {
    if (!this.selectedCompany) {
      alert('⚠️ Please select a company first');
      return;
    }

    if (!this.selectedCompany.stripeCustomerId) {
      console.error('No Stripe customer ID for company:', this.selectedCompany);
      alert(`⚠️ This company doesn't have a Stripe customer ID yet.\n\nCompany: ${this.selectedCompany.name}\nPlease create a Stripe customer for this company first.`);
      return;
    }

    console.log('Opening payment method modal for customer:', this.selectedCompany.stripeCustomerId);
    this.showAddPaymentMethodModal = true;
    this.newPaymentMethod = {
      customerId: this.selectedCompany.stripeCustomerId,
      paymentMethodId: '',
      cardNumber: '',
      expMonth: '',
      expYear: '',
      cvc: ''
    };
  }

  /**
   * Close add payment method modal
   */
  closeAddPaymentMethodModal() {
    this.showAddPaymentMethodModal = false;
    this.newPaymentMethod = {
      customerId: '',
      paymentMethodId: '',
      cardNumber: '',
      expMonth: '',
      expYear: '',
      cvc: ''
    };
  }

  /**
   * Open card actions modal
   */
  openCardActionsModal(paymentMethod: any) {
    this.selectedCardForActions = paymentMethod;
    this.showCardActionsModal = true;
  }

  /**
   * Close card actions modal
   */
  closeCardActionsModal() {
    this.showCardActionsModal = false;
    this.selectedCardForActions = null;
  }

  /**
   * Set default payment method from modal
   */
  setDefaultPaymentMethodFromModal() {
    if (this.selectedCardForActions) {
      this.setDefaultPaymentMethod(this.selectedCardForActions.id);
      this.closeCardActionsModal();
    }
  }

  /**
   * Delete payment method from modal
   */
  deletePaymentMethodFromModal() {
    if (this.selectedCardForActions) {
      this.deletePaymentMethod(this.selectedCardForActions.id);
      this.closeCardActionsModal();
    }
  }

  /**
   * Add payment method to customer
   */
  addPaymentMethod() {
    if (!this.newPaymentMethod.paymentMethodId) {
      alert('⚠️ Payment Method ID is required');
      return;
    }

    this.isAddingPaymentMethod = true;

    this.stripeService.attachPaymentMethod(
      this.newPaymentMethod.paymentMethodId,
      this.newPaymentMethod.customerId
    ).pipe(
      timeout(15000),
      catchError(error => {
        alert(`❌ Failed to add payment method: ${error.message}`);
        return of(null);
      })
    ).subscribe(result => {
      this.isAddingPaymentMethod = false;

      if (result) {
        // Reload payment methods
        if (this.selectedCompany?.stripeCustomerId) {
          this.loadCustomerPaymentMethods(this.selectedCompany.stripeCustomerId);
        }
        this.closeAddPaymentMethodModal();
        alert(`✅ Payment method added successfully!`);
      }
    });
  }

  /**
   * Set default payment method
   */
  setDefaultPaymentMethod(paymentMethodId: string) {
    if (!this.selectedCompany?.stripeCustomerId) {
      alert('⚠️ No Stripe customer found');
      return;
    }

    if (!confirm('Set this as the default payment method?')) return;

    this.isSettingDefaultPayment = true;

    this.stripeService.setDefaultPaymentMethod(this.selectedCompany.stripeCustomerId, paymentMethodId).pipe(
      timeout(15000),
      catchError(error => {
        alert(`❌ Failed to set default: ${error.message}`);
        return of(null);
      })
    ).subscribe(result => {
      this.isSettingDefaultPayment = false;

      if (result) {
        // Reload customer details
        if (this.selectedCompany?.stripeCustomerId) {
          this.loadCustomerDetails(this.selectedCompany.stripeCustomerId);
        }
        alert(`✅ Default payment method updated!`);
      }
    });
  }

  /**
   * Delete payment method
   */
  deletePaymentMethod(paymentMethodId: string) {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    this.isDeletingPaymentMethod = true;

    this.stripeService.detachPaymentMethod(paymentMethodId).pipe(
      timeout(15000),
      catchError(error => {
        alert(`❌ Failed to delete payment method: ${error.message}`);
        return of(null);
      })
    ).subscribe(result => {
      this.isDeletingPaymentMethod = false;

      if (result) {
        // Reload payment methods
        if (this.selectedCompany?.stripeCustomerId) {
          this.loadCustomerPaymentMethods(this.selectedCompany.stripeCustomerId);
        }
        alert(`✅ Payment method deleted successfully!`);
      }
    });
  }

  // ===== Subscription Management =====

  /**
   * Open add subscription modal
   */
  openAddSubscriptionModal() {
    if (!this.selectedCompany?.stripeCustomerId) {
      alert('⚠️ No Stripe customer ID found for this company');
      return;
    }
    this.showAddSubscriptionModal = true;
    this.newSubscription = {
      customerId: this.selectedCompany.stripeCustomerId,
      priceId: '',
      paymentMethodId: '',
      trialPeriodDays: 0
    };
  }

  /**
   * Close add subscription modal
   */
  closeAddSubscriptionModal() {
    this.showAddSubscriptionModal = false;
    this.newSubscription = {
      customerId: '',
      priceId: '',
      paymentMethodId: '',
      trialPeriodDays: 0
    };
  }

  /**
   * Create subscription
   */
  createSubscription() {
    if (!this.newSubscription.priceId) {
      alert('⚠️ Price ID is required');
      return;
    }

    this.isCreatingSubscription = true;

    const subscriptionData: any = {
      customerId: this.newSubscription.customerId,
      priceId: this.newSubscription.priceId,
      environment: 'test' // You can make this dynamic based on your setup
    };

    if (this.newSubscription.paymentMethodId) {
      subscriptionData.paymentMethodId = this.newSubscription.paymentMethodId;
    }
    if (this.newSubscription.trialPeriodDays > 0) {
      subscriptionData.trialPeriodDays = this.newSubscription.trialPeriodDays;
    }

    this.stripeService.createSubscription(subscriptionData).pipe(
      timeout(15000),
      catchError(error => {
        alert(`❌ Failed to create subscription: ${error.message}`);
        return of(null);
      })
    ).subscribe(result => {
      this.isCreatingSubscription = false;

      if (result) {
        // Reload subscriptions
        if (this.selectedCompany?.stripeCustomerId) {
          this.loadCustomerSubscriptions(this.selectedCompany.stripeCustomerId);
        }
        this.closeAddSubscriptionModal();
        const subscription = (result as any).data || result;
        alert(`✅ Subscription created!\n\nID: ${subscription.id}`);
      }
    });
  }

  /**
   * Cancel subscription
   */
  cancelSubscription(subscriptionId: string) {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;

    this.isCancelingSubscription = true;

    this.stripeService.cancelSubscription(subscriptionId).pipe(
      timeout(15000),
      catchError(error => {
        alert(`❌ Failed to cancel subscription: ${error.message}`);
        return of(null);
      })
    ).subscribe(result => {
      this.isCancelingSubscription = false;

      if (result) {
        // Reload subscriptions
        if (this.selectedCompany?.stripeCustomerId) {
          this.loadCustomerSubscriptions(this.selectedCompany.stripeCustomerId);
        }
        alert(`✅ Subscription canceled successfully!`);
      }
    });
  }

  /**
   * Get available prices for subscription creation
   */
  getAvailablePrices() {
    return this.availablePrices.filter(price => price.active);
  }

  /**
   * Get available payment methods for the selected customer
   */
  getAvailablePaymentMethods() {
    return this.selectedCustomerDetails?.paymentMethods || [];
  }

  /**
   * Format price display for dropdown
   */
  formatPriceDisplay(price: any): string {
    const amount = this.formatCurrency((price.unit_amount || 0) / 100); // Convert cents to dollars
    const interval = price.recurring ? ` / ${price.recurring.interval}` : ' (one-time)';
    const nickname = price.nickname ? ` - ${price.nickname}` : '';
    return `${amount}${interval}${nickname}`;
  }

  // ===== Product Purchase Management =====

  /**
   * Open purchase confirmation modal for a product/price
   */
  openPurchaseModal(product: any, price: any) {
    if (!this.selectedCompany) {
      alert('⚠️ Please select a company first');
      return;
    }

    if (!this.selectedCompany.stripeCustomerId) {
      alert('⚠️ This company does not have a Stripe customer account yet. Please set up billing first.');
      return;
    }

    if (!this.selectedCustomerDetails?.paymentMethods || this.selectedCustomerDetails.paymentMethods.length === 0) {
      alert('⚠️ Please add a payment method before making a purchase.');
      return;
    }

    this.selectedProductForPurchase = product;
    this.selectedPriceForPurchase = price;
    this.purchaseType = price.recurring ? 'subscription' : 'one-time';
    this.showPurchaseConfirmationModal = true;
  }

  /**
   * Close purchase confirmation modal
   */
  closePurchaseModal = () => {
    this.showPurchaseConfirmationModal = false;
    this.selectedProductForPurchase = null;
    this.selectedPriceForPurchase = null;
  }

  /**
   * Confirm and process purchase
   */
  confirmPurchase() {
    if (!this.selectedPriceForPurchase || !this.selectedCompany?.stripeCustomerId) {
      return;
    }

    this.isPurchasing = true;

    if (this.purchaseType === 'subscription') {
      // Create subscription
      const subscriptionData = {
        customerId: this.selectedCompany.stripeCustomerId,
        priceId: this.selectedPriceForPurchase.id,
        paymentMethodId: this.selectedCustomerDetails?.customer?.invoice_settings?.default_payment_method || ''
      };

      this.stripeService.createSubscription(subscriptionData).pipe(
        timeout(15000),
        catchError(error => {
          alert(`❌ Failed to create subscription: ${error.message}`);
          return of(null);
        })
      ).subscribe(result => {
        this.isPurchasing = false;

        if (result) {
          // Reload customer details
          if (this.selectedCompany?.stripeCustomerId) {
            this.loadCustomerDetails(this.selectedCompany.stripeCustomerId);
          }
          this.closePurchaseModal();
          const subscription = (result as any).data || result;
          alert(`✅ Subscription created successfully!\n\nYou are now subscribed to ${this.selectedProductForPurchase.name}`);
        }
      });
    } else {
      // For one-time purchases, you would create an invoice or payment intent
      // This is a simplified version - you may need to implement invoice creation
      alert('⚠️ One-time purchases require invoice creation. This feature is coming soon!');
      this.isPurchasing = false;
      this.closePurchaseModal();
    }
  }

  /**
   * Get products with recurring prices (subscriptions)
   */
  getSubscriptionProducts() {
    return this.availableProducts.filter(product => {
      // Check if product has at least one recurring price
      const prices = this.availablePrices.filter(p => p.product === product.id || p.product?.id === product.id);
      return prices.some(p => p.recurring && p.active);
    });
  }

  /**
   * Get products with one-time prices
   */
  getOneTimeProducts() {
    return this.availableProducts.filter(product => {
      const prices = this.availablePrices.filter(p => p.product === product.id || p.product?.id === product.id);
      return prices.some(p => !p.recurring && p.active);
    });
  }

  /**
   * Get prices for a specific product
   */
  getPricesForProduct(productId: string) {
    return this.availablePrices.filter(p =>
      (p.product === productId || p.product?.id === productId) && p.active
    );
  }

  /**
   * Check if user already has a subscription to this product
   */
  hasActiveSubscription(productId: string): boolean {
    if (!this.selectedCustomerDetails?.subscriptions) {
      return false;
    }

    return this.selectedCustomerDetails.subscriptions.some(sub =>
      (sub.status === 'active' || sub.status === 'trialing') &&
      sub.items?.data?.some((item: any) =>
        item.price?.product === productId || item.price?.product?.id === productId
      )
    );
  }

  /**
   * Get recurring prices for a product
   */
  getRecurringPricesForProduct(productId: string) {
    return this.getPricesForProduct(productId).filter(p => p.recurring);
  }

  /**
   * Get one-time prices for a product
   */
  getOneTimePricesForProduct(productId: string) {
    return this.getPricesForProduct(productId).filter(p => !p.recurring);
  }

  /**
   * Get default payment method for display
   */
  getDefaultPaymentMethodDisplay(): string {
    if (!this.selectedCustomerDetails?.paymentMethods) {
      return 'No payment method';
    }

    const defaultPmId = this.selectedCustomerDetails.customer?.invoice_settings?.default_payment_method;
    let paymentMethod;

    if (defaultPmId) {
      paymentMethod = this.selectedCustomerDetails.paymentMethods.find(pm => pm.id === defaultPmId);
    } else if (this.selectedCustomerDetails.paymentMethods.length > 0) {
      paymentMethod = this.selectedCustomerDetails.paymentMethods[0];
    }

    if (paymentMethod?.card) {
      return `${paymentMethod.card.brand || 'Card'} •••• ${paymentMethod.card.last4 || '****'}`;
    }

    return 'Payment method available';
  }

  /**
   * Load invoices for a specific company
   */
  async loadInvoicesForCompany(company: Company) {
    if (!company.stripeCustomerId) {
      console.warn(`Company ${company.name} has no Stripe customer ID`);
      this.transfers = [];
      return;
    }

    this.isLoading = true;

    this.stripeService.getInvoices(company.stripeCustomerId).pipe(
      timeout(30000),
      catchError((err: any) => {
        console.error('❌ Failed to load invoices for company:', err);
        return of([]);
      })
    ).subscribe({
      next: (invoices: any[]) => {
        console.log(`✅ Loaded invoices for ${company.name}:`, invoices);

        if (invoices && invoices.length > 0) {
          this.transfers = invoices
            .filter(invoice => invoice.status === 'paid')
            .slice(0, 10)
            .map(invoice => ({
              logo: this.getDefaultCompanyLogo(company.name),
              company: company.name,
              description: invoice.description || `Invoice ${invoice.number || invoice.id}`,
              lastFour: invoice.charge?.payment_method_details?.card?.last4 || '****',
              date: this.formatDate(new Date(invoice.created * 1000)),
              amount: invoice.amount_paid / 100
            }));
        } else {
          this.transfers = [];
        }

        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ Error loading invoices:', error);
        this.transfers = [];
        this.isLoading = false;
      }
    });
  }

  /**
   * Load invoice data from Stripe for the user's companies
   */
  async loadStripeInvoiceDataForUser() {
    if (this.userCompanies.length === 0) {
      console.warn('No companies to load invoices for');
      return;
    }

    // Load invoices for the selected company (or first company)
    const targetCompany = this.selectedCompany || this.userCompanies[0];
    if (targetCompany) {
      await this.loadInvoicesForCompany(targetCompany);
    }
  }

  /**
   * Load billing data for companies associated with the current user
   */
  async loadUserBillingData() {
    if (!this.user?.id) {
      console.warn('No user ID available for billing data');
      this.loadMockTransfers(); // Fallback to mock data
      return;
    }

    try {
      const firestore = getFirestore();

      // First, get the current user's data including attached sites
      const userDoc = await getDoc(doc(firestore, 'users', this.user.id));

      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        this.user = { ...this.user, ...userData };

        if (this.user.attachedSites && this.user.attachedSites.length > 0) {
          // Load company data for attached sites
          await this.loadCompanyData();

          // Load billing transactions for these companies
          await this.loadBillingTransactions();
        } else {
          console.log('User has no attached sites');
          this.loadMockTransfers(); // Fallback to mock data
        }
      } else {
        console.log('User document not found');
        this.loadMockTransfers(); // Fallback to mock data
      }
    } catch (error) {
      console.error('Error loading user billing data:', error);
      this.loadMockTransfers(); // Fallback to mock data on error
    }
  }

  /**
   * Load company data for user's attached sites
   */
  async loadCompanyData() {
    if (!this.user?.attachedSites) return;

    const firestore = getFirestore();
    const companyPromises = this.user.attachedSites.map(async (site: AttachedSite) => {
      try {
        const companyDoc = await getDoc(doc(firestore, 'companies', site.companyId));
        if (companyDoc.exists()) {
          return { id: companyDoc.id, ...companyDoc.data() } as Company;
        }
        return null;
      } catch (error) {
        console.error(`Error loading company ${site.companyId}:`, error);
        return null;
      }
    });

    const companies = await Promise.all(companyPromises);
    this.userCompanies = companies.filter(company => company !== null) as Company[];
    console.log('Loaded companies:', this.userCompanies);
  }

  /**
   * Load recent billing transactions for user's companies
   */
  async loadBillingTransactions() {
    if (this.userCompanies.length === 0) return;

    const firestore = getFirestore();
    const companyIds = this.userCompanies.map(company => company.id);

    try {
      // Query billing/transactions collection for companies
      const transactionsRef = collection(firestore, 'billing', 'transactions', 'records');
      const transactionsQuery = query(
        transactionsRef,
        where('companyId', 'in', companyIds),
        where('status', '==', 'completed'),
        orderBy('date', 'desc'),
        limit(10) // Get the latest 10 transactions
      );

      const transactionDocs = await getDocs(transactionsQuery);

      this.billingTransactions = transactionDocs.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          companyId: data['companyId'],
          companyName: this.getCompanyName(data['companyId']),
          companyLogo: this.getCompanyLogo(data['companyId']),
          description: data['description'] || 'Payment',
          amount: data['amount'] || 0,
          currency: data['currency'] || 'USD',
          date: data['date']?.toDate() || new Date(),
          lastFour: data['lastFour'] || '****',
          status: data['status'] || 'completed',
          invoiceId: data['invoiceId'],
          paymentMethod: data['paymentMethod']
        } as BillingTransaction;
      });

      // Convert billing transactions to transfers format
      this.convertBillingToTransfers();

      console.log('Loaded billing transactions:', this.billingTransactions);
    } catch (error) {
      console.error('Error loading billing transactions:', error);

      // If the billing collection doesn't exist, try to generate from company billing info
      this.generateTransfersFromCompanyBilling();
    }
  }

  /**
   * Convert billing transactions to transfers format for display
   */
  convertBillingToTransfers() {
    this.transfers = this.billingTransactions.map(transaction => ({
      logo: transaction.companyLogo || this.getDefaultCompanyLogo(transaction.companyName),
      company: transaction.companyName,
      description: transaction.description,
      lastFour: transaction.lastFour,
      date: this.formatDate(transaction.date),
      amount: transaction.amount
    }));
  }

  /**
   * Generate transfers from company billing information if no transaction history exists
   */
  generateTransfersFromCompanyBilling() {
    this.transfers = this.userCompanies
      .filter(company => company.billing && company.billing.monthlyRate)
      .map(company => ({
        logo: this.getDefaultCompanyLogo(company.name),
        company: company.name,
        description: `${company.billing?.subscriptionPlan || 'Monthly'} Subscription`,
        lastFour: '****', // No payment method info available
        date: this.formatDate(company.billing?.nextBillingDate || new Date()),
        amount: company.billing?.monthlyRate || 0
      }));

    if (this.transfers.length === 0) {
      // Still no data, fallback to mock
      this.loadMockTransfers();
    }
  }

  /**
   * Get company name by ID
   */
  getCompanyName(companyId: string): string {
    const company = this.userCompanies.find(c => c.id === companyId);
    return company?.name || 'Unknown Company';
  }

  /**
   * Get company logo by ID
   */
  getCompanyLogo(companyId: string): string | undefined {
    const company = this.userCompanies.find(c => c.id === companyId);
    // Assuming companies might have a logo field in the future
    return (company as any)?.logo;
  }

  /**
   * Generate a default logo based on company name
   */
  getDefaultCompanyLogo(companyName: string): string {
    // Create a simple avatar-style logo based on company name
    const initials = companyName.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=007bff&color=fff&size=64`;
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    });
  }

  /**
   * Load invoice data from Stripe API
   */
  loadStripeInvoiceData() {
    console.log('💳 Loading Stripe invoice data...');
    this.isLoading = true;

    // Load all customers to get their invoices
    this.stripeService.getAllCustomers(10).pipe(
      timeout(30000),
      catchError((err: any) => {
        console.error('❌ Failed to load Stripe customers:', err);
        this.loadMockTransfers(); // Fallback to mock data
        return of([]);
      })
    ).subscribe({
      next: (customers: any[]) => {
        console.log('✅ Loaded Stripe customers:', customers);

        if (customers && customers.length > 0) {
          // Load invoices for all customers
          this.loadCustomerInvoices(customers);
        } else {
          console.log('No customers found, using mock data');
          this.loadMockTransfers();
          this.isLoading = false;
        }
      },
      error: (error: any) => {
        console.error('❌ Error loading customers:', error);
        this.loadMockTransfers(); // Fallback to mock data
        this.isLoading = false;
      }
    });
  }

  /**
   * Load invoices for all customers from Stripe
   */
  private loadCustomerInvoices(customers: any[]) {
    // Get invoices for each customer
    const customerIds = customers.slice(0, 10); // Limit to first 10 customers for performance

    if (customerIds.length === 0) {
      this.loadMockTransfers();
      this.isLoading = false;
      return;
    }

    // For now, we'll get invoices for the first customer as a demo
    // In production, you might want to aggregate across multiple customers
    const firstCustomer = customerIds[0];

    this.stripeService.getInvoices(firstCustomer.id).pipe(
      timeout(30000),
      catchError((err: any) => {
        console.error('❌ Failed to load invoices:', err);
        return of([]);
      })
    ).subscribe({
      next: (invoices: any[]) => {
        console.log('✅ Loaded Stripe invoices:', invoices);

        if (invoices && invoices.length > 0) {
          this.convertStripeInvoicesToTransfers(invoices, customers);
        } else {
          console.log('No invoices found, using mock data');
          this.loadMockTransfers();
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ Error loading invoices:', error);
        this.loadMockTransfers();
        this.isLoading = false;
      }
    });
  }

  /**
   * Convert Stripe invoices to transfers format for display
   */
  private convertStripeInvoicesToTransfers(invoices: any[], customers: any[]) {
    this.transfers = invoices
      .filter(invoice => invoice.status === 'paid') // Only show paid invoices
      .slice(0, 10) // Limit to 10 most recent
      .map(invoice => {
        // Find the customer for this invoice
        const customer = customers.find(c => c.id === invoice.customer);
        const customerName = customer?.name || customer?.email || 'Unknown Customer';

        // Get payment method info
        const paymentIntent = invoice.payment_intent;
        const lastFour = invoice.charge?.payment_method_details?.card?.last4 || '****';

        return {
          logo: this.getDefaultCompanyLogo(customerName),
          company: customerName,
          description: invoice.description || `Invoice ${invoice.number || invoice.id}`,
          lastFour: lastFour,
          date: this.formatDate(new Date(invoice.created * 1000)),
          amount: invoice.amount_paid / 100 // Convert from cents to dollars
        };
      });

    console.log('✅ Converted invoices to transfers:', this.transfers);

    // If no transfers were created, fall back to mock data
    if (this.transfers.length === 0) {
      this.loadMockTransfers();
    }
  }

  /**
   * Refresh billing data - useful for testing and manual refresh
   */
  async refreshBillingData() {
    this.isLoading = true;
    this.loadStripeInvoiceData();
  }

  loadCustomerData() {
    // Create a mock user with a realistic ID for Firebase queries
    this.createMockUser();

    // Generate mock data for demo purposes
    this.loadMockProjects();
    this.loadMockActivities();
    this.loadMockServices();

    this.isLoading = false;
  }

  private createMockUser() {
    // Create a mock user for demo purposes with a realistic ID
    this.user = {
      id: 'demo-user-123', // Use a realistic ID for Firebase queries
      firstName: 'John',
      lastName: 'Doe',
      name: 'John Doe',
      email: 'customer@example.com',
      phone: '555-123-4567',
      avatarUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
      platforms: [],
      onboardingCompleted: true,
      role: 'User',
      status: 'Active',
      joinDate: new Date('2025-01-01'),
      lastLogin: new Date('2025-08-28'),
      location: 'New York, NY',
      bio: 'Customer at Pixel & Post (KNDL Inc.)',
      // Add some mock attached sites for testing
      attachedSites: [
        {
          companyId: 'company-1',
          companyName: 'Tech Solutions Inc.',
          dateAttached: new Date('2025-01-15'),
          role: 'Client',
          permissions: ['billing_view'],
          notes: 'Main client account'
        },
        {
          companyId: 'company-2',
          companyName: 'Digital Marketing Pro',
          dateAttached: new Date('2025-02-10'),
          role: 'Client',
          permissions: ['billing_view'],
          notes: 'Marketing services'
        }
      ]
    };
  }

  private loadMockProjects() {
    this.projects = [
      {
        id: '1',
        name: 'Business Website',
        status: 'in-progress',
        type: 'website',
        lastUpdated: new Date('2025-08-25'),
        nextMilestone: 'Content Review',
        progress: 65,
        url: 'https://your-site.com'
      },
      {
        id: '2',
        name: 'Domain Setup',
        status: 'completed',
        type: 'domain',
        lastUpdated: new Date('2025-08-20'),
        progress: 100
      },
      {
        id: '3',
        name: 'SEO Optimization',
        status: 'active',
        type: 'website',
        lastUpdated: new Date('2025-08-28'),
        nextMilestone: 'Keyword Research',
        progress: 30
      }
    ];
  }

  private loadMockActivities() {
    this.recentActivities = [
      {
        id: '1',
        type: 'milestone',
        description: 'Website design approved',
        date: new Date('2025-08-27'),
        status: 'completed'
      },
      {
        id: '2',
        type: 'payment',
        description: 'Monthly hosting payment',
        date: new Date('2025-08-25'),
        amount: 29.99,
        status: 'completed'
      },
      {
        id: '3',
        type: 'update',
        description: 'Content updates published',
        date: new Date('2025-08-23'),
        status: 'completed'
      },
      {
        id: '4',
        type: 'support',
        description: 'Support ticket resolved',
        date: new Date('2025-08-20'),
        status: 'completed'
      }
    ];
  }

  private loadMockServices() {
    this.services = [
      {
        name: 'Web Hosting',
        status: 'active',
        renewalDate: new Date('2025-09-15'),
        monthlyFee: 29.99,
        icon: 'fas fa-server'
      },
      {
        name: 'Domain Registration',
        status: 'active',
        renewalDate: new Date('2026-01-12'),
        monthlyFee: 15.99,
        icon: 'fas fa-globe'
      },
      {
        name: 'SSL Certificate',
        status: 'active',
        renewalDate: new Date('2026-01-12'),
        icon: 'fas fa-shield-alt'
      },
      {
        name: 'Maintenance Plan',
        status: 'active',
        monthlyFee: 99.99,
        icon: 'fas fa-tools'
      }
    ];
  }

  private loadMockTransfers() {
    this.transfers = [];
  }

  private loadMockPayments() {
    this.payments = [
      {
        cardColor: "green",
        expiry: "01/22",
        lastFour: "4012",
        service: "Internet",
        amount: 2110,
        currency: "USD",
        icon: "ph-caret-right-bold"
      },
      {
        cardColor: "olive",
        expiry: "12/23",
        lastFour: "2228",
        service: "Universal",
        amount: 5621,
        currency: "USD",
        icon: "ph-caret-right-bold"
      },
      {
        cardColor: "gray",
        expiry: "03/22",
        lastFour: "5214",
        service: "Gold",
        amount: 3473,
        currency: "USD",
        icon: "ph-caret-right-bold"
      }
    ];
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
      case 'completed':
        return 'status-success';
      case 'in-progress':
        return 'status-progress';
      case 'on-hold':
      case 'pending':
        return 'status-warning';
      case 'expired':
      case 'suspended':
        return 'status-error';
      default:
        return 'status-default';
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'payment':
        return 'fas fa-credit-card';
      case 'update':
        return 'fas fa-edit';
      case 'support':
        return 'fas fa-headset';
      case 'milestone':
        return 'fas fa-flag-checkered';
      default:
        return 'fas fa-info-circle';
    }
  }

  getDaysUntilRenewal(renewalDate: Date): number {
    const today = new Date();
    const timeDiff = renewalDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  get activeServicesCount(): number {
    return this.services.filter(s => s.status === 'active').length;
  }

  navigateToProject(project: CustomerProject) {
    // Navigate to project details or external URL
    if (project.url) {
      window.open(project.url, '_blank');
    } else {
      // Navigate to project management section
      console.log('Navigate to project:', project.id);
    }
  }

  viewAllProjects() {
    console.log('Navigate to all projects');
  }

  viewAllActivities() {
    console.log('Navigate to all activities');
  }

  manageServices() {
    console.log('Navigate to services management');
  }

  get CompanyName(): string {
    return this.companyName || "Your Company";
  }

  set CompanyName(name: string) {
    this.companyName = name;
  }

}
