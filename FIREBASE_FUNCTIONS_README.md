# Firebase Functions Critical Information

## ⚠️ NEVER DELETE OR OVERWRITE THESE CRITICAL FILES:

### 🔥 Firebase Functions
- `functions/stripe-products.js` - Contains 62 Stripe integration functions with recent fixes
- `functions/package.json` - Node.js 22 configuration
- `functions/.env.example` - Environment template

### 🛡️ Protection Scripts
- `setup-functions.sh` - Quick setup for new environments
- `recover-functions.sh` - Emergency recovery script
- `DEPLOYMENT_GUIDE.md` - Complete deployment instructions

### 🔧 Recent Critical Fixes (Sept 30, 2025)
1. **Fixed Firebase Functions Parameter Handling**: Corrected `data.data` nested structure
2. **Enhanced CORS Configuration**: Proper localhost support
3. **Node.js 22 Upgrade**: Updated runtime for better performance
4. **Comprehensive Error Handling**: Enhanced debugging for production

## 🚨 Emergency Recovery

If functions get accidentally deleted or overwritten:

1. **Quick Recovery**: Run `./recover-functions.sh`
2. **Manual Recovery**: Copy from `backups/functions-YYYYMMDD/`
3. **Fresh Setup**: Run `./setup-functions.sh`

## 📋 Function List (62 total)

Critical functions with recent fixes:
- `getStripePaymentMethods` - Fixed parameter handling
- `getCustomerInvoices` - Fixed parameter handling + debugging
- `testStripeConnection` - Connection testing
- Plus 59 other Stripe integration functions

## 🔐 Environment Variables Required

```bash
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_LIVE_SECRET_KEY=sk_live_...
FIREBASE_PROJECT_ID=kndl-3663b
```

## 📞 Support

If you need help recovering or setting up functions:
1. Check `DEPLOYMENT_GUIDE.md`
2. Run recovery scripts
3. Review git history for recent changes