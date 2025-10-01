import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { StripeService, StripeProduct, StripePrice } from '../../../../services/stripe.service';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-subscription-tab',
    templateUrl: './subscription-tab.component.html',
    styleUrls: ['./subscription-tab.component.scss']
})
export class SubscriptionTabComponent implements OnInit, OnDestroy, OnChanges {
    @Input() selectedCompany: any;
    @Input() stripeLoading: boolean = false;
    @Input() stripeSubscriptionsData: any[] = [];

    @Output() createStripeSubscriptionForCompany = new EventEmitter<{ company: any, priceId: string }>();
    @Output() cancelStripeSubscription = new EventEmitter<{ company: any, immediately: boolean }>();
    @Output() changeStripeSubscription = new EventEmitter<{ company: any, newPriceId: string }>();
    @Output() syncCompanyWithStripe = new EventEmitter<any>();
    @Output() getStripeCustomerData = new EventEmitter<any>();
    @Output() refreshSubscriptions = new EventEmitter<any>();

    stripeProducts: StripeProduct[] = [];
    stripePrices: StripePrice[] = [];
    isLoadingStripeProducts: boolean = false;
    availableProducts: StripeProduct[] = [];
    availablePrices: StripePrice[] = [];
    selectedPriceId: string = '';
    currentSubscriptions: any[] = [];
    availablePricesForDropdown: StripePrice[] = [];
    selectedDropdownPriceId: string = '';

    private destroy$ = new Subject<void>();

    constructor(private stripeService: StripeService) { }

    ngOnInit(): void {
        console.log('🚀 SubscriptionTabComponent initialized');
        console.log('📊 Initial state:', {
            selectedCompany: this.selectedCompany?.name,
            stripeCustomerId: this.selectedCompany?.stripeCustomerId,
            stripeLoading: this.stripeLoading,
            inputSubscriptionsLength: this.stripeSubscriptionsData?.length || 0
        });

        this.initializeStripeProducts();
        this.updateSubscriptionsFromInput();
    }

