import { Component, AfterViewInit, Output, EventEmitter, OnInit, Input } from '@angular/core';
import { User } from 'src/app/models/User';
import { filteredSubscriptionPlans, oneTimeAddons } from 'src/app/kndl/addons.data';
import { CompanyBillingService } from '../../services/company-billing.service';
import { CompanyBilling } from '../../models/company-billing';

interface MetricCard {
  icon: string;
  title: string;
  value: number;
  subtitle: string;
  class: string;
}

interface Billing {
  id: string;
  customer: string;
  amount: number;
  date: string;
  service: string;
  status: string;
}

interface UrgentBilling {
  id: string;
  customer: string;
  amount: number;
  dueDate: string;
  overdueDays: number;
  service: string;
  status: string;
  priority: string;
}

interface RevenueMonth {
  month: string;
  revenue: number;
  taxes: number;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})

export class AdminComponent implements OnInit, AfterViewInit {
  @Input() subTab: string = 'Home';
  @Output() childTabs = new EventEmitter<string[]>();
  sectionIds: string[] = ['Home'];
  private previousSubTab: string = '';
  // Firebase data
  companies: CompanyBilling[] = [];
  dashboardMetrics: any = {};
  isLoading = true;

  // Comprehensive billing data
  pastBillings: any[] = [];
  futureBillings: any[] = [];
  overduePayments: any[] = [];

  // Component state
  showCreateDummyButton = true;

  // Configuration properties
  packages: any[] = [
    {
      id: 'starter',
      name: 'Starter',
      tagline: 'Brand Essentials',
      price: '$325 – $780',
      color: '#364074',
      description: 'For solo founders, local service pros, and small businesses who need a credible web presence fast.',
      features: ['Single-page build', 'Contact form', 'SEO & performance', 'WordPress core setup']
    },
    {
      id: 'growth',
      name: 'Growth',
      tagline: 'Digital + Print',
      price: '$1,040 – $1,950',
      color: '#197c65ff',
      description: 'For growing businesses ready for a multi-page site, blog, and enhanced forms or bookings.',
      features: ['Multi-page build', 'Blog & CPT', 'Enhanced forms', 'Bookings/payments']
    },
    {
      id: 'pro',
      name: 'Pro',
      tagline: 'Total Brand Presence',
      price: '$2,600 – $4,550+',
      color: '#d2b48c',
      description: 'For teams needing advanced custom development, integrations, and scalable WordPress solutions.',
      features: ['Custom dev & integrations', 'WooCommerce', 'Memberships/roles', 'Headless/Angular components']
    }
  ];

  oneTimeAddons: any[] = oneTimeAddons;
  subscriptions: any[] = filteredSubscriptionPlans;

  // Modal configuration properties
  showConfigModal = false;
  modalTitle = '';
  configType: 'package' | 'addon' | 'subscription' = 'package';
  currentConfig: any = {};
  isEditing = false;
  editingIndex = -1;
  featuresText = '';

  // Metrics for cards
  user: User = {} as User;
  totalRevenue = 285400;
  taxesOwed = 42810;
  quarterlyTaxEstimate = 71350;
  nextTaxDeadline = '2025-10-15';
  totalOverdue = 5650;
  overdueCount = 3;

  cardData: MetricCard[] = [
    {
      icon: 'fa-dollar-sign',
      title: 'Total Revenue (YTD)',
      value: this.totalRevenue,
      subtitle: '+12.5% from last year',
      class: 'revenue'
    },
    {
      icon: 'fa-file-text',
      title: 'Taxes Owed (Current)',
      value: this.taxesOwed,
      subtitle: 'Due: ' + this.nextTaxDeadline,
      class: 'taxes'
    },
    {
      icon: 'fa-calendar',
      title: 'Quarterly Estimate',
      value: this.quarterlyTaxEstimate,
      subtitle: 'Q4 2025 Estimate',
      class: 'quarterly'
    },
    {
      icon: 'fa-triangle-exclamation',
      title: 'Overdue Amount',
      value: this.totalOverdue,
      subtitle: this.overdueCount + ' invoices',
      class: 'overdue'
    }
  ];

