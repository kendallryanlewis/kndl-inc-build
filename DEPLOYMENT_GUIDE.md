# Firebase Functions Deployment Guide

## 🚨 CRITICAL: Environment Setup Required

Before deploying Firebase functions, you MUST have the environment variables configured.

### Step 1: Environment File Setup
```bash
cd functions/
cp .env.example .env
```

Then edit `.env` with your actual API keys:
- `STRIPE_TEST_SECRET_KEY=sk_test_your_actual_test_key`
- `STRIPE_LIVE_SECRET_KEY=sk_live_your_actual_live_key`

### Step 2: Firebase Configuration
Set up Firebase functions config as backup:
```bash
firebase functions:config:set stripe.test_secret_key="your_test_key_here"
firebase functions:config:set stripe.live_secret_key="your_live_key_here"
```

### Step 3: Deploy Functions
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:getStripePaymentMethods

# Force deploy (use with caution)
firebase deploy --only functions --force
```

## 🔧 Recent Critical Fixes Applied

1. **Node.js 22 Upgrade**: Updated `functions/package.json` engines
2. **Data Handling Fix**: Fixed nested `data.data` structure in Firebase callable functions
3. **CORS Configuration**: Proper CORS setup for localhost development
4. **Environment Handling**: Improved environment variable management

## 🛡️ Security Notes

- ✅ `.env` files are in `.gitignore` - DO NOT commit them
- ✅ Use `.env.example` as template for new setups
- ✅ Keep Stripe keys secure and rotate them periodically
- ✅ Test functions work in both test and live modes

## 🔍 Testing Functions

Test connection:
```bash
curl -X POST "https://us-central1-kndl-3663b.cloudfunctions.net/testStripeConnection" \
  -H "Content-Type: application/json" \
  -d '{"data": {"environment": "test"}}'
```

## 📋 Function List (62 functions total)

Key functions that were recently fixed:
- `getStripePaymentMethods` - Fixed data.data parameter handling
- `getCustomerInvoices` - Fixed data.data parameter handling + enhanced debugging
- `testStripeConnection` - Connection testing
- `createStripeCustomer` - Customer management
- All other 58 Stripe integration functions

## 🚨 If Deployment Fails

1. Check environment variables are set
2. Verify Firebase CLI is logged in: `firebase login`
3. Check function logs: `firebase functions:log`
4. Verify Node.js version matches package.json (22)
5. Check for CORS issues in browser console