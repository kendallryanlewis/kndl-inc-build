import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil, forkJoin, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged, User as FirebaseUser, Unsubscribe } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { StripeService } from 'src/app/services/stripe.service';
import {
    StripeCustomer,
    StripeSubscription,
    StripePaymentMethod,
    StripeTransaction,
    StripeInvoice,
    PackagePlan,
    AddonPlan
} from '../../config/stripe.config';
import { User } from '../../models/User';
import { StripeCardElement } from '@stripe/stripe-js';

@Component({
    selector: 'app-billing-management',
    templateUrl: './billing-management.component.html',
    styleUrls: ['./billing-management.component.scss']
})
export class BillingManagementComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private authStateSubscription?: Unsubscribe;
    private firestore = getFirestore();

    // Current user and customer data
    currentUser: User | null = null;
    currentFirebaseUser: FirebaseUser | null = null;
    currentCustomer: StripeCustomer | null = null;

    // Data arrays
    subscriptions: StripeSubscription[] = [];
    paymentMethods: StripePaymentMethod[] = [];
    transactions: StripeTransaction[] = [];
    invoices: StripeInvoice[] = [];

    // Available plans
    packagePlans: PackagePlan[] = [];
    addonPlans: AddonPlan[] = [];

    // UI state
    activeTab = 'overview';
    loading = false;
    error: string | null = null;

    // Modal states
    showAddPaymentMethodModal = false;
    showSelectPackageModal = false;
    showTransactionDetailModal = false;
    showSubscriptionDetailModal = false;

    // Selected items for modals
    selectedTransaction: StripeTransaction | null = null;
    selectedSubscription: StripeSubscription | null = null;
    selectedPackage: PackagePlan | null = null;

    // Form states
    addingPaymentMethod = false;
    creatingSubscription = false;

    // Stripe elements
    cardElement: StripeCardElement | null = null;
    cardElementMounted = false;

    // Billing analytics
    billingAnalytics: any = null;

    constructor(
        private stripeService: StripeService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {
        this.packagePlans = this.stripeService.getPackagePlans();
        this.addonPlans = this.stripeService.getAddonPlans();
    }

    ngOnInit(): void {
        const auth = getAuth();
        this.authStateSubscription = onAuthStateChanged(auth, async (firebaseUser) => {
            this.currentFirebaseUser = firebaseUser;
            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(this.firestore, `users/${firebaseUser.uid}`));
                    if (userDoc.exists()) {
                        this.currentUser = { id: firebaseUser.uid, ...userDoc.data() } as User;

                        // Check if user has a Stripe customer ID
                        const userData = userDoc.data();
                        if (userData['stripeCustomerId']) {
                            this.loadCustomerData(userData['stripeCustomerId']);
                        } else {
                            this.createStripeCustomer(this.currentUser, firebaseUser);
                        }
                    }
                } catch (error) {
                    console.error('Error loading user data:', error);
                    this.error = 'Failed to load user data';
                }
            }
        });

        // Subscribe to real-time Stripe updates
        this.stripeService.subscriptions$.pipe(takeUntil(this.destroy$)).subscribe(subs => {
            this.subscriptions = subs;
            this.cdr.detectChanges();
        });

        this.stripeService.paymentMethods$.pipe(takeUntil(this.destroy$)).subscribe(methods => {
            this.paymentMethods = methods;
            this.cdr.detectChanges();
        });

        this.stripeService.transactions$.pipe(takeUntil(this.destroy$)).subscribe(transactions => {
            this.transactions = transactions;
            this.cdr.detectChanges();
        });

        this.stripeService.invoices$.pipe(takeUntil(this.destroy$)).subscribe(invoices => {
            this.invoices = invoices;
            this.cdr.detectChanges();
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.authStateSubscription) {
            this.authStateSubscription();
        }
    }

    private createStripeCustomer(user: User, firebaseUser: FirebaseUser): void {
        this.loading = true;
        this.stripeService.createCustomer({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            phone: user.phone || undefined,
            metadata: {
                userId: firebaseUser.uid,
                firstName: user.firstName,
                lastName: user.lastName
            }
        }).subscribe({
            next: async (customer) => {
                this.currentCustomer = customer;
                // Update Firebase user record with Stripe customer ID
                try {
                    await updateDoc(doc(this.firestore, `users/${firebaseUser.uid}`), {
                        stripeCustomerId: customer.id
                    });
                } catch (error) {
                    console.error('Error updating user with Stripe customer ID:', error);
                }
                this.loadCustomerData(customer.id);
                this.loading = false;
            },
            error: (error) => {
                this.error = `Failed to create customer: ${error.message}`;
                this.loading = false;
                console.error('Error creating Stripe customer:', error);
            }
        });
    }

    private loadCustomerData(customerId: string): void {
        this.loading = true;

        forkJoin({
            customer: this.stripeService.getCustomer(customerId),
            subscriptions: this.stripeService.getSubscriptions(customerId),
            paymentMethods: this.stripeService.getPaymentMethods(customerId),
            transactions: this.stripeService.getTransactions(customerId),
            invoices: this.stripeService.getInvoices(customerId),
            analytics: this.stripeService.getBillingAnalytics(customerId)
        }).subscribe({
            next: (data) => {
                this.currentCustomer = data.customer;
                this.subscriptions = data.subscriptions;
                this.paymentMethods = data.paymentMethods;
                this.transactions = data.transactions;
                this.invoices = data.invoices;
                this.billingAnalytics = data.analytics;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                this.error = `Failed to load billing data: ${error.message}`;
                this.loading = false;
                console.error('Error loading customer data:', error);
            }
        });
    }

    // Tab navigation
    setActiveTab(tab: string): void {
        this.activeTab = tab;
        this.cdr.detectChanges();
    }

    // Payment Method Management
    async showAddPaymentMethod(): Promise<void> {
        this.showAddPaymentMethodModal = true;
        this.cdr.detectChanges();

        // Wait for modal to render
        setTimeout(async () => {
            this.cardElement = await this.stripeService.createCardElement();
            if (this.cardElement) {
                const cardElementContainer = document.getElementById('card-element');
                if (cardElementContainer) {
                    this.cardElement.mount('#card-element');
                    this.cardElementMounted = true;
                }
            }
        }, 100);
    }

    async addPaymentMethod(): Promise<void> {
        if (!this.cardElement || !this.currentCustomer) return;

        this.addingPaymentMethod = true;
        this.error = null;

        try {
            // Create payment method
            const paymentMethod = await this.stripeService.createPaymentMethod(this.cardElement, {
                name: `${this.currentUser?.firstName} ${this.currentUser?.lastName}`,
                email: this.currentUser?.email
            });

            // Attach to customer
            await this.stripeService.attachPaymentMethod(paymentMethod.id, this.currentCustomer.id).toPromise();

            this.showAddPaymentMethodModal = false;
            this.cardElement = null;
            this.cardElementMounted = false;
            this.addingPaymentMethod = false;

            // Refresh payment methods
            this.stripeService.getPaymentMethods(this.currentCustomer.id).subscribe();

        } catch (error: any) {
            this.error = this.stripeService.getStripeErrorMessage(error);
            this.addingPaymentMethod = false;
        }
    }

    removePaymentMethod(paymentMethodId: string): void {
        if (confirm('Are you sure you want to remove this payment method?')) {
            this.stripeService.detachPaymentMethod(paymentMethodId).subscribe({
                next: () => {
                    // Payment methods will be updated via subscription
                },
                error: (error) => {
                    this.error = `Failed to remove payment method: ${error.message}`;
                }
            });
        }
    }

    setDefaultPaymentMethod(paymentMethodId: string): void {
        if (!this.currentCustomer) return;

        this.stripeService.setDefaultPaymentMethod(this.currentCustomer.id, paymentMethodId).subscribe({
            next: (customer) => {
                this.currentCustomer = customer;
                this.cdr.detectChanges();
            },
            error: (error) => {
                this.error = `Failed to set default payment method: ${error.message}`;
            }
        });
    }

    // Subscription Management
    showSelectPackage(): void {
        this.showSelectPackageModal = true;
    }

    selectPackage(packagePlan: PackagePlan): void {
        this.selectedPackage = packagePlan;
    }

    createSubscription(): void {
        if (!this.selectedPackage || !this.currentCustomer || !this.currentUser) return;

        this.creatingSubscription = true;
        this.error = null;

        // Get default payment method
        const defaultPaymentMethod = this.paymentMethods.find(pm => pm.id === this.currentCustomer?.invoice_settings?.default_payment_method);

        if (!defaultPaymentMethod) {
            this.error = 'Please add a payment method first';
            this.creatingSubscription = false;
            return;
        }

        try {
            this.stripeService.createSubscription({
                customerId: this.currentCustomer.id,
                priceId: this.selectedPackage.stripePriceId,
                paymentMethodId: defaultPaymentMethod.id,
                metadata: {
                    packageType: this.selectedPackage.id,
                    companyId: this.currentUser?.companyId || '',
                    packageName: this.selectedPackage.name
                }
            }).subscribe({
                next: (subscription) => {
                    this.showSelectPackageModal = false;
                    this.selectedPackage = null;
                    this.creatingSubscription = false;

                    // Refresh subscriptions
                    if (this.currentCustomer) {
                        this.stripeService.getSubscriptions(this.currentCustomer.id).subscribe();
                    }
                },
                error: (error: any) => {
                    this.error = this.stripeService.getStripeErrorMessage(error);
                    this.creatingSubscription = false;
                }
            });
        } catch (error: any) {
            this.error = this.stripeService.getStripeErrorMessage(error);
            this.creatingSubscription = false;
        }
    }

    updateSubscription(subscriptionId: string, newPriceId: string): void {
        this.stripeService.updateSubscription(subscriptionId, { priceId: newPriceId }).subscribe({
            next: () => {
                // Subscriptions will be updated via subscription
            },
            error: (error) => {
                this.error = `Failed to update subscription: ${error.message}`;
            }
        });
    }

    cancelSubscription(subscription: StripeSubscription): void {
        const message = `Are you sure you want to cancel your ${subscription.packageType || 'subscription'}? This will take effect at the end of your current billing period.`;

        if (confirm(message)) {
            this.stripeService.cancelSubscription(subscription.id, true).subscribe({
                next: () => {
                    // Subscriptions will be updated via subscription
                },
                error: (error) => {
                    this.error = `Failed to cancel subscription: ${error.message}`;
                }
            });
        }
    }

    reactivateSubscription(subscription: StripeSubscription): void {
        this.stripeService.reactivateSubscription(subscription.id).subscribe({
            next: () => {
                // Subscriptions will be updated via subscription
            },
            error: (error) => {
                this.error = `Failed to reactivate subscription: ${error.message}`;
            }
        });
    }

    // Transaction and Invoice Management
    showTransactionDetail(transaction: StripeTransaction): void {
        this.selectedTransaction = transaction;
        this.showTransactionDetailModal = true;
    }

    showSubscriptionDetail(subscription: StripeSubscription): void {
        this.selectedSubscription = subscription;
        this.showSubscriptionDetailModal = true;
    }

    downloadInvoice(invoiceId: string): void {
        this.stripeService.downloadInvoice(invoiceId).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `invoice-${invoiceId}.pdf`;
                link.click();
                window.URL.revokeObjectURL(url);
            },
            error: (error) => {
                this.error = `Failed to download invoice: ${error.message}`;
            }
        });
    }

    // Utility Methods
    formatCurrency(amount: number, currency = 'usd'): string {
        return this.stripeService.formatCurrency(amount, currency);
    }

    formatDate(timestamp: number): string {
        return this.stripeService.formatDate(timestamp);
    }

    formatDateTime(timestamp: number): string {
        return this.stripeService.formatDateTime(timestamp);
    }

    getCardBrandIcon(brand: string): string {
        return this.stripeService.getCardBrandIcon(brand);
    }

    getPackageById(packageId: string): PackagePlan | undefined {
        return this.packagePlans.find(pkg => pkg.id === packageId);
    }

    getAddonById(addonId: string): AddonPlan | undefined {
        return this.addonPlans.find(addon => addon.id === addonId);
    }

    getSubscriptionStatusColor(status: string): string {
        return this.stripeService.getSubscriptionStatusColor(status);
    }

    getTransactionStatusColor(status: string): string {
        return this.stripeService.getTransactionStatusColor(status);
    }

    getTotalActiveSubscriptions(): number {
        return this.subscriptions.filter(sub => sub.status === 'active').length;
    }

    getTotalMonthlyAmount(): number {
        return this.subscriptions
            .filter(sub => sub.status === 'active')
            .reduce((total, sub) => total + sub.amount, 0);
    }

    getNextBillingDate(): Date | null {
        const activeSubscriptions = this.subscriptions.filter(sub => sub.status === 'active');
        if (activeSubscriptions.length === 0) return null;

        const nextBilling = Math.min(...activeSubscriptions.map(sub => sub.currentPeriodEnd || sub.current_period_end));
        return new Date(nextBilling * 1000);
    }

    hasPaymentMethods(): boolean {
        return this.paymentMethods.length > 0;
    }

    hasActiveSubscription(): boolean {
        return this.subscriptions.some(sub => sub.status === 'active');
    }

    closeModal(): void {
        this.showAddPaymentMethodModal = false;
        this.showSelectPackageModal = false;
        this.showTransactionDetailModal = false;
        this.showSubscriptionDetailModal = false;
        this.selectedTransaction = null;
        this.selectedSubscription = null;
        this.selectedPackage = null;

        if (this.cardElement && this.cardElementMounted) {
            this.cardElement.unmount();
            this.cardElement = null;
            this.cardElementMounted = false;
        }
    }

    clearError(): void {
        this.error = null;
    }
}