  // Recent Billings
  recentBillings: Billing[] = [];

  // Urgent/Failed Billings
  urgentBillings: UrgentBilling[] = []

  // Monthly Revenue Breakdown
  monthlyRevenue: RevenueMonth[] = [
    { month: 'January', revenue: 28400, taxes: 4260 },
    { month: 'February', revenue: 31200, taxes: 4680 },
    { month: 'March', revenue: 29800, taxes: 4470 },
    { month: 'April', revenue: 33500, taxes: 5025 },
    { month: 'May', revenue: 35200, taxes: 5280 },
    { month: 'June', revenue: 32100, taxes: 4815 },
    { month: 'July', revenue: 36800, taxes: 5520 },
    { month: 'August', revenue: 38400, taxes: 5760 },
    { month: 'September', revenue: 20000, taxes: 3000 }
  ];

  // Payment Stats
  successfulPayments = 24;
  failedPayments = 3;

  // Tax Estimate Section
  taxEstimateLeast = 0;
  taxEstimateAverage = 0;
  taxEstimateMost = 0;

  // Tax configuration
  taxRate = {
    federal: {
      single: [
        { min: 0, max: 11000, rate: 0.10 },
        { min: 11000, max: 44725, rate: 0.12 },
        { min: 44725, max: 95375, rate: 0.22 },
        { min: 95375, max: 182050, rate: 0.24 },
        { min: 182050, max: 231250, rate: 0.32 },
        { min: 231250, max: 578125, rate: 0.35 },
        { min: 578125, max: Infinity, rate: 0.37 }
      ],
      marriedJoint: [
        { min: 0, max: 22000, rate: 0.10 },
        { min: 22000, max: 89450, rate: 0.12 },
        { min: 89450, max: 190750, rate: 0.22 },
        { min: 190750, max: 364200, rate: 0.24 },
        { min: 364200, max: 462500, rate: 0.32 },
        { min: 462500, max: 693750, rate: 0.35 },
        { min: 693750, max: Infinity, rate: 0.37 }
      ]
    },
    state: {
      California: 0.133,  // Highest state rate
      Texas: 0.0,         // No state income tax
      Florida: 0.0,       // No state income tax
      'New York': 0.109,
      Illinois: 0.0495,
      Nevada: 0.0,        // No state income tax
      Washington: 0.0,    // No state income tax
      Oregon: 0.099,
      Colorado: 0.0463,
      Massachusetts: 0.05
    },
    selfEmployment: 0.1413, // Self-employment tax rate
    standardDeduction: {
      single: 13850,
      marriedJoint: 27700
    }
  };

  deductionScenarios = {
    minimal: 0.05,     // 5% of income in deductions
    average: 0.15,     // 15% of income in deductions  
    maximum: 0.30      // 30% of income in deductions
  };

  states: string[] = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida',
    'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
    'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska',
    'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
    'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee',
    'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];
  selectedState: string = 'Texas';
  federalFilingStatus: string = 'single';


  constructor(private companyBillingService: CompanyBillingService) {
    this.user = this.getUser() || {} as User;
  }

