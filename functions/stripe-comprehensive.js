const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({
    origin: [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
        'https://kndl-3663b.web.app',
        'https://kndl-3663b.firebaseapp.com',
        'https://kndl-inc.com',
        'https://www.kndl-inc.com'
    ],
    credentials: true
});
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

// Initialize Stripe with environment variables
const stripeTest = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY || 'sk_test_...');
const stripeLive = require('stripe')(process.env.STRIPE_LIVE_SECRET_KEY || 'sk_live_...');

// Helper function to get Stripe instance based on environment
const getStripeInstance = (environment) => {
    return environment === 'live' ? stripeLive : stripeTest;
};

// Helper function for error handling
const handleStripeError = (error, operation) => {
    console.error(`Error in ${operation}:`, error);
    throw new functions.https.HttpsError('internal', error.message);
};

// ===== PAYMENT INTENTS =====

// Create Payment Intent
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const paymentIntentData = {
            amount: data.amount,
            currency: data.currency || 'usd',
            customer: data.customerId,
            payment_method: data.paymentMethodId,
            confirm: data.confirm || false,
            metadata: data.metadata || {}
        };

        if (data.applicationFeeAmount) {
            paymentIntentData.application_fee_amount = data.applicationFeeAmount;
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

        console.log(`Payment Intent created: ${paymentIntent.id} in ${data.environment || 'test'} mode`);
        return { data: paymentIntent };
    } catch (error) {
        handleStripeError(error, 'createPaymentIntent');
    }
});

// Get Payment Intent
exports.getPaymentIntent = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const paymentIntent = await stripe.paymentIntents.retrieve(data.paymentIntentId);

        console.log(`Payment Intent retrieved: ${paymentIntent.id} in ${data.environment || 'test'} mode`);
        return { data: paymentIntent };
    } catch (error) {
        handleStripeError(error, 'getPaymentIntent');
    }
});

// Update Payment Intent
exports.updatePaymentIntent = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const updateData = {};
        if (data.amount) updateData.amount = data.amount;
        if (data.currency) updateData.currency = data.currency;
        if (data.metadata) updateData.metadata = data.metadata;

        const paymentIntent = await stripe.paymentIntents.update(data.paymentIntentId, updateData);

        console.log(`Payment Intent updated: ${paymentIntent.id} in ${data.environment || 'test'} mode`);
        return { data: paymentIntent };
    } catch (error) {
        handleStripeError(error, 'updatePaymentIntent');
    }
});

// Confirm Payment Intent
exports.confirmPaymentIntent = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const confirmData = {};
        if (data.paymentMethod) confirmData.payment_method = data.paymentMethod;
        if (data.returnUrl) confirmData.return_url = data.returnUrl;

        const paymentIntent = await stripe.paymentIntents.confirm(data.paymentIntentId, confirmData);

        console.log(`Payment Intent confirmed: ${paymentIntent.id} in ${data.environment || 'test'} mode`);
        return { data: paymentIntent };
    } catch (error) {
        handleStripeError(error, 'confirmPaymentIntent');
    }
});

// Cancel Payment Intent
exports.cancelPaymentIntent = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const paymentIntent = await stripe.paymentIntents.cancel(data.paymentIntentId);

        console.log(`Payment Intent cancelled: ${paymentIntent.id} in ${data.environment || 'test'} mode`);
        return { data: paymentIntent };
    } catch (error) {
        handleStripeError(error, 'cancelPaymentIntent');
    }
});

// List Payment Intents
exports.listPaymentIntents = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const params = {
            limit: data.limit || 10,
        };

        if (data.customer) params.customer = data.customer;
        if (data.created) params.created = data.created;

        const paymentIntents = await stripe.paymentIntents.list(params);

        console.log(`Retrieved ${paymentIntents.data.length} payment intents from ${data.environment || 'test'} mode`);
        return { data: paymentIntents.data };
    } catch (error) {
        handleStripeError(error, 'listPaymentIntents');
    }
});

// ===== SETUP INTENTS =====