    ngOnChanges(changes: SimpleChanges): void {
        console.log('🔍 SUBSCRIPTION TAB DEBUG: ngOnChanges called');

        if (changes['selectedCompany'] && changes['selectedCompany'].currentValue) {
            this.initializeStripeProducts();
        }

        if (changes['stripeSubscriptionsData']) {
            console.log('🔍 SUBSCRIPTION TAB DEBUG: Stripe subscriptions data changed:', changes['stripeSubscriptionsData'].currentValue);
            this.updateSubscriptionsFromInput();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initializeStripeProducts(): void {
        this.isLoadingStripeProducts = true;
        this.stripeService.initializeProductsAndPrices();

        combineLatest([
            this.stripeService.getProducts(),
            this.stripeService.getPrices()
        ]).pipe(takeUntil(this.destroy$)).subscribe({
            next: ([products, prices]) => {
                this.stripeProducts = products || [];
                this.stripePrices = prices || [];
                this.availableProducts = this.stripeProducts;
                this.availablePrices = this.stripePrices;
                this.isLoadingStripeProducts = false;
                this.updateAvailablePricesForDropdown();
            },
            error: (error) => {
                console.error('ERROR loading Stripe products/prices:', error);
                this.isLoadingStripeProducts = false;
            }
        });
    }

    updateSubscriptionsFromInput(): void {
        console.log('🔍 SUBSCRIPTION TAB DEBUG: Updating subscriptions from input data:', this.stripeSubscriptionsData?.length || 0, 'subscriptions');
        console.log('🔍 SUBSCRIPTION TAB DEBUG: Raw subscription data:', this.stripeSubscriptionsData);

        this.currentSubscriptions = Array.isArray(this.stripeSubscriptionsData) ? this.stripeSubscriptionsData : [];

        console.log('🔍 SUBSCRIPTION TAB DEBUG: Final currentSubscriptions:', this.currentSubscriptions);
        console.log('🔍 SUBSCRIPTION TAB DEBUG: currentSubscriptions length:', this.currentSubscriptions.length);

        // Enhanced logging for all subscription details
        this.logAllSubscriptionDetails();

        this.updateAvailablePricesForDropdown();
    }

    private logAllSubscriptionDetails(): void {
        console.log('\n📋 === COMPLETE SUBSCRIPTION REPORT ===');
        console.log(`Customer has ${this.currentSubscriptions.length} total subscriptions`);

        if (this.currentSubscriptions.length === 0) {
            console.log('❌ No subscriptions found');
            return;
        }

        this.currentSubscriptions.forEach((subscription, index) => {
            console.log(`\n🔹 SUBSCRIPTION ${index + 1}:`);
            console.log('   📄 ID:', subscription.id);
            console.log('   📊 Status:', subscription.status);
            console.log('   💰 Currency:', subscription.currency);
            console.log('   📅 Created:', this.formatDate(subscription.created));
            console.log('   📅 Current Period Start:', this.formatDate(subscription.current_period_start));
            console.log('   📅 Current Period End:', this.formatDate(subscription.current_period_end));

            if (subscription.items && subscription.items.data) {
                console.log('   📦 SUBSCRIPTION ITEMS:');
                subscription.items.data.forEach((item: any, itemIndex: number) => {
                    console.log(`     🔸 Item ${itemIndex + 1}:`);
                    console.log('       💵 Price ID:', item.price?.id);
                    console.log('       💲 Amount:', item.price?.unit_amount ? `${item.price.unit_amount / 100} ${item.price.currency}` : 'Unknown');
                    console.log('       🔄 Interval:', item.price?.recurring?.interval || 'Unknown');
                    console.log('       🏷️ Product ID:', item.price?.product);

                    // Get product name if available
                    const product = this.getProductForPrice(item.price?.id);
                    if (product) {
                        console.log('       📝 Product Name:', product.name);
                        console.log('       📋 Product Description:', product.description || 'No description');
                    }

                    console.log('       📊 Quantity:', item.quantity);
                });
            }

            if (subscription.metadata && Object.keys(subscription.metadata).length > 0) {
                console.log('   🏷️ METADATA:');
                Object.entries(subscription.metadata).forEach(([key, value]) => {
                    console.log(`     ${key}: ${value}`);
                });
            }

            console.log('   🔗 Raw subscription object:', subscription);
        });

        // Summary by status
        const statusSummary = this.currentSubscriptions.reduce((acc, sub) => {
            acc[sub.status] = (acc[sub.status] || 0) + 1;
            return acc;
        }, {});

        console.log('\n📊 === SUBSCRIPTION STATUS SUMMARY ===');
        Object.entries(statusSummary).forEach(([status, count]) => {
            console.log(`   ${status}: ${count} subscription(s)`);
        });

        // Active subscriptions breakdown
        const activeSubscriptions = this.currentSubscriptions.filter(sub =>
            sub.status === 'active' || sub.status === 'trialing'
        );

        console.log(`\n✅ Active/Trialing Subscriptions: ${activeSubscriptions.length}`);
        if (activeSubscriptions.length > 0) {
            activeSubscriptions.forEach((sub: any, index: number) => {
                const totalAmount = sub.items?.data?.reduce((sum: number, item: any) => {
                    return sum + (item.price?.unit_amount || 0) * (item.quantity || 1);
                }, 0) || 0;

                console.log(`   ${index + 1}. ${sub.id} - ${totalAmount / 100} ${sub.currency}/${sub.items?.data?.[0]?.price?.recurring?.interval || 'unknown'}`);
            });
        }

        console.log('=== END SUBSCRIPTION REPORT ===\n');
    }

    // Method to manually trigger detailed subscription logging
    debugSubscriptions(): void {
        console.log('\n🔧 === MANUAL DEBUG TRIGGER ===');
        console.log('📅 Debug triggered at:', new Date().toISOString());
        console.log('👤 Customer:', this.selectedCompany?.name);
        console.log('🆔 Customer ID:', this.selectedCompany?.stripeCustomerId);
        console.log('📊 Component State:');
        console.log('   - stripeLoading:', this.stripeLoading);
        console.log('   - stripeSubscriptionsData:', this.stripeSubscriptionsData);
        console.log('   - currentSubscriptions:', this.currentSubscriptions);

        this.logAllSubscriptionDetails();

        // Also log products and prices for context
        if (this.stripeProducts.length > 0) {
            console.log('\n📦 Available Products:');
            this.stripeProducts.forEach((product, index) => {
                console.log(`   ${index + 1}. ${product.name} (${product.id})`);
            });
        }

        if (this.stripePrices.length > 0) {
            console.log('\n💰 Available Prices:');
            this.stripePrices.forEach((price, index) => {
                console.log(`   ${index + 1}. ${price.id} - ${price.unit_amount ? price.unit_amount / 100 : 'Unknown'} ${price.currency}/${price.recurring?.interval || 'one-time'}`);
            });
        }

        console.log('🔧 === END MANUAL DEBUG ===\n');
    }

    /**
     * 🔍 COMPREHENSIVE CUSTOMER DATA LOGGER
     * Fetches and logs ALL customer information including subscriptions, payments, invoices, and activity
     */
    async logAllCustomerData(): Promise<void> {
        if (!this.selectedCompany?.stripeCustomerId) {
            console.error('❌ No company selected or missing Stripe customer ID');
            return;
        }

        console.log(`\n🔍 ===== COMPREHENSIVE CUSTOMER DATA REPORT =====`);
        console.log(`📊 Company: ${this.selectedCompany.name}`);
        console.log(`🆔 Customer ID: ${this.selectedCompany.stripeCustomerId}`);
        console.log(`⏰ Generated: ${new Date().toLocaleString()}`);
        console.log(`================================================\n`);

        try {
            // Fetch basic customer data
            console.log(`👤 === CUSTOMER INFORMATION ===`);
            this.stripeService.getCustomer(this.selectedCompany.stripeCustomerId).subscribe({
                next: (customer) => {
                    console.log(`📧 Email: ${customer.email}`);
                    console.log(`📱 Phone: ${customer.phone || 'Not provided'}`);
                    console.log(`🏠 Address:`, customer.address || 'Not provided');
                    console.log(`💳 Default Payment Method: ${customer.default_source || customer.invoice_settings?.default_payment_method || 'None'}`);
                    console.log(`💰 Account Balance: $${((customer.account_balance || 0) / 100).toFixed(2)}`);
                    console.log(`📅 Created: ${new Date(customer.created * 1000).toLocaleString()}`);
                    console.log(`🏷️ Customer Object:`, customer);
                },
                error: (error) => console.error(`❌ Failed to fetch customer data:`, error)
            });

            // Log current subscriptions with enhanced detail
            console.log(`\n💎 === SUBSCRIPTIONS (${this.currentSubscriptions.length}) ===`);
            if (this.currentSubscriptions.length > 0) {
                this.currentSubscriptions.forEach((subscription: any, index: number) => {
                    console.log(`\n📋 Subscription ${index + 1}:`);
                    console.log(`  🆔 ID: ${subscription.id}`);
                    console.log(`  📊 Status: ${subscription.status}`);

                    if (subscription.items?.data?.[0]?.price) {
                        const price = subscription.items.data[0].price;
                        console.log(`  💵 Amount: $${(price.unit_amount / 100).toFixed(2)}`);
                        console.log(`  🔄 Interval: ${price.recurring?.interval}`);

                        const product = this.getProductForPrice(price.id);
                        if (product) {
                            console.log(`  🏷️ Product: ${product.name}`);
                        }
                    }

                    console.log(`  📅 Current Period: ${new Date(subscription.current_period_start * 1000).toLocaleDateString()} - ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`);
                    console.log(`  🎯 Trial End: ${subscription.trial_end ? new Date(subscription.trial_end * 1000).toLocaleDateString() : 'No trial'}`);
                    console.log(`  📦 Full Object:`, subscription);
                });
            } else {
                console.log(`❌ No subscriptions found`);
            }

            // Fetch payment methods
            console.log(`\n💳 === PAYMENT METHODS ===`);
            this.stripeService.getPaymentMethods(this.selectedCompany.stripeCustomerId).subscribe({
                next: (paymentMethods) => {
                    console.log(`Found ${paymentMethods.length} payment methods:`);
                    paymentMethods.forEach((pm: any, index: number) => {
                        console.log(`\n💳 Payment Method ${index + 1}:`);
                        console.log(`  🆔 ID: ${pm.id}`);
                        console.log(`  🔧 Type: ${pm.type}`);
                        if (pm.card) {
                            console.log(`  💳 Card: **** **** **** ${pm.card.last4} (${pm.card.brand.toUpperCase()})`);
                            console.log(`  📅 Expires: ${pm.card.exp_month}/${pm.card.exp_year}`);
                            console.log(`  🏦 Country: ${pm.card.country}`);
                        }
                        console.log(`  📦 Full Object:`, pm);
                    });
                },
                error: (error) => console.error(`❌ Failed to fetch payment methods:`, error)
            });

            // Fetch invoices
            console.log(`\n🧾 === INVOICES ===`);
            this.stripeService.getInvoices(this.selectedCompany.stripeCustomerId).subscribe({
                next: (invoices) => {
                    console.log(`Found ${invoices.length} invoices:`);
                    if (invoices.length > 0) {
                        invoices.forEach((invoice: any, index: number) => {
                            console.log(`\n🧾 Invoice ${index + 1}:`);
                            console.log(`  🆔 ID: ${invoice.id}`);
                            console.log(`  📊 Status: ${invoice.status}`);
                            console.log(`  💵 Amount: $${(invoice.amount_due / 100).toFixed(2)}`);
                            console.log(`  💰 Paid: $${(invoice.amount_paid / 100).toFixed(2)}`);
                            console.log(`  📅 Created: ${new Date(invoice.created * 1000).toLocaleDateString()}`);
                            console.log(`  📅 Due: ${invoice.due_date ? new Date(invoice.due_date * 1000).toLocaleDateString() : 'No due date'}`);
                            console.log(`  🔗 PDF: ${invoice.invoice_pdf || 'Not available'}`);
                            console.log(`  📦 Full Object:`, invoice);
                        });
                    } else {
                        console.log(`❌ No invoices found`);
                    }
                },
                error: (error) => console.error(`❌ Failed to fetch invoices:`, error)
            });

            // Generate Summary
            console.log(`\n📊 === CUSTOMER SUMMARY ===`);
            console.log(`👤 Customer: ${this.selectedCompany.name} (${this.selectedCompany.stripeCustomerId})`);
            console.log(`💎 Active Subscriptions: ${this.getActiveSubscriptionCount()}`);
            console.log(`💎 Total Subscriptions: ${this.currentSubscriptions.length}`);

            const totalRevenue = this.calculateTotalRevenue();
            console.log(`💰 Estimated Monthly Revenue: $${totalRevenue.toFixed(2)}`);

            console.log(`\n✅ === CUSTOMER DATA REPORT COMPLETE ===\n`);

        } catch (error) {
            console.error('❌ Error fetching comprehensive customer data:', error);
        }
    }

    /**
     * Helper method to get active subscription count
     */
    private getActiveSubscriptionCount(): number {
        return this.currentSubscriptions.filter(sub =>
            sub.status === 'active' || sub.status === 'trialing'
        ).length;
    }

    /**
     * Helper method to calculate total revenue from active subscriptions
     */
    private calculateTotalRevenue(): number {
        return this.currentSubscriptions
            .filter(sub => sub.status === 'active' || sub.status === 'trialing')
            .reduce((total, sub) => {
                if (sub.items?.data?.[0]?.price?.unit_amount) {
                    return total + (sub.items.data[0].price.unit_amount / 100);
                }
                return total;
            }, 0);
    }

    // Method to trigger subscription refresh from parent component
    refreshSubscriptionData(): void {
        console.log('🔄 Refreshing subscription data...');
        if (this.selectedCompany?.stripeCustomerId) {
            this.refreshSubscriptions.emit(this.selectedCompany);
        } else {
            console.warn('⚠️ Cannot refresh: No customer ID found');
        }
    }

    updateAvailablePricesForDropdown(): void {
        if (!Array.isArray(this.currentSubscriptions)) {
            this.currentSubscriptions = [];
            this.availablePricesForDropdown = this.availablePrices || [];
            return;
        }

        const currentPriceIds = this.currentSubscriptions
            .filter(sub => sub && (sub.status === 'active' || sub.status === 'trialing'))
            .flatMap(sub => sub.items?.data || [])
            .map(item => item?.price?.id)
            .filter(Boolean);

        this.availablePricesForDropdown = (this.availablePrices || []).filter(
            price => price && !currentPriceIds.includes(price.id)
        );
    }

    onCreateSubscriptionFromDropdown(): void {
        if (!this.selectedDropdownPriceId) {
            alert('Please select a subscription plan from the dropdown');
            return;
        }

        this.createStripeSubscriptionForCompany.emit({
            company: this.selectedCompany,
            priceId: this.selectedDropdownPriceId
        });
    }

    cancelSubscription(subscriptionId: string, immediately: boolean = false): void {
        this.cancelStripeSubscription.emit({
            company: { ...this.selectedCompany, stripeSubscriptionId: subscriptionId },
            immediately: immediately
        });
    }

    getSubscriptionStatusBadgeClass(status: string): string {
        switch (status?.toLowerCase()) {
            case 'active':
                return 'bg-success';
            case 'trialing':
                return 'bg-info';
            case 'past_due':
                return 'bg-warning';
            case 'canceled':
                return 'bg-secondary';
            case 'unpaid':
                return 'bg-danger';
            default:
                return 'bg-light';
        }
    }

    getProductForPrice(priceId: string): StripeProduct | null {
        const price = this.stripePrices.find(p => p.id === priceId);
        if (!price) return null;

        return this.stripeProducts.find(product => product.id === price.product) || null;
    }

    formatDate(dateInput: any): string {
        if (!dateInput) return 'N/A';

        let date: Date;
        if (typeof dateInput === 'string') {
            date = new Date(dateInput);
        } else if (typeof dateInput === 'number') {
            date = new Date(dateInput * 1000);
        } else if (dateInput instanceof Date) {
            date = dateInput;
        } else {
            return 'Invalid Date';
        }

        return date.toLocaleDateString();
    }

    // Getter for available subscription plans (used in template)
    get availableSubscriptionPlans(): any[] {
        // Create subscription plans from available products and prices
        const plans: any[] = [];

        // Group prices by product
        const productPriceMap = new Map<string, StripePrice[]>();
        this.stripePrices.forEach(price => {
            if (!productPriceMap.has(price.product)) {
                productPriceMap.set(price.product, []);
            }
            productPriceMap.get(price.product)!.push(price);
        });

        // Create subscription plans
        this.stripeProducts.forEach(product => {
            const productPrices = productPriceMap.get(product.id) || [];
            const monthlyPrice = productPrices.find(p =>
                p.recurring?.interval === 'month' && p.active
            );
            const yearlyPrice = productPrices.find(p =>
                p.recurring?.interval === 'year' && p.active
            );

            if (monthlyPrice) {
                const plan = {
                    stripeProductId: product.id,
                    stripeMonthlyPriceId: monthlyPrice.id,
                    stripeYearlyPriceId: yearlyPrice?.id,
                    name: product.name,
                    description: product.description || '',
                    active: product.active,
                    monthlyPrice: monthlyPrice.unit_amount / 100,
                    yearlyPrice: yearlyPrice ? (yearlyPrice.unit_amount / 100) : undefined,
                    currency: monthlyPrice.currency,
                    features: this.extractFeaturesFromProduct(product),
                    isPopular: this.isProductPopular(product),
                    planType: this.extractPlanType(product)
                };
                plans.push(plan);
            }
        });

        return plans;
    }

    // Method for creating subscription from plan (used in template)
    onCreateSubscriptionFromPlan(plan: any): void {
        console.log('Creating subscription for plan:', plan);
        console.log('Selected company:', this.selectedCompany);

        if (!plan.stripeMonthlyPriceId) {
            console.error('Plan missing monthly price ID:', plan);
            alert('This plan does not have a monthly price configured');
            return;
        }

        if (!this.selectedCompany?.stripeCustomerId) {
            console.error('Company missing Stripe customer ID:', this.selectedCompany);
            alert('Company must have a Stripe customer before creating subscription.');
            return;
        }

        console.log('Emitting subscription creation event with priceId:', plan.stripeMonthlyPriceId);
        this.createStripeSubscriptionForCompany.emit({
            company: this.selectedCompany,
            priceId: plan.stripeMonthlyPriceId
        });
    }

    // Helper methods for subscription plans
    private extractFeaturesFromProduct(product: StripeProduct): string[] {
        if (product.metadata?.['features']) {
            try {
                return JSON.parse(product.metadata['features']);
            } catch {
                return product.metadata['features'].split(',').map(f => f.trim());
            }
        }

        const features: string[] = [];
        if (product.description) {
            const lines = product.description.split('\n');
            lines.forEach(line => {
                if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
                    features.push(line.trim().substring(1).trim());
                }
            });
        }

        return features.length > 0 ? features : ['Standard features included'];
    }

    private isProductPopular(product: StripeProduct): boolean {
        return product.metadata?.['popular'] === 'true' ||
            product.name.toLowerCase().includes('popular') ||
            product.name.toLowerCase().includes('recommended');
    }

    private extractPlanType(product: StripeProduct): 'Starter' | 'Business' | 'Enterprise' {
        const type = product.metadata?.['planType'] || product.metadata?.['plan_type'];
        if (type && ['Starter', 'Business', 'Enterprise'].includes(type)) {
            return type as 'Starter' | 'Business' | 'Enterprise';
        }

        const name = product.name.toLowerCase();
        if (name.includes('starter') || name.includes('basic')) return 'Starter';
        if (name.includes('enterprise') || name.includes('premium')) return 'Enterprise';
        return 'Business';
    }
}
