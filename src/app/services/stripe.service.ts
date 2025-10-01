import { Injectable } from '@angular/core';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { BehaviorSubject, Observable, throwError, of, from } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { initializeApp, getApps } from 'firebase/app';
import { MockStripeFunctionsService } from './mock-stripe-functions.service';
import { environment } from '../../environments/environment';
import {
    stripeConfig,
    stripeEnvironments,
    StripeEnvironment
} from '../config/stripe.config';

export interface StripeProduct {
    id: string;
    name: string;
    description?: string;
    active: boolean;
    metadata: { [key: string]: string };
    created: number;
    updated: number;
}

export interface StripePrice {
    id: string;
    product: string;
    active: boolean;
    currency: string;
    unit_amount: number;
    recurring?: {
        interval: 'day' | 'week' | 'month' | 'year';
        interval_count: number;
    };
    metadata: { [key: string]: string };
    nickname?: string;
}

@Injectable({
    providedIn: 'root'
})
export class StripeService {
    private stripe: Stripe | null = null;

    // Environment management
    private currentEnvironmentSubject = new BehaviorSubject<string>(stripeConfig.defaultEnvironment);
    public currentEnvironment$ = this.currentEnvironmentSubject.asObservable();

    private isLiveModeSubject = new BehaviorSubject<boolean>(false);

    /**
     * Data Loading Strategy: Use this method for billing operations only
     * For normal operations, load from Firebase directly
     */
    public getCustomerWithBillingData(customerId: string): Observable<any> {
        return this.getCustomer(customerId);
    }

    /**
     * Efficient batch loading for admin dashboard
     * Only fetches Stripe data when specifically needed
     */
    public shouldFetchStripeData(operationType: 'view' | 'billing' | 'admin'): boolean {
        return operationType === 'billing' || operationType === 'admin';
    }
    public isLiveMode$ = this.isLiveModeSubject.asObservable();

    // Observable subjects for billing data
    private subscriptionsSubject = new BehaviorSubject<any[]>([]);
    private paymentMethodsSubject = new BehaviorSubject<any[]>([]);
    private transactionsSubject = new BehaviorSubject<any[]>([]);
    private invoicesSubject = new BehaviorSubject<any[]>([]);

    // Observable subjects for products and prices
    private productsSubject = new BehaviorSubject<StripeProduct[]>([]);
    private pricesSubject = new BehaviorSubject<StripePrice[]>([]);

    public subscriptions$ = this.subscriptionsSubject.asObservable();
    public paymentMethods$ = this.paymentMethodsSubject.asObservable();
    public transactions$ = this.transactionsSubject.asObservable();
    public invoices$ = this.invoicesSubject.asObservable();

    // Product and price observables
    public products$ = this.productsSubject.asObservable();
    public prices$ = this.pricesSubject.asObservable();

    // Firebase Functions instance
    private functions = getFunctions(this.getFirebaseApp());

    private getFirebaseApp() {
        // Get the existing Firebase app or create one
        const apps = getApps();
        if (apps.length > 0) {
            return apps[0];
        }

        // If no app exists, initialize with config
        const firebaseConfig = {
            apiKey: "AIzaSyDciq_4bsS_3vDdxElIkvbbMO_j8zC4txo",
            authDomain: "kndl-3663b.firebaseapp.com",
            projectId: "kndl-3663b",
            storageBucket: "kndl-3663b.firebasestorage.app",
            messagingSenderId: "363681629994",
            appId: "1:363681629994:web:5ca220294c3cb0ee3e4053",
            measurementId: "G-CGGZ63SWW1"
        };

        return initializeApp(firebaseConfig);
    }

    constructor(
        private http: HttpClient,
        private mockStripeFunctions: MockStripeFunctionsService
    ) {
        // Connect to Functions emulator only when using mock functions
        if (!environment.production && !environment.useRealFirebaseFunctions) {
            try {
                connectFunctionsEmulator(this.functions, 'localhost', 5001);
                console.log('Connected to Firebase Functions emulator');
            } catch (error) {
                console.log('Functions emulator connection failed (may already be connected):', error);
            }
        } else {
            console.log('Using real Firebase Functions');
        }

        this.initializeStripe(stripeConfig.defaultEnvironment);
    }

    // Helper method to determine if we should use mock functions
    private get useMockFunctions(): boolean {
        return !environment.production && !environment.useRealFirebaseFunctions;
    }