// Create Setup Intent
exports.createSetupIntent = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const setupIntentData = {
            customer: data.customerId,
            payment_method_types: data.paymentMethodTypes || ['card'],
            usage: data.usage || 'off_session',
            metadata: data.metadata || {}
        };

        const setupIntent = await stripe.setupIntents.create(setupIntentData);

        console.log(`Setup Intent created: ${setupIntent.id} in ${data.environment || 'test'} mode`);
        return { data: setupIntent };
    } catch (error) {
        handleStripeError(error, 'createSetupIntent');
    }
});

// Get Setup Intent
exports.getSetupIntent = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const setupIntent = await stripe.setupIntents.retrieve(data.setupIntentId);

        console.log(`Setup Intent retrieved: ${setupIntent.id} in ${data.environment || 'test'} mode`);
        return { data: setupIntent };
    } catch (error) {
        handleStripeError(error, 'getSetupIntent');
    }
});

// ===== CHARGES =====

// Create Charge
exports.createCharge = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const chargeData = {
            amount: data.amount,
            currency: data.currency || 'usd',
            source: data.source,
            customer: data.customerId,
            description: data.description,
            metadata: data.metadata || {}
        };

        const charge = await stripe.charges.create(chargeData);

        console.log(`Charge created: ${charge.id} in ${data.environment || 'test'} mode`);
        return { data: charge };
    } catch (error) {
        handleStripeError(error, 'createCharge');
    }
});

// Get Charge
exports.getCharge = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const charge = await stripe.charges.retrieve(data.chargeId);

        console.log(`Charge retrieved: ${charge.id} in ${data.environment || 'test'} mode`);
        return { data: charge };
    } catch (error) {
        handleStripeError(error, 'getCharge');
    }
});

// List Charges
exports.listCharges = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const params = {
            limit: data.limit || 10,
        };

        if (data.customer) params.customer = data.customer;
        if (data.created) params.created = data.created;

        const charges = await stripe.charges.list(params);

        console.log(`Retrieved ${charges.data.length} charges from ${data.environment || 'test'} mode`);
        return { data: charges.data };
    } catch (error) {
        handleStripeError(error, 'listCharges');
    }
});

// ===== REFUNDS =====

// Create Refund
exports.createRefund = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const refundData = {
            charge: data.chargeId,
            amount: data.amount,
            reason: data.reason,
            metadata: data.metadata || {}
        };

        const refund = await stripe.refunds.create(refundData);

        console.log(`Refund created: ${refund.id} in ${data.environment || 'test'} mode`);
        return { data: refund };
    } catch (error) {
        handleStripeError(error, 'createRefund');
    }
});

// Get Refund
exports.getRefund = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const refund = await stripe.refunds.retrieve(data.refundId);

        console.log(`Refund retrieved: ${refund.id} in ${data.environment || 'test'} mode`);
        return { data: refund };
    } catch (error) {
        handleStripeError(error, 'getRefund');
    }
});

// List Refunds
exports.listRefunds = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const params = {
            limit: data.limit || 10,
        };

        if (data.charge) params.charge = data.charge;
        if (data.created) params.created = data.created;

        const refunds = await stripe.refunds.list(params);

        console.log(`Retrieved ${refunds.data.length} refunds from ${data.environment || 'test'} mode`);
        return { data: refunds.data };
    } catch (error) {
        handleStripeError(error, 'listRefunds');
    }
});

// ===== CHECKOUT SESSIONS =====

// Create Checkout Session
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const sessionData = {
            payment_method_types: data.paymentMethodTypes || ['card'],
            line_items: data.lineItems,
            mode: data.mode || 'payment',
            success_url: data.successUrl,
            cancel_url: data.cancelUrl,
            customer: data.customerId,
            metadata: data.metadata || {}
        };

        if (data.mode === 'subscription') {
            sessionData.subscription_data = data.subscriptionData || {};
        }

        const session = await stripe.checkout.sessions.create(sessionData);

        console.log(`Checkout Session created: ${session.id} in ${data.environment || 'test'} mode`);
        return { data: session };
    } catch (error) {
        handleStripeError(error, 'createCheckoutSession');
    }
});

