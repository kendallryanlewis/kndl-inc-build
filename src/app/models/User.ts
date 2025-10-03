export interface User {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    platforms: UserPlatform[];
    attachedSites?: AttachedSite[]; // New property for attached sites
    onboardingCompleted?: boolean;
    role: 'Admin' | 'User' | 'Manager';
    status: 'Active' | 'Deleted' | 'Invited';
    joinDate?: Date;
    lastLogin?: Date;
    location?: string; // Added location property
    bio?: string;
    // Stripe integration
    stripeCustomerId?: string;
    companyId?: string;
}

export interface UserPlatform {
    id: string;
    name: string;
    url: string;
    defaultUserEmail: string;
    company?: string;
    dateCreated: Date;
    dateUpdated: Date;
    description?: string;
    platformType?: string;
    status?: string;
    // Add more fields as needed for site/platform details
}

// Company/Site interfaces for the new Sites tab functionality
export interface Company {
    id: string;
    name: string;
    website?: string;
    industry?: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    billing?: BillingInfo;
    links?: CompanyLink[];
    status: 'Active' | 'Inactive' | 'Suspended';
    stripeCustomerId?: string;
    stripeCustomerData?: any; // Full Stripe customer object for reference
    dateCreated?: Date;
    dateUpdated?: Date;
    source?: 'firestore' | 'stripe-only'; // Track where the company data originated
}

export interface BillingInfo {
    billingEmail?: string;
    billingAddress?: string;
    paymentMethod?: string;
    subscriptionPlan?: string;
    subscriptionStatus?: 'Active' | 'Cancelled' | 'Past Due' | 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'N/A';
    nextBillingDate?: Date;
    monthlyRate?: number;
}

export interface CompanyLink {
    id: string;
    name: string;
    url: string;
    type: 'website' | 'social' | 'documentation' | 'support' | 'other';
    description?: string;
}

export interface AttachedSite {
    companyId: string;
    companyName: string;
    dateAttached: Date;
    role?: string; // User's role for this specific site
    permissions?: string[]; // Specific permissions for this site
    notes?: string;
    customerId?: string; // Stripe customer ID for this site
}