    // Helper method to call Firebase Functions (real or mock)
    private callFunction(functionName: string, data: any): Observable<any> {
        if (this.useMockFunctions) {
            switch (functionName) {
                case 'testStripeConnection':
                    // Simple mock test - always returns success
                    return of({
                        data: {
                            success: true,
                            environment: data.environment || 'test',
                            message: `Mock Stripe ${data.environment || 'test'} connection successful`,
                            productCount: 0
                        }
                    });
                case 'createStripeProduct':
                    return this.mockStripeFunctions.createStripeProduct(data);
                case 'updateStripeProduct':
                    return this.mockStripeFunctions.updateStripeProduct(data);
                case 'getStripeProducts':
                    return this.mockStripeFunctions.getStripeProducts(data);
                case 'createStripePrice':
                    return this.mockStripeFunctions.createStripePrice(data);
                case 'updateStripePrice':
                    return this.mockStripeFunctions.updateStripePrice(data);
                case 'getStripePrices':
                    return this.mockStripeFunctions.getStripePrices(data);
                case 'createStripeProductWithPrice':
                    return this.mockStripeFunctions.createStripeProductWithPrice(data);
                case 'getAllStripeCustomers':
                    // Mock implementation for getAllStripeCustomers
                    return of({
                        data: [
                            {
                                id: 'cus_mock_1',
                                email: 'demo@example.com',
                                name: 'Demo Company',
                                metadata: { companyName: 'Demo Company' },
                                created: Date.now() / 1000
                            },
                            {
                                id: 'cus_mock_2',
                                email: 'test@example.com',
                                name: 'Test Company',
                                metadata: { companyName: 'Test Company' },
                                created: Date.now() / 1000
                            }
                        ]
                    });
                default:
                    return throwError(() => new Error(`Mock function ${functionName} not implemented`));
            }
        } else {
            const func = httpsCallable(this.functions, functionName);
            return from(func(data)).pipe(
                tap((result) => {
                    console.log(`✅ Firebase function ${functionName} successful:`, result);
                }),
                map((result) => {
                    // Firebase callable functions wrap the response in a 'data' property
                    // So if our function returns { success: true, data: [...] }
                    // Firebase wraps it as { data: { success: true, data: [...] } }
                    return result.data || result;
                }),
                catchError((error: any) => {
                    console.error(`❌ Firebase function ${functionName} error:`, error);
                    console.error('Error details:', {
                        code: error.code,
                        message: error.message,
                        details: error.details
                    });
                    return throwError(() => error);
                })
            );
        }
    }

    // Initialize Stripe with specific environment
    private async initializeStripe(environment: string): Promise<void> {
        const env = stripeEnvironments[environment];
        if (!env) {
            throw new Error(`Invalid Stripe environment: ${environment}`);
        }

        // Check HTTPS requirement for live mode
        if (env.mode === 'live' && !this.isHttpsConnection()) {
            throw new Error(
                'Live Stripe.js integrations must use HTTPS. ' +
                'Please deploy your application over HTTPS before using live mode.'
            );
        }

        try {
            this.stripe = await loadStripe(env.publishableKey);
            this.currentEnvironmentSubject.next(environment);
            this.isLiveModeSubject.next(env.mode === 'live');

            console.log(`Stripe initialized in ${env.mode} mode`);

            if (env.mode === 'live') {
                console.warn('🔴 LIVE MODE ACTIVE - Real payments will be processed');
            } else {
                console.log('🧪 TEST MODE ACTIVE - Safe for development');
            }
        } catch (error) {
            console.error('Error initializing Stripe:', error);
            throw error;
        }
    }

    // Check if the current connection is HTTPS
    private isHttpsConnection(): boolean {
        return window.location.protocol === 'https:' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
    }

    // Switch between test and live mode
    async switchEnvironment(environment: 'test' | 'live'): Promise<void> {
        if (!stripeEnvironments[environment]) {
            throw new Error(`Invalid environment: ${environment}`);
        }

        // Additional check for live mode HTTPS requirement
        if (environment === 'live' && !this.isHttpsConnection()) {
            const error = new Error(
                'Cannot switch to live mode: HTTPS required.\n\n' +
                'Live Stripe.js integrations must use HTTPS. Please:\n' +
                '1. Deploy your application over HTTPS, or\n' +
                '2. Use test mode for development\n\n' +
                'Test mode works fine over HTTP for development.'
            );
            console.error(error.message);
            throw error;
        }

        try {
            await this.initializeStripe(environment);
            console.log(`Successfully switched to Stripe ${environment} mode`);
        } catch (error) {
            console.error(`Failed to switch to ${environment} mode:`, error);
            throw error;
        }
    }

    // Get current environment info
    getCurrentEnvironment(): StripeEnvironment {
        const currentEnv = this.currentEnvironmentSubject.value;
        return stripeEnvironments[currentEnv];
    }

    // Check if currently in live mode
    isLiveMode(): boolean {
        return this.isLiveModeSubject.value;
    }

    // Get environment status for dashboard display
    getEnvironmentStatus(): { mode: string; isLive: boolean; keyPreview: string; httpsReady: boolean; connectionInfo: string } {
        const env = this.getCurrentEnvironment();
        const httpsReady = this.isHttpsConnection();

        let connectionInfo = '';
        if (window.location.protocol === 'https:') {
            connectionInfo = 'Secure HTTPS connection - Ready for live mode';
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            connectionInfo = 'Local development - Test mode only';
        } else {
            connectionInfo = 'HTTP connection - Test mode only (HTTPS required for live)';
        }

        return {
            mode: env.mode,
            isLive: env.mode === 'live',
            keyPreview: `${env.publishableKey.substring(0, 12)}...`,
            httpsReady,
            connectionInfo
        };
    }

    // Get Stripe instance
    getStripe(): Stripe | null {
        return this.stripe;
    }

    // PRODUCT MANAGEMENT METHODS

    // Create a product in Stripe
    createProduct(data: {
        name: string;
        description?: string;
        active?: boolean;
        metadata?: { [key: string]: string };
    }): Observable<StripeProduct> {
        // Sanitize the data before sending
        const sanitizedData = this.sanitizeStripeData({
            ...data,
            environment: this.getCurrentEnvironment().mode
        });

        return this.callFunction('createStripeProduct', sanitizedData).pipe(
            map((result: any) => {
                this.loadProducts();
                return result.data as StripeProduct;
            }),
            catchError(this.handleError)
        );
    }

