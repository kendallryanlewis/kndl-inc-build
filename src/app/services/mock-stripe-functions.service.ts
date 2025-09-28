import { Injectable } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';

export interface MockStripeProduct {
    id: string;
    name: string;
    description?: string;
    active: boolean;
    metadata: { [key: string]: string };
    created: number;
    updated: number;
}

export interface MockStripePrice {
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
export class MockStripeFunctionsService {
    private products: MockStripeProduct[] = [];
    private prices: MockStripePrice[] = [];

    constructor() {
        // Initialize with some sample subscription plans for development
        this.initializeSampleData();
    }

    private initializeSampleData(): void {
        console.log('🧪 MOCK: Initializing sample subscription data...');

        // Sample Starter Plan
        const starterProduct: MockStripeProduct = {
            id: 'prod_sample_starter',
            name: 'Starter Plan',
            description: 'Perfect for small businesses getting started',
            active: true,
            metadata: {
                features: JSON.stringify(['5 Projects', 'Basic Support', '10GB Storage']),
                isPopular: 'false',
                maxUsers: '5',
                storageLimit: '10GB',
                supportLevel: 'Basic',
                trialDays: '14',
                category: 'Starter'
            },
            created: Date.now() - 86400000, // 1 day ago
            updated: Date.now() - 86400000
        };

        const starterPrice: MockStripePrice = {
            id: 'price_sample_starter_monthly',
            product: starterProduct.id,
            active: true,
            currency: 'usd',
            unit_amount: 2900, // $29.00
            recurring: {
                interval: 'month',
                interval_count: 1
            },
            nickname: 'Starter Plan - Monthly',
            metadata: {}
        };

        // Sample Business Plan
        const businessProduct: MockStripeProduct = {
            id: 'prod_sample_business',
            name: 'Business Plan',
            description: 'Ideal for growing businesses with advanced features',
            active: true,
            metadata: {
                features: JSON.stringify(['Unlimited Projects', 'Priority Support', '100GB Storage', 'Advanced Analytics']),
                isPopular: 'true',
                maxUsers: '25',
                storageLimit: '100GB',
                supportLevel: 'Priority',
                trialDays: '14',
                category: 'Business'
            },
            created: Date.now() - 172800000, // 2 days ago
            updated: Date.now() - 86400000
        };

        const businessPrice: MockStripePrice = {
            id: 'price_sample_business_monthly',
            product: businessProduct.id,
            active: true,
            currency: 'usd',
            unit_amount: 7900, // $79.00
            recurring: {
                interval: 'month',
                interval_count: 1
            },
            nickname: 'Business Plan - Monthly',
            metadata: {}
        };

        // Sample Enterprise Plan
        const enterpriseProduct: MockStripeProduct = {
            id: 'prod_sample_enterprise',
            name: 'Enterprise Plan',
            description: 'For large organizations requiring maximum scalability',
            active: true,
            metadata: {
                features: JSON.stringify(['Unlimited Everything', 'Premium Support', '1TB Storage', 'Custom Integration', 'Dedicated Manager']),
                isPopular: 'false',
                maxUsers: '500',
                storageLimit: '1TB',
                supportLevel: 'Premium',
                trialDays: '30',
                category: 'Enterprise'
            },
            created: Date.now() - 259200000, // 3 days ago
            updated: Date.now() - 172800000
        };

        const enterprisePrice: MockStripePrice = {
            id: 'price_sample_enterprise_monthly',
            product: enterpriseProduct.id,
            active: true,
            currency: 'usd',
            unit_amount: 19900, // $199.00
            recurring: {
                interval: 'month',
                interval_count: 1
            },
            nickname: 'Enterprise Plan - Monthly',
            metadata: {}
        };

        // Add to arrays
        this.products = [starterProduct, businessProduct, enterpriseProduct];
        this.prices = [starterPrice, businessPrice, enterprisePrice];

        console.log('🧪 MOCK: Sample data initialized with', this.products.length, 'products and', this.prices.length, 'prices');
    }

