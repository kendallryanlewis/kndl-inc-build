const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({
    origin: [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
        'https://kndl-3663b.web.app', // Firebase hosting
        'https://kndl-3663b.firebaseapp.com', // Firebase hosting
        'https://kndl-inc.com', // Your custom domain (if you have one)
        'https://www.kndl-inc.com' // Your custom domain with www
    ],
    credentials: true
});
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

// Initialize Stripe with Firebase config as priority, fallback to env variables
// Note: Validate API keys before initialization to avoid authentication errors
const testKey = functions.config().stripe?.test_secret_key || process.env.STRIPE_TEST_SECRET_KEY;
const liveKey = process.env.STRIPE_LIVE_SECRET_KEY;

if (!testKey || testKey.startsWith('sk_test_...') || testKey === 'sk_test_...') {
    console.error('❌ STRIPE ERROR: Test secret key is missing or invalid');
    console.error('🔧 FIX: Update STRIPE_TEST_SECRET_KEY in functions/.env file');
}

if (!liveKey || liveKey.startsWith('sk_live_...') || liveKey === 'sk_live_...' || liveKey.includes('REPLACE_WITH_YOUR_ACTUAL_LIVE_KEY')) {
    console.warn('⚠️ STRIPE WARNING: Live secret key is missing or invalid');
    console.warn('🔧 FIX: Update STRIPE_LIVE_SECRET_KEY in functions/.env file');
}

const stripeTest = testKey ? require('stripe')(testKey) : null;
const stripeLive = liveKey ? require('stripe')(liveKey) : null;

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
    const stripe = environment === 'live' ? stripeLive : stripeTest;

    if (!stripe) {
        const envType = environment === 'live' ? 'live' : 'test';
        throw new functions.https.HttpsError(
            'failed-precondition',
            `Stripe ${envType} instance is not properly configured. Please check your API keys in functions/.env file.`
        );
    }

    return stripe;
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

// ========================================
// CUSTOMER MANAGEMENT FUNCTIONS
// ========================================

