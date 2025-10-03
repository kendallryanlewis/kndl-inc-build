import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { StripeService } from '../../../services/stripe.service';
import { Observable, forkJoin, BehaviorSubject, of, timer } from 'rxjs';
import { catchError, map, tap, timeout, takeUntil, switchMap, filter, take } from 'rxjs/operators';

interface StripeTestData {
    connectionStatus: any;
    products: any[];
    prices: any[];
    customers: any[];
    environment: string;
    isLiveMode: boolean;
}

interface CustomerDetails {
    customer: any;
    subscriptions: any[];
    paymentMethods: any[];
    invoices: any[];
    recentActivity: ActivityItem[];
}

interface ActivityItem {
    type: 'payment' | 'models' | 'invoice' | 'subscription' | 'refund' | 'payment_method';
    title: string;
    description: string;
    amount?: number;
    currency?: string;
    status?: string;
    timestamp: number;
    icon: string;
    metadata?: any;
}

@Component({
    selector: 'app-admin-stripe',
    templateUrl: './admin-stripe.component.html',
    styleUrls: ['./admin-stripe.component.scss']
})
export class AdminStripeComponent implements OnInit {
    @Input() subTab: string = 'overview';
    @Output() childTabs = new EventEmitter<string[]>();
    @Output() subTabChange = new EventEmitter<string>();
    sectionIds: string[] = ['overview', 'sites', 'models', 'subscriptions', 'services', 'connection', '|', 'refresh'];
    private previousSubTab: string = '';

    // Loading states
    isLoading = true;
    isLoadingCustomerDetails = false;
    isCreatingCustomer = false;
    isUpdatingCustomer = false;
    isAddingPaymentMethod = false;
    isSettingDefaultPayment = false;
    isCreatingSubscription = false;

    // Test data
    stripeData: StripeTestData = {
        connectionStatus: null,
        products: [],
        prices: [],
        customers: [],
        environment: '',
        isLiveMode: false
    };

    // Cache for Stripe data
    private cachedProducts: any[] = [];
    private cachedPrices: any[] = [];
    private cachedCustomers: any[] = [];
    private cacheTimestamp: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // Selected customer details
    selectedCustomer: CustomerDetails | null = null;

    // Error handling
    errors: string[] = [];

    // UI State
    activeTab: 'overview' | 'models' | 'subscriptions' | 'services' | 'sites' | 'connection' = 'overview';
    selectedCustomerId: string | null = null;
    showInactiveSubscriptions = false;
    showInactiveServices = false;
    showInactiveBusinessModels = false;
    showAllActivity = false;

    // Search filters
    subscriptionSearchTerm = '';
    serviceSearchTerm = '';
    businessModelSearchTerm = '';
    customerSearchTerm = '';

    // Invoice filters
    invoiceFilter = 'all'; // all, paid, unpaid, overdue
    invoiceSortBy = 'date'; // date, amount, status

    // Add Customer Modal
    showAddCustomerModal = false;
    newCustomer = {
        name: '',
        email: '',
        phone: '',
        description: ''
    };

    // Edit Customer Modal
    showEditCustomerModal = false;
    editCustomer = {
        id: '',
        name: '',
        email: '',
        phone: '',
        description: ''
    };

    // Add Payment Method Modal
    showAddPaymentMethodModal = false;
    newPaymentMethod = {
        customerId: '',
        paymentMethodId: '',
        cardNumber: '',
        expMonth: '',
        expYear: '',
        cvc: ''
    };

    // Add Subscription Modal
    showAddSubscriptionModal = false;
    newSubscription = {
        customerId: '',
        priceId: '',
        paymentMethodId: '',
        trialPeriodDays: 0
    };

    // Product/Service Management Modals
    showAddProductModal = false;
    showEditProductModal = false;
    showAddPriceModal = false;
    isCreatingProduct = false;
    isUpdatingProduct = false;
    isDeletingProduct = false;
    isCreatingPrice = false;

    // Product Customers Modal
    showProductCustomersModal = false;
    isLoadingProductCustomers = false;
    selectedProduct: any = null;
    productCustomers: any[] = [];

    newProduct = {
        name: '',
        description: '',
        type: 'subscription' as 'subscription' | 'onetime' | 'businessModel', // subscription, onetime, or businessModel
        active: true,
        price: 0,
        currency: 'usd',
        priceNickname: '',
        interval: 'month' as 'month' | 'year',
        intervalCount: 1
    };

    editProduct = {
        id: '',
        name: '',
        description: '',
        active: true,
        price: 0,
        currency: 'usd',
        priceNickname: '',
        interval: 'month' as 'month' | 'year',
        intervalCount: 1
    };

    newPrice = {
        productId: '',
        unitAmount: 0,
        currency: 'usd',
        nickname: '',
        recurring: null as { interval: 'month' | 'year'; intervalCount?: number } | null
    };

    selectedProductForPrice: any = null;

    constructor(public stripeService: StripeService) { }

    async ngOnInit(): Promise<void> {
        this.loadStripeData();
        // Ensure subTab defaults to 'Home' if not provided
        if (!this.subTab || this.subTab.trim() === '') {
            this.subTab = 'Home';
        }
        // Load data asynchronously and emit child tabs
        await Promise.all([
            this.emitChildTabs()
        ]);
    }

    ngOnChanges(): void {
        if (this.subTab !== this.previousSubTab && this.subTab != 'refresh') {
            this.activeTab = this.subTab as any;
            this.previousSubTab = this.subTab;
        } else if (this.subTab === 'refresh') {
            this.refreshData();
            this.activeTab = this.previousSubTab as any; // Revert back to previous tab
            this.subTabChange.emit(this.previousSubTab);
        }
    }

    private async emitChildTabs(): Promise<void> {
        // Emit available section IDs to parent components
        this.childTabs.emit(this.sectionIds);
    }

    loadStripeData() {
        this.isLoading = true;
        this.errors = [];

        console.log('🔄 Starting Stripe data load...');

        // Get current environment info
        this.stripeService.currentEnvironment$.subscribe(env => {
            this.stripeData.environment = env;
            console.log('📡 Environment:', env);
        });

        this.stripeService.isLiveMode$.subscribe(isLive => {
            this.stripeData.isLiveMode = isLive;
            console.log('🔴 Live mode:', isLive);
        });

        // Check if we have valid cached data
        const now = Date.now();
        const cacheAge = now - this.cacheTimestamp;
        const isCacheValid = cacheAge < this.CACHE_DURATION;

        if (isCacheValid && this.cachedProducts.length > 0) {
            console.log('💾 Using cached data (age: ' + Math.round(cacheAge / 1000) + 's)');
            this.stripeData.products = this.cachedProducts;
            this.stripeData.prices = this.cachedPrices;
            this.stripeData.customers = this.cachedCustomers;
            this.isLoading = false;
            return;
        }

        // Load each data type individually with timeouts
        this.loadConnectionTest();
    }