    // Update a product in Stripe
    updateProduct(productId: string, updateData: {
        name?: string;
        description?: string;
        active?: boolean;
        metadata?: { [key: string]: string };
    }): Observable<StripeProduct> {
        const payload = {
            productId,
            ...updateData,
            environment: this.getCurrentEnvironment().mode
        };

        return this.callFunction('updateStripeProduct', payload).pipe(
            map((result: any) => {
                this.loadProducts(); // Refresh products list
                return result.data as StripeProduct;
            }),
            catchError(this.handleError)
        );
    }

    // Archive a product in Stripe (safer than deletion)
    archiveProduct(productId: string): Observable<StripeProduct> {
        return this.updateProduct(productId, { active: false });
    }

    // Get all products
    getProducts(): Observable<StripeProduct[]> {
        return this.products$;
    }

    // Load products from Stripe
    private loadProducts(): void {
        const environment = this.getCurrentEnvironment().mode;

        this.callFunction('getStripeProducts', { environment })
            .pipe(
                map((result: any) => {
                    // Enhanced data extraction logic
                    let extractedData: any;

                    // Priority 1: Double nested data (Firebase functions return {data: {data: [...]}})
                    if (result?.data?.data && Array.isArray(result.data.data)) {
                        extractedData = result.data.data;
                    }
                    // Priority 2: Direct data property (Firebase functions return {data: [...]} structure)
                    else if (result?.data && Array.isArray(result.data)) {
                        extractedData = result.data;
                    }
                    // Priority 3: Result is already an array
                    else if (Array.isArray(result)) {
                        extractedData = result;
                    }
                    // Priority 4: Check if result has a data property that's not an array but contains data
                    else if (result?.data) {
                        extractedData = result.data;
                    }
                    // Priority 5: Use result object directly if it looks like product data
                    else if (result && typeof result === 'object' && result.id) {
                        extractedData = [result]; // Single product wrapped in array
                    }
                    // Priority 6: Default to empty array
                    else {
                        extractedData = [];
                    }

                    // Ensure we always return an array of StripeProduct objects
                    const finalData = Array.isArray(extractedData) ? extractedData as StripeProduct[] : [];

                    return finalData;
                }),
                catchError((error) => {
                    console.error('Error loading products:', error);
                    return of([] as StripeProduct[]);
                })
            )
            .subscribe(products => {
                this.productsSubject.next(products);
            });
    }

    // PRICE MANAGEMENT METHODS

    // Create a price in Stripe
    createPrice(data: {
        productId: string;
        unitAmount: number;
        currency: string;
        nickname?: string;
        recurring?: {
            interval: 'month' | 'year';
            intervalCount?: number;
        };
        metadata?: { [key: string]: string };
    }): Observable<StripePrice> {
        // Sanitize the data before sending
        const sanitizedData = this.sanitizeStripeData({
            ...data,
            environment: this.getCurrentEnvironment().mode
        });

        return this.callFunction('createStripePrice', sanitizedData).pipe(
            map((result: any) => {
                this.loadPrices();
                return result.data as StripePrice;
            }),
            catchError(this.handleError)
        );
    }

    // Update a price in Stripe (limited updates possible)
    updatePrice(priceId: string, updateData: {
        active?: boolean;
        nickname?: string;
        metadata?: { [key: string]: string };
    }): Observable<StripePrice> {
        const payload = {
            priceId,
            ...updateData,
            environment: this.getCurrentEnvironment().mode
        };

        return this.callFunction('updateStripePrice', payload).pipe(
            map((result: any) => {
                this.loadPrices(); // Refresh prices list
                return result.data as StripePrice;
            }),
            catchError(this.handleError)
        );
    }

    // Archive a price in Stripe
    archivePrice(priceId: string): Observable<StripePrice> {
        return this.updatePrice(priceId, { active: false });
    }

    // Get all prices
    getPrices(): Observable<StripePrice[]> {
        return this.prices$;
    }

    // Load prices from Stripe
    private loadPrices(): void {
        const environment = this.getCurrentEnvironment().mode;

        this.callFunction('getStripePrices', { environment })
            .pipe(
                map((result: any) => {
                    // Enhanced data extraction logic
                    let extractedData: any;

                    // Priority 1: Double nested data (Firebase functions return {data: {data: [...]}})
                    if (result?.data?.data && Array.isArray(result.data.data)) {
                        extractedData = result.data.data;
                    }
                    // Priority 2: Direct data property (Firebase functions return {data: [...]} structure)
                    else if (result?.data && Array.isArray(result.data)) {
                        extractedData = result.data;
                    }
                    // Priority 3: Result is already an array
                    else if (Array.isArray(result)) {
                        extractedData = result;
                    }
                    // Priority 4: Check if result has a data property that's not an array but contains data
                    else if (result?.data) {
                        extractedData = result.data;
                    }
                    // Priority 5: Use result object directly if it looks like price data
                    else if (result && typeof result === 'object' && result.id) {
                        extractedData = [result]; // Single price wrapped in array
                    }
                    // Priority 6: Default to empty array
                    else {
                        extractedData = [];
                    }

                    // Ensure we always return an array of StripePrice objects
                    const finalData = Array.isArray(extractedData) ? extractedData as StripePrice[] : [];

                    return finalData;
                }),
                catchError((error) => {
                    console.error('Error loading prices:', error);
                    return of([] as StripePrice[]);
                })
            )
            .subscribe(prices => {
                this.pricesSubject.next(prices);
            });
    }

    // COMBINED OPERATIONS