// Get Checkout Session
exports.getCheckoutSession = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const session = await stripe.checkout.sessions.retrieve(data.sessionId);

        console.log(`Checkout Session retrieved: ${session.id} in ${data.environment || 'test'} mode`);
        return { data: session };
    } catch (error) {
        handleStripeError(error, 'getCheckoutSession');
    }
});

// List Checkout Sessions
exports.listCheckoutSessions = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const params = {
            limit: data.limit || 10,
        };

        if (data.customer) params.customer = data.customer;
        if (data.created) params.created = data.created;

        const sessions = await stripe.checkout.sessions.list(params);

        console.log(`Retrieved ${sessions.data.length} checkout sessions from ${data.environment || 'test'} mode`);
        return { data: sessions.data };
    } catch (error) {
        handleStripeError(error, 'listCheckoutSessions');
    }
});

// ===== BILLING PORTAL =====

// Create Billing Portal Session
exports.createBillingPortalSession = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const sessionData = {
            customer: data.customerId,
            return_url: data.returnUrl
        };

        const session = await stripe.billingPortal.sessions.create(sessionData);

        console.log(`Billing Portal Session created for customer: ${data.customerId} in ${data.environment || 'test'} mode`);
        return { data: session };
    } catch (error) {
        handleStripeError(error, 'createBillingPortalSession');
    }
});

// ===== COUPONS =====

// Create Coupon
exports.createCoupon = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const couponData = {
            id: data.id,
            percent_off: data.percentOff,
            amount_off: data.amountOff,
            currency: data.currency,
            duration: data.duration || 'once',
            duration_in_months: data.durationInMonths,
            max_redemptions: data.maxRedemptions,
            redeem_by: data.redeemBy,
            metadata: data.metadata || {}
        };

        // Remove undefined fields
        Object.keys(couponData).forEach(key =>
            couponData[key] === undefined && delete couponData[key]
        );

        const coupon = await stripe.coupons.create(couponData);

        console.log(`Coupon created: ${coupon.id} in ${data.environment || 'test'} mode`);
        return { data: coupon };
    } catch (error) {
        handleStripeError(error, 'createCoupon');
    }
});

// Get Coupon
exports.getCoupon = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const coupon = await stripe.coupons.retrieve(data.couponId);

        console.log(`Coupon retrieved: ${coupon.id} in ${data.environment || 'test'} mode`);
        return { data: coupon };
    } catch (error) {
        handleStripeError(error, 'getCoupon');
    }
});

// List Coupons
exports.listCoupons = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const params = {
            limit: data.limit || 10,
        };

        if (data.created) params.created = data.created;

        const coupons = await stripe.coupons.list(params);

        console.log(`Retrieved ${coupons.data.length} coupons from ${data.environment || 'test'} mode`);
        return { data: coupons.data };
    } catch (error) {
        handleStripeError(error, 'listCoupons');
    }
});

// Delete Coupon
exports.deleteCoupon = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const coupon = await stripe.coupons.del(data.couponId);

        console.log(`Coupon deleted: ${data.couponId} in ${data.environment || 'test'} mode`);
        return { data: coupon };
    } catch (error) {
        handleStripeError(error, 'deleteCoupon');
    }
});

// ===== PROMOTION CODES =====

// Create Promotion Code
exports.createPromotionCode = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const promotionCodeData = {
            coupon: data.couponId,
            code: data.code,
            active: data.active !== false,
            customer: data.customerId,
            expires_at: data.expiresAt,
            max_redemptions: data.maxRedemptions,
            restrictions: data.restrictions,
            metadata: data.metadata || {}
        };

        // Remove undefined fields
        Object.keys(promotionCodeData).forEach(key =>
            promotionCodeData[key] === undefined && delete promotionCodeData[key]
        );

        const promotionCode = await stripe.promotionCodes.create(promotionCodeData);

        console.log(`Promotion Code created: ${promotionCode.id} in ${data.environment || 'test'} mode`);
        return { data: promotionCode };
    } catch (error) {
        handleStripeError(error, 'createPromotionCode');
    }
});