    refreshData() {
        console.log('🔄 Force refresh - clearing cache...');
        this.selectedCustomer = null;
        this.selectedCustomerId = null;
        this.invalidateCache();
        this.loadStripeData();
    }

    private invalidateCache() {
        console.log('🗑️ Invalidating cache...');
        this.cachedProducts = [];
        this.cachedPrices = [];
        this.cachedCustomers = [];
        this.cacheTimestamp = 0;
    }

    private loadConnectionTest() {
        console.log('🔗 Testing connection...');
        this.stripeService.testStripeConnection().pipe(
            timeout(10000),
            catchError(err => {
                console.error('❌ Connection test failed:', err);
                // Only add error if we don't have cached data
                if (this.cachedProducts.length === 0) {
                    this.errors.push(`Connection test failed: ${err.message}`);
                } else {
                    console.log('💾 Suppressing connection error - have cached data');
                }
                return of({ error: err.message });
            })
        ).subscribe({
            next: (data) => {
                console.log('✅ Connection test complete:', data);
                this.stripeData.connectionStatus = data;
                this.loadProducts();
            },
            error: (error) => {
                console.error('❌ Connection test error:', error);
                // Only add error if we don't have cached data
                if (this.cachedProducts.length === 0) {
                    this.errors.push(`Connection test timeout or error: ${error.message}`);
                } else {
                    console.log('💾 Suppressing connection error - have cached data');
                }
                this.loadProducts(); // Continue anyway
            }
        });
    }

    private loadProducts() {
        console.log('📦 Loading products...');
        this.stripeService.getProducts().pipe(
            timeout(30000),
            catchError(err => {
                console.error('❌ Products load failed:', err);
                // Use cached data if available
                if (this.cachedProducts.length > 0) {
                    console.log('💾 Using cached products as fallback (suppressing error)');
                    return of(this.cachedProducts);
                }
                // Only add error if we don't have cached data
                this.errors.push(`Failed to load products: ${err.message}`);
                return of([]);
            })
        ).subscribe({
            next: (data) => {
                console.log('✅ Products loaded:', data);
                this.stripeData.products = data;
                // Cache the data if we got results
                if (data && data.length > 0) {
                    this.cachedProducts = data;
                    this.cacheTimestamp = Date.now();
                    console.log('💾 Products cached');
                }
                this.loadPrices();
            },
            error: (error) => {
                console.error('❌ Products load error:', error);
                // Use cached data as fallback
                if (this.cachedProducts.length > 0) {
                    this.stripeData.products = this.cachedProducts;
                    console.log('💾 Using cached products (suppressing error)');
                } else {
                    this.errors.push(`Products timeout or error: ${error.message}`);
                }
                this.loadPrices();
            }
        });
    }

    private loadPrices() {
        console.log('💰 Loading prices...');
        this.stripeService.getPrices().pipe(
            // Filter out empty initial values like overview component does
            filter(prices => Array.isArray(prices) && prices.length > 0),
            take(1), // Take only the first emission with data
            timeout(30000),
            catchError(err => {
                console.error('❌ Prices load failed:', err);
                // Use cached data if available
                if (this.cachedPrices.length > 0) {
                    console.log('💾 Using cached prices as fallback (suppressing error)');
                    return of(this.cachedPrices);
                }
                // Only add error if we don't have cached data
                this.errors.push(`Failed to load prices: ${err.message}`);
                return of([]);
            })
        ).subscribe({
            next: (data) => {
                console.log('✅ Prices loaded:', data);
                // Handle both array and object with data property (like overview component)
                if (Array.isArray(data)) {
                    this.stripeData.prices = data;
                } else if (data && Array.isArray((data as any).data)) {
                    this.stripeData.prices = (data as any).data;
                }
                // Cache the data if we got results
                if (this.stripeData.prices && this.stripeData.prices.length > 0) {
                    this.cachedPrices = this.stripeData.prices;
                    this.cacheTimestamp = Date.now();
                    console.log('💾 Prices cached');
                }
                this.loadCustomers();
            },
            error: (error) => {
                console.error('❌ Prices load error:', error);
                // Use cached data as fallback
                if (this.cachedPrices.length > 0) {
                    this.stripeData.prices = this.cachedPrices;
                    console.log('💾 Using cached prices (suppressing error)');
                } else {
                    this.errors.push(`Prices timeout or error: ${error.message}`);
                }
                this.loadCustomers();
            }
        });
    }

    private loadCustomers() {
        console.log('👥 Loading customers...');
        this.stripeService.getAllCustomers(10).pipe(
            timeout(15000),
            catchError(err => {
                console.error('❌ Customers load failed:', err);
                // Use cached data if available
                if (this.cachedCustomers.length > 0) {
                    console.log('💾 Using cached customers as fallback (suppressing error)');
                    return of(this.cachedCustomers);
                }
                // Only add error if we don't have cached data
                this.errors.push(`Failed to load customers: ${err.message}`);
                return of([]);
            })
        ).subscribe({
            next: (data) => {
                console.log('✅ Customers loaded:', data);
                this.stripeData.customers = data;
                // Cache the data if we got results
                if (data && data.length > 0) {
                    this.cachedCustomers = data;
                    this.cacheTimestamp = Date.now();
                    console.log('💾 Customers cached');
                }
                this.finishLoading();
            },
            error: (error) => {
                console.error('❌ Customers load error:', error);
                // Use cached data as fallback
                if (this.cachedCustomers.length > 0) {
                    this.stripeData.customers = this.cachedCustomers;
                    console.log('💾 Using cached customers (suppressing error)');
                } else {
                    this.errors.push(`Customers timeout or error: ${error.message}`);
                }
                this.finishLoading();
            }
        });
    }

    private finishLoading() {
        this.isLoading = false;
        console.log('🎉 All Stripe data loading complete:', this.stripeData);
        if (this.errors.length > 0) {
            console.warn('⚠️ Errors encountered:', this.errors);
        }
    }

    loadCustomerDetails(customerId: string) {
        if (!customerId) return;

        this.isLoadingCustomerDetails = true;
        this.selectedCustomerId = customerId;

        const customer = this.stripeData.customers.find(c => c.id === customerId);

        this.selectedCustomer = {
            customer: customer,
            subscriptions: [],
            paymentMethods: [],
            invoices: [],
            recentActivity: []
        };

        console.log('📥 Loading customer details for:', customerId);

        this.loadCustomerSubscriptions(customerId);
        this.loadCustomerPaymentMethods(customerId);
        this.loadCustomerInvoices(customerId);
        this.activeTab = 'sites';
        this.subTabChange.emit(this.activeTab);
        this.isLoadingCustomerDetails = false;
    }