// Create a new Stripe customer
exports.createStripeCustomer = functions.https.onCall(async (data, context) => {
    try {
        const { name, email, phone, companyId, metadata } = data;
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        // Validate required fields
        if (!name || !email) {
            throw new functions.https.HttpsError('invalid-argument', 'Name and email are required');
        }

        console.log(`Creating customer in ${environment} mode:`, { name, email, companyId });

        const customerData = {
            name: name,
            email: email,
            metadata: {
                firebaseId: companyId || '',
                companyName: name,
                environment: environment,
                createdBy: 'kndl-admin',
                lastSyncAt: new Date().toISOString(),
                syncStatus: 'active',
                // Only add essential custom metadata, avoiding large data
                ...(metadata && Object.keys(metadata).length < 5 ? metadata : {})
            }
        };

        if (phone) {
            customerData.phone = phone;
        }

        const customer = await stripe.customers.create(customerData);

        console.log(`Customer created: ${customer.id} in ${environment} mode`);
        return {
            data: customer
        };
    } catch (error) {
        console.error('Error creating Stripe customer:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Get a Stripe customer
exports.getStripeCustomer = functions.https.onCall(async (data, context) => {
    try {
        const { customerId } = data;
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        if (!customerId) {
            throw new functions.https.HttpsError('invalid-argument', 'Customer ID is required');
        }

        console.log(`Getting customer ${customerId} in ${environment} mode`);

        const customer = await stripe.customers.retrieve(customerId);

        return {
            data: customer
        };
    } catch (error) {
        console.error('Error getting Stripe customer:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Update a Stripe customer
exports.updateStripeCustomer = functions.https.onCall(async (data, context) => {
    try {
        const { customerId, name, email, phone, metadata } = data;
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        if (!customerId) {
            throw new functions.https.HttpsError('invalid-argument', 'Customer ID is required');
        }

        console.log(`Updating customer ${customerId} in ${environment} mode`);

        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;
        if (metadata) updateData.metadata = metadata;

        const customer = await stripe.customers.update(customerId, updateData);

        return {
            data: customer
        };
    } catch (error) {
        console.error('Error updating Stripe customer:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Delete a Stripe customer
exports.deleteStripeCustomer = functions.https.onCall(async (data, context) => {
    try {
        const { customerId } = data;
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        if (!customerId) {
            throw new functions.https.HttpsError('invalid-argument', 'Customer ID is required');
        }

        console.log(`Deleting customer ${customerId} in ${environment} mode`);

        const deleted = await stripe.customers.del(customerId);

        return {
            data: deleted
        };
    } catch (error) {
        console.error('Error deleting Stripe customer:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Get customer subscriptions
exports.getCustomerSubscriptions = functions.https.onCall(async (data, context) => {
    try {
        const { customerId } = data;
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        if (!customerId) {
            throw new functions.https.HttpsError('invalid-argument', 'Customer ID is required');
        }

        console.log(`🔍 Getting subscriptions for customer ${customerId} in ${environment} mode`);

        // Debug API key
        const keyEnv = environment === 'live' ? process.env.STRIPE_LIVE_SECRET_KEY : process.env.STRIPE_TEST_SECRET_KEY;
        console.log(`🔑 Using API key: ${keyEnv?.substring(0, 25)}...`);

        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            limit: 100
        });

        console.log(`✅ Retrieved ${subscriptions.data.length} subscriptions for customer ${customerId}`);

        return {
            data: subscriptions
        };
    } catch (error) {
        console.error('❌ Error getting customer subscriptions:', error);
        console.error('Error details:', {
            message: error.message,
            type: error.type,
            code: error.code,
            statusCode: error.statusCode
        });
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ========================================
// SUBSCRIPTION MANAGEMENT FUNCTIONS
// ========================================

// Create a new subscription
exports.createStripeSubscription = functions.https.onCall(async (data, context) => {
    try {
        const { customerId, priceId, paymentMethodId, trialPeriodDays, metadata } = data;
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        if (!customerId || !priceId) {
            throw new functions.https.HttpsError('invalid-argument', 'Customer ID and Price ID are required');
        }

        console.log(`Creating subscription for customer ${customerId} in ${environment} mode`);

        const subscriptionData = {
            customer: customerId,
            items: [{ price: priceId }],
            metadata: {
                environment: environment,
                createdBy: 'kndl-admin',
                ...metadata
            }
        };

        if (paymentMethodId) {
            subscriptionData.default_payment_method = paymentMethodId;
        }

        if (trialPeriodDays) {
            subscriptionData.trial_period_days = trialPeriodDays;
        }

        const subscription = await stripe.subscriptions.create(subscriptionData);

        console.log(`Subscription created: ${subscription.id} in ${environment} mode`);
        return subscription;
    } catch (error) {
        console.error('Error creating Stripe subscription:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Update a subscription
exports.updateStripeSubscription = functions.https.onCall(async (data, context) => {
    try {
        const { subscriptionId, priceId, quantity, metadata, prorationBehavior } = data;
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        if (!subscriptionId) {
            throw new functions.https.HttpsError('invalid-argument', 'Subscription ID is required');
        }

        console.log(`Updating subscription ${subscriptionId} in ${environment} mode`);

        const updateData = {};

        if (priceId) {
            // Get current subscription to update items
            const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);
            updateData.items = [{
                id: currentSubscription.items.data[0].id,
                price: priceId
            }];
        }

        if (quantity) updateData.quantity = quantity;
        if (metadata) updateData.metadata = metadata;
        if (prorationBehavior) updateData.proration_behavior = prorationBehavior;

        const subscription = await stripe.subscriptions.update(subscriptionId, updateData);

        return {
            data: subscription
        };
    } catch (error) {
        console.error('Error updating Stripe subscription:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Cancel a subscription
exports.cancelStripeSubscription = functions.https.onCall(async (data, context) => {
    try {
        const { subscriptionId, atPeriodEnd = true } = data;
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        if (!subscriptionId) {
            throw new functions.https.HttpsError('invalid-argument', 'Subscription ID is required');
        }

        console.log(`Canceling subscription ${subscriptionId} (at period end: ${atPeriodEnd}) in ${environment} mode`);

        let subscription;
        if (atPeriodEnd) {
            subscription = await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true
            });
        } else {
            subscription = await stripe.subscriptions.cancel(subscriptionId);
        }

        return {
            data: subscription
        };
    } catch (error) {
        console.error('Error canceling Stripe subscription:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Reactivate a subscription
exports.reactivateStripeSubscription = functions.https.onCall(async (data, context) => {
    try {
        const { subscriptionId } = data;
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        if (!subscriptionId) {
            throw new functions.https.HttpsError('invalid-argument', 'Subscription ID is required');
        }

        console.log(`Reactivating subscription ${subscriptionId} in ${environment} mode`);

        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false
        });

        return {
            data: subscription
        };
    } catch (error) {
        console.error('Error reactivating Stripe subscription:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Get all Stripe customers with pagination
exports.getAllStripeCustomers = functions.https.onCall(async (data, context) => {
    try {
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        console.log(`Getting all customers from Stripe ${environment} environment`);

        const limit = data.limit || 100; // Default to 100, max 100 per Stripe API
        const startingAfter = data.startingAfter || null;

        const listParams = {
            limit: limit
        };

        // Only add starting_after if it has a valid value
        if (startingAfter && startingAfter.trim() !== '') {
            listParams.starting_after = startingAfter;
        }

        const customers = await stripe.customers.list(listParams);

        console.log(`Successfully retrieved ${customers.data.length} customers`);

        return {
            success: true,
            data: customers.data,
            hasMore: customers.has_more,
            count: customers.data.length
        };
    } catch (error) {
        console.error('Error retrieving Stripe customers:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Search Stripe customers by email or name
exports.searchStripeCustomers = functions.https.onCall(async (data, context) => {
    try {
        const { query, limit = 50 } = data;

        if (!query) {
            throw new functions.https.HttpsError('invalid-argument', 'Search query is required');
        }

        // Search by email first
        const customers = await stripe.customers.list({
            email: query,
            limit: limit
        });

        // If no results by email, search by name (requires retrieving all and filtering)
        if (customers.data.length === 0) {
            const allCustomers = await stripe.customers.list({
                limit: limit
            });

            const filteredCustomers = allCustomers.data.filter(customer =>
                customer.name && customer.name.toLowerCase().includes(query.toLowerCase())
            );

            return {
                success: true,
                data: filteredCustomers,
                searchType: 'name',
                count: filteredCustomers.length
            };
        }

        return {
            success: true,
            data: customers.data,
            searchType: 'email',
            count: customers.data.length
        };
    } catch (error) {
        console.error('Error searching Stripe customers:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Import a Stripe customer as a local company
exports.importStripeCustomerAsCompany = functions.https.onCall(async (data, context) => {
    try {
        const { customerId } = data;

        if (!customerId) {
            throw new functions.https.HttpsError('invalid-argument', 'Customer ID is required');
        }

        // Get the Stripe customer
        const customer = await stripe.customers.retrieve(customerId);

        if (!customer) {
            throw new functions.https.HttpsError('not-found', 'Customer not found in Stripe');
        }

        // Create company data from Stripe customer
        const companyData = {
            name: customer.name || customer.email || 'Imported Customer',
            email: customer.email || '',
            phone: customer.phone || '',
            stripeCustomerId: customer.id,
            importedFromStripe: true,
            importedAt: admin.firestore.FieldValue.serverTimestamp(),
            metadata: customer.metadata || {},
            address: customer.address ? {
                line1: customer.address.line1 || '',
                line2: customer.address.line2 || '',
                city: customer.address.city || '',
                state: customer.address.state || '',
                postal_code: customer.address.postal_code || '',
                country: customer.address.country || ''
            } : null,
            description: customer.description || '',
            created: new Date(customer.created * 1000), // Convert from Unix timestamp
            status: 'active' // Default status for imported companies
        };

        // Check if company already exists
        const existingCompany = await admin.firestore()
            .collection('companies')
            .where('stripeCustomerId', '==', customer.id)
            .get();

        if (!existingCompany.empty) {
            return {
                success: false,
                message: 'Company already exists for this Stripe customer',
                existingCompany: existingCompany.docs[0].data()
            };
        }

        // Save to Firestore
        const docRef = await admin.firestore().collection('companies').add(companyData);

        return {
            success: true,
            data: {
                id: docRef.id,
                ...companyData
            },
            message: 'Customer successfully imported as company'
        };
    } catch (error) {
        console.error('Error importing Stripe customer as company:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Bulk export companies to Stripe customers
exports.bulkExportCompaniesToStripe = functions.https.onCall(async (data, context) => {
    try {
        console.log('Bulk export function called with data:', data);
        const { companyIds = [], exportAll = false, environment = 'test' } = data;
        const stripe = getStripeInstance(environment);
        console.log('Export parameters:', { companyIds, exportAll, companyIdsLength: companyIds.length, environment });

        let companiesQuery;

        if (exportAll) {
            // Export all companies - we'll filter out those with stripeCustomerId later
            companiesQuery = admin.firestore()
                .collection('companies');
        } else if (companyIds.length > 0) {
            // Export specific companies
            companiesQuery = admin.firestore()
                .collection('companies')
                .where(admin.firestore.FieldPath.documentId(), 'in', companyIds);
        } else {
            throw new functions.https.HttpsError('invalid-argument', 'Either provide company IDs or set exportAll to true');
        }

        const companiesSnapshot = await companiesQuery.get();
        let companies = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Found companies before filtering:', companies.length);

        // If exportAll is true, filter out companies that already have stripeCustomerId
        if (exportAll) {
            const beforeFilter = companies.length;
            companies = companies.filter(company => {
                const hasStripeId = company.stripeCustomerId && company.stripeCustomerId.trim() !== '';
                console.log(`Company ${company.id} (${company.name}): stripeCustomerId = "${company.stripeCustomerId}", hasStripeId = ${hasStripeId}`);
                return !hasStripeId;
            });
            console.log('Companies after filtering (without stripeCustomerId):', companies.length, 'from', beforeFilter);
        }

        console.log('Final companies to process:', companies.map(c => ({ id: c.id, name: c.name, hasStripeId: !!c.stripeCustomerId })));

        if (companies.length === 0) {
            console.log('No companies to export, returning early');
            return {
                success: true,
                message: 'No companies to export',
                results: { success: [], errors: [] }
            };
        }

        const results = { success: [], errors: [] };

        // Process companies in batches to avoid timeout
        for (const company of companies) {
            try {
                // Skip if company already has a Stripe customer ID
                if (company.stripeCustomerId) {
                    results.errors.push({
                        company: company,
                        error: 'Company already has a Stripe customer ID'
                    });
                    continue;
                }

                // Create Stripe customer data
                const customerData = {
                    name: company.name || 'Company',
                    email: company.contactEmail || company.email || '',
                    phone: company.phone || '',
                    description: `Company: ${company.name} (Domain: ${company.domain || 'N/A'})`,
                    metadata: {
                        companyId: company.id,
                        domain: company.domain || '',
                        subscriptionPlan: company.subscriptionPlan || '',
                        importedFromFirebase: 'true',
                        importedAt: new Date().toISOString()
                    }
                };

                // Add address if available
                if (company.address) {
                    customerData.address = {
                        line1: company.address.line1 || '',
                        line2: company.address.line2 || '',
                        city: company.address.city || '',
                        state: company.address.state || '',
                        postal_code: company.address.postal_code || '',
                        country: company.address.country || 'US'
                    };
                }

                // Create customer in Stripe
                const stripeCustomer = await stripe.customers.create(customerData);

                // Update company with Stripe customer ID
                await admin.firestore()
                    .collection('companies')
                    .doc(company.id)
                    .update({
                        stripeCustomerId: stripeCustomer.id,
                        stripeSyncStatus: 'synced',
                        lastStripeSyncDate: admin.firestore.FieldValue.serverTimestamp()
                    });

                results.success.push({
                    company: company,
                    stripeCustomer: stripeCustomer
                });

            } catch (error) {
                console.error(`Error creating Stripe customer for company ${company.id}:`, error);
                results.errors.push({
                    company: company,
                    error: error.message || 'Unknown error'
                });
            }
        }

        // Sanitize results to avoid JSON encoding issues with NaN values
        const sanitizedResults = {
            success: results.success.map(item => ({
                company: {
                    id: item.company.id,
                    name: item.company.name || 'Unknown',
                    email: item.company.email || item.company.contactEmail || ''
                },
                stripeCustomer: {
                    id: item.stripeCustomer.id,
                    name: item.stripeCustomer.name,
                    email: item.stripeCustomer.email
                }
            })),
            errors: results.errors.map(item => ({
                company: {
                    id: item.company.id,
                    name: item.company.name || 'Unknown'
                },
                error: typeof item.error === 'string' ? item.error : item.error.message || 'Unknown error'
            }))
        };

        return {
            success: true,
            data: sanitizedResults,
            message: `Processed ${companies.length} companies. ${sanitizedResults.success.length} succeeded, ${sanitizedResults.errors.length} failed.`
        };
    } catch (error) {
        console.error('Error in bulk export companies to Stripe:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        throw new functions.https.HttpsError('internal', `Export failed: ${error.message}`);
    }
});

// ============================================================================
// PAYMENT METHOD MANAGEMENT FUNCTIONS
// ============================================================================

// Create a payment method
exports.createStripePaymentMethod = functions.https.onCall(async (data, context) => {
    try {
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        console.log('Creating Stripe payment method:', JSON.stringify(data, null, 2));

        const paymentMethodData = {
            type: data.type,
            billing_details: data.billing_details || {}
        };

        // Add type-specific data
        if (data.type === 'card' && data.card) {
            if (data.card.token) {
                // Use token-based approach for secure testing
                console.log('Using token-based payment method creation:', data.card.token);
                paymentMethodData.card = { token: data.card.token };
            } else {
                // Use raw card data (requires account configuration)
                console.log('Using raw card data (requires Stripe account setup)');
                paymentMethodData.card = data.card;
            }
        } else if (data.type === 'us_bank_account' && data.us_bank_account) {
            paymentMethodData.us_bank_account = data.us_bank_account;
        }

        console.log('Sending to Stripe:', JSON.stringify(paymentMethodData, null, 2));

        const paymentMethod = await stripe.paymentMethods.create(paymentMethodData);

        console.log('Payment method created successfully:', paymentMethod.id);
        console.log('Full payment method response:', JSON.stringify(paymentMethod, null, 2));

        return {
            data: {
                id: paymentMethod.id,
                type: paymentMethod.type,
                created: paymentMethod.created,
                billing_details: paymentMethod.billing_details,
                card: paymentMethod.card,
                us_bank_account: paymentMethod.us_bank_account
            }
        };
    } catch (error) {
        console.error('Error creating payment method:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw new functions.https.HttpsError(
            'internal',
            `Failed to create payment method: ${error.message}`,
            { code: error.code, type: error.type }
        );
    }
});

// Attach a payment method to a customer
exports.attachStripePaymentMethod = functions.https.onCall(async (data, context) => {
    try {
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        console.log('Attaching payment method to customer:', data);

        const paymentMethod = await stripe.paymentMethods.attach(data.paymentMethodId, {
            customer: data.customerId
        });

        console.log('Payment method attached successfully:', paymentMethod.id);

        return {
            data: {
                id: paymentMethod.id,
                customer: paymentMethod.customer,
                type: paymentMethod.type,
                billing_details: paymentMethod.billing_details
            }
        };
    } catch (error) {
        console.error('Error attaching payment method:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Failed to attach payment method: ${error.message}`,
            { code: error.code, type: error.type }
        );
    }
});

// Detach a payment method from a customer
exports.detachStripePaymentMethod = functions.https.onCall(async (data, context) => {
    try {
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        console.log('Detaching payment method:', data.paymentMethodId);

        const paymentMethod = await stripe.paymentMethods.detach(data.paymentMethodId);

        console.log('Payment method detached successfully:', paymentMethod.id);

        return {
            data: {
                id: paymentMethod.id,
                customer: paymentMethod.customer
            }
        };
    } catch (error) {
        console.error('Error detaching payment method:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Failed to detach payment method: ${error.message}`,
            { code: error.code, type: error.type }
        );
    }
});

// Set default payment method for a customer
exports.setDefaultStripePaymentMethod = functions.https.onCall(async (data, context) => {
    try {
        const environment = data.environment || 'test';
        const stripe = getStripeInstance(environment);

        console.log('Setting default payment method for customer:', data);

        const customer = await stripe.customers.update(data.customerId, {
            invoice_settings: {
                default_payment_method: data.paymentMethodId
            }
        });

        console.log('Default payment method set successfully for customer:', customer.id);

        return {
            data: {
                id: customer.id,
                invoice_settings: customer.invoice_settings
            }
        };
    } catch (error) {
        console.error('Error setting default payment method:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Failed to set default payment method: ${error.message}`,
            { code: error.code, type: error.type }
        );
    }
});

// Get payment methods for a customer
exports.getStripePaymentMethods = functions.https.onCall(async (data, context) => {
    try {
        // Extract the actual data - it might be nested in data.data
        const actualData = data.data || data;
        const environment = actualData.environment || 'test';
        const stripe = getStripeInstance(environment);

        console.log('🔍 Getting payment methods for customer:', {
            customerId: actualData.customerId,
            environment: environment,
            dataType: typeof actualData.customerId,
            dataValid: !!actualData.customerId,
            rawDataKeys: Object.keys(data),
            actualDataKeys: Object.keys(actualData)
        });

        if (!actualData.customerId) {
            console.error('❌ Customer ID validation failed:', {
                customerId: actualData.customerId,
                dataKeys: Object.keys(data),
                actualDataKeys: Object.keys(actualData),
                data: data,
                actualData: actualData
            });
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Customer ID is required'
            );
        }

        const paymentMethods = await stripe.paymentMethods.list({
            customer: actualData.customerId,
            type: 'card', // You can modify this to support other types
        });

        console.log('Payment methods retrieved successfully:', paymentMethods.data.length);

        return {
            data: paymentMethods.data
        };
    } catch (error) {
        console.error('Error getting payment methods:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Failed to get payment methods: ${error.message}`,
            { code: error.code, type: error.type }
        );
    }
});

/**
 * Get customer invoices from Stripe
 */
exports.getCustomerInvoices = functions.https.onCall(async (data, context) => {
    // Extract the actual data - it might be nested in data.data
    const actualData = data.data || data;
    const { customerId, environment = 'test' } = actualData;

    console.log('🔍 Debug getCustomerInvoices data structure:', {
        customerId: customerId,
        environment: environment,
        rawDataKeys: Object.keys(data),
        actualDataKeys: Object.keys(actualData),
        customerIdType: typeof customerId
    });

    if (!customerId) {
        console.error('❌ Customer ID validation failed in getCustomerInvoices:', {
            customerId: customerId,
            data: data,
            actualData: actualData
        });
        throw new functions.https.HttpsError('invalid-argument', 'Customer ID is required');
    }

    try {
        const stripe = getStripeInstance(environment);

        console.log(`🔍 Fetching invoices for customer ${customerId} in ${environment} environment`);

        // Get customer invoices
        const invoices = await stripe.invoices.list({
            customer: customerId,
            limit: 100
        });

        console.log(`✅ Retrieved ${invoices.data.length} invoices for customer ${customerId}`);

        return {
            data: invoices.data
        };

    } catch (error) {
        console.error('❌ Error fetching customer invoices:', error);

        if (error.type === 'StripeInvalidRequestError') {
            throw new functions.https.HttpsError('invalid-argument',
                `Stripe error: ${error.message}`);
        }

        throw new functions.https.HttpsError('internal',
            `Failed to fetch customer invoices: ${error.message}`);
    }
});

// Get customer's default payment method
exports.getDefaultPaymentMethod = functions.https.onCall(async (data, context) => {
    try {
        const { customerId, environment } = data;

        if (!customerId) {
            throw new functions.https.HttpsError('invalid-argument', 'Customer ID is required');
        }

        console.log(`Getting default payment method for customer ${customerId} in ${environment} mode`);

        const stripe = getStripeInstance(environment);

        // First, get the customer to check their default payment method
        const customer = await stripe.customers.retrieve(customerId);

        if (!customer || customer.deleted) {
            throw new functions.https.HttpsError('not-found', 'Customer not found');
        }

        // Check if customer has a default payment method set
        let defaultPaymentMethodId = null;

        // Check invoice settings first (preferred default)
        if (customer.invoice_settings && customer.invoice_settings.default_payment_method) {
            defaultPaymentMethodId = customer.invoice_settings.default_payment_method;
        }
        // Fall back to default source if no invoice default is set
        else if (customer.default_source) {
            defaultPaymentMethodId = customer.default_source;
        }

        if (!defaultPaymentMethodId) {
            // No default payment method set - return null
            console.log(`No default payment method found for customer ${customerId}`);
            return { data: null };
        }

        // Retrieve the default payment method details
        let defaultPaymentMethod;

        try {
            // Try to retrieve as payment method first
            defaultPaymentMethod = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);
        } catch (error) {
            try {
                // If that fails, try to retrieve as source (legacy)
                const source = await stripe.sources.retrieve(defaultPaymentMethodId);
                // Convert source to payment method format for consistency
                defaultPaymentMethod = {
                    id: source.id,
                    type: source.type,
                    card: source.card || source,
                    customer: source.customer,
                    created: source.created,
                    is_default: true,
                    object: 'payment_method'
                };
            } catch (sourceError) {
                console.error(`Failed to retrieve default payment method ${defaultPaymentMethodId}:`, sourceError);
                return { data: null };
            }
        }

        // Add a flag to indicate this is the default
        defaultPaymentMethod.is_default = true;

        console.log(`Successfully retrieved default payment method for customer ${customerId}`);

        return { data: defaultPaymentMethod };

    } catch (error) {
        console.error('Error getting default payment method:', error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        // Handle Stripe-specific errors
        if (error.type === 'StripeCardError') {
            throw new functions.https.HttpsError('invalid-argument', error.message);
        } else if (error.type === 'StripeInvalidRequestError') {
            throw new functions.https.HttpsError('invalid-argument', error.message);
        } else if (error.type === 'StripeAPIError') {
            throw new functions.https.HttpsError('internal', 'Stripe API error occurred');
        } else if (error.type === 'StripeConnectionError') {
            throw new functions.https.HttpsError('unavailable', 'Unable to connect to Stripe');
        } else if (error.type === 'StripeAuthenticationError') {
            throw new functions.https.HttpsError('unauthenticated', 'Stripe authentication failed');
        }

        throw new functions.https.HttpsError('internal', 'An unexpected error occurred');
    }
});

// ===== ENHANCED COMPREHENSIVE STRIPE FUNCTIONS =====

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