// Get Promotion Code
exports.getPromotionCode = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const promotionCode = await stripe.promotionCodes.retrieve(data.promotionCodeId);

        console.log(`Promotion Code retrieved: ${promotionCode.id} in ${data.environment || 'test'} mode`);
        return { data: promotionCode };
    } catch (error) {
        handleStripeError(error, 'getPromotionCode');
    }
});

// List Promotion Codes
exports.listPromotionCodes = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const params = {
            limit: data.limit || 10,
        };

        if (data.active !== undefined) params.active = data.active;
        if (data.code) params.code = data.code;
        if (data.coupon) params.coupon = data.coupon;
        if (data.customer) params.customer = data.customer;

        const promotionCodes = await stripe.promotionCodes.list(params);

        console.log(`Retrieved ${promotionCodes.data.length} promotion codes from ${data.environment || 'test'} mode`);
        return { data: promotionCodes.data };
    } catch (error) {
        handleStripeError(error, 'listPromotionCodes');
    }
});

// ===== BALANCE & BALANCE TRANSACTIONS =====

// Get Balance
exports.getBalance = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const balance = await stripe.balance.retrieve();

        console.log(`Balance retrieved in ${data.environment || 'test'} mode`);
        return { data: balance };
    } catch (error) {
        handleStripeError(error, 'getBalance');
    }
});

// Get Balance Transaction
exports.getBalanceTransaction = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const balanceTransaction = await stripe.balanceTransactions.retrieve(data.balanceTransactionId);

        console.log(`Balance Transaction retrieved: ${balanceTransaction.id} in ${data.environment || 'test'} mode`);
        return { data: balanceTransaction };
    } catch (error) {
        handleStripeError(error, 'getBalanceTransaction');
    }
});

// List Balance Transactions
exports.listBalanceTransactions = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const params = {
            limit: data.limit || 10,
        };

        if (data.available_on) params.available_on = data.available_on;
        if (data.created) params.created = data.created;
        if (data.currency) params.currency = data.currency;
        if (data.source) params.source = data.source;
        if (data.type) params.type = data.type;

        const balanceTransactions = await stripe.balanceTransactions.list(params);

        console.log(`Retrieved ${balanceTransactions.data.length} balance transactions from ${data.environment || 'test'} mode`);
        return { data: balanceTransactions.data };
    } catch (error) {
        handleStripeError(error, 'listBalanceTransactions');
    }
});

// ===== EVENTS =====

// Get Event
exports.getEvent = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const event = await stripe.events.retrieve(data.eventId);

        console.log(`Event retrieved: ${event.id} in ${data.environment || 'test'} mode`);
        return { data: event };
    } catch (error) {
        handleStripeError(error, 'getEvent');
    }
});

// List Events
exports.listEvents = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const params = {
            limit: data.limit || 10,
        };

        if (data.created) params.created = data.created;
        if (data.type) params.type = data.type;
        if (data.types) params.types = data.types;

        const events = await stripe.events.list(params);

        console.log(`Retrieved ${events.data.length} events from ${data.environment || 'test'} mode`);
        return { data: events.data };
    } catch (error) {
        handleStripeError(error, 'listEvents');
    }
});

// ===== WEBHOOK ENDPOINTS =====

// Create Webhook Endpoint
exports.createWebhookEndpoint = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const webhookData = {
            url: data.url,
            enabled_events: data.enabledEvents || ['*'],
            description: data.description,
            metadata: data.metadata || {}
        };

        const webhook = await stripe.webhookEndpoints.create(webhookData);

        console.log(`Webhook Endpoint created: ${webhook.id} in ${data.environment || 'test'} mode`);
        return { data: webhook };
    } catch (error) {
        handleStripeError(error, 'createWebhookEndpoint');
    }
});