    private loadCustomerSubscriptions(customerId: string) {
        this.stripeService.getSubscriptions(customerId).pipe(
            timeout(15000),
            catchError(err => {
                console.error('Failed to load subscriptions:', err);
                return of([]);
            }),
            map(result => {
                const resultObj = result as any;
                if (resultObj && resultObj.data && resultObj.data.data && Array.isArray(resultObj.data.data)) {
                    return resultObj.data.data;
                } else if (resultObj && Array.isArray(resultObj.data)) {
                    return resultObj.data;
                } else if (Array.isArray(result)) {
                    return result;
                }
                return [];
            })
        ).subscribe(subscriptions => {
            if (this.selectedCustomer) {
                this.selectedCustomer.subscriptions = subscriptions;
                console.log('✅ Subscriptions loaded:', subscriptions.length);
            }
        });
    }

    private loadCustomerPaymentMethods(customerId: string) {
        this.stripeService.getPaymentMethods(customerId).pipe(
            timeout(15000),
            catchError(err => {
                console.error('❌ Failed to load payment methods:', err);
                return of([]);
            }),
            map(result => {
                const resultObj = result as any;
                if (Array.isArray(result)) {
                    return result;
                } else if (resultObj && Array.isArray(resultObj.data)) {
                    return resultObj.data;
                }
                return [];
            })
        ).subscribe(paymentMethods => {
            if (this.selectedCustomer) {
                this.selectedCustomer.paymentMethods = paymentMethods;
                console.log('✅ Payment methods loaded:', paymentMethods.length);
            }
        });
    }

    private loadCustomerInvoices(customerId: string) {
        this.stripeService.getInvoices(customerId).pipe(
            timeout(15000),
            catchError(err => {
                console.error('❌ Failed to load invoices:', err);
                return of([]);
            }),
            map(result => {
                const resultObj = result as any;
                if (Array.isArray(result)) {
                    return result;
                } else if (resultObj && Array.isArray(resultObj.data)) {
                    return resultObj.data;
                }
                return [];
            })
        ).subscribe(invoices => {
            if (this.selectedCustomer) {
                this.selectedCustomer.invoices = invoices;
                console.log('✅ Invoices loaded:', invoices.length);
                this.generateRecentActivity();
            }
        });
    }

    private generateRecentActivity() {
        if (!this.selectedCustomer) return;

        const activities: ActivityItem[] = [];

        this.selectedCustomer.invoices.forEach((invoice: any) => {
            activities.push({
                type: 'invoice',
                title: `Invoice ${invoice.number || invoice.id}`,
                description: invoice.status === 'paid' ? 'Invoice paid' : `Invoice ${invoice.status}`,
                amount: invoice.total,
                currency: invoice.currency,
                status: invoice.status,
                timestamp: invoice.created,
                icon: '🧾',
                metadata: invoice
            });

            if (invoice.status === 'paid' && invoice.status_transitions?.paid_at) {
                activities.push({
                    type: 'payment',
                    title: 'Payment Received',
                    description: `Payment for invoice ${invoice.number || invoice.id}`,
                    amount: invoice.amount_paid,
                    currency: invoice.currency,
                    status: 'succeeded',
                    timestamp: invoice.status_transitions.paid_at,
                    icon: '💳',
                    metadata: invoice
                });
            }
        });

        this.selectedCustomer.subscriptions.forEach((sub: any) => {
            activities.push({
                type: 'subscription',
                title: 'Subscription',
                description: `Subscription ${sub.status}`,
                amount: sub.plan?.amount || sub.items?.data[0]?.price?.unit_amount,
                currency: sub.currency,
                status: sub.status,
                timestamp: sub.created,
                icon: '📅',
                metadata: sub
            });

            if (sub.canceled_at) {
                activities.push({
                    type: 'subscription',
                    title: 'Subscription Canceled',
                    description: sub.cancel_at_period_end ? 'Will cancel at period end' : 'Canceled immediately',
                    timestamp: sub.canceled_at,
                    icon: '❌',
                    status: 'canceled',
                    metadata: sub
                });
            }
        });

        this.selectedCustomer.paymentMethods.forEach((pm: any) => {
            activities.push({
                type: 'payment_method',
                title: 'Payment Method Added',
                description: `${pm.card?.brand || pm.type} ending in ${pm.card?.last4 || '****'}`,
                timestamp: pm.created,
                icon: '💳',
                metadata: pm
            });
        });

        activities.sort((a, b) => b.timestamp - a.timestamp);
        this.selectedCustomer.recentActivity = activities.slice(0, 20);
    }

    // Utility methods
    getCacheAge(): string {
        if (this.cacheTimestamp === 0) return 'No cache';
        const ageInSeconds = Math.floor((Date.now() - this.cacheTimestamp) / 1000);
        if (ageInSeconds < 60) return `${ageInSeconds}s ago`;
        const ageInMinutes = Math.floor(ageInSeconds / 60);
        return `${ageInMinutes}m ago`;
    }

    isCacheValid(): boolean {
        if (this.cacheTimestamp === 0) return false;
        const cacheAge = Date.now() - this.cacheTimestamp;
        return cacheAge < this.CACHE_DURATION;
    }

    formatDate(timestamp: number): string {
        return new Date(timestamp * 1000).toLocaleDateString();
    }

