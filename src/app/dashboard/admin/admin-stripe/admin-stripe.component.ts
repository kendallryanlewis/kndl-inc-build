import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { StripeService } from '../../../services/stripe.service';
import { Observable, forkJoin, BehaviorSubject, of, timer } from 'rxjs';
import { catchError, map, tap, timeout, takeUntil } from 'rxjs/operators';

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
    type: 'payment' | 'invoice' | 'subscription' | 'refund' | 'payment_method';
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
    sectionIds: string[] = ['overview', 'customers', 'subscriptions', 'services', 'connection'];
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
    activeTab: 'overview' | 'subscriptions' | 'services' | 'customers' | 'connection' = 'overview';
    selectedCustomerId: string | null = null;

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

    newProduct = {
        name: '',
        description: '',
        type: 'subscription' as 'subscription' | 'onetime', // subscription or onetime
        active: true
    };

    editProduct = {
        id: '',
        name: '',
        description: '',
        active: true
    };

    newPrice = {
        productId: '',
        unitAmount: 0,
        currency: 'usd',
        nickname: '',
        recurring: null as { interval: 'month' | 'year'; intervalCount?: number } | null
    };

    selectedProductForPrice: any = null;

    constructor(private stripeService: StripeService) { }

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
        if (this.subTab !== this.previousSubTab) {
            this.activeTab = this.subTab as any;
            this.previousSubTab = this.subTab;
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
                this.stripeData.prices = data;
                // Cache the data if we got results
                if (data && data.length > 0) {
                    this.cachedPrices = data;
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



    setActiveTab(tab: 'overview' | 'subscriptions' | 'services' | 'customers' | 'connection') {
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
        return this.stripeData.prices.filter(p => p && p.product === productId);
    }

    hasNoPricesForProduct(productId: string): boolean {
        return this.getPricesForProduct(productId).length === 0;
    }

    getSubscriptionProducts(): any[] {
        return this.stripeData.products.filter(product => {
            const prices = this.getPricesForProduct(product.id);
            return prices.some(price => price.recurring);
        });
    }

    getOneTimeProducts(): any[] {
        return this.stripeData.products.filter(product => {
            const prices = this.getPricesForProduct(product.id);
            return prices.length === 0 || prices.every(price => !price.recurring);
        });
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
                this.activeTab = 'customers';
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

    openAddProductModal(type: 'subscription' | 'onetime') {
        this.showAddProductModal = true;
        this.newProduct = {
            name: '',
            description: '',
            type: type,
            active: true
        };
    }

    closeAddProductModal() {
        this.showAddProductModal = false;
        this.newProduct = {
            name: '',
            description: '',
            type: 'subscription',
            active: true
        };
    }

    createProduct() {
        if (!this.newProduct.name) {
            alert('⚠️ Product name is required');
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

        this.stripeService.createProduct(productData).pipe(
            timeout(15000),
            catchError(error => {
                alert(`❌ Failed to create product: ${error.message}`);
                return of(null);
            })
        ).subscribe(result => {
            this.isCreatingProduct = false;

            if (result) {
                this.invalidateCache(); // Clear cache to force fresh data
                this.loadStripeData();
                this.closeAddProductModal();
                alert(`✅ Product created successfully!\n\nID: ${result.id}\nName: ${result.name}`);
            }
        });
    }

    openEditProductModal(product: any) {
        this.showEditProductModal = true;
        this.editProduct = {
            id: product.id,
            name: product.name,
            description: product.description || '',
            active: product.active
        };
    }

    closeEditProductModal() {
        this.showEditProductModal = false;
        this.editProduct = {
            id: '',
            name: '',
            description: '',
            active: true
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

        this.stripeService.updateProduct(this.editProduct.id, updateData).pipe(
            timeout(15000),
            catchError(error => {
                alert(`❌ Failed to update product: ${error.message}`);
                return of(null);
            })
        ).subscribe(result => {
            this.isUpdatingProduct = false;

            if (result) {
                this.invalidateCache(); // Clear cache to force fresh data
                this.loadStripeData();
                this.closeEditProductModal();
                alert(`✅ Product updated successfully!`);
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
            unitAmount: this.newPrice.unitAmount,
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
}
