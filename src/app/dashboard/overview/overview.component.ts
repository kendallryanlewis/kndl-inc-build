import { Component, OnInit } from '@angular/core';
import { ComponentCommunicationService } from '../../services/component-communication.service';
import { User, UserPlatform, Company, BillingInfo, AttachedSite } from '../../models/User';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { StripeService } from '../../services/stripe.service';
import { timeout, catchError } from 'rxjs/operators';
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
  styleUrls: ['./overview.component.scss', '../dashboard.component.scss']
})
export class OverviewComponent implements OnInit {
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
  selectedSite: string = "Kendallryanlewis.com";
  companyName: string = "Pixel & Post (KNDL Inc.)";

  constructor(
    private communicationService: ComponentCommunicationService,
    private stripeService: StripeService
  ) { }

  ngOnInit() {
    this.loadCustomerData();
    this.getWebsties();
    this.loadStripeInvoiceData();
    this.loadMockPayments();
  }

  getWebsties() {
    // In a real application, fetch the websites from the user data or an API
    if (this.user) {
      this.websites = ["Kendallryanlewis.com", "kndl-inc.com"];
      /*this.websites = this.user.platforms.map((platform: UserPlatform) => platform.domain);
      if (this.websites.length > 0) {
        this.selectedSite = this.websites[0];
      }*/
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
    this.transfers = [
      {
        logo: "https://assets.codepen.io/285131/apple.svg",
        company: "Apple Inc.",
        description: "Apple ID Payment",
        lastFour: "4012",
        date: "28 Oct. 21",
        amount: 550
      },
      {
        logo: "https://assets.codepen.io/285131/pinterest.svg",
        company: "Pinterest",
        description: "2 year subscription",
        lastFour: "5214",
        date: "26 Oct. 21",
        amount: 120
      },
      {
        logo: "https://assets.codepen.io/285131/warner-bros.svg",
        company: "Warner Bros.",
        description: "Cinema",
        lastFour: "2228",
        date: "22 Oct. 21",
        amount: 70
      }
    ];
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
