export interface CompanyBilling {
    id?: string;
    companyName: string;
    contactEmail: string;
    contactPhone?: string;
    address?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
    };

    // Billing Information
    pastBillings: PastBilling[];
    futureBillings: FutureBilling[];
    overduePayments: OverduePayment[];

    // Company Details
    services: string[];
    contractStartDate: string;
    contractEndDate?: string;
    paymentMethod: 'credit_card' | 'bank_transfer' | 'check' | 'cash';
    billingFrequency: 'monthly' | 'quarterly' | 'annually' | 'one_time';

    // Metadata
    createdDate: string;
    lastModified: string;
    isActive: boolean;
    notes?: string;
    totalLifetimeValue: number;
    averageMonthlyRevenue: number;
}

export interface PastBilling {
    id: string;
    invoiceNumber: string;
    amount: number;
    paidAmount: number;
    service: string;
    description?: string;
    billingDate: string;
    paidDate?: string;
    dueDate: string;
    status: 'paid' | 'partially_paid' | 'cancelled' | 'refunded';
    paymentMethod?: string;
    taxAmount?: number;
    discountAmount?: number;
    notes?: string;
}

export interface FutureBilling {
    id: string;
    scheduledInvoiceNumber: string;
    estimatedAmount: number;
    service: string;
    description?: string;
    scheduledDate: string;
    dueDate: string;
    status: 'scheduled' | 'draft' | 'pending_approval';
    isRecurring: boolean;
    recurringFrequency?: 'monthly' | 'quarterly' | 'annually';
    notes?: string;
}

export interface OverduePayment {
    id: string;
    invoiceNumber: string;
    originalAmount: number;
    remainingAmount: number;
    service: string;
    description?: string;
    originalDueDate: string;
    daysPastDue: number;
    lastContactDate?: string;
    contactAttempts: number;
    status: 'overdue' | 'in_collections' | 'payment_plan' | 'written_off';
    priority: 'low' | 'medium' | 'high' | 'critical';
    notes?: string;
    penaltyAmount?: number;
    interestAmount?: number;
}