  ngOnChanges(): void {
    if (this.subTab !== this.previousSubTab) {
      // DON'T reset changed fields when switching tabs - preserve changes across views
      // Only update the cached properties to reflect current state
      this.previousSubTab = this.subTab;
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
    this.loadDashboardData();
  }

  private async emitChildTabs(): Promise<void> {
    // Emit available section IDs to parent components
    this.childTabs.emit(this.sectionIds);
  }


  /**
   * Load all dashboard data from Firebase
   */
  async loadDashboardData(): Promise<void> {
    try {
      this.isLoading = true;

      // Load companies and metrics
      this.companies = await this.companyBillingService.getAllCompanies();
      this.dashboardMetrics = await this.companyBillingService.getDashboardMetrics();

      // Load all billing data from the three collections
      const [pastBillings, futureBillings, overduePayments] = await Promise.all([
        this.getPastBillings(),
        this.companyBillingService.getFutureBillings(),
        this.companyBillingService.getOverduePayments()
      ]);

      // Store billing data in component properties
      this.pastBillings = pastBillings;
      this.futureBillings = futureBillings;
      this.overduePayments = overduePayments;

      // Update recent billings with past billings data
      this.recentBillings = pastBillings.slice(0, 10).map(billing => ({
        id: billing.id,
        customer: billing.customer,
        amount: billing.amount,
        date: this.formatDate(billing.date),
        service: billing.service,
        status: this.capitalizeFirstLetter(billing.status)
      }));

      // Update urgent/overdue billings from Firebase
      this.urgentBillings = overduePayments.map(overdue => ({
        id: overdue.id,
        customer: overdue.customer,
        amount: overdue.amount,
        dueDate: this.formatDate(overdue.dueDate),
        overdueDays: overdue.overdueDays,
        service: overdue.service,
        status: this.capitalizeFirstLetter(overdue.status),
        priority: this.capitalizeFirstLetter(overdue.priority)
      }));

      // Update monthly revenue with comprehensive billing data
      this.updateMonthlyRevenueFromBillings(pastBillings, futureBillings, overduePayments);

      // Update card data with comprehensive metrics
      this.updateCardDataFromBillings(pastBillings, futureBillings, overduePayments);

      // Calculate payment statistics for charts
      this.calculatePaymentStats();

      // Hide the create dummy button if we have data
      if (this.companies.length > 0) {
        this.showCreateDummyButton = false;
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);

      // Handle permissions errors specifically
      if (error instanceof Error && error.message.includes('permissions')) {
        console.error('🔒 Firebase Permissions Issue Detected!');
        console.error('Please follow these steps to fix:');
        console.error('1. Go to Firebase Console');
        console.error('2. Select your project');
        console.error('3. Navigate to Firestore Database > Rules');
        console.error('4. Update the rules as shown in firestore-rules.txt');

        // Show a user-friendly error message
        alert(`Firebase Permissions Error: Please update your Firestore security rules to allow access to the companyBillings collection. Check the console for detailed instructions.`);
      }

      // Set empty data to prevent UI errors
      this.companies = [];
      this.recentBillings = [];
      this.urgentBillings = [];
      this.dashboardMetrics = {
        totalRevenue: 0,
        monthlyRecurringRevenue: 0,
        totalOverdue: 0,
        futureRevenue: 0,
        activeCompanies: 0,
        totalCompanies: 0
      };
      this.updateCardDataFromMetrics();

    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Get past billings across all companies
   */
  async getPastBillings(): Promise<any[]> {
    try {
      const companies = await this.companyBillingService.getAllCompanies();
      const pastBillings: any[] = [];

      companies.forEach(company => {
        company.pastBillings?.forEach((billing: any) => {
          pastBillings.push({
            id: billing.invoiceNumber,
            customer: company.companyName,
            service: billing.service,
            amount: billing.amount,
            date: billing.paymentDate,
            status: billing.status || 'paid'
          });
        });
      });

      // Sort by date (most recent first)
      return pastBillings.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error fetching past billings:', error);
      return [];
    }
  }

  /**
   * Update monthly revenue from billing data
   */
  updateMonthlyRevenueFromBillings(pastBillings: any[], futureBillings: any[], overduePayments: any[]): void {
    // Update monthly revenue from billing data
    const monthlyData: { [key: string]: { revenue: number, taxes: number } } = {};

    // Process past billings
    pastBillings.forEach(billing => {
      const date = new Date(billing.date);
      const monthKey = date.toLocaleString('default', { month: 'long' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, taxes: 0 };
      }

      monthlyData[monthKey].revenue += billing.amount;
    });

    // Calculate taxes for each month using the new tax estimation
    Object.keys(monthlyData).forEach(month => {
      const monthlyIncome = monthlyData[month].revenue;
      monthlyData[month].taxes = this.calculateTaxEstimate(monthlyIncome, 'average');
    });

    // Update monthlyRevenue array
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    this.monthlyRevenue = months.map(month => ({
      month,
      revenue: monthlyData[month]?.revenue || 0,
      taxes: monthlyData[month]?.taxes || 0
    }));

    // Update totals and tax estimates
    this.totalRevenue = pastBillings.reduce((sum, billing) => sum + billing.amount, 0);
    this.updateTaxEstimates(this.totalRevenue);
  }

  /**
   * Update card data from comprehensive billing data
   */
  updateCardDataFromBillings(pastBillings: any[], futureBillings: any[], overduePayments: any[]): void {
    const totalRevenue = pastBillings.reduce((sum, billing) => sum + billing.amount, 0);
    const totalOverdue = overduePayments.reduce((sum, overdue) => sum + overdue.amount, 0);
    const futureRevenue = futureBillings.reduce((sum, future) => sum + future.amount, 0);
    const quarterlyRevenue = this.calculateQuarterlyRevenue(pastBillings);

    this.cardData = [
      {
        icon: 'fa-dollar-sign',
        title: 'Total Revenue',
        value: totalRevenue,
        subtitle: 'From completed payments',
        class: 'revenue'
      },
      {
        icon: 'fa-exclamation-triangle',
        title: 'Overdue Payments',
        value: totalOverdue,
        subtitle: `${overduePayments.length} overdue invoices`,
        class: 'taxes'
      },
      {
        icon: 'fa-calendar-alt',
        title: 'Future Revenue',
        value: futureRevenue,
        subtitle: 'Scheduled future billings',
        class: 'quarterly'
      },
      {
        icon: 'fa-chart-line',
        title: 'Quarterly Revenue',
        value: quarterlyRevenue,
        subtitle: 'Current quarter performance',
        class: 'overdue'
      }
    ];
  }

  /**
   * Calculate quarterly revenue from past billings
   */
  calculateQuarterlyRevenue(pastBillings: any[]): number {
    const currentDate = new Date();
    const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;
    const currentYear = currentDate.getFullYear();

    return pastBillings
      .filter(billing => {
        const billingDate = new Date(billing.date);
        const billingQuarter = Math.floor(billingDate.getMonth() / 3) + 1;
        const billingYear = billingDate.getFullYear();

        return billingYear === currentYear && billingQuarter === currentQuarter;
      })
      .reduce((sum, billing) => sum + billing.amount, 0);
  }

  /**
   * Update metric cards with Firebase data
   */
  updateCardDataFromMetrics(): void {
    if (this.dashboardMetrics) {
      this.cardData = [
        {
          icon: 'fa-dollar-sign',
          title: 'Total Revenue',
          value: this.dashboardMetrics.totalRevenue || 0,
          subtitle: 'Year to  date',
          class: 'revenue-card'
        },
        {
          icon: 'fa-repeat',
          title: 'Monthly Recurring',
          value: this.dashboardMetrics.monthlyRecurringRevenue || 0,
          subtitle: 'Active subscriptions',
          class: 'recurring-card'
        },
        {
          icon: 'fa-triangle-exclamation',
          title: 'Overdue Payments',
          value: this.dashboardMetrics.totalOverdue || 0,
          subtitle: 'Requires attention',
          class: 'overdue-card'
        },
        {
          icon: 'fa-calendar',
          title: 'Future Revenue',
          value: this.dashboardMetrics.futureRevenue || 0,
          subtitle: 'Scheduled billings',
          class: 'future-card'
        }
      ];
    }
  }

  /**
   * Create dummy companies for testing
   */
  async createDummyCompanies(): Promise<void> {
    try {
      await this.companyBillingService.createDummyCompanies();
      this.showCreateDummyButton = false;
      await this.loadDashboardData();
      alert('Dummy companies created successfully! Dashboard data has been updated.');
    } catch (error) {
      console.error('Error creating dummy companies:', error);
      alert('Error creating dummy companies. Please try again.');
    }
  }

  /**
   * Helper method to format dates
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Helper method to capitalize first letter
   */
  capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1).replace('_', ' ');
  }

  ngAfterViewInit() {
  }

  getUser(): User | null {
    const user = localStorage.getItem('user');
    if (user) {
      const userObj = JSON.parse(user);
      return userObj;
    }
    return {
      email: 'admin@example.com',
      // Add other required User properties here
    } as User;
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'Urgent': return '#ff4757';
      case 'High': return '#ff6b35';
      case 'Medium': return '#ffa502';
      default: return '#2ed573';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Paid': return '#2ed573';
      case 'Pending': return '#ffa502';
      case 'Overdue': return '#ff6b35';
      case 'Payment Failed': return '#ff4757';
      default: return '#747d8c';
    }
  }

