import { Injectable } from '@angular/core';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { Observable, from, BehaviorSubject, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { 
  stripeConfig, 
  StripeCustomer, 
  StripeSubscription, 
  StripePaymentMethod, 
  StripeTransaction,
  StripeInvoice,
  PackagePlan,
  AddonPlan,
  PACKAGE_PLANS,
  ADDON_PLANS
} from '../config/stripe.config';

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private stripePromise: Promise<Stripe | null>;
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private apiUrl = '/api/stripe'; // Your backend API endpoint
  
  // Observable subjects for real-time updates
  private customersSubject = new BehaviorSubject<StripeCustomer[]>([]);
  private subscriptionsSubject = new BehaviorSubject<StripeSubscription[]>([]);
  private transactionsSubject = new BehaviorSubject<StripeTransaction[]>([]);
  private paymentMethodsSubject = new BehaviorSubject<StripePaymentMethod[]>([]);
  private invoicesSubject = new BehaviorSubject<StripeInvoice[]>([]);

  public customers$ = this.customersSubject.asObservable();
  public subscriptions$ = this.subscriptionsSubject.asObservable();
  public transactions$ = this.transactionsSubject.asObservable();
  public paymentMethods$ = this.paymentMethodsSubject.asObservable();
  public invoices$ = this.invoicesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.stripePromise = loadStripe(stripeConfig.publishableKey);
    this.initializeStripe();
  }

  private async initializeStripe(): Promise<void> {
    try {
      this.stripe = await this.stripePromise;
      if (this.stripe) {
        this.elements = this.stripe.elements();
      }
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      throw error;
    }
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      errorMessage = error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error('Stripe Service Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // Stripe Elements Management
  async createCardElement(): Promise<StripeCardElement | null> {
    if (!this.stripe || !this.elements) {
      await this.initializeStripe();
    }
    
    if (this.elements) {
      return this.elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: 'antialiased',
            '::placeholder': {
              color: '#aab7c4',
            },
            iconColor: '#666EE8',
          },
          invalid: {
            color: '#fa755a',
            iconColor: '#fa755a',
          },
        },
        hidePostalCode: false,
      });
    }
    return null;
  }

  // Package Plans
  getPackagePlans(): PackagePlan[] {
    return PACKAGE_PLANS;
  }

  getAddonPlans(): AddonPlan[] {
    return ADDON_PLANS;
  }

  getPackageById(packageId: string): PackagePlan | undefined {
    return PACKAGE_PLANS.find(pkg => pkg.id === packageId);
  }

  getAddonById(addonId: string): AddonPlan | undefined {
    return ADDON_PLANS.find(addon => addon.id === addonId);
  }

  // Customer Management
  createCustomer(customerData: { 
    email: string; 
    name: string; 
    userId: string;
    companyId?: string;
    phone?: string;
    address?: any;
  }): Observable<StripeCustomer> {
    return this.http.post<StripeCustomer>(`${this.apiUrl}/customers`, customerData).pipe(
      map(customer => {
        // Update the customers subject
        const currentCustomers = this.customersSubject.value;
        this.customersSubject.next([...currentCustomers, customer]);
        return customer;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getCustomer(customerId: string): Observable<StripeCustomer> {
    return this.http.get<StripeCustomer>(`${this.apiUrl}/customers/${customerId}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  updateCustomer(customerId: string, updateData: Partial<StripeCustomer>): Observable<StripeCustomer> {
    return this.http.put<StripeCustomer>(`${this.apiUrl}/customers/${customerId}`, updateData).pipe(
      map(customer => {
        // Update the customers subject
        const currentCustomers = this.customersSubject.value;
        const updatedCustomers = currentCustomers.map(c => c.id === customerId ? customer : c);
        this.customersSubject.next(updatedCustomers);
        return customer;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  deleteCustomer(customerId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/customers/${customerId}`).pipe(
      map(() => {
        // Update the customers subject
        const currentCustomers = this.customersSubject.value;
        this.customersSubject.next(currentCustomers.filter(c => c.id !== customerId));
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // Subscription Management
  createSubscription(subscriptionData: {
    customerId: string;
    priceId: string;
    paymentMethodId?: string;
    companyId?: string;
    packageType: string;
    addons?: string[];
    trialPeriodDays?: number;
  }): Observable<StripeSubscription> {
    return this.http.post<StripeSubscription>(`${this.apiUrl}/subscriptions`, subscriptionData).pipe(
      map(subscription => {
        // Update the subscriptions subject
        const currentSubscriptions = this.subscriptionsSubject.value;
        this.subscriptionsSubject.next([...currentSubscriptions, subscription]);
        return subscription;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getSubscription(subscriptionId: string): Observable<StripeSubscription> {
    return this.http.get<StripeSubscription>(`${this.apiUrl}/subscriptions/${subscriptionId}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  getSubscriptions(customerId?: string, companyId?: string): Observable<StripeSubscription[]> {
    const params: any = {};
    if (customerId) params.customerId = customerId;
    if (companyId) params.companyId = companyId;

    return this.http.get<StripeSubscription[]>(`${this.apiUrl}/subscriptions`, { params }).pipe(
      map(subscriptions => {
        this.subscriptionsSubject.next(subscriptions);
        return subscriptions;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  updateSubscription(subscriptionId: string, updateData: {
    priceId?: string;
    quantity?: number;
    addons?: string[];
    pauseCollection?: boolean;
  }): Observable<StripeSubscription> {
    return this.http.put<StripeSubscription>(`${this.apiUrl}/subscriptions/${subscriptionId}`, updateData).pipe(
      map(subscription => {
        // Update the subscriptions subject
        const currentSubscriptions = this.subscriptionsSubject.value;
        const updatedSubscriptions = currentSubscriptions.map(s => 
          s.id === subscriptionId ? subscription : s
        );
        this.subscriptionsSubject.next(updatedSubscriptions);
        return subscription;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  cancelSubscription(subscriptionId: string, atPeriodEnd: boolean = true): Observable<StripeSubscription> {
    return this.http.post<StripeSubscription>(`${this.apiUrl}/subscriptions/${subscriptionId}/cancel`, {
      atPeriodEnd
    }).pipe(
      map(subscription => {
        // Update the subscriptions subject
        const currentSubscriptions = this.subscriptionsSubject.value;
        const updatedSubscriptions = currentSubscriptions.map(s => 
          s.id === subscriptionId ? subscription : s
        );
        this.subscriptionsSubject.next(updatedSubscriptions);
        return subscription;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  reactivateSubscription(subscriptionId: string): Observable<StripeSubscription> {
    return this.http.post<StripeSubscription>(`${this.apiUrl}/subscriptions/${subscriptionId}/reactivate`, {}).pipe(
      map(subscription => {
        // Update the subscriptions subject
        const currentSubscriptions = this.subscriptionsSubject.value;
        const updatedSubscriptions = currentSubscriptions.map(s => 
          s.id === subscriptionId ? subscription : s
        );
        this.subscriptionsSubject.next(updatedSubscriptions);
        return subscription;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // Payment Method Management
  async createPaymentMethod(cardElement: StripeCardElement, billingDetails?: any): Promise<any> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const result = await this.stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: billingDetails
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.paymentMethod;
  }

  attachPaymentMethod(paymentMethodId: string, customerId: string): Observable<StripePaymentMethod> {
    return this.http.post<StripePaymentMethod>(`${this.apiUrl}/payment-methods/${paymentMethodId}/attach`, {
      customerId
    }).pipe(
      map(paymentMethod => {
        // Update the payment methods subject
        const currentPaymentMethods = this.paymentMethodsSubject.value;
        this.paymentMethodsSubject.next([...currentPaymentMethods, paymentMethod]);
        return paymentMethod;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getPaymentMethods(customerId: string): Observable<StripePaymentMethod[]> {
    return this.http.get<StripePaymentMethod[]>(`${this.apiUrl}/customers/${customerId}/payment-methods`).pipe(
      map(paymentMethods => {
        this.paymentMethodsSubject.next(paymentMethods);
        return paymentMethods;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  detachPaymentMethod(paymentMethodId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/payment-methods/${paymentMethodId}/detach`, {}).pipe(
      map(() => {
        // Update the payment methods subject
        const currentPaymentMethods = this.paymentMethodsSubject.value;
        this.paymentMethodsSubject.next(currentPaymentMethods.filter(pm => pm.id !== paymentMethodId));
      }),
      catchError(this.handleError.bind(this))
    );
  }

  setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Observable<StripeCustomer> {
    return this.http.post<StripeCustomer>(`${this.apiUrl}/customers/${customerId}/default-payment-method`, {
      paymentMethodId
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Transaction History
  getTransactions(customerId?: string, companyId?: string, limit: number = 50): Observable<StripeTransaction[]> {
    const params: any = { limit };
    if (customerId) params.customerId = customerId;
    if (companyId) params.companyId = companyId;

    return this.http.get<StripeTransaction[]>(`${this.apiUrl}/transactions`, { params }).pipe(
      map(transactions => {
        this.transactionsSubject.next(transactions);
        return transactions;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getTransaction(transactionId: string): Observable<StripeTransaction> {
    return this.http.get<StripeTransaction>(`${this.apiUrl}/transactions/${transactionId}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Invoice Management
  getInvoices(customerId: string, limit: number = 50): Observable<StripeInvoice[]> {
    return this.http.get<StripeInvoice[]>(`${this.apiUrl}/customers/${customerId}/invoices`, {
      params: { limit: limit.toString() }
    }).pipe(
      map(invoices => {
        this.invoicesSubject.next(invoices);
        return invoices;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getInvoice(invoiceId: string): Observable<StripeInvoice> {
    return this.http.get<StripeInvoice>(`${this.apiUrl}/invoices/${invoiceId}`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  downloadInvoice(invoiceId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/invoices/${invoiceId}/pdf`, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Payment Processing
  createPaymentIntent(amount: number, customerId: string, paymentMethodId?: string, metadata?: any): Observable<{ clientSecret: string }> {
    return this.http.post<{ clientSecret: string }>(`${this.apiUrl}/payment-intents`, {
      amount,
      customerId,
      paymentMethodId,
      currency: stripeConfig.currency,
      metadata
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  async confirmPayment(clientSecret: string, paymentMethodId?: string): Promise<any> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const confirmParams: any = {};
    if (paymentMethodId) {
      confirmParams.payment_method = paymentMethodId;
    }

    const result = await this.stripe.confirmCardPayment(clientSecret, confirmParams);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.paymentIntent;
  }

  // Analytics and Reporting
  getBillingAnalytics(customerId: string, dateRange?: { start: Date; end: Date }): Observable<any> {
    const params: any = {};
    if (dateRange) {
      params.startDate = dateRange.start.toISOString();
      params.endDate = dateRange.end.toISOString();
    }

    return this.http.get(`${this.apiUrl}/customers/${customerId}/analytics`, { params }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Webhook handling for real-time updates
  handleWebhookEvent(event: any): void {
    switch (event.type) {
      case 'customer.created':
      case 'customer.updated':
        this.refreshCustomers();
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        this.refreshSubscriptions();
        break;
      case 'payment_method.attached':
      case 'payment_method.detached':
        this.refreshPaymentMethods();
        break;
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        this.refreshTransactions();
        this.refreshInvoices();
        break;
      default:
        console.log('Unhandled webhook event:', event.type);
    }
  }

  private refreshCustomers(): void {
    // Implement refresh logic based on current context
    console.log('Refreshing customers...');
  }

  private refreshSubscriptions(): void {
    // Implement refresh logic based on current context
    console.log('Refreshing subscriptions...');
  }

  private refreshPaymentMethods(): void {
    // Implement refresh logic based on current context
    console.log('Refreshing payment methods...');
  }

  private refreshTransactions(): void {
    // Implement refresh logic based on current context
    console.log('Refreshing transactions...');
  }

  private refreshInvoices(): void {
    // Implement refresh logic based on current context
    console.log('Refreshing invoices...');
  }

  // Utility methods
  formatCurrency(amount: number, currency: string = stripeConfig.currency): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCardBrandIcon(brand: string): string {
    const icons: { [key: string]: string } = {
      'visa': 'fab fa-cc-visa',
      'mastercard': 'fab fa-cc-mastercard',
      'amex': 'fab fa-cc-amex',
      'discover': 'fab fa-cc-discover',
      'diners': 'fab fa-cc-diners-club',
      'jcb': 'fab fa-cc-jcb',
      'unionpay': 'fas fa-credit-card',
      'unknown': 'fas fa-credit-card'
    };
    return icons[brand?.toLowerCase()] || icons['unknown'];
  }

  getSubscriptionStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'active': 'success',
      'trialing': 'info',
      'past_due': 'warning',
      'canceled': 'secondary',
      'unpaid': 'danger',
      'incomplete': 'warning'
    };
    return colors[status] || 'secondary';
  }

  getTransactionStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'succeeded': 'success',
      'pending': 'warning',
      'failed': 'danger',
      'canceled': 'secondary'
    };
    return colors[status] || 'secondary';
  }

  calculateProration(currentPlan: PackagePlan, newPlan: PackagePlan, daysRemaining: number): number {
    const currentMonthlyAmount = currentPlan.price;
    const newMonthlyAmount = newPlan.price;
    const daysInMonth = 30; // Approximate

    const unusedAmount = (currentMonthlyAmount * daysRemaining) / daysInMonth;
    const newPlanAmount = (newMonthlyAmount * daysRemaining) / daysInMonth;

    return Math.round(newPlanAmount - unusedAmount);
  }

  // Error handling helper
  isStripeError(error: any): boolean {
    return error?.type?.startsWith('Stripe') || error?.code?.startsWith('stripe_');
  }

  getStripeErrorMessage(error: any): string {
    if (this.isStripeError(error)) {
      return error.message || 'A payment error occurred';
    }
    return error.message || 'An unexpected error occurred';
  }
}