// Get Webhook Endpoint
exports.getWebhookEndpoint = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const webhook = await stripe.webhookEndpoints.retrieve(data.webhookId);

        console.log(`Webhook Endpoint retrieved: ${webhook.id} in ${data.environment || 'test'} mode`);
        return { data: webhook };
    } catch (error) {
        handleStripeError(error, 'getWebhookEndpoint');
    }
});

// List Webhook Endpoints
exports.listWebhookEndpoints = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const params = {
            limit: data.limit || 10,
        };

        const webhooks = await stripe.webhookEndpoints.list(params);

        console.log(`Retrieved ${webhooks.data.length} webhook endpoints from ${data.environment || 'test'} mode`);
        return { data: webhooks.data };
    } catch (error) {
        handleStripeError(error, 'listWebhookEndpoints');
    }
});

// Update Webhook Endpoint
exports.updateWebhookEndpoint = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const updateData = {};
        if (data.url) updateData.url = data.url;
        if (data.enabled_events) updateData.enabled_events = data.enabled_events;
        if (data.description) updateData.description = data.description;
        if (data.disabled) updateData.disabled = data.disabled;
        if (data.metadata) updateData.metadata = data.metadata;

        const webhook = await stripe.webhookEndpoints.update(data.webhookId, updateData);

        console.log(`Webhook Endpoint updated: ${webhook.id} in ${data.environment || 'test'} mode`);
        return { data: webhook };
    } catch (error) {
        handleStripeError(error, 'updateWebhookEndpoint');
    }
});

// Delete Webhook Endpoint
exports.deleteWebhookEndpoint = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const webhook = await stripe.webhookEndpoints.del(data.webhookId);

        console.log(`Webhook Endpoint deleted: ${data.webhookId} in ${data.environment || 'test'} mode`);
        return { data: webhook };
    } catch (error) {
        handleStripeError(error, 'deleteWebhookEndpoint');
    }
});

// ===== DISPUTES =====

// Get Dispute
exports.getDispute = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const dispute = await stripe.disputes.retrieve(data.disputeId);

        console.log(`Dispute retrieved: ${dispute.id} in ${data.environment || 'test'} mode`);
        return { data: dispute };
    } catch (error) {
        handleStripeError(error, 'getDispute');
    }
});

// List Disputes
exports.listDisputes = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const params = {
            limit: data.limit || 10,
        };

        if (data.charge) params.charge = data.charge;
        if (data.created) params.created = data.created;

        const disputes = await stripe.disputes.list(params);

        console.log(`Retrieved ${disputes.data.length} disputes from ${data.environment || 'test'} mode`);
        return { data: disputes.data };
    } catch (error) {
        handleStripeError(error, 'listDisputes');
    }
});

// Update Dispute
exports.updateDispute = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const updateData = {};
        if (data.evidence) updateData.evidence = data.evidence;
        if (data.metadata) updateData.metadata = data.metadata;
        if (data.submit !== undefined) updateData.submit = data.submit;

        const dispute = await stripe.disputes.update(data.disputeId, updateData);

        console.log(`Dispute updated: ${dispute.id} in ${data.environment || 'test'} mode`);
        return { data: dispute };
    } catch (error) {
        handleStripeError(error, 'updateDispute');
    }
});

// ===== TAX RATES =====

// Create Tax Rate
exports.createTaxRate = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const taxRateData = {
            display_name: data.displayName,
            percentage: data.percentage,
            inclusive: data.inclusive || false,
            active: data.active !== false,
            country: data.country,
            state: data.state,
            jurisdiction: data.jurisdiction,
            description: data.description,
            metadata: data.metadata || {}
        };

        // Remove undefined fields
        Object.keys(taxRateData).forEach(key =>
            taxRateData[key] === undefined && delete taxRateData[key]
        );

        const taxRate = await stripe.taxRates.create(taxRateData);

        console.log(`Tax Rate created: ${taxRate.id} in ${data.environment || 'test'} mode`);
        return { data: taxRate };
    } catch (error) {
        handleStripeError(error, 'createTaxRate');
    }
});

