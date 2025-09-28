# Stripe Integration Setup Guide

## 1. Firebase Functions Setup

### Install Dependencies
```bash
cd functions
npm install stripe firebase-functions firebase-admin
```

### Configure Stripe Keys
Set your Stripe keys in Firebase Functions config:

```bash
# For Test Mode
firebase functions:config:set stripe.test_secret_key="sk_test_your_test_secret_key_here"

# For Live Mode (when ready)
firebase functions:config:set stripe.live_secret_key="sk_live_your_live_secret_key_here"
```

### Deploy Functions
```bash
firebase deploy --only functions
```

## 2. Frontend Configuration

### Update API Endpoints
Make sure your Angular app points to the correct Firebase Functions URLs. Update these in your `environment.ts`:

```typescript
export const environment = {
  production: false,
  firebase: {
    // your firebase config
  },
  api: {
    baseUrl: 'https://your-region-your-project.cloudfunctions.net'
  }
};
```

### Update HTTP Service Calls
In your `StripeService`, make sure the HTTP calls point to your Firebase Functions:

```typescript
// Instead of '/api/stripe/products'
// Use: `${environment.api.baseUrl}/createStripeProduct`

createProduct(productData: any): Observable<StripeProduct> {
  const createProduct = this.fns.httpsCallable('createStripeProduct');
  return createProduct({
    ...productData,
    environment: this.getCurrentEnvironment().mode
  }).pipe(
    map(result => {
      this.loadProducts();
      return result.data;
    }),
    catchError(this.handleError)
  );
}
```

## 3. Security Rules

### Firestore Rules
Make sure your Firestore rules allow authenticated users to read/write subscription plans:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to manage subscription plans
    match /subscriptionPlans/{planId} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

## 4. Testing the Integration

### Test Mode First
1. Start with test mode (default configuration)
2. Create a subscription plan in your dashboard
3. Click "Sync with Stripe" 
4. Verify the product appears in your Stripe Test Dashboard
5. Check that product ID and price ID are saved to your plan

### Live Mode Setup
1. Get your live Stripe keys from Stripe Dashboard
2. Set live secret key: `firebase functions:config:set stripe.live_secret_key="sk_live_..."`
3. Deploy functions: `firebase deploy --only functions`
4. Switch to live mode in your dashboard
5. Sync existing plans or create new ones

## 5. Webhook Setup (Recommended)

For production use, set up webhooks to keep your local data in sync with Stripe:

### Create Webhook Endpoint
```javascript
// functions/stripe-webhooks.js
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'product.updated':
      // Update your local database
      break;
    case 'price.updated':
      // Update your local database
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});
```

### Add Webhook URL to Stripe
1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://your-region-your-project.cloudfunctions.net/stripeWebhook`
3. Select events: `product.*`, `price.*`

## 6. Error Handling

### Common Issues
- **CORS errors**: Make sure your Firebase Functions are properly configured
- **Authentication errors**: Ensure users are logged in before calling functions
- **Rate limits**: Stripe has API rate limits, implement retry logic
- **HTTPS requirement**: Live mode requires HTTPS deployment

### Monitoring
- Check Firebase Functions logs for errors
- Monitor Stripe Dashboard for API usage
- Set up alerts for failed webhook deliveries

## 7. Best Practices

### Data Consistency
- Always sync changes both ways (local DB ↔ Stripe)
- Use Stripe webhooks for real-time updates
- Implement retry logic for failed operations

### Security
- Never expose secret keys in frontend code
- Use Firebase Functions for all Stripe API calls
- Implement proper authentication checks
- Validate all input data

### Performance
- Cache Stripe data locally when possible
- Use pagination for large datasets
- Implement loading states in UI
- Handle offline scenarios gracefully

## 8. Deployment Checklist

### Before Going Live
- [ ] Test all CRUD operations in test mode
- [ ] Verify webhook endpoints work
- [ ] Set up monitoring and alerting
- [ ] Configure live Stripe keys
- [ ] Deploy over HTTPS
- [ ] Test live mode functionality
- [ ] Set up backup/recovery procedures

### Production Monitoring
- [ ] Monitor Firebase Functions usage
- [ ] Track Stripe API usage and costs
- [ ] Set up error alerting
- [ ] Regular backup of subscription data
- [ ] Monitor sync status between systems

Your Stripe integration is now ready for production use! 🚀