    formatCurrency(amount: number, currency: string = 'usd'): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase()
        }).format(amount / 100);
    }

    getStatusBadgeClass(status: string): string {
        switch (status?.toLowerCase()) {
            case 'active': return 'badge-success';
            case 'trialing': return 'badge-info';
            case 'past_due': return 'badge-warning';
            case 'canceled': return 'badge-danger';
            case 'unpaid': return 'badge-danger';
            case 'incomplete': return 'badge-secondary';
            default: return 'badge-secondary';
        }
    }



    setActiveTab(tab: 'overview' | 'subscriptions' | 'services' | 'sites' | 'connection') {
        this.activeTab = tab;
    }

    getObjectKeys(obj: any): string[] {
        return Object.keys(obj || {});
    }

    getObjectEntries(obj: any): [string, any][] {
        return Object.entries(obj || {});
    }

    getCurrentTimestamp(): string {
        return new Date().toLocaleString();
    }

    getRecurringPricesCount(): number {
        return this.stripeData.prices.filter(p => p && p.recurring).length;
    }

    getPricesForProduct(productId: string): any[] {
        // Handle both string product IDs and product objects (matching overview component pattern)
        return this.stripeData.prices.filter(p => 
            p && (p.product === productId || p.product?.id === productId)
        );
    }

    hasNoPricesForProduct(productId: string): boolean {
        return this.getPricesForProduct(productId).length === 0;
    }

    getSubscriptionProducts(): any[] {
        return this.stripeData.products.filter(product => {
            const prices = this.getPricesForProduct(product.id);
            const isBusinessModel = product.metadata?.type === 'businessModel';
            return prices.some(price => price.recurring) && !isBusinessModel;
        });
    }

    getBusinessModelProducts(): any[] {
        return this.stripeData.products.filter(product => {
            const isBusinessModel = product.metadata?.type === 'businessModel';
            // Business models are one-time payments with the businessModel type
            return isBusinessModel;
        });
    }

    getOneTimeProducts(): any[] {
        return this.stripeData.products.filter(product => {
            const prices = this.getPricesForProduct(product.id);
            const isBusinessModel = product.metadata?.type === 'businessModel';
            return !isBusinessModel && (prices.length === 0 || prices.every(price => !price.recurring));
        });
    }

    // Filtered products based on show/hide inactive state
    getFilteredSubscriptionProducts(): any[] {
        let subscriptions = this.getSubscriptionProducts();

        // Filter by active/inactive
        if (!this.showInactiveSubscriptions) {
            subscriptions = subscriptions.filter(product => product.active);
        }

        // Filter by search term
        if (this.subscriptionSearchTerm.trim()) {
            const searchLower = this.subscriptionSearchTerm.toLowerCase().trim();
            subscriptions = subscriptions.filter(product =>
                product.name?.toLowerCase().includes(searchLower) ||
                product.description?.toLowerCase().includes(searchLower) ||
                product.id?.toLowerCase().includes(searchLower)
            );
        }

        return subscriptions;
    }

    getFilteredBusinessModelProducts(): any[] {
        let businessModels = this.getBusinessModelProducts();

        // Filter by active/inactive
        if (!this.showInactiveBusinessModels) {
            businessModels = businessModels.filter(product => product.active);
        }

        // Filter by search term
        if (this.businessModelSearchTerm.trim()) {
            const searchLower = this.businessModelSearchTerm.toLowerCase().trim();
            businessModels = businessModels.filter(product =>
                product.name?.toLowerCase().includes(searchLower) ||
                product.description?.toLowerCase().includes(searchLower) ||
                product.id?.toLowerCase().includes(searchLower)
            );
        }

        return businessModels;
    }

    getFilteredOneTimeProducts(): any[] {
        let services = this.getOneTimeProducts();

        // Filter by active/inactive
        if (!this.showInactiveServices) {
            services = services.filter(product => product.active);
        }

        // Filter by search term
        if (this.serviceSearchTerm.trim()) {
            const searchLower = this.serviceSearchTerm.toLowerCase().trim();
            services = services.filter(product =>
                product.name?.toLowerCase().includes(searchLower) ||
                product.description?.toLowerCase().includes(searchLower) ||
                product.id?.toLowerCase().includes(searchLower)
            );
        }

        return services;
    }

    getFilteredCustomers(): any[] {
        let customers = this.stripeData.customers;

        // Filter by search term
        if (this.customerSearchTerm.trim()) {
            const searchLower = this.customerSearchTerm.toLowerCase().trim();
            customers = customers.filter((customer: any) =>
                customer.name?.toLowerCase().includes(searchLower) ||
                customer.email?.toLowerCase().includes(searchLower) ||
                customer.phone?.toLowerCase().includes(searchLower) ||
                customer.id?.toLowerCase().includes(searchLower)
            );
        }

        return customers;
    }

    // Toggle methods for show/hide inactive
    toggleInactiveSubscriptions(): void {
        this.showInactiveSubscriptions = !this.showInactiveSubscriptions;
    }

    toggleInactiveBusinessModels(): void {
        this.showInactiveBusinessModels = !this.showInactiveBusinessModels;
    }

    toggleInactiveServices(): void {
        this.showInactiveServices = !this.showInactiveServices;
    }

    // Separate customer subscriptions from services
    getCustomerRecurringSubscriptions(): any[] {
        if (!this.selectedCustomer) return [];
        return this.selectedCustomer.subscriptions.filter((sub: any) => {
            // Check if subscription has recurring items
            const hasRecurring = sub.items?.data?.some((item: any) => item.price?.recurring);
            return hasRecurring || sub.plan?.interval; // Also check legacy plan.interval
        });
    }

    getCustomerOneTimeServices(): any[] {
        if (!this.selectedCustomer) return [];
        return this.selectedCustomer.subscriptions.filter((sub: any) => {
            // Check if subscription has only one-time items
            const hasRecurring = sub.items?.data?.some((item: any) => item.price?.recurring);
            const hasLegacyPlan = sub.plan?.interval;
            return !hasRecurring && !hasLegacyPlan;
        });
    }

    getSubscriptionProductName(subscription: any): string {
        // Try to get product name from subscription items
        if (subscription.items?.data?.[0]?.price?.product) {
            const productId = typeof subscription.items.data[0].price.product === 'string'
                ? subscription.items.data[0].price.product
                : subscription.items.data[0].price.product.id;
            const product = this.stripeData.products.find(p => p.id === productId);
            return product?.name || 'Unknown Product';
        }
        // Fallback to plan nickname or product
        return subscription.plan?.nickname || subscription.plan?.product || 'Unknown Product';
    }

    isSubscriptionProduct(productId: string): boolean {
        const prices = this.getPricesForProduct(productId);
        return prices.some(price => price.recurring);
    }

    // Invoice filtering and sorting
    getFilteredInvoices(): any[] {
        if (!this.selectedCustomer) return [];

        let invoices = [...this.selectedCustomer.invoices];

        switch (this.invoiceFilter) {
            case 'paid':
                invoices = invoices.filter(inv => inv.status === 'paid');
                break;
            case 'unpaid':
                invoices = invoices.filter(inv => inv.status === 'open' || inv.status === 'uncollectible');
                break;
            case 'overdue':
                invoices = invoices.filter(inv => {
                    const now = Date.now() / 1000;
                    return inv.status === 'open' && inv.due_date && inv.due_date < now;
                });
                break;
        }

        switch (this.invoiceSortBy) {
            case 'date':
                invoices.sort((a, b) => b.created - a.created);
                break;
            case 'amount':
                invoices.sort((a, b) => b.total - a.total);
                break;
            case 'status':
                invoices.sort((a, b) => a.status.localeCompare(b.status));
                break;
        }

        return invoices;
    }

    setInvoiceFilter(filter: string) {
        this.invoiceFilter = filter;
    }

    setInvoiceSort(sort: string) {
        this.invoiceSortBy = sort;
    }

    getInvoiceStatusIcon(status: string): string {
        switch (status?.toLowerCase()) {
            case 'paid': return '✅';
            case 'open': return '📄';
            case 'void': return '❌';
            case 'uncollectible': return '⚠️';
            case 'draft': return '📝';
            default: return '📋';
        }
    }

    isInvoiceOverdue(invoice: any): boolean {
        if (!invoice.due_date) return false;
        const now = Date.now() / 1000;
        return invoice.status === 'open' && invoice.due_date < now;
    }

    downloadInvoice(invoice: any) {
        if (invoice.invoice_pdf) {
            window.open(invoice.invoice_pdf, '_blank');
        } else if (invoice.hosted_invoice_url) {
            window.open(invoice.hosted_invoice_url, '_blank');
        } else {
            alert('⚠️ No PDF available for this invoice');
        }
    }

    viewInvoiceDetails(invoice: any) {
        alert(`Invoice Details:\n\nNumber: ${invoice.number || invoice.id}\nStatus: ${invoice.status}\nAmount: ${this.formatCurrency(invoice.total, invoice.currency)}\nCreated: ${this.formatDate(invoice.created)}`);
    }

    // Add Customer Modal Methods
    openAddCustomerModal() {
        this.showAddCustomerModal = true;
        this.newCustomer = { name: '', email: '', phone: '', description: '' };
    }

    closeAddCustomerModal() {
        this.showAddCustomerModal = false;
        this.newCustomer = { name: '', email: '', phone: '', description: '' };
    }

    createCustomer() {
        if (!this.newCustomer.name || !this.newCustomer.email) {
            alert('⚠️ Name and Email are required');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.newCustomer.email)) {
            alert('⚠️ Please enter a valid email address');
            return;
        }

        this.isCreatingCustomer = true;

        const customerData: any = {
            name: this.newCustomer.name,
            email: this.newCustomer.email,
            environment: this.stripeData.environment
        };

        if (this.newCustomer.phone) customerData.phone = this.newCustomer.phone;
        if (this.newCustomer.description) customerData.metadata = { description: this.newCustomer.description };

        this.stripeService.createCustomer(customerData).pipe(
            timeout(15000),
            catchError(error => {
                console.error('❌ Error creating customer:', error);
                alert(`❌ Failed to create customer: ${error.message}`);
                return of(null);
            })
        ).subscribe(result => {
            this.isCreatingCustomer = false;

            if (result) {
                const newCustomer = result.data || result;
                this.stripeData.customers.unshift(newCustomer);
                this.closeAddCustomerModal();
                alert(`✅ Customer created successfully!\n\nID: ${newCustomer.id}\nName: ${newCustomer.name}`);
                this.activeTab = 'sites';
                this.loadCustomerDetails(newCustomer.id);
            }
        });
    }

    // Edit Customer Modal Methods
    openEditCustomerModal(customer: any) {
        this.showEditCustomerModal = true;
        this.editCustomer = {
            id: customer.id,
            name: customer.name || '',
            email: customer.email || '',
            phone: customer.phone || '',
            description: customer.metadata?.description || ''
        };
    }

    closeEditCustomerModal() {
        this.showEditCustomerModal = false;
        this.editCustomer = { id: '', name: '', email: '', phone: '', description: '' };
    }

    updateCustomer() {
        if (!this.editCustomer.name || !this.editCustomer.email) {
            alert('⚠️ Name and Email are required');
            return;
        }

        this.isUpdatingCustomer = true;

        const updateData: any = {
            name: this.editCustomer.name,
            email: this.editCustomer.email,
            environment: this.stripeData.environment
        };

        if (this.editCustomer.phone) updateData.phone = this.editCustomer.phone;
        if (this.editCustomer.description) updateData.metadata = { description: this.editCustomer.description };

        this.stripeService.updateCustomer(this.editCustomer.id, updateData).pipe(
            timeout(15000),
            catchError(error => {
                alert(`❌ Failed to update customer: ${error.message}`);
                return of(null);
            })
        ).subscribe(result => {
            this.isUpdatingCustomer = false;

            if (result) {
                const updatedCustomer = result.data || result;
                const index = this.stripeData.customers.findIndex(c => c.id === updatedCustomer.id);
                if (index !== -1) this.stripeData.customers[index] = updatedCustomer;
                if (this.selectedCustomer && this.selectedCustomer.customer.id === updatedCustomer.id) {
                    this.selectedCustomer.customer = updatedCustomer;
                }
                this.closeEditCustomerModal();
                alert(`✅ Customer updated successfully!`);
            }
        });
    }

    // Add Payment Method Modal Methods
    openAddPaymentMethodModal(customerId: string) {
        this.showAddPaymentMethodModal = true;
        this.newPaymentMethod = { customerId, paymentMethodId: '', cardNumber: '', expMonth: '', expYear: '', cvc: '' };
    }

    closeAddPaymentMethodModal() {
        this.showAddPaymentMethodModal = false;
        this.newPaymentMethod = { customerId: '', paymentMethodId: '', cardNumber: '', expMonth: '', expYear: '', cvc: '' };
    }

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
                if (this.selectedCustomer) {
                    this.loadCustomerPaymentMethods(this.newPaymentMethod.customerId);
                }
                this.closeAddPaymentMethodModal();
                alert(`✅ Payment method added successfully!`);
            }
        });
    }

    setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
        if (!confirm('Set this as the default payment method?')) return;

        this.isSettingDefaultPayment = true;

        this.stripeService.setDefaultPaymentMethod(customerId, paymentMethodId).pipe(
            timeout(15000),
            catchError(error => {
                alert(`❌ Failed to set default: ${error.message}`);
                return of(null);
            })
        ).subscribe(result => {
            this.isSettingDefaultPayment = false;

            if (result) {
                if (this.selectedCustomer) this.loadCustomerDetails(customerId);
                alert(`✅ Default payment method updated!`);
            }
        });
    }

    // Add Subscription Modal Methods
    openAddSubscriptionModal(customerId: string) {
        this.showAddSubscriptionModal = true;
        this.newSubscription = { customerId, priceId: '', paymentMethodId: '', trialPeriodDays: 0 };
    }

    closeAddSubscriptionModal() {
        this.showAddSubscriptionModal = false;
        this.newSubscription = { customerId: '', priceId: '', paymentMethodId: '', trialPeriodDays: 0 };
    }

    createSubscription() {
        if (!this.newSubscription.priceId) {
            alert('⚠️ Price ID is required');
            return;
        }

        this.isCreatingSubscription = true;

        const subscriptionData: any = {
            customerId: this.newSubscription.customerId,
            priceId: this.newSubscription.priceId,
            environment: this.stripeData.environment
        };

        if (this.newSubscription.paymentMethodId) subscriptionData.paymentMethodId = this.newSubscription.paymentMethodId;
        if (this.newSubscription.trialPeriodDays > 0) subscriptionData.trialPeriodDays = this.newSubscription.trialPeriodDays;

        this.stripeService.createSubscription(subscriptionData).pipe(
            timeout(15000),
            catchError(error => {
                alert(`❌ Failed to create subscription: ${error.message}`);
                return of(null);
            })
        ).subscribe(result => {
            this.isCreatingSubscription = false;

            if (result) {
                if (this.selectedCustomer) this.loadCustomerSubscriptions(this.newSubscription.customerId);
                this.closeAddSubscriptionModal();
                const subscription = result.data || result;
                alert(`✅ Subscription created!\n\nID: ${subscription.id}`);
            }
        });
    }

    getAvailablePrices() {
        return this.stripeData.prices.filter(price => price.active);
    }

    getAvailablePaymentMethods() {
        return this.selectedCustomer?.paymentMethods || [];
    }

    formatPriceDisplay(price: any): string {
        const amount = this.formatCurrency(price.unit_amount, price.currency);
        const interval = price.recurring ? ` / ${price.recurring.interval}` : ' (one-time)';
        const nickname = price.nickname ? ` - ${price.nickname}` : '';
        return `${amount}${interval}${nickname}`;
    }

    // ==================== PRODUCT MANAGEMENT ====================

    openAddProductModal(type: 'subscription' | 'onetime' | 'businessModel') {
        this.showAddProductModal = true;
        this.newProduct = {
            name: '',
            description: '',
            type: type,
            active: true,
            price: 0,
            currency: 'usd',
            priceNickname: '',
            interval: 'month',
            intervalCount: 1
        };
    }

    closeAddProductModal() {
        this.showAddProductModal = false;
        this.newProduct = {
            name: '',
            description: '',
            type: 'subscription',
            active: true,
            price: 0,
            currency: 'usd',
            priceNickname: '',
            interval: 'month',
            intervalCount: 1
        };
    }

    createProduct() {
        if (!this.newProduct.name) {
            alert('⚠️ Product name is required');
            return;
        }

        if (!this.newProduct.price || this.newProduct.price <= 0) {
            alert('⚠️ Price is required and must be greater than 0');
            return;
        }

        this.isCreatingProduct = true;

        const productData = {
            name: this.newProduct.name,
            description: this.newProduct.description || undefined,
            active: this.newProduct.active,
            metadata: {
                type: this.newProduct.type
            }
        };

        // First create the product
        this.stripeService.createProduct(productData).pipe(
            timeout(15000),
            catchError(error => {
                alert(`❌ Failed to create product: ${error.message}`);
                return of(null);
            }),
            // Then create the price if product creation succeeded
            switchMap(productResult => {
                if (!productResult) {
                    return of(null);
                }

                // Build price data
                const priceData: any = {
                    productId: productResult.id,
                    currency: this.newProduct.currency,
                    unitAmount: Math.round(this.newProduct.price * 100), // Convert dollars to cents
                    nickname: this.newProduct.priceNickname || undefined
                };

                // Add recurring billing for subscriptions only (business models are one-time)
                if (this.newProduct.type === 'subscription') {
                    priceData.recurring = {
                        interval: this.newProduct.interval,
                        intervalCount: this.newProduct.intervalCount || 1
                    };
                }

                // Create the price
                return this.stripeService.createPrice(priceData).pipe(
                    timeout(15000),
                    catchError(error => {
                        alert(`⚠️ Product created but failed to create price: ${error.message}\nYou can add a price manually later.`);
                        return of({ product: productResult, price: null });
                    }),
                    map(priceResult => ({ product: productResult, price: priceResult }))
                );
            })
        ).subscribe((result: any) => {
            this.isCreatingProduct = false;

            if (result && result.product) {
                this.invalidateCache(); // Clear cache to force fresh data
                this.loadStripeData();
                this.closeAddProductModal();

                const priceInfo = result.price
                    ? `\nPrice: ${this.formatCurrency(result.price.unit_amount, result.price.currency)}`
                    : '';

                alert(`✅ Product created successfully!\n\nID: ${result.product.id}\nName: ${result.product.name}${priceInfo}`);
            }
        });
    }

    openEditProductModal(product: any) {
        this.showEditProductModal = true;
        // Get the first price for this product if available using the proper method
        const productPrices = this.getPricesForProduct(product.id);
        const firstPrice = productPrices.length > 0 ? productPrices[0] : null;

        this.editProduct = {
            id: product.id,
            name: product.name,
            description: product.description || '',
            active: product.active,
            price: firstPrice?.unit_amount ? (firstPrice.unit_amount / 100) : 0, // Convert cents to dollars
            currency: firstPrice?.currency || 'usd',
            priceNickname: firstPrice?.nickname || '',
            interval: firstPrice?.recurring?.interval || 'month',
            intervalCount: firstPrice?.recurring?.interval_count || 1
        };
    }

    closeEditProductModal() {
        this.showEditProductModal = false;
        this.editProduct = {
            id: '',
            name: '',
            description: '',
            active: true,
            price: 0,
            currency: 'usd',
            priceNickname: '',
            interval: 'month',
            intervalCount: 1
        };
    }

    updateProduct() {
        if (!this.editProduct.name) {
            alert('⚠️ Product name is required');
            return;
        }

        this.isUpdatingProduct = true;

        const updateData = {
            name: this.editProduct.name,
            description: this.editProduct.description || undefined,
            active: this.editProduct.active
        };

        // First, update the product
        this.stripeService.updateProduct(this.editProduct.id, updateData).pipe(
            timeout(15000),
            catchError(error => {
                alert(`❌ Failed to update product: ${error.message}`);
                return of(null);
            }),
            // Then check if we need to create a new price
            switchMap(productResult => {
                if (!productResult) {
                    return of(null);
                }

                // Check if price has changed and is valid
                const currentPrices = this.getPricesForProduct(this.editProduct.id);
                const currentPrice = currentPrices.find(p => p.active) || currentPrices[0];
                const currentPriceInDollars = currentPrice?.unit_amount ? (currentPrice.unit_amount / 100) : 0;

                // If price has changed and is greater than 0, create a new price
                if (this.editProduct.price > 0 && this.editProduct.price !== currentPriceInDollars) {
                    const newPriceData: any = {
                        productId: this.editProduct.id,
                        unitAmount: Math.round(this.editProduct.price * 100), // Convert dollars to cents
                        currency: this.editProduct.currency,
                        nickname: this.editProduct.priceNickname || undefined
                    };

                    // Add recurring data if it exists
                    if (this.editProduct.interval) {
                        newPriceData.recurring = {
                            interval: this.editProduct.interval,
                            intervalCount: this.editProduct.intervalCount || 1
                        };
                    }

                    // Create the new price
                    return this.stripeService.createPrice(newPriceData).pipe(
                        timeout(15000),
                        catchError(error => {
                            alert(`⚠️ Product updated but failed to create new price: ${error.message}\nYou can add a price manually.`);
                            return of({ product: productResult, price: null, priceChanged: true });
                        }),
                        map(priceResult => ({ product: productResult, price: priceResult, priceChanged: true }))
                    );
                } else {
                    // No price change needed
                    return of({ product: productResult, price: null, priceChanged: false });
                }
            })
        ).subscribe((result: any) => {
            this.isUpdatingProduct = false;

            if (result && result.product) {
                this.invalidateCache(); // Clear cache to force fresh data
                this.closeEditProductModal();
                
                // Force the stripe service to reload data
                this.stripeService.forceDataRefresh().then(() => {
                    // Then reload the component's data
                    this.loadStripeData();
                    
                    if (result.priceChanged && result.price) {
                        const amount = this.formatCurrency(result.price.unit_amount, result.price.currency);
                        alert(`✅ Product updated successfully!\n\nNew price created: ${amount}\n\nNote: The old price was not archived. You can archive it manually if needed.`);
                    } else {
                        alert(`✅ Product updated successfully!`);
                    }
                });
            }
        });
    }

    archiveProduct(productId: string, productName: string) {
        const confirmArchive = confirm(
            `⚠️ Archive Product?\n\n` +
            `Product: ${productName}\n` +
            `ID: ${productId}\n\n` +
            `This will deactivate the product and all its prices. Continue?`
        );

        if (!confirmArchive) return;

        this.isDeletingProduct = true;

        this.stripeService.archiveProduct(productId).pipe(
            timeout(15000),
            catchError(error => {
                alert(`❌ Failed to archive product: ${error.message}`);
                return of(null);
            })
        ).subscribe(result => {
            this.isDeletingProduct = false;

            if (result) {
                this.invalidateCache(); // Clear cache to force fresh data
                this.loadStripeData();
                alert(`✅ Product archived successfully!`);
            }
        });
    }

    /**
     * Delete an inactive product (permanent deletion)
     * NOTE: Stripe only allows deleting products with NO prices
     */
    deleteProduct(productId: string, productName: string) {
        const confirmDelete = confirm(
            `🗑️ DELETE Product Permanently?\n\n` +
            `Product: ${productName}\n` +
            `ID: ${productId}\n\n` +
            `⚠️ STRIPE LIMITATION:\n` +
            `• Products with prices (even archived) CANNOT be deleted\n` +
            `• Only products with ZERO prices can be permanently deleted\n` +
            `• If this product has prices, you can only ARCHIVE it\n\n` +
            `⚠️ This action CANNOT be undone!\n\n` +
            `Are you absolutely sure you want to try deleting this inactive product?`
        );

        if (!confirmDelete) return;

        // Double confirmation for safety
        const doubleCheck = confirm(
            `⚠️ FINAL CONFIRMATION\n\n` +
            `You are about to PERMANENTLY DELETE:\n` +
            `"${productName}"\n\n` +
            `This will only work if the product has NO prices.\n` +
            `This action is IRREVERSIBLE. Continue?`
        );

        if (!doubleCheck) return;

        this.isDeletingProduct = true;

        this.stripeService.deleteProduct(productId).pipe(
            timeout(15000),
            catchError((error: any) => {
                const errorMsg = error.message || error;
                // Check if error is about prices
                if (errorMsg.includes('price')) {
                    alert(
                        `❌ Cannot Delete Product\n\n` +
                        `${errorMsg}\n\n` +
                        `💡 SOLUTION: This is a Stripe limitation.\n` +
                        `You can only ARCHIVE this product, not delete it.\n\n` +
                        `Use the "Archive" button instead to mark it as inactive.`
                    );
                } else {
                    alert(`❌ Failed to delete product: ${errorMsg}`);
                }
                return of(null);
            })
        ).subscribe((result: any) => {
            this.isDeletingProduct = false;

            if (result) {
                this.invalidateCache(); // Clear cache to force fresh data
                this.loadStripeData();
                alert(`✅ Product deleted successfully!\n\nThe product "${productName}" has been permanently removed from Stripe.`);
            }
        });
    }

    // ==================== PRICE MANAGEMENT ====================

    openAddPriceModal(product: any) {
        this.selectedProductForPrice = product;
        this.showAddPriceModal = true;

        // Determine if this is a subscription product
        const isSubscription = product.metadata?.type === 'subscription';

        this.newPrice = {
            productId: product.id,
            unitAmount: 0,
            currency: 'usd',
            nickname: '',
            recurring: isSubscription ? { interval: 'month', intervalCount: 1 } : null
        };
    }

    closeAddPriceModal() {
        this.showAddPriceModal = false;
        this.selectedProductForPrice = null;
        this.newPrice = {
            productId: '',
            unitAmount: 0,
            currency: 'usd',
            nickname: '',
            recurring: null
        };
    }

    createPrice() {
        if (this.newPrice.unitAmount <= 0) {
            alert('⚠️ Price amount must be greater than 0');
            return;
        }

        this.isCreatingPrice = true;

        const priceData: any = {
            productId: this.newPrice.productId,
            unitAmount: Math.round(this.newPrice.unitAmount * 100), // Convert dollars to cents
            currency: this.newPrice.currency,
            nickname: this.newPrice.nickname || undefined
        };

        // Add recurring data if it's a subscription
        if (this.newPrice.recurring) {
            priceData.recurring = {
                interval: this.newPrice.recurring.interval,
                intervalCount: this.newPrice.recurring.intervalCount || 1
            };
        }

        this.stripeService.createPrice(priceData).pipe(
            timeout(15000),
            catchError(error => {
                alert(`❌ Failed to create price: ${error.message}`);
                return of(null);
            })
        ).subscribe(result => {
            this.isCreatingPrice = false;

            if (result) {
                this.invalidateCache(); // Clear cache to force fresh data
                this.loadStripeData();
                this.closeAddPriceModal();
                const amount = this.formatCurrency(result.unit_amount, result.currency);
                const interval = result.recurring ? ` / ${result.recurring.interval}` : '';
                alert(`✅ Price created successfully!\n\nAmount: ${amount}${interval}`);
            }
        });
    }

    archivePrice(priceId: string, price: any) {
        const amount = this.formatCurrency(price.unit_amount, price.currency);
        const interval = price.recurring ? ` / ${price.recurring.interval}` : ' (one-time)';

        const confirmArchive = confirm(
            `⚠️ Archive Price?\n\n` +
            `Price: ${amount}${interval}\n` +
            `ID: ${priceId}\n\n` +
            `This will deactivate the price. Continue?`
        );

        if (!confirmArchive) return;

        this.stripeService.archivePrice(priceId).pipe(
            timeout(15000),
            catchError(error => {
                alert(`❌ Failed to archive price: ${error.message}`);
                return of(null);
            })
        ).subscribe(result => {
            if (result) {
                this.invalidateCache(); // Clear cache to force fresh data
                this.loadStripeData();
                alert(`✅ Price archived successfully!`);
            }
        });
    }

    // ==================== SUBSCRIPTION CARD INTEGRATION ====================

    /**
     * Convert Stripe product to subscription-card compatible format
     */
    convertToCardProduct(stripeProduct: any): any {
        const prices = this.getPricesForProduct(stripeProduct.id);
        const primaryPrice = prices.find(p => p.active) || prices[0];
        
        // Determine if this is a recurring or one-time product based on price
        const isRecurring = primaryPrice?.recurring ? true : false;
        const priceAmount = primaryPrice ? (primaryPrice.unit_amount / 100) : 0;
        
        // Determine product type from metadata
        const metadataType = stripeProduct.metadata?.type;
        const isBusinessModel = metadataType === 'businessModel';

        // Build the card product object
        const cardProduct: any = {
            id: stripeProduct.id,
            stripeProductId: stripeProduct.id,
            stripePriceId: primaryPrice?.id,
            name: stripeProduct.name,
            description: stripeProduct.description || '',
            // Set price property for general use
            price: priceAmount,
            currency: primaryPrice?.currency || 'usd',
            status: stripeProduct.active ? 'Active' : 'Inactive',
            lastModified: stripeProduct.created ? new Date(stripeProduct.created * 1000).toISOString() : new Date().toISOString(),
            features: [],
            // Flag to indicate if it's recurring
            isRecurring: isRecurring,
            // Include price details for display
            _prices: prices,
            _stripeData: stripeProduct
        };

        // Add type-specific properties based on product type
        if (isRecurring) {
            // Subscription product - add planType to trigger isSubscriptionPlan() type guard
            cardProduct.planType = 'recurring';
            cardProduct.monthlyPrice = priceAmount;
        } else if (isBusinessModel) {
            // Business model - add productType to trigger isOneTimeProduct() type guard
            cardProduct.productType = 'businessModel';
            cardProduct.price = priceAmount;
        } else {
            // One-time service - add productType to trigger isOneTimeProduct() type guard
            cardProduct.productType = 'service';
            cardProduct.price = priceAmount;
        }

        return cardProduct;
    }

    /**
     * Get custom actions for product cards
     */
    getProductActions(product: any): Array<{ icon: string, label: string, class: string, action: string, disabled?: boolean }> {
        const actions = [];

        // View Customers action - always available
        actions.push({
            icon: 'fa-users',
            label: 'View Customers',
            class: 'btn-info',
            action: 'view-customers',
            disabled: false
        });

        // Archive action - only for active products
        if (product.active) {
            actions.push({
                icon: 'fa-archive',
                label: 'Archive Product',
                class: 'btn-warning',
                action: 'archive',
                disabled: this.isDeletingProduct
            });
        }

        // Delete action - only for inactive products
        if (!product.active) {
            actions.push({
                icon: 'fa-trash',
                label: 'Delete Product',
                class: 'btn-danger',
                action: 'delete',
                disabled: this.isDeletingProduct
            });
        }

        return actions;
    }

    /**
     * Convert Stripe customer to card product format
     */
    convertCustomerToCard(customer: any): any {
        return {
            id: customer.id,
            stripeProductId: customer.id,
            name: customer.name || customer.email || 'Unnamed Customer',
            description: customer.email || '',
            price: 0, // Customers don't have a price
            currency: 'usd',
            status: customer.delinquent ? 'Delinquent' : 'Active',
            lastModified: customer.created ? new Date(customer.created * 1000).toISOString() : new Date().toISOString(),
            features: [
                customer.email ? `📧 ${customer.email}` : '',
                customer.phone ? `📞 ${customer.phone}` : '',
                `🗓️ Created: ${this.formatDate(customer.created)}`
            ].filter(f => f),
            _customerData: customer
        };
    }

    /**
     * Get custom actions for customer cards
     */
    getCustomerActions(customer: any): Array<{ icon: string, label: string, class: string, action: string }> {
        return [
            {
                icon: 'fa-eye',
                label: 'View Details',
                class: 'btn-primary',
                action: 'view-details'
            },
            {
                icon: 'fa-edit',
                label: 'Edit Customer',
                class: 'btn-secondary',
                action: 'edit-customer'
            }
        ];
    }

    /**
     * Handle custom action clicks from customer cards
     */
    onCustomerAction(event: { action: string, product: any }, customer: any) {
        switch (event.action) {
            case 'view-details':
                this.loadCustomerDetails(customer._customerData?.id || customer.id);
                break;
            case 'edit-customer':
                this.openEditCustomerModal(customer._customerData || customer);
                break;
            default:
                console.log('Unknown customer action:', event.action);
        }
    }

    /**
     * Handle custom action clicks from subscription cards
     */
    onProductAction(event: { action: string, product: any }, product: any) {
        switch (event.action) {
            case 'add-price':
                this.openAddPriceModal(product._stripeData || product);
                break;
            case 'archive':
                this.archiveProduct(product.id, product.name);
                break;
            case 'delete':
                this.deleteProduct(product.id, product.name);
                break;
            case 'view-customers':
                this.viewProductCustomers(product);
                break;
            default:
                console.log('Unknown action:', event.action);
        }
    }

    /**
     * Open modal to view customers for a specific product
     */
    viewProductCustomers(product: any): void {
        this.selectedProduct = product._stripeData || product;
        this.showProductCustomersModal = true;
        this.isLoadingProductCustomers = true;
        this.productCustomers = [];

        this.stripeService.getProductCustomers(product.id).subscribe({
            next: (result) => {
                this.productCustomers = result.data || [];
                this.isLoadingProductCustomers = false;
                console.log('✅ Loaded product customers:', this.productCustomers);
            },
            error: (error) => {
                console.error('❌ Error loading product customers:', error);
                this.isLoadingProductCustomers = false;
                this.errors.push(`Failed to load customers: ${error.message || 'Unknown error'}`);
            }
        });
    }

    /**
     * Close product customers modal
     */
    closeProductCustomersModal(): void {
        this.showProductCustomersModal = false;
        this.selectedProduct = null;
        this.productCustomers = [];
    }

    /**
     * Remove a customer from a product (cancel their subscription)
     */
    removeCustomerFromProduct(customer: any): void {
        const confirmMessage = `Are you sure you want to cancel ${customer.customerName || customer.customerEmail}'s subscription to this product?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        const doubleConfirm = `This will cancel the subscription immediately. Type "CANCEL" to confirm.`;
        const userInput = prompt(doubleConfirm);

        if (userInput !== 'CANCEL') {
            alert('Action cancelled. Subscription not removed.');
            return;
        }

        this.stripeService.removeCustomerFromProduct(customer.subscriptionId).subscribe({
            next: (result) => {
                console.log('✅ Customer removed from product:', result);
                alert(`✅ Successfully canceled subscription for ${customer.customerName || customer.customerEmail}`);
                // Refresh the customer list
                this.viewProductCustomers(this.selectedProduct);
            },
            error: (error) => {
                console.error('❌ Error removing customer:', error);
                alert(`❌ Failed to cancel subscription: ${error.message || 'Unknown error'}`);
            }
        });
    }

    /**
     * Close customer details panel
     */
    closeCustomerDetails(): void {
        this.selectedCustomer = null;
        this.selectedCustomerId = null;
    }
}