    // Mock Firebase Functions calls for development
    createStripeProduct(data: any): Observable<{ data: MockStripeProduct }> {
        console.log('🧪 MOCK: Creating Stripe product:', data);

        const product: MockStripeProduct = {
            id: `prod_mock_${Date.now()}`,
            name: data.name,
            description: data.description || '',
            active: data.active !== false,
            metadata: data.metadata || {},
            created: Date.now(),
            updated: Date.now()
        };

        this.products.push(product);

        return of({ data: product }).pipe(delay(1000)); // Simulate network delay
    }

    updateStripeProduct(data: any): Observable<{ data: MockStripeProduct }> {
        console.log('🧪 MOCK: Updating Stripe product:', data);

        const productIndex = this.products.findIndex(p => p.id === data.productId);
        if (productIndex === -1) {
            return throwError(() => new Error('Product not found'));
        }

        const product = this.products[productIndex];
        if (data.name) product.name = data.name;
        if (data.description !== undefined) product.description = data.description;
        if (data.active !== undefined) product.active = data.active;
        if (data.metadata) product.metadata = { ...product.metadata, ...data.metadata };
        product.updated = Date.now();

        return of({ data: product }).pipe(delay(500));
    }

    getStripeProducts(data: any): Observable<{ data: MockStripeProduct[] }> {
        console.log('🧪 MOCK: Getting Stripe products for environment:', data.environment);

        const filteredProducts = this.products.filter(p =>
            data.active === undefined || p.active === data.active
        );

        return of({ data: filteredProducts }).pipe(delay(300));
    }

    createStripePrice(data: any): Observable<{ data: MockStripePrice }> {
        console.log('🧪 MOCK: Creating Stripe price:', data);

        const price: MockStripePrice = {
            id: `price_mock_${Date.now()}`,
            product: data.productId,
            active: true,
            currency: data.currency || 'usd',
            unit_amount: data.unitAmount,
            recurring: data.recurring,
            nickname: data.nickname,
            metadata: data.metadata || {}
        };

        this.prices.push(price);

        return of({ data: price }).pipe(delay(800));
    }

    updateStripePrice(data: any): Observable<{ data: MockStripePrice }> {
        console.log('🧪 MOCK: Updating Stripe price:', data);

        const priceIndex = this.prices.findIndex(p => p.id === data.priceId);
        if (priceIndex === -1) {
            return throwError(() => new Error('Price not found'));
        }

        const price = this.prices[priceIndex];
        if (data.active !== undefined) price.active = data.active;
        if (data.nickname !== undefined) price.nickname = data.nickname;
        if (data.metadata) price.metadata = { ...price.metadata, ...data.metadata };

        return of({ data: price }).pipe(delay(500));
    }

    getStripePrices(data: any): Observable<{ data: MockStripePrice[] }> {
        console.log('🧪 MOCK: Getting Stripe prices for environment:', data.environment);

        const filteredPrices = this.prices.filter(p =>
            data.active === undefined || p.active === data.active
        );

        return of({ data: filteredPrices }).pipe(delay(300));
    }

    createStripeProductWithPrice(data: any): Observable<{ data: { product: MockStripeProduct; price: MockStripePrice } }> {
        console.log('🧪 MOCK: Creating Stripe product with price:', data);

        const product: MockStripeProduct = {
            id: `prod_mock_${Date.now()}`,
            name: data.name,
            description: data.description || '',
            active: true,
            metadata: data.metadata || {},
            created: Date.now(),
            updated: Date.now()
        };

        const price: MockStripePrice = {
            id: `price_mock_${Date.now() + 1}`,
            product: product.id,
            active: true,
            currency: data.currency || 'usd',
            unit_amount: data.unitAmount,
            recurring: {
                interval: data.interval || 'month',
                interval_count: 1
            },
            nickname: `${data.name} - ${data.interval || 'month'}ly`,
            metadata: data.metadata || {}
        };

        this.products.push(product);
        this.prices.push(price);

        return of({ data: { product, price } }).pipe(delay(1500));
    }

    // Utility methods
    clearMockData(): void {
        this.products = [];
        this.prices = [];
        console.log('🧪 MOCK: Cleared all mock Stripe data');
    }

    getMockData(): { products: MockStripeProduct[]; prices: MockStripePrice[] } {
        return {
            products: [...this.products],
            prices: [...this.prices]
        };
    }
}