    // Create product and price together
    createProductWithPrice(data: {
        name: string;
        description?: string;
        unitAmount: number;
        currency: string;
        interval: 'month' | 'year';
        trialDays?: number;
        metadata?: { [key: string]: string };
    }): Observable<{ product: StripeProduct; price: StripePrice }> {
        // Sanitize the data before sending
        const sanitizedData = this.sanitizeStripeData({
            ...data,
            environment: this.getCurrentEnvironment().mode
        });

        return this.callFunction('createStripeProductWithPrice', sanitizedData).pipe(
            map((result: any) => {
                this.loadProducts();
                this.loadPrices();
                return result.data as { product: StripeProduct; price: StripePrice };
            }),
            catchError(this.handleError)
        );
    }

    // Initialize products and prices loading
    initializeProductsAndPrices(): void {
        // Add a small delay to avoid rapid-fire calls
        setTimeout(() => this.loadProducts(), 100);
        setTimeout(() => this.loadPrices(), 300);
    }

    // Debug method to test Firebase functions directly and return raw results
    async debugFirebaseFunctions(): Promise<{ products: any, prices: any }> {
        const environment = this.getCurrentEnvironment().mode;

        try {
            const productsResult = await this.callFunction('getStripeProducts', { environment }).toPromise();
            const pricesResult = await this.callFunction('getStripePrices', { environment }).toPromise();

            return {
                products: productsResult,
                prices: pricesResult
            };
        } catch (error) {
            console.error('Error in debug Firebase functions:', error);
            throw error;
        }
    }

    // Manual method to force re-process Firebase function data
    async forceDataRefresh(): Promise<void> {
        try {
            const results = await this.debugFirebaseFunctions();

            // Manually process products
            const products = this.extractProductsFromResult(results.products);
            this.productsSubject.next(products);

            // Manually process prices  
            const prices = this.extractPricesFromResult(results.prices);
            this.pricesSubject.next(prices);

        } catch (error) {
            console.error('Error in force data refresh:', error);
        }
    }

    // Helper method to extract products from Firebase result
    private extractProductsFromResult(result: any): StripeProduct[] {
        // Try different extraction methods with double nested support
        let data;

        // Priority 1: Double nested data (Firebase functions return {data: {data: [...]}})
        if (result?.data?.data && Array.isArray(result.data.data)) {
            data = result.data.data;
        }
        // Priority 2: Single nested data
        else if (result?.data && Array.isArray(result.data)) {
            data = result.data;
        }
        // Priority 3: Direct array
        else if (Array.isArray(result)) {
            data = result;
        }
        // Priority 4: Object exploration
        else if (result && typeof result === 'object') {
            // Check if the result itself contains product-like objects
            if (result.id && result.name) {
                data = [result]; // Single product
            } else {
                // Maybe it's wrapped in another property
                const keys = Object.keys(result);
                for (const key of keys) {
                    if (Array.isArray(result[key])) {
                        data = result[key];
                        break;
                    }
                    // Check nested objects for arrays
                    else if (result[key] && typeof result[key] === 'object') {
                        const nestedKeys = Object.keys(result[key]);
                        for (const nestedKey of nestedKeys) {
                            if (Array.isArray(result[key][nestedKey])) {
                                data = result[key][nestedKey];
                                break;
                            }
                        }
                        if (data) break;
                    }
                }
            }
        }

        return Array.isArray(data) ? data as StripeProduct[] : [];
    }

    // Helper method to extract prices from Firebase result
    private extractPricesFromResult(result: any): StripePrice[] {
        // Try different extraction methods with double nested support
        let data;

        // Priority 1: Double nested data (Firebase functions return {data: {data: [...]}})
        if (result?.data?.data && Array.isArray(result.data.data)) {
            data = result.data.data;
        }
        // Priority 2: Single nested data
        else if (result?.data && Array.isArray(result.data)) {
            data = result.data;
        }
        // Priority 3: Direct array
        else if (Array.isArray(result)) {
            data = result;
        }
        // Priority 4: Object exploration
        else if (result && typeof result === 'object') {
            // Check if the result itself contains price-like objects
            if (result.id && result.unit_amount !== undefined) {
                data = [result]; // Single price
            } else {
                // Maybe it's wrapped in another property
                const keys = Object.keys(result);
                for (const key of keys) {
                    if (Array.isArray(result[key])) {
                        data = result[key];
                        break;
                    }
                    // Check nested objects for arrays
                    else if (result[key] && typeof result[key] === 'object') {
                        const nestedKeys = Object.keys(result[key]);
                        for (const nestedKey of nestedKeys) {
                            if (Array.isArray(result[key][nestedKey])) {
                                data = result[key][nestedKey];
                                break;
                            }
                        }
                        if (data) break;
                    }
                }
            }
        }

        return Array.isArray(data) ? data as StripePrice[] : [];
    }

    // Test Stripe connection
    testStripeConnection(environment?: string): Observable<any> {
        const env = environment || this.getCurrentEnvironment().mode;
        return this.callFunction('testStripeConnection', { environment: env }).pipe(
            catchError(this.handleError)
        );
    }

    // Sanitize data before sending to Stripe
    private sanitizeStripeData(data: any): any {
        const sanitized = { ...data };

        // Remove empty strings and replace with undefined
        Object.keys(sanitized).forEach(key => {
            if (typeof sanitized[key] === 'string' && sanitized[key].trim() === '') {
                delete sanitized[key];
            }

            // Handle nested objects (like metadata)
            if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
                Object.keys(sanitized[key]).forEach(nestedKey => {
                    if (typeof sanitized[key][nestedKey] === 'string' && sanitized[key][nestedKey].trim() === '') {
                        delete sanitized[key][nestedKey];
                    }
                });
            }
        });

