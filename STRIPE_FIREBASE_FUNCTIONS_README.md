# Comprehensive Stripe Firebase Functions Documentation

## Overview

This documentation covers all Firebase Cloud Functions for Stripe integration in the KNDL Inc application. The functions provide a complete interface to Stripe's API, supporting both test and live environments with comprehensive error handling and logging.

## Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Environment Management](#environment-management)
3. [Function Categories](#function-categories)
4. [API Reference](#api-reference)
5. [Usage Examples](#usage-examples)
6. [Error Handling](#error-handling)
7. [Testing](#testing)
8. [Deployment](#deployment)

## Setup & Configuration

### Prerequisites

- Firebase CLI installed
- Node.js 18+ 
- Valid Stripe API keys (test and live)
- Firebase project configured

### Environment Variables

Create a `.env` file in the `functions/` directory:

```env
STRIPE_TEST_SECRET_KEY=sk_test_your_test_key_here
STRIPE_LIVE_SECRET_KEY=sk_live_your_live_key_here
```

### Installation

```bash
cd functions
npm install
```

### Local Development

```bash
# Start Firebase emulator
firebase emulators:start --only functions

# Functions will be available at:
# http://localhost:5001/your-project-id/us-central1/functionName
```

## Environment Management

All functions support environment switching via the `environment` parameter:

- `test` (default): Uses test Stripe keys
- `live`: Uses live Stripe keys

## Function Categories

### Core Functions (27 existing)
- **Connection Testing**: `testStripeConnection`
- **Products**: Create, update, get, list
- **Prices**: Create, update, get, list  
- **Customers**: Create, update, get, delete, list, search, import
- **Subscriptions**: Create, update, cancel, reactivate, list
- **Payment Methods**: Create, attach, detach, set default, list
- **Invoices**: Get customer invoices

### Enhanced Functions (30+ new)
- **Payment Intents**: Full lifecycle management
- **Setup Intents**: For future payments
- **Charges**: Direct charge operations
- **Refunds**: Create and manage refunds
- **Checkout Sessions**: Hosted checkout flows
- **Billing Portal**: Customer self-service
- **Coupons**: Discount management
- **Promotion Codes**: Coupon distribution
- **Events**: Webhook event handling
- **Webhooks**: Endpoint management
- **Balance**: Account balance operations
- **Disputes**: Chargeback handling
- **Tax Rates**: Tax calculation
- **Advanced Search**: Cross-object search
- **Health Checks**: System validation

## API Reference

### Basic Function Structure

All functions follow this pattern:

```javascript
exports.functionName = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');
        // Function logic here
        return { data: result };
    } catch (error) {
        handleStripeError(error, 'functionName');
    }
});
```

### Common Parameters

- `environment`: `'test'` | `'live'` (default: `'test'`)
- `metadata`: Object for custom metadata
- `limit`: Number for pagination (default: 10)

## Function Details

### Connection & Health

#### `testStripeConnection`
Test Stripe API connectivity and key validity.

**Parameters:**
```typescript
{
    environment?: 'test' | 'live'
}
```

**Response:**
```typescript
{
    success: boolean;
    environment: string;
    message: string;
    productCount?: number;
    error?: string;
}
```

#### `stripeHealthCheck`
Comprehensive system health check.

**Parameters:**
```typescript
{
    environment?: 'test' | 'live'
}
```

**Response:**
```typescript
{
    environment: string;
    account_id: string;
    account_type: string;
    country: string;
    capabilities: object;
    requirements: object;
    products_accessible: boolean;
    customers_accessible: boolean;
    timestamp: string;
}
```

### Products & Prices

#### `createStripeProduct`
Create a new Stripe product.

**Parameters:**
```typescript
{
    name: string;
    description?: string;
    active?: boolean;
    metadata?: object;
    environment?: 'test' | 'live';
}
```

#### `getStripeProducts`
Retrieve all products.

**Parameters:**
```typescript
{
    active?: boolean;
    limit?: number;
    environment?: 'test' | 'live';
}
```

#### `createStripePrice`
Create a price for a product.

**Parameters:**
```typescript
{
    productId: string;
    unitAmount: number;
    currency?: string;
    recurring?: {
        interval: 'day' | 'week' | 'month' | 'year';
        interval_count?: number;
    };
    environment?: 'test' | 'live';
}
```

### Customers

#### `createStripeCustomer`
Create a new customer.

**Parameters:**
```typescript
{
    email?: string;
    name?: string;
    phone?: string;
    description?: string;
    metadata?: object;
    address?: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
    };
    environment?: 'test' | 'live';
}
```

#### `getStripeCustomer`
Retrieve customer by ID.

**Parameters:**
```typescript
{
    customerId: string;
    environment?: 'test' | 'live';
}
```

#### `searchStripeCustomers`
Search customers by query.

**Parameters:**
```typescript
{
    email?: string;
    name?: string;
    phone?: string;
    limit?: number;
    environment?: 'test' | 'live';
}
```

### Subscriptions

#### `createStripeSubscription`
Create a subscription for a customer.

**Parameters:**
```typescript
{
    customerId: string;
    items: Array<{
        price: string;
        quantity?: number;
    }>;
    trial_period_days?: number;
    coupon?: string;
    metadata?: object;
    environment?: 'test' | 'live';
}
```

#### `getCustomerSubscriptions`
Get all subscriptions for a customer.

**Parameters:**
```typescript
{
    customerId: string;
    status?: 'active' | 'canceled' | 'incomplete';
    environment?: 'test' | 'live';
}
```

#### `cancelStripeSubscription`
Cancel a subscription.

**Parameters:**
```typescript
{
    subscriptionId: string;
    cancel_at_period_end?: boolean;
    environment?: 'test' | 'live';
}
```

### Payment Intents

#### `createPaymentIntent`
Create a payment intent for processing payments.

**Parameters:**
```typescript
{
    amount: number; // Amount in cents
    currency?: string; // Default: 'usd'
    customerId?: string;
    paymentMethodId?: string;
    confirm?: boolean;
    metadata?: object;
    applicationFeeAmount?: number;
    environment?: 'test' | 'live';
}
```

#### `confirmPaymentIntent`
Confirm a payment intent.

**Parameters:**
```typescript
{
    paymentIntentId: string;
    paymentMethod?: string;
    returnUrl?: string;
    environment?: 'test' | 'live';
}
```

#### `listPaymentIntents`
List payment intents with filters.

**Parameters:**
```typescript
{
    customer?: string;
    limit?: number;
    created?: {
        gte?: number;
        lte?: number;
    };
    environment?: 'test' | 'live';
}
```

### Payment Methods

#### `createStripePaymentMethod`
Create a payment method.

**Parameters:**
```typescript
{
    type: 'card' | 'bank_account';
    card?: {
        number: string;
        exp_month: number;
        exp_year: number;
        cvc: string;
    };
    billing_details?: {
        name?: string;
        email?: string;
        address?: object;
    };
    environment?: 'test' | 'live';
}
```

#### `getStripePaymentMethods`
Get payment methods for a customer.

**Parameters:**
```typescript
{
    customerId: string;
    type?: 'card' | 'bank_account';
    environment?: 'test' | 'live';
}
```

### Checkout Sessions

#### `createCheckoutSession`
Create a hosted checkout session.

**Parameters:**
```typescript
{
    paymentMethodTypes?: string[];
    lineItems: Array<{
        price_data?: {
            currency: string;
            product_data: {
                name: string;
                description?: string;
            };
            unit_amount: number;
        };
        price?: string;
        quantity: number;
    }>;
    mode: 'payment' | 'subscription' | 'setup';
    successUrl: string;
    cancelUrl: string;
    customerId?: string;
    metadata?: object;
    environment?: 'test' | 'live';
}
```

### Billing Portal

#### `createBillingPortalSession`
Create a billing portal session for customer self-service.

**Parameters:**
```typescript
{
    customerId: string;
    returnUrl: string;
    environment?: 'test' | 'live';
}
```

### Refunds

#### `createRefund`
Create a refund for a charge.

**Parameters:**
```typescript
{
    chargeId: string;
    amount?: number; // Partial refund amount
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: object;
    environment?: 'test' | 'live';
}
```

#### `listRefunds`
List refunds with filters.

**Parameters:**
```typescript
{
    charge?: string;
    limit?: number;
    created?: object;
    environment?: 'test' | 'live';
}
```

### Coupons & Promotions

#### `createCoupon`
Create a discount coupon.

**Parameters:**
```typescript
{
    id?: string;
    percentOff?: number;
    amountOff?: number;
    currency?: string;
    duration: 'forever' | 'once' | 'repeating';
    durationInMonths?: number;
    maxRedemptions?: number;
    redeemBy?: number;
    metadata?: object;
    environment?: 'test' | 'live';
}
```

#### `createPromotionCode`
Create a promotion code for a coupon.

**Parameters:**
```typescript
{
    couponId: string;
    code?: string;
    active?: boolean;
    customerId?: string;
    expiresAt?: number;
    maxRedemptions?: number;
    restrictions?: object;
    metadata?: object;
    environment?: 'test' | 'live';
}
```

### Webhooks

#### `createWebhookEndpoint`
Create a webhook endpoint.

**Parameters:**
```typescript
{
    url: string;
    enabledEvents?: string[];
    description?: string;
    metadata?: object;
    environment?: 'test' | 'live';
}
```

#### `constructEvent`
Verify and construct webhook events.

**Parameters:**
```typescript
{
    payload: string;
    signature: string;
    endpointSecret: string;
    environment?: 'test' | 'live';
}
```

### Advanced Search

#### `searchCustomers`
Advanced customer search.

**Parameters:**
```typescript
{
    query: string; // e.g., "email:'customer@example.com'"
    limit?: number;
    environment?: 'test' | 'live';
}
```

#### `searchInvoices`
Advanced invoice search.

**Parameters:**
```typescript
{
    query: string; // e.g., "status:'paid' AND total>1000"
    limit?: number;
    environment?: 'test' | 'live';
}
```

#### `searchSubscriptions`
Advanced subscription search.

**Parameters:**
```typescript
{
    query: string; // e.g., "status:'active'"
    limit?: number;
    environment?: 'test' | 'live';
}
```

## Usage Examples

### Frontend Integration (Angular)

```typescript
import { AngularFireFunctions } from '@angular/fire/compat/functions';

export class StripeService {
    constructor(private fns: AngularFireFunctions) {}

    async createCustomer(customerData: any, environment: 'test' | 'live' = 'test') {
        const callable = this.fns.httpsCallable('createStripeCustomer');
        return callable({ ...customerData, environment }).toPromise();
    }

    async createPaymentIntent(amount: number, customerId: string, environment: 'test' | 'live' = 'test') {
        const callable = this.fns.httpsCallable('createPaymentIntent');
        return callable({ 
            amount, 
            customerId, 
            currency: 'usd',
            environment 
        }).toPromise();
    }

    async createCheckoutSession(lineItems: any[], customerId: string, environment: 'test' | 'live' = 'test') {
        const callable = this.fns.httpsCallable('createCheckoutSession');
        return callable({
            lineItems,
            customerId,
            mode: 'payment',
            successUrl: 'https://your-site.com/success',
            cancelUrl: 'https://your-site.com/cancel',
            environment
        }).toPromise();
    }
}
```

### Complete Payment Flow Example

```typescript
// 1. Create customer
const customer = await this.stripeService.createCustomer({
    email: 'customer@example.com',
    name: 'John Doe'
}, 'test');

// 2. Create payment intent
const paymentIntent = await this.stripeService.createPaymentIntent(
    2000, // $20.00
    customer.data.id,
    'test'
);

// 3. Confirm payment (frontend with Stripe.js)
const { error } = await stripe.confirmCardPayment(
    paymentIntent.data.client_secret,
    {
        payment_method: {
            card: cardElement,
            billing_details: { name: 'John Doe' }
        }
    }
);

// 4. Handle successful payment
if (!error) {
    console.log('Payment succeeded!');
}
```

### Subscription Flow Example

```typescript
// 1. Create customer
const customer = await this.createCustomer({
    email: 'subscriber@example.com',
    name: 'Jane Smith'
});

// 2. Create subscription
const subscription = await this.createSubscription({
    customerId: customer.data.id,
    items: [{ price: 'price_monthly_plan' }],
    trial_period_days: 14
});

// 3. Create billing portal session for customer management
const portalSession = await this.createBillingPortalSession({
    customerId: customer.data.id,
    returnUrl: 'https://your-site.com/account'
});

// Redirect to portal
window.location.href = portalSession.data.url;
```

## Error Handling

All functions use standardized error handling:

```typescript
try {
    const result = await stripeFunction(params);
    console.log('Success:', result.data);
} catch (error) {
    console.error('Stripe Error:', error);
    
    // Common error types:
    // - StripeCardError: Card was declined
    // - StripeInvalidRequestError: Invalid parameters
    // - StripeAPIError: API error
    // - StripeConnectionError: Network error
    // - StripeAuthenticationError: Invalid API key
}
```

### Error Response Format

```typescript
{
    code: string;
    message: string;
    type: string;
    details?: any;
}
```

## Testing

### Unit Testing Functions

```bash
cd functions
npm test
```

### Testing with Stripe CLI

```bash
# Install Stripe CLI
stripe login

# Forward events to local webhook
stripe listen --forward-to localhost:5001/your-project/us-central1/handleStripeWebhook

# Trigger test events
stripe trigger payment_intent.succeeded
```

### Test Data

Use Stripe's test card numbers:

- `4242424242424242` - Visa (succeeds)
- `4000000000000002` - Visa (declined)
- `4000000000009995` - Visa (insufficient funds)

## Deployment

### Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:createStripeCustomer
```

### Environment Setup

```bash
# Set Firebase config (alternative to .env)
firebase functions:config:set stripe.test_secret_key="sk_test_..."
firebase functions:config:set stripe.live_secret_key="sk_live_..."

# Deploy with config
firebase deploy --only functions
```

## Security Best Practices

1. **API Keys**: Never expose secret keys in client-side code
2. **Environment Variables**: Use Firebase config or .env files
3. **Authentication**: Implement proper user authentication
4. **Validation**: Validate all input parameters
5. **Logging**: Log operations but never log sensitive data
6. **HTTPS**: All functions use HTTPS by default
7. **CORS**: Configure allowed origins properly

## Rate Limiting

Stripe has rate limits:
- Test mode: Higher limits for development
- Live mode: Production rate limits apply
- Implement exponential backoff for retries

## Monitoring & Logs

### Firebase Console
- Function invocations
- Error rates
- Performance metrics

### Stripe Dashboard
- API logs
- Event logs
- Webhook delivery status

## Webhook Handling

### Setup Webhook Endpoint

```typescript
exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.log(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('PaymentIntent was successful!');
            break;
        case 'customer.subscription.created':
            const subscription = event.data.object;
            console.log('Subscription created!');
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
});
```

## Support & Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)

## Function Summary

Total Functions Available: **57+**

### Core Categories:
- **Products & Prices**: 8 functions
- **Customers**: 7 functions  
- **Subscriptions**: 6 functions
- **Payment Methods**: 5 functions
- **Payment Intents**: 6 functions
- **Checkout & Billing**: 4 functions
- **Refunds & Disputes**: 5 functions
- **Coupons & Promotions**: 6 functions
- **Webhooks & Events**: 6 functions
- **Search & Utilities**: 4 functions
- **Health & Testing**: 2 functions
- **Advanced Features**: 8+ functions

This comprehensive Stripe integration provides everything needed for a complete payment processing system with full Stripe API coverage.