  getMaxRevenue(): number {
    return Math.max(...this.monthlyRevenue.map(m => m.revenue));
  }

  // Configuration Management Methods

  // Package Management
  addNewPackage(): void {
    this.configType = 'package';
    this.modalTitle = 'Add New Package';
    this.isEditing = false;
    this.currentConfig = {
      id: '',
      name: '',
      tagline: '',
      price: '',
      color: '#364074',
      description: '',
      features: []
    };
    this.featuresText = '';
    this.showConfigModal = true;
  }

  editPackage(index: number): void {
    this.configType = 'package';
    this.modalTitle = 'Edit Package';
    this.isEditing = true;
    this.editingIndex = index;
    this.currentConfig = { ...this.packages[index] };
    this.featuresText = this.currentConfig.features.join('\n');
    this.showConfigModal = true;
  }

  deletePackage(index: number): void {
    if (confirm('Are you sure you want to delete this package?')) {
      this.packages.splice(index, 1);
    }
  }

  // One-Time Add-on Management
  addNewOneTimeAddon(): void {
    this.configType = 'addon';
    this.modalTitle = 'Add New One-Time Add-on';
    this.isEditing = false;
    this.currentConfig = {
      title: '',
      price: '',
      category: 'digitalGrowthAddons',
      desc: ''
    };
    this.showConfigModal = true;
  }