// Get Tax Rate
exports.getTaxRate = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const taxRate = await stripe.taxRates.retrieve(data.taxRateId);

        console.log(`Tax Rate retrieved: ${taxRate.id} in ${data.environment || 'test'} mode`);
        return { data: taxRate };
    } catch (error) {
        handleStripeError(error, 'getTaxRate');
    }
});

// List Tax Rates
exports.listTaxRates = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const params = {
            limit: data.limit || 10,
        };

        if (data.active !== undefined) params.active = data.active;
        if (data.inclusive !== undefined) params.inclusive = data.inclusive;
        if (data.created) params.created = data.created;

        const taxRates = await stripe.taxRates.list(params);

        console.log(`Retrieved ${taxRates.data.length} tax rates from ${data.environment || 'test'} mode`);
        return { data: taxRates.data };
    } catch (error) {
        handleStripeError(error, 'listTaxRates');
    }
});

// Update Tax Rate
exports.updateTaxRate = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const updateData = {};
        if (data.active !== undefined) updateData.active = data.active;
        if (data.display_name) updateData.display_name = data.display_name;
        if (data.description) updateData.description = data.description;
        if (data.jurisdiction) updateData.jurisdiction = data.jurisdiction;
        if (data.metadata) updateData.metadata = data.metadata;

        const taxRate = await stripe.taxRates.update(data.taxRateId, updateData);

        console.log(`Tax Rate updated: ${taxRate.id} in ${data.environment || 'test'} mode`);
        return { data: taxRate };
    } catch (error) {
        handleStripeError(error, 'updateTaxRate');
    }
});

// ===== ADVANCED UTILITY FUNCTIONS =====

// Construct Event for Webhook Processing
exports.constructEvent = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const sig = data.signature;
        const payload = data.payload;
        const endpointSecret = data.endpointSecret;

        const event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);

        console.log(`Event constructed: ${event.type} in ${data.environment || 'test'} mode`);
        return { data: event };
    } catch (error) {
        handleStripeError(error, 'constructEvent');
    }
});

// Search functionality (requires search-enabled fields)
exports.searchCustomers = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const searchResult = await stripe.customers.search({
            query: data.query,
            limit: data.limit || 10
        });

        console.log(`Customer search completed: ${searchResult.data.length} results in ${data.environment || 'test'} mode`);
        return { data: searchResult.data };
    } catch (error) {
        handleStripeError(error, 'searchCustomers');
    }
});

// Search invoices
exports.searchInvoices = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const searchResult = await stripe.invoices.search({
            query: data.query,
            limit: data.limit || 10
        });

        console.log(`Invoice search completed: ${searchResult.data.length} results in ${data.environment || 'test'} mode`);
        return { data: searchResult.data };
    } catch (error) {
        handleStripeError(error, 'searchInvoices');
    }
});

// Search subscriptions
exports.searchSubscriptions = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const searchResult = await stripe.subscriptions.search({
            query: data.query,
            limit: data.limit || 10
        });

        console.log(`Subscription search completed: ${searchResult.data.length} results in ${data.environment || 'test'} mode`);
        return { data: searchResult.data };
    } catch (error) {
        handleStripeError(error, 'searchSubscriptions');
    }
});

// Comprehensive health check
exports.stripeHealthCheck = functions.https.onCall(async (data, context) => {
    try {
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        // Test basic connectivity
        const account = await stripe.accounts.retrieve();

        // Test key permissions
        const products = await stripe.products.list({ limit: 1 });
        const customers = await stripe.customers.list({ limit: 1 });

        const healthCheck = {
            environment: environment,
            account_id: account.id,
            account_type: account.type,
            country: account.country,
            capabilities: account.capabilities,
            requirements: account.requirements,
            products_accessible: true,
            customers_accessible: true,
            timestamp: new Date().toISOString()
        };

        console.log(`Stripe health check completed for ${environment} environment`);
        return { data: healthCheck };
    } catch (error) {
        console.error('Stripe health check failed:', error);
        return {
            data: {
                healthy: false,
                error: error.message,
                environment: data.environment || 'test',
                timestamp: new Date().toISOString()
            }
        };
    }
});