        // Special handling for trialDays - ensure it's a valid number or remove it
        if ('trialDays' in sanitized) {
            if (!sanitized.trialDays || typeof sanitized.trialDays !== 'number' || sanitized.trialDays <= 0) {
                delete sanitized.trialDays;
            }
        }

        return sanitized;
    }

    // Validate Stripe data before submission
    validateStripeProductData(data: {
        name: string;
        description?: string;
        unitAmount?: number;
        currency?: string;
        interval?: string;
    }): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Required fields
        if (!data.name || data.name.trim() === '') {
            errors.push('Product name is required');
        }

        if (data.unitAmount !== undefined) {
            if (!data.unitAmount || typeof data.unitAmount !== 'number' || data.unitAmount <= 0) {
                errors.push('Unit amount must be a positive number');
            } else if (data.unitAmount > 99999999) {
                errors.push('Unit amount cannot exceed $999,999.99 (Stripe limit)');
            }
        }

        if (data.currency && !['usd', 'eur', 'gbp', 'cad', 'aud'].includes(data.currency.toLowerCase())) {
            errors.push('Currency must be a supported currency code (usd, eur, gbp, cad, aud)');
        }

        if (data.interval && !['month', 'year'].includes(data.interval)) {
            errors.push('Interval must be either "month" or "year"');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Helper method to clean data before Stripe submission
    cleanStripeData(data: any): any {
        return this.sanitizeStripeData(data);
    }

    // Placeholder methods for billing component compatibility
    getPackagePlans(): any[] {
        return [];
    }

    getAddonPlans(): any[] {
        return [];
    }

    // Enhanced customer management methods
    createCustomer(data: {
        name: string;
        email: string;
        phone?: string;
        companyId?: string;
        metadata?: Record<string, string>;
    }): Observable<any> {
        if (!environment.production && !environment.useRealStripe) {
            // Return mock data for development
            return of({
                id: `cus_${Date.now()}`,
                email: data.email,
                name: data.name,
                phone: data.phone,
                metadata: {
                    companyId: data.companyId || '',
                    ...data.metadata
                },
                created: Date.now() / 1000,
                object: 'customer'
            });
        }

        const createCustomerFunction = httpsCallable(this.functions, 'createStripeCustomer');
        return from(createCustomerFunction({
            ...data,
            environment: environment.useRealStripe ? 'live' : 'test'
        })).pipe(
            map((result: any) => result.data),
            catchError(this.handleError)
        );
    }

    getCustomer(customerId: string): Observable<any> {
        if (!customerId || customerId === 'undefined' || customerId.trim() === '') {
            console.error('🚫 STRIPE SERVICE DEBUG: Customer ID is required for getCustomer. Received:', customerId);
            return of(null);
        }

        console.log('🔍 STRIPE SERVICE DEBUG: getCustomer called', {
            customerId,
            environment: environment.production ? 'PRODUCTION' : 'DEVELOPMENT',
            useRealStripe: environment.useRealStripe,
            willUseMock: !environment.production && !environment.useRealStripe
        });

        if (!environment.production && !environment.useRealStripe) {
            console.log('📝 STRIPE SERVICE DEBUG: Returning mock data');
            // Return mock data for development
            return of({
                id: customerId,
                email: 'company@example.com',
                name: 'Company Name',
                metadata: { companyId: '1' },
                created: Date.now() / 1000,
                object: 'customer'
            });
        }

        console.log('🚀 STRIPE SERVICE DEBUG: Making real Stripe API call via Firebase Function');
        const getCustomerFunction = httpsCallable(this.functions, 'getStripeCustomer');
        return from(getCustomerFunction({
            customerId,
            environment: environment.useRealStripe ? 'live' : 'test'
        })).pipe(
            map((result: any) => {
                console.log('✅ STRIPE SERVICE DEBUG: API call successful', {
                    customerId,
                    resultData: result.data,
                    customerExists: !!result.data
                });
                return result.data;
            }),
            catchError((error) => {
                console.error('❌ STRIPE SERVICE DEBUG: API call failed', {
                    customerId,
                    error: error.message,
                    errorCode: error.code,
                    errorType: error.type,
                    fullError: error
                });
                return this.handleError(error);
            })
        );
    }

    getAllCustomers(limit: number = 100, startingAfter?: string): Observable<any[]> {
        console.log('🔍 STRIPE SERVICE DEBUG: getAllCustomers called', {
            limit,
            startingAfter,
            environment: environment.production ? 'production' : 'development',
            useRealStripe: environment.useRealStripe
        });

        if (!environment.useRealStripe) {
            // Return mock data for development
            const mockCustomers = [
                {
                    id: 'cus_mock_1',
                    email: 'test1@example.com',
                    name: 'Test Customer 1',
                    created: Math.floor(Date.now() / 1000) - 86400,
                    description: 'Mock customer for development'
                },
                {
                    id: 'cus_mock_2',
                    email: 'test2@example.com',
                    name: 'Test Customer 2',
                    created: Math.floor(Date.now() / 1000) - 172800,
                    description: 'Another mock customer'
                }
            ];
            console.log('🔍 STRIPE SERVICE DEBUG: Returning mock customers', mockCustomers);
            return of(mockCustomers);
        }

        const getAllCustomersFunction = httpsCallable(this.functions, 'getAllStripeCustomers');
        return from(getAllCustomersFunction({
            limit,
            startingAfter,
            environment: environment.useRealStripe ? 'live' : 'test'
        })).pipe(
            tap((result: any) => {
                console.log('🔍 STRIPE SERVICE DEBUG: getAllCustomers API response', {
                    success: result.data?.success,
                    customerCount: result.data?.count,
                    hasMore: result.data?.hasMore
                });
            }),
            map((result: any) => {
                console.log('✅ STRIPE SERVICE DEBUG: Successfully retrieved customers', {
                    customerCount: result.data?.data?.length || 0,
                    customers: result.data?.data
                });
                return result.data?.data || [];
            }),
            catchError((error) => {
                console.error('❌ STRIPE SERVICE DEBUG: getAllCustomers failed', {
                    error: error.message,
                    errorCode: error.code,
                    errorType: error.type,
                    fullError: error
                });
                return this.handleError(error);
            })
        );
    }

    updateCustomer(customerId: string, data: {
        name?: string;
        email?: string;
        phone?: string;
        metadata?: Record<string, string>;
    }): Observable<any> {
        if (environment.production === false) {
            // Return mock data for development
            return of({
                id: customerId,
                ...data,
                updated: Date.now() / 1000
            });
        }

        const updateCustomerFunction = httpsCallable(this.functions, 'updateStripeCustomer');
        return from(updateCustomerFunction({ customerId, ...data })).pipe(
            map((result: any) => result.data),
            catchError(this.handleError)
        );
    }

    deleteCustomer(customerId: string): Observable<any> {
        if (environment.production === false) {
            // Return mock success for development
            return of({ deleted: true, id: customerId });
        }

        const deleteCustomerFunction = httpsCallable(this.functions, 'deleteStripeCustomer');
        return from(deleteCustomerFunction({ customerId })).pipe(
            map((result: any) => result.data),
            catchError(this.handleError)
        );
    }

    getSubscriptions(customerId: string): Observable<any[]> {
        if (!customerId || customerId === 'undefined' || customerId.trim() === '') {
            console.error('🚫 STRIPE SERVICE DEBUG: Customer ID is required for getSubscriptions. Received:', customerId);
            return of([]);
        }

        console.log('🔍 STRIPE SERVICE DEBUG: Getting subscriptions for customer:', customerId);
        if (!environment.production && !environment.useRealStripe) {
            // Return mock subscription data for development
            return of([
                {
                    id: `sub_${Date.now()}`,
                    customer: customerId,
                    status: 'active',
                    current_period_start: Date.now() / 1000,
                    current_period_end: (Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
                    items: {
                        data: [{
                            price: {
                                id: 'price_example',
                                unit_amount: 7900, // $79.00
                                currency: 'usd',
                                recurring: { interval: 'month' }
                            }
                        }]
                    },
                    metadata: {}
                }
            ]);
        }

        const getSubscriptionsFunction = httpsCallable(this.functions, 'getCustomerSubscriptions');
        return from(getSubscriptionsFunction({
            customerId: customerId,
            environment: environment.useRealStripe ? 'live' : 'test'
        })).pipe(
            map((result: any) => {
                console.log('🔍 SUBSCRIPTION SERVICE DEBUG: getSubscriptions result:', result);
                console.log('🔍 SUBSCRIPTION SERVICE DEBUG: result.data:', result.data);
                console.log('🔍 SUBSCRIPTION SERVICE DEBUG: result.data?.data:', result.data?.data);
                return result.data?.data || [];
            }),
            catchError(this.handleError)
        );
    }

    getPaymentMethods(customerId: string): Observable<any[]> {
        if (!customerId || customerId === 'undefined' || customerId.trim() === '') {
            console.error('🚫 STRIPE SERVICE DEBUG: Customer ID is required for getPaymentMethods. Received:', customerId);
            return of([]);
        }

        console.log('🔍 STRIPE SERVICE DEBUG: Getting payment methods for customer:', customerId);

        const getPaymentMethodsFunction = httpsCallable(this.functions, 'getStripePaymentMethods');
        return from(getPaymentMethodsFunction({
            customerId: customerId,
            environment: this.currentEnvironmentSubject.value
        })).pipe(
            map((result: any) => {
                console.log('Payment methods result:', result);
                console.log('Result.data:', result?.data);
                console.log('Result.data.data:', result?.data?.data);

                // Firebase callable functions wrap the response in result.data
                // Our function returns { data: paymentMethods }, so we need result.data.data
                const paymentMethods = result?.data?.data || result?.data || [];
                console.log('Final payment methods array:', paymentMethods);

                return paymentMethods;
            }),
            catchError((error) => {
                console.error('Error getting payment methods:', error);
                return of([]);
            })
        );
    }

    getTransactions(customerId: string): Observable<any[]> {
        if (!customerId || customerId === 'undefined' || customerId.trim() === '') {
            console.error('🚫 STRIPE SERVICE DEBUG: Customer ID is required for getTransactions. Received:', customerId);
            return of([]);
        }
        
        console.log('🔍 STRIPE SERVICE DEBUG: Getting transactions for customer:', customerId);
        // Currently returns empty array - can be implemented later
        return of([]);
    }

    getInvoices(customerId: string): Observable<any[]> {
        if (!customerId || customerId === 'undefined' || customerId.trim() === '') {
            console.error('🚫 STRIPE SERVICE DEBUG: Customer ID is required for getInvoices. Received:', customerId);
            return of([]);
        }

        console.log('🔍 STRIPE SERVICE DEBUG: getInvoices called', { customerId });

        const getInvoicesFunction = httpsCallable(this.functions, 'getCustomerInvoices');
        return from(getInvoicesFunction({
            customerId: customerId,
            environment: environment.useRealStripe ? 'live' : 'test'
        })).pipe(
            map((result: any) => {
                console.log('✅ STRIPE SERVICE DEBUG: getInvoices response', result.data);
                return Array.isArray(result.data) ? result.data : [];
            }),
            catchError(error => {
                console.error('❌ STRIPE SERVICE DEBUG: getInvoices error', error);
                return of([]);
            })
        );
    }

    getBillingAnalytics(customerId: string): Observable<any> {
        return of({});
    }

    getDefaultPaymentMethod(customerId: string): Observable<any> {
        console.log('Getting default payment method for customer:', customerId);

        if (!environment.production && !environment.useRealStripe) {
            // Return mock default payment method for development
            return of({
                id: `pm_mock_default_${Date.now()}`,
                type: 'card',
                card: {
                    brand: 'visa',
                    last4: '4242',
                    exp_month: 12,
                    exp_year: 2025
                },
                customer: customerId,
                created: Date.now() / 1000,
                is_default: true
            });
        }

        const getDefaultPaymentMethodFunction = httpsCallable(this.functions, 'getDefaultPaymentMethod');
        return from(getDefaultPaymentMethodFunction({
            customerId: customerId,
            environment: environment.useRealStripe ? 'live' : 'test'
        })).pipe(
            map((result: any) => {
                console.log('🔍 DEFAULT PAYMENT METHOD DEBUG: result:', result);
                console.log('🔍 DEFAULT PAYMENT METHOD DEBUG: result.data:', result.data);
                return result.data;
            }),
            catchError((error) => {
                console.error('❌ Error getting default payment method:', error);
                return of(null); // Return null if no default payment method exists
            })
        );
    }

    hasDefaultPaymentMethod(customerId: string): Observable<boolean> {
        return this.getDefaultPaymentMethod(customerId).pipe(
            map((paymentMethod) => !!paymentMethod),
            catchError(() => of(false))
        );
    }

    // Helper method to get customer with their default payment method included
    getCustomerWithDefaultPaymentMethod(customerId: string): Observable<any> {
        return this.getCustomer(customerId).pipe(
            switchMap((customer) => {
                if (!customer) {
                    return of(null);
                }

                return this.getDefaultPaymentMethod(customerId).pipe(
                    map((defaultPaymentMethod) => ({
                        ...customer,
                        defaultPaymentMethod
                    })),
                    catchError(() => of({
                        ...customer,
                        defaultPaymentMethod: null
                    }))
                );
            })
        );
    }

    createCardElement(): Promise<any> {
        return Promise.resolve({});
    }

    createPaymentMethod(cardElement: any, data: any): Promise<any> {
        // For now, return a placeholder - this needs proper Stripe Elements integration
        // In production, this would use Stripe.js to create payment methods client-side
        console.warn('createPaymentMethod is using mock data - implement Stripe Elements integration');
        return Promise.resolve({ id: 'pm_placeholder_' + Date.now() });
    }

    createStripePaymentMethod(paymentMethodData: any): Observable<any> {
        if (!environment.production && !environment.useRealStripe) {
            // Return mock payment method for development
            return of({
                id: `pm_mock_${Date.now()}`,
                type: paymentMethodData.type || 'card',
                created: Date.now() / 1000,
                customer: null
            });
        }

        const createPaymentMethodFunction = httpsCallable(this.functions, 'createStripePaymentMethod');
        return from(createPaymentMethodFunction({
            ...paymentMethodData,
            environment: environment.useRealStripe ? 'live' : 'test'
        })).pipe(
            map((result: any) => result.data),
            catchError(this.handleError)
        );
    }

    attachPaymentMethod(paymentMethodId: string, customerId: string): Observable<any> {
        if (!environment.production && !environment.useRealStripe) {
            // Return mock response for development
            return of({
                id: paymentMethodId,
                customer: customerId,
                attached: true
            });
        }

        const attachPaymentMethodFunction = httpsCallable(this.functions, 'attachStripePaymentMethod');
        return from(attachPaymentMethodFunction({
            paymentMethodId: paymentMethodId,
            customerId: customerId,
            environment: environment.useRealStripe ? 'live' : 'test'
        })).pipe(
            map((result: any) => result.data),
            catchError(this.handleError)
        );
    }

    detachPaymentMethod(paymentMethodId: string): Observable<any> {
        if (!environment.production && !environment.useRealStripe) {
            // Return mock response for development
            return of({
                id: paymentMethodId,
                detached: true
            });
        }

        const detachPaymentMethodFunction = httpsCallable(this.functions, 'detachStripePaymentMethod');
        return from(detachPaymentMethodFunction({
            paymentMethodId: paymentMethodId,
            environment: environment.useRealStripe ? 'live' : 'test'
        })).pipe(
            map((result: any) => result.data),
            catchError(this.handleError)
        );
    }

    setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Observable<any> {
        if (!environment.production && !environment.useRealStripe) {
            // Return mock response for development
            return of({
                id: customerId,
                invoice_settings: {
                    default_payment_method: paymentMethodId
                }
            });
        }

        const setDefaultPaymentMethodFunction = httpsCallable(this.functions, 'setDefaultStripePaymentMethod');
        return from(setDefaultPaymentMethodFunction({
            customerId: customerId,
            paymentMethodId: paymentMethodId,
            environment: environment.useRealStripe ? 'live' : 'test'
        })).pipe(
            map((result: any) => result.data),
            catchError(this.handleError)
        );
    }


    createSubscription(data: {
        customerId: string;
        priceId: string;
        paymentMethodId?: string;
        trialPeriodDays?: number;
        metadata?: Record<string, string>;
    }): Observable<any> {
        if (!environment.production && !environment.useRealStripe) {
            // Return mock subscription for development
            return of({
                id: `sub_${Date.now()}`,
                customer: data.customerId,
                status: 'active',
                current_period_start: Date.now() / 1000,
                current_period_end: (Date.now() / 1000) + (30 * 24 * 60 * 60),
                items: {
                    data: [{
                        price: {
                            id: data.priceId,
                            unit_amount: 7900,
                            currency: 'usd',
                            recurring: { interval: 'month' }
                        }
                    }]
                },
                metadata: data.metadata || {}
            });
        }

        const createSubscriptionFunction = httpsCallable(this.functions, 'createStripeSubscription');
        return from(createSubscriptionFunction({
            ...data,
            environment: environment.useRealStripe ? 'live' : 'test'
        })).pipe(
            map((result: any) => {
                console.log('=== STRIPE SERVICE DEBUG ===');
                console.log('Raw Firebase callable result:', result);
                console.log('result.data:', result.data);
                console.log('result.data type:', typeof result.data);
                if (result.data) {
                    console.log('result.data keys:', Object.keys(result.data));
                    console.log('result.data.id:', result.data.id);
                    console.log('result.data stringified:', JSON.stringify(result.data, null, 2));
                }
                console.log('=== END STRIPE SERVICE DEBUG ===');
                return result.data;
            }),
            catchError(this.handleError)
        );
    }

    updateSubscription(subscriptionId: string, data: {
        priceId?: string;
        quantity?: number;
        metadata?: Record<string, string>;
        prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
    }): Observable<any> {
        if (environment.production === false) {
            // Return mock updated subscription for development
            return of({
                id: subscriptionId,
                ...data,
                updated: Date.now() / 1000
            });
        }

        const updateSubscriptionFunction = httpsCallable(this.functions, 'updateStripeSubscription');
        return from(updateSubscriptionFunction({ subscriptionId, ...data })).pipe(
            map((result: any) => result.data),
            catchError(this.handleError)
        );
    }

    cancelSubscription(subscriptionId: string, atPeriodEnd: boolean = true): Observable<any> {
        if (environment.production === false) {
            // Return mock cancelled subscription for development
            return of({
                id: subscriptionId,
                status: atPeriodEnd ? 'active' : 'canceled',
                cancel_at_period_end: atPeriodEnd,
                canceled_at: atPeriodEnd ? null : Date.now() / 1000
            });
        }

        const cancelSubscriptionFunction = httpsCallable(this.functions, 'cancelStripeSubscription');
        return from(cancelSubscriptionFunction({ subscriptionId, atPeriodEnd })).pipe(
            map((result: any) => result.data),
            catchError(this.handleError)
        );
    }

    reactivateSubscription(subscriptionId: string): Observable<any> {
        if (environment.production === false) {
            // Return mock reactivated subscription for development
            return of({
                id: subscriptionId,
                status: 'active',
                cancel_at_period_end: false,
                canceled_at: null
            });
        }

        const reactivateSubscriptionFunction = httpsCallable(this.functions, 'reactivateStripeSubscription');
        return from(reactivateSubscriptionFunction({ subscriptionId })).pipe(
            map((result: any) => result.data),
            catchError(this.handleError)
        );
    }

    downloadInvoice(invoiceId: string): Observable<Blob> {
        return of(new Blob());
    }

    formatCurrency(amount: number, currency?: string): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || stripeConfig.currency.toUpperCase(),
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
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
            visa: 'fab fa-cc-visa',
            mastercard: 'fab fa-cc-mastercard',
            amex: 'fab fa-cc-amex',
            discover: 'fab fa-cc-discover',
            diners: 'fab fa-cc-diners-club',
            jcb: 'fab fa-cc-jcb',
            unionpay: 'fas fa-credit-card'
        };
        return icons[brand.toLowerCase()] || 'fas fa-credit-card';
    }

    getSubscriptionStatusColor(status: string): string {
        const colors: { [key: string]: string } = {
            active: 'success',
            trialing: 'info',
            past_due: 'warning',
            canceled: 'secondary',
            unpaid: 'danger',
            incomplete: 'warning'
        };
        return colors[status] || 'secondary';
    }

    getTransactionStatusColor(status: string): string {
        const colors: { [key: string]: string } = {
            succeeded: 'success',
            pending: 'warning',
            failed: 'danger',
            canceled: 'secondary'
        };
        return colors[status] || 'secondary';
    }

    getStripeErrorMessage(error: any): string {
        if (error && error.type && error.type.startsWith('Stripe')) {
            return error.message || 'A payment error occurred';
        }
        return error.message || 'An unexpected error occurred';
    }

    // Get all Stripe customers with pagination
    getAllStripeCustomers(limit: number = 100, startingAfter?: string): Observable<any> {
        const functionName = 'getAllStripeCustomers';
        const data: any = { limit };

        // Only include startingAfter if it has a value
        if (startingAfter && startingAfter.trim() !== '') {
            data.startingAfter = startingAfter;
        }

        return this.callFunction(functionName, data);
    }

    // Search Stripe customers by email or name
    searchStripeCustomers(query: string, limit: number = 50): Observable<any> {
        const functionName = 'searchStripeCustomers';
        const data = { query, limit };

        return this.callFunction(functionName, data);
    }

    // Basic error handling
    private handleError(error: HttpErrorResponse): Observable<never> {
        console.error('Stripe service error:', error);
        return throwError(() => error);
    }
}