  editOneTimeAddon(index: number): void {
    this.configType = 'addon';
    this.modalTitle = 'Edit One-Time Add-on';
    this.isEditing = true;
    this.editingIndex = index;
    this.currentConfig = { ...this.oneTimeAddons[index] };
    this.showConfigModal = true;
  }

  deleteOneTimeAddon(index: number): void {
    if (confirm('Are you sure you want to delete this add-on?')) {
      this.oneTimeAddons.splice(index, 1);
    }
  }

  // Subscription Management
  addNewSubscription(): void {
    this.configType = 'subscription';
    this.modalTitle = 'Add New Subscription';
    this.isEditing = false;
    this.currentConfig = {
      title: '',
      price: '',
      category: 'digitalGrowthAddons',
      desc: ''
    };
    this.showConfigModal = true;
  }

  editSubscription(index: number): void {
    this.configType = 'subscription';
    this.modalTitle = 'Edit Subscription';
    this.isEditing = true;
    this.editingIndex = index;
    this.currentConfig = { ...this.subscriptions[index] };
    this.showConfigModal = true;
  }

  deleteSubscription(index: number): void {
    if (confirm('Are you sure you want to delete this subscription?')) {
      this.subscriptions.splice(index, 1);
    }
  }

  // Modal Management
  closeConfigModal(): void {
    this.showConfigModal = false;
    this.currentConfig = {};
    this.featuresText = '';
    this.isEditing = false;
    this.editingIndex = -1;
  }

