const functions = require('firebase-functions');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

// Initialize Stripe with Firebase config as priority, fallback to env variables
const stripeTest = require('stripe')(functions.config().stripe?.test_secret_key || process.env.STRIPE_TEST_SECRET_KEY || 'sk_test_...');
const stripeLive = require('stripe')(process.env.STRIPE_LIVE_SECRET_KEY || 'sk_live_...');

// Simple test function to validate API keys
exports.testStripeConnection = functions.https.onCall(async (data, context) => {
    try {
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        console.log(`Testing Stripe connection in ${environment} mode`);
        console.log(`API Key starts with: ${(environment === 'live' ? process.env.STRIPE_LIVE_SECRET_KEY : process.env.STRIPE_TEST_SECRET_KEY)?.substring(0, 25)}...`);

        // Try to list products (this is a simple read operation)
        const products = await stripe.products.list({ limit: 1 });

        return {
            data: {
                success: true,
                environment: environment,
                message: `Stripe ${environment} connection successful`,
                productCount: products.data.length
            }
        };
    } catch (error) {
        console.error('Stripe connection test failed:', error);
        return {
            data: {
                success: false,
                error: error.message,
                code: error.code,
                type: error.type
            }
        };
    }
});

// Helper function to get Stripe instance based on environment
const getStripeInstance = (environment) => {
    return environment === 'live' ? stripeLive : stripeTest;
};

// Create a product in Stripe
exports.createStripeProduct = functions.https.onCall(async (data, context) => {
    // For development - comment out authentication check

    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const productData = {
            name: data.name,
            metadata: {
                ...data.metadata,
                createdBy: context.auth?.uid || 'anonymous',
                environment: data.environment || 'test'
            },
            active: data.active !== false
        };

        // Only add description if it's not empty
        if (data.description && data.description.trim() !== '') {
            productData.description = data.description;
        }

        const product = await stripe.products.create(productData);

        console.log(`Product created: ${product.id} in ${data.environment || 'test'} mode`);
        return { data: product };
    } catch (error) {
        console.error('Error creating Stripe product:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Update a product in Stripe
exports.updateStripeProduct = functions.https.onCall(async (data, context) => {
    // For development - comment out authentication check

    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const updateData = {};
        if (data.name) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.active !== undefined) updateData.active = data.active;
        if (data.metadata) {
            updateData.metadata = {
                ...data.metadata,
                updatedBy: context.auth?.uid || "anonymous",
                updatedAt: new Date().toISOString()
            };
        }

        const product = await stripe.products.update(data.productId, updateData);

        console.log(`Product updated: ${product.id} in ${data.environment || 'test'} mode`);
        return { data: product };
    } catch (error) {
        console.error('Error updating Stripe product:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Get all products from Stripe
exports.getStripeProducts = functions.https.onCall(async (data, context) => {
    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const products = await stripe.products.list({
            limit: 100,
            active: data.active
        });

        console.log(`Retrieved ${products.data.length} products from ${data.environment || 'test'} mode`);
        return { data: products.data };
    } catch (error) {
        console.error('Error getting Stripe products:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Create a price in Stripe
exports.createStripePrice = functions.https.onCall(async (data, context) => {

    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const priceData = {
            product: data.productId,
            unit_amount: data.unitAmount,
            currency: data.currency || 'usd',
            metadata: {
                ...data.metadata,
                createdBy: context.auth?.uid || "anonymous",
                environment: data.environment || 'test'
            }
        };

        // Only add nickname if it's not empty
        if (data.nickname && data.nickname.trim() !== '') {
            priceData.nickname = data.nickname;
        }

        if (data.recurring) {
            priceData.recurring = {
                interval: data.recurring.interval,
                interval_count: data.recurring.intervalCount || 1
            };
        }

        const price = await stripe.prices.create(priceData);

        console.log(`Price created: ${price.id} for product ${data.productId} in ${data.environment || 'test'} mode`);
        return { data: price };
    } catch (error) {
        console.error('Error creating Stripe price:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Update a price in Stripe (limited updates)
exports.updateStripePrice = functions.https.onCall(async (data, context) => {

    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const updateData = {};
        if (data.active !== undefined) updateData.active = data.active;
        if (data.nickname !== undefined) updateData.nickname = data.nickname;
        if (data.metadata) {
            updateData.metadata = {
                ...data.metadata,
                updatedBy: context.auth?.uid || "anonymous",
                updatedAt: new Date().toISOString()
            };
        }

        const price = await stripe.prices.update(data.priceId, updateData);

        console.log(`Price updated: ${price.id} in ${data.environment || 'test'} mode`);
        return { data: price };
    } catch (error) {
        console.error('Error updating Stripe price:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Get all prices from Stripe
exports.getStripePrices = functions.https.onCall(async (data, context) => {

    try {
        const stripe = getStripeInstance(data.environment || 'test');

        const prices = await stripe.prices.list({
            limit: 100,
            active: data.active
        });

        console.log(`Retrieved ${prices.data.length} prices from ${data.environment || 'test'} mode`);
        return { data: prices.data };
    } catch (error) {
        console.error('Error getting Stripe prices:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Create product with price in one operation
exports.createStripeProductWithPrice = functions.https.onCall(async (data, context) => {
    // For development - comment out authentication check

    try {
        const environment = data.environment || 'test';
        console.log(`Environment: ${environment}`);
        console.log(`Test key starts with: ${process.env.STRIPE_TEST_SECRET_KEY?.substring(0, 20)}...`);
        console.log(`Live key starts with: ${process.env.STRIPE_LIVE_SECRET_KEY?.substring(0, 20)}...`);

        const stripe = getStripeInstance(environment);

        // Create the product first
        const productData = {
            name: data.name,
            metadata: {
                ...data.metadata,
                createdBy: context.auth?.uid || "anonymous",
                environment: data.environment || 'test'
            }
        };

        // Only add description if it's not empty
        if (data.description && data.description.trim() !== '') {
            productData.description = data.description;
        }

        const product = await stripe.products.create(productData);

        // Create price for the product
        const priceData = {
            product: product.id,
            unit_amount: data.unitAmount,
            currency: data.currency || 'usd',
            recurring: {
                interval: data.interval || 'month'
            },
            metadata: {
                ...data.metadata,
                createdBy: context.auth?.uid || "anonymous",
                environment: data.environment || 'test'
            }
        };

        // Only add nickname if it's not empty
        if (data.name && data.interval) {
            priceData.nickname = `${data.name} - ${data.interval}ly`;
        }

        // Only add trial_period_days if it's a valid number
        if (data.trialDays && typeof data.trialDays === 'number' && data.trialDays > 0) {
            priceData.recurring.trial_period_days = data.trialDays;
        }

        const price = await stripe.prices.create(priceData);

        console.log(`Product and price created: ${product.id}, ${price.id} in ${data.environment || 'test'} mode`);
        return {
            data: {
                product: product,
                price: price
            }
        };
    } catch (error) {
        console.error('Error creating Stripe product with price:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});