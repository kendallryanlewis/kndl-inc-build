export interface StripeEnvironment {
  mode: 'test' | 'live';
  publishableKey: string;
  webhookEndpoint?: string;
}

export const stripeEnvironments: { [key: string]: StripeEnvironment } = {
  test: {
    mode: 'test',
    publishableKey: 'pk_test_51SBnYFB5xXNyoBvWCacEhu1suc4FZATxhFIDUEevkCY4qKpbhzPDUpXZy6heLzMrWT7BaTAmHS0eEj4dh7HLoJGj007rwjrrTb',
    webhookEndpoint: 'https://your-api.com/webhooks/stripe-test'
  },
  live: {
    mode: 'live',
    publishableKey: 'pk_live_your_live_key_here', // Replace with your actual live key when ready
    webhookEndpoint: 'https://your-api.com/webhooks/stripe-live'
  }
};

export const stripeConfig = {
  apiVersion: '2023-10-16' as const,
  currency: 'usd',
  // Default to test mode for safety
  defaultEnvironment: 'test' as const,
  // Legacy support
  publishableKey: stripeEnvironments['test'].publishableKey
};

export interface StripeCustomer {
  id: string;
  email: string;
  name: string;
  userId: string;
  companyId?: string;
  phone?: string;
  address?: any;
  default_source?: string;
  invoice_settings?: {
    default_payment_method?: string;
  };
  created: number;
  updated: number;
  metadata?: Record<string, string>;
}

export interface StripeSubscription {
  id: string;
  customerId: string;
  companyId?: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  packageType: string;
  priceId: string;
  amount: number; // in cents
  currency: string;
  interval: 'month' | 'year';
  current_period_start: number;
  current_period_end: number;
  currentPeriodEnd: number; // Alias for current_period_end
  cancel_at_period_end: boolean;
  addons?: string[];
  created: number;
  updated: number;
  metadata?: Record<string, string>;
}

export interface StripeSubscriptionItem {
  id: string;
  priceId: string;
  quantity: number;
  price: {
    id: string;
    unitAmount: number;
    currency: string;
    nickname?: string;
    product: string;
    recurring?: {
      interval: 'day' | 'week' | 'month' | 'year';
      intervalCount: number;
    };
  };
}

export interface StripePaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    exp_month: number; // Alias for expMonth
    exp_year: number; // Alias for expYear
    fingerprint: string;
    funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
  };
  billing_details?: any;
  created: number;
  metadata?: Record<string, string>;
}

export interface StripeTransaction {
  id: string;
  amount: number; // in cents
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'canceled';
  description: string;
  created: number;
  customerId?: string;
  paymentMethodId?: string;
  metadata?: {
    companyId?: string;
    userId?: string;
    subscription_id?: string;
    [key: string]: any;
  };
}

export interface StripeInvoice {
  id: string;
  number?: string; // Invoice number
  customerId: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  paid?: boolean;
  total: number; // in cents
  amountPaid?: number; // in cents
  amountDue?: number; // in cents
  currency: string;
  created: number;
  dueDate?: number;
  lines?: any;
  metadata?: Record<string, string>;
}

export interface StripeInvoiceLineItem {
  id: string;
  amount: number;
  currency: string;
  description?: string;
  period: {
    start: number;
    end: number;
  };
  priceId?: string;
  quantity?: number;
}

export interface PackagePlan {
  id: string;
  name: string;
  description?: string;
  price: number; // in cents
  currency: string;
  interval: 'month' | 'year';
  stripePriceId: string;
  features: string[];
  popular?: boolean;
  limits?: {
    websites?: number;
    sites?: number;
    storage?: string;
    bandwidth?: string;
    users?: number;
  };
}

export interface AddonPlan {
  id: string;
  name: string;
  stripePriceId: string;
  price: number; // in cents
  interval: 'month' | 'year';
  description: string;
  category: 'feature' | 'capacity' | 'support';
}

// Predefined plans - you would typically load these from your backend
export const PACKAGE_PLANS: PackagePlan[] = [
  {
    id: 'basic_monthly',
    name: 'Basic Plan',
    description: 'Perfect for small businesses and personal websites',
    stripePriceId: 'price_basic_monthly', // Replace with your actual Stripe price ID
    price: 2900, // $29.00
    currency: 'usd',
    interval: 'month',
    features: [
      'Up to 5 websites',
      '10GB storage per site',
      'Basic templates',
      'Email support',
      'SSL certificates'
    ],
    limits: {
      sites: 5,
      users: 1,
      storage: '10GB'
    }
  },
  {
    id: 'pro_monthly',
    name: 'Pro Plan',
    description: 'Great for growing businesses with multiple sites',
    stripePriceId: 'price_pro_monthly', // Replace with your actual Stripe price ID
    price: 5900, // $59.00
    currency: 'usd',
    interval: 'month',
    features: [
      'Up to 25 websites',
      '50GB storage per site',
      'Premium templates',
      'Priority email support',
      'SSL certificates',
      'Advanced analytics',
      'Custom domains'
    ],
    popular: true,
    limits: {
      sites: 25,
      users: 3,
      storage: '50GB'
    }
  },
  {
    id: 'enterprise_monthly',
    name: 'Enterprise Plan',
    description: 'Unlimited power for large organizations',
    stripePriceId: 'price_enterprise_monthly', // Replace with your actual Stripe price ID
    price: 9900, // $99.00
    currency: 'usd',
    interval: 'month',
    features: [
      'Unlimited websites',
      'Unlimited storage',
      'All templates',
      'Phone & email support',
      'SSL certificates',
      'Advanced analytics',
      'Custom domains',
      'Priority support',
      'Custom integrations'
    ],
    limits: {
      sites: -1, // unlimited
      users: -1, // unlimited
      storage: 'Unlimited'
    }
  }
];

export const ADDON_PLANS: AddonPlan[] = [
  {
    id: 'extra_sites_10',
    name: '10 Extra Sites',
    stripePriceId: 'price_extra_sites_10', // Replace with your actual Stripe price ID
    price: 1000, // $10.00
    interval: 'month',
    description: 'Add 10 additional sites to your current plan',
    category: 'capacity'
  },
  {
    id: 'premium_support',
    name: 'Premium Support',
    stripePriceId: 'price_premium_support', // Replace with your actual Stripe price ID
    price: 1500, // $15.00
    interval: 'month',
    description: '24/7 priority support with dedicated account manager',
    category: 'support'
  },
  {
    id: 'white_label',
    name: 'White Label',
    stripePriceId: 'price_white_label', // Replace with your actual Stripe price ID
    price: 2500, // $25.00
    interval: 'month',
    description: 'Remove our branding and use your own',
    category: 'feature'
  },
  {
    id: 'extra_storage_100gb',
    name: '100GB Extra Storage',
    stripePriceId: 'price_extra_storage_100gb', // Replace with your actual Stripe price ID
    price: 800, // $8.00
    interval: 'month',
    description: 'Add 100GB of additional storage',
    category: 'capacity'
  }
];

export const STRIPE_WEBHOOKS = {
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  PAYMENT_METHOD_ATTACHED: 'payment_method.attached',
  PAYMENT_METHOD_DETACHED: 'payment_method.detached'
};