  saveConfiguration(): void {
    if (this.configType === 'package') {
      // Process features text into array
      this.currentConfig.features = this.featuresText.split('\n').filter(f => f.trim());

      if (this.isEditing) {
        this.packages[this.editingIndex] = { ...this.currentConfig };
      } else {
        // Generate ID for new package
        this.currentConfig.id = this.currentConfig.name.toLowerCase().replace(/\s+/g, '-');
        this.packages.push({ ...this.currentConfig });
      }
    } else if (this.configType === 'addon') {
      if (this.isEditing) {
        this.oneTimeAddons[this.editingIndex] = { ...this.currentConfig };
      } else {
        this.oneTimeAddons.push({ ...this.currentConfig });
      }
    } else if (this.configType === 'subscription') {
      if (this.isEditing) {
        this.subscriptions[this.editingIndex] = { ...this.currentConfig };
      } else {
        this.subscriptions.push({ ...this.currentConfig });
      }
    }

    this.closeConfigModal();
  }

  getCurrentDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  }

  // Helper methods for template calculations
  getPastBillingsTotal(): number {
    return this.pastBillings.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  }

  getFutureBillingsTotal(): number {
    return this.futureBillings.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  }

  /**
   * Calculate federal income tax using progressive tax brackets
   */
  calculateFederalTax(income: number, filingStatus: string = 'single'): number {
    const brackets = this.taxRate.federal[filingStatus as keyof typeof this.taxRate.federal] || this.taxRate.federal.single;
    const standardDeduction = this.taxRate.standardDeduction[filingStatus as keyof typeof this.taxRate.standardDeduction] || this.taxRate.standardDeduction.single;

    const taxableIncome = Math.max(0, income - standardDeduction);
    let tax = 0;

    for (const bracket of brackets) {
      if (taxableIncome > bracket.min) {
        const taxableAmount = Math.min(taxableIncome, bracket.max) - bracket.min;
        tax += taxableAmount * bracket.rate;
      }
    }

    return tax;
  }

  /**
   * Calculate state income tax
   */
  calculateStateTax(income: number, state: string = this.selectedState): number {
    const stateRate = this.taxRate.state[state as keyof typeof this.taxRate.state] || 0;
    return income * stateRate;
  }

  /**
   * Calculate self-employment tax
   */
  calculateSelfEmploymentTax(income: number): number {
    const netEarnings = income * 0.9235; // SE deduction
    return Math.min(netEarnings * this.taxRate.selfEmployment, income * this.taxRate.selfEmployment);
  }

  /**
   * Calculate tax estimate with different deduction scenarios
   */
  calculateTaxEstimate(income: number, scenario: 'minimal' | 'average' | 'maximum'): number {
    // Apply deductions based on scenario
    const deductionRate = this.deductionScenarios[scenario];
    const deductions = income * deductionRate;
    const adjustedIncome = Math.max(0, income - deductions);

    // Calculate different tax components
    const federalTax = this.calculateFederalTax(adjustedIncome, this.federalFilingStatus);
    const stateTax = this.calculateStateTax(adjustedIncome, this.selectedState);
    const selfEmploymentTax = this.calculateSelfEmploymentTax(income); // SE tax calculated on gross income

    return federalTax + stateTax + selfEmploymentTax;
  }

  /**
   * Update tax estimates based on total revenue
   */
  updateTaxEstimates(totalRevenue: number): void {
    this.taxEstimateLeast = this.calculateTaxEstimate(totalRevenue, 'maximum'); // Maximum deductions = least tax
    this.taxEstimateAverage = this.calculateTaxEstimate(totalRevenue, 'average');
    this.taxEstimateMost = this.calculateTaxEstimate(totalRevenue, 'minimal'); // Minimal deductions = most tax

    // Update taxesOwed to the average estimate
    this.taxesOwed = this.taxEstimateAverage;

    // Update quarterly estimate (divide by 4)
    this.quarterlyTaxEstimate = this.taxesOwed / 4;
  }

  /**
 * Recalculate tax estimates when tax settings change
 */
  onTaxSettingsChange(): void {
    this.updateTaxEstimates(this.totalRevenue);

    // Also update monthly taxes
    this.monthlyRevenue = this.monthlyRevenue.map(month => ({
      ...month,
      taxes: this.calculateTaxEstimate(month.revenue, 'average')
    }));
  }

  /**
   * Get state tax rate safely
   */
  getStateTaxRate(state: string): number {
    return this.taxRate.state[state as keyof typeof this.taxRate.state] || 0;
  }

  getOverduePaymentsTotal(): number {
    return this.overduePayments.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  }

  /**
   * Calculate payment statistics from real billing data
   */
  calculatePaymentStats(): void {
    // Calculate successful payments from past billings
    this.successfulPayments = this.pastBillings.filter(bill =>
      bill.status?.toLowerCase() === 'paid' ||
      bill.status?.toLowerCase() === 'completed'
    ).length;

    // Calculate failed payments from overdue payments
    this.failedPayments = this.overduePayments.filter(bill =>
      bill.status?.toLowerCase() === 'failed' ||
      bill.overdueDays > 30
    ).length;

    // Pending payments are recent billings that aren't paid yet
    const pendingCount = this.recentBillings.filter(bill =>
      bill.status?.toLowerCase() === 'pending' ||
      bill.status?.toLowerCase() === 'processing'
    ).length;

    // Update recent billings length to reflect actual pending count
    this.pendingPaymentsCount = pendingCount;
  }

  /**
   * Get total payment count for percentage calculations
   */
  getTotalPaymentCount(): number {
    return this.successfulPayments + this.failedPayments + this.pendingPaymentsCount;
  }

  /**
   * Get payment success percentage
   */
  getPaymentSuccessRate(): number {
    const total = this.getTotalPaymentCount();
    return total > 0 ? (this.successfulPayments / total) * 100 : 0;
  }

  /**
   * Get payment failure percentage
   */
  getPaymentFailureRate(): number {
    const total = this.getTotalPaymentCount();
    return total > 0 ? (this.failedPayments / total) * 100 : 0;
  }

  /**
   * Get pending payment percentage
   */
  getPendingPaymentRate(): number {
    const total = this.getTotalPaymentCount();
    return total > 0 ? (this.pendingPaymentsCount / total) * 100 : 0;
  }

  /**
   * Get chart height for revenue bars with minimum height
   */
  getBarHeight(revenue: number): number {
    const maxRevenue = this.getMaxRevenue();
    if (maxRevenue === 0) return 10; // Minimum height
    const percentage = (revenue / maxRevenue) * 100;
    return Math.max(percentage, 5); // Minimum 5% height for visibility
  }

  /**
   * Get color based on revenue performance
   */
  getBarColor(revenue: number): string {
    const maxRevenue = this.getMaxRevenue();
    const percentage = maxRevenue > 0 ? (revenue / maxRevenue) : 0;

    if (percentage >= 0.8) return '#28a745'; // Green for high performance
    if (percentage >= 0.5) return '#ffc107'; // Yellow for medium performance
    return '#dc3545'; // Red for low performance
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }
  /**
   * Get average monthly revenue
   */
  getAverageMonthlyRevenue(): number {
    return this.monthlyRevenue.length > 0 ? this.totalRevenue / this.monthlyRevenue.length : 0;
  }

  /**
   * Get average monthly tax burden
   */
  getAverageMonthlyTax(): number {
    return this.monthlyRevenue.length > 0 ? this.taxesOwed / this.monthlyRevenue.length : 0;
  }

  /**
   * Get effective tax rate
   */
  getEffectiveTaxRate(): number {
    return this.totalRevenue > 0 ? (this.taxesOwed / this.totalRevenue) * 100 : 0;
  }

  /**
   * Get month with highest revenue
   */
  getHighestRevenueMonth(): string {
    if (this.monthlyRevenue.length === 0) return 'N/A';
    const highest = this.monthlyRevenue.reduce((max, month) =>
      month.revenue > max.revenue ? month : max
    );
    return highest.month;
  }

  /**
   * Get month with lowest revenue
   */
  getLowestRevenueMonth(): string {
    if (this.monthlyRevenue.length === 0) return 'N/A';
    const lowest = this.monthlyRevenue.reduce((min, month) =>
      month.revenue < min.revenue ? month : min
    );
    return lowest.month;
  }

  /**
   * Get net income (revenue - taxes)
   */
  getTotalNetIncome(): number {
    return this.totalRevenue - this.taxesOwed;
  }

  /**
   * Get net profit margin percentage
   */
  getNetProfitMargin(): number {
    return this.totalRevenue > 0 ? ((this.totalRevenue - this.taxesOwed) / this.totalRevenue) * 100 : 0;
  }

  /**
   * Get growth rate between current and previous month
   */
  getMonthlyGrowthRate(monthIndex: number): number {
    if (monthIndex <= 0 || !this.monthlyRevenue[monthIndex - 1]) return 0;

    const current = this.monthlyRevenue[monthIndex].revenue;
    const previous = this.monthlyRevenue[monthIndex - 1].revenue;

    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  /**
   * Get year-over-year growth rate (if available)
   */
  getYearOverYearGrowth(): number {
    // This would need previous year data to calculate properly
    // For now, return a calculated estimate based on trend
    const recentMonths = this.monthlyRevenue.slice(-3);
    if (recentMonths.length < 2) return 0;

    const recentAvg = recentMonths.reduce((sum, month) => sum + month.revenue, 0) / recentMonths.length;
    const overallAvg = this.getAverageMonthlyRevenue();

    return overallAvg > 0 ? ((recentAvg - overallAvg) / overallAvg) * 100 : 0;
  }

  /**
   * Get performance indicator for a month
   */
  getMonthPerformanceIndicator(revenue: number): string {
    const average = this.getAverageMonthlyRevenue();
    if (revenue >= average * 1.2) return 'excellent';
    if (revenue >= average * 1.1) return 'good';
    if (revenue >= average * 0.9) return 'average';
    return 'below-average';
  }

  /**
   * Get performance color for month row
   */
  getMonthPerformanceColor(revenue: number): string {
    const indicator = this.getMonthPerformanceIndicator(revenue);
    switch (indicator) {
      case 'excellent': return '#d4edda'; // Light green
      case 'good': return '#d1ecf1'; // Light blue
      case 'average': return '#fff3cd'; // Light yellow
      case 'below-average': return '#f8d7da'; // Light red
      default: return '#ffffff'; // White
    }
  }

  // Add pending payments count property
  pendingPaymentsCount = 0;

  /**
   * Navigate to a specific dashboard tab
   */
  navigateTo(tab: string): void {
    // Emit the tab change to parent component
    this.childTabs.emit([tab]);
  }

  /**
   * Get total number of users
   */
  getTotalUsers(): number {
    // Return actual user count or placeholder
    return 1247; // Placeholder value
  }

  /**
   * Get number of active subscriptions
   */
  getActiveSubscriptions(): number {
    // Return actual subscription count or placeholder
    return 892; // Placeholder value
  }

  /**
   * Get total revenue (reuse existing totalRevenue or calculate)
   */
  getTotalRevenue(): number {
    return this.totalRevenue || 0;
  }

  /**
   * Get system uptime
   */
  getSystemUptime(): string {
    // Return system uptime or placeholder
    return '99.9%'; // Placeholder value
  }
}
