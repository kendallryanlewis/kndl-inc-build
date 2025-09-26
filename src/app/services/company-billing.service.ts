import { Injectable } from '@angular/core';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc, getDoc, query, orderBy, where, limit } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { CompanyBilling, PastBilling, FutureBilling, OverduePayment } from '../models/company-billing';

@Injectable({
    providedIn: 'root'
})
export class CompanyBillingService {
    private firestore = getFirestore();
    private auth = getAuth();
    private collectionName = 'companyBillings';

    constructor() { }

    /**
     * Check if user is authenticated
     */
    private async ensureAuthenticated(): Promise<boolean> {
        return new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(this.auth, (user) => {
                unsubscribe();
                resolve(!!user);
            });
        });
    }

    /**
     * Get all companies with billing data
     */
    async getAllCompanies(): Promise<CompanyBilling[]> {
        try {
            // For development, we'll skip auth check
            // In production, uncomment the following lines:
            // const isAuthenticated = await this.ensureAuthenticated();
            // if (!isAuthenticated) {
            //   throw new Error('User must be authenticated to access company data');
            // }

            const querySnapshot = await getDocs(collection(this.firestore, this.collectionName));
            const companies: CompanyBilling[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data() as Omit<CompanyBilling, 'id'>;
                companies.push({
                    id: doc.id,
                    ...data
                });
            });

            return companies.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
        } catch (error) {
            console.error('Error fetching companies:', error);

            // If it's a permissions error, provide helpful guidance
            if (error instanceof Error && error.message.includes('permissions')) {
                console.error('🔒 Firebase Permissions Error: Please update your Firestore security rules');
                console.error('📝 Go to Firebase Console > Firestore Database > Rules and update them');
                console.error('💡 See firestore-rules.txt for the correct rules');
            }

            throw error;
        }
    }

    /**
     * Get a specific company by ID
     */
    async getCompanyById(id: string): Promise<CompanyBilling | null> {
        try {
            const docRef = doc(this.firestore, this.collectionName, id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                } as CompanyBilling;
            }

            return null;
        } catch (error) {
            console.error('Error fetching company:', error);
            throw error;
        }
    }

    /**
     * Add a new company
     */
    async addCompany(company: Omit<CompanyBilling, 'id'>): Promise<string> {
        try {
            const now = new Date().toISOString();
            const companyData = {
                ...company,
                createdDate: now,
                lastModified: now
            };

            const docRef = await addDoc(collection(this.firestore, this.collectionName), companyData);
            return docRef.id;
        } catch (error) {
            console.error('Error adding company:', error);
            throw error;
        }
    }

    /**
     * Update an existing company
     */
    async updateCompany(id: string, updates: Partial<CompanyBilling>): Promise<void> {
        try {
            const docRef = doc(this.firestore, this.collectionName, id);
            await updateDoc(docRef, {
                ...updates,
                lastModified: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating company:', error);
            throw error;
        }
    }

    /**
     * Delete a company
     */
    async deleteCompany(id: string): Promise<void> {
        try {
            await deleteDoc(doc(this.firestore, this.collectionName, id));
        } catch (error) {
            console.error('Error deleting company:', error);
            throw error;
        }
    }

    /**
     * Get recent billings across all companies
     */
    async getRecentBillings(limitCount: number = 10): Promise<any[]> {
        try {
            const companies = await this.getAllCompanies();
            const recentBillings: any[] = [];

            companies.forEach(company => {
                company.pastBillings.forEach(billing => {
                    recentBillings.push({
                        id: billing.invoiceNumber,
                        customer: company.companyName,
                        service: billing.service,
                        amount: billing.amount,
                        date: billing.billingDate,
                        status: billing.status,
                        paidDate: billing.paidDate
                    });
                });
            });

            // Sort by billing date and limit results
            return recentBillings
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, limitCount);
        } catch (error) {
            console.error('Error fetching recent billings:', error);
            throw error;
        }
    }

    /**
     * Get overdue payments across all companies
     */
    async getOverduePayments(): Promise<any[]> {
        try {
            const companies = await this.getAllCompanies();
            const overduePayments: any[] = [];

            companies.forEach(company => {
                company.overduePayments.forEach(overdue => {
                    overduePayments.push({
                        id: overdue.invoiceNumber,
                        customer: company.companyName,
                        service: overdue.service,
                        amount: overdue.remainingAmount,
                        dueDate: overdue.originalDueDate,
                        overdueDays: overdue.daysPastDue,
                        status: overdue.status,
                        priority: overdue.priority
                    });
                });
            });

            // Sort by priority and days past due
            return overduePayments.sort((a, b) => {
                const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
                const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
                const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;

                if (aPriority !== bPriority) {
                    return bPriority - aPriority;
                }

                return b.overdueDays - a.overdueDays;
            });
        } catch (error) {
            console.error('Error fetching overdue payments:', error);
            throw error;
        }
    }

    /**
     * Get future billings across all companies
     */
    async getFutureBillings(): Promise<any[]> {
        try {
            const companies = await this.getAllCompanies();
            const futureBillings: any[] = [];

            companies.forEach(company => {
                company.futureBillings.forEach(future => {
                    futureBillings.push({
                        id: future.scheduledInvoiceNumber,
                        customer: company.companyName,
                        service: future.service,
                        amount: future.estimatedAmount,
                        scheduledDate: future.scheduledDate,
                        dueDate: future.dueDate,
                        status: future.status,
                        isRecurring: future.isRecurring
                    });
                });
            });

            // Sort by scheduled date
            return futureBillings
                .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
        } catch (error) {
            console.error('Error fetching future billings:', error);
            throw error;
        }
    }

    /**
     * Calculate dashboard metrics
     */
    async getDashboardMetrics(): Promise<any> {
        try {
            const companies = await this.getAllCompanies();

            let totalRevenue = 0;
            let monthlyRecurringRevenue = 0;
            let totalOverdue = 0;
            let futureRevenue = 0;

            companies.forEach(company => {
                // Calculate total revenue from past billings
                company.pastBillings.forEach(billing => {
                    if (billing.status === 'paid') {
                        totalRevenue += billing.paidAmount;
                    }
                });

                // Calculate overdue amounts
                company.overduePayments.forEach(overdue => {
                    totalOverdue += overdue.remainingAmount;
                });

                // Calculate future revenue
                company.futureBillings.forEach(future => {
                    futureRevenue += future.estimatedAmount;
                });

                // Add to monthly recurring revenue if active
                if (company.isActive && company.billingFrequency === 'monthly') {
                    monthlyRecurringRevenue += company.averageMonthlyRevenue;
                }
            });

            return {
                totalRevenue,
                monthlyRecurringRevenue,
                totalOverdue,
                futureRevenue,
                activeCompanies: companies.filter(c => c.isActive).length,
                totalCompanies: companies.length
            };
        } catch (error) {
            console.error('Error calculating dashboard metrics:', error);
            throw error;
        }
    }

    /**
     * Create dummy companies for testing
     */
    async createDummyCompanies(): Promise<void> {
        const dummyCompanies: Omit<CompanyBilling, 'id'>[] = [
            {
                companyName: 'TechStart Solutions',
                contactEmail: 'contact@techstart.com',
                contactPhone: '(555) 123-4567',
                address: {
                    street: '123 Innovation Drive',
                    city: 'San Francisco',
                    state: 'CA',
                    zipCode: '94105'
                },
                services: ['Web Development', 'Brand Kit', 'SEO'],
                contractStartDate: '2024-01-15',
                paymentMethod: 'credit_card',
                billingFrequency: 'monthly',
                pastBillings: [
                    {
                        id: 'PB001',
                        invoiceNumber: 'INV-2024-001',
                        amount: 5000,
                        paidAmount: 5000,
                        service: 'Web Development',
                        description: 'Custom website development',
                        billingDate: '2024-01-15',
                        paidDate: '2024-01-20',
                        dueDate: '2024-02-15',
                        status: 'paid',
                        taxAmount: 450
                    },
                    {
                        id: 'PB002',
                        invoiceNumber: 'INV-2024-002',
                        amount: 2500,
                        paidAmount: 2500,
                        service: 'Brand Kit',
                        description: 'Complete brand identity package',
                        billingDate: '2024-02-15',
                        paidDate: '2024-02-18',
                        dueDate: '2024-03-15',
                        status: 'paid',
                        taxAmount: 225
                    }
                ],
                futureBillings: [
                    {
                        id: 'FB001',
                        scheduledInvoiceNumber: 'INV-2025-010',
                        estimatedAmount: 1200,
                        service: 'Monthly Maintenance',
                        description: 'Website maintenance and updates',
                        scheduledDate: '2025-10-15',
                        dueDate: '2025-11-15',
                        status: 'scheduled',
                        isRecurring: true,
                        recurringFrequency: 'monthly'
                    }
                ],
                overduePayments: [],
                createdDate: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                isActive: true,
                totalLifetimeValue: 7500,
                averageMonthlyRevenue: 1200
            },
            {
                companyName: 'Local Bistro Co.',
                contactEmail: 'manager@localbistro.com',
                contactPhone: '(555) 987-6543',
                address: {
                    street: '456 Main Street',
                    city: 'Austin',
                    state: 'TX',
                    zipCode: '73301'
                },
                services: ['Web Development', 'Digital Marketing'],
                contractStartDate: '2024-03-01',
                paymentMethod: 'bank_transfer',
                billingFrequency: 'monthly',
                pastBillings: [
                    {
                        id: 'PB003',
                        invoiceNumber: 'INV-2024-003',
                        amount: 3500,
                        paidAmount: 3500,
                        service: 'Web Development',
                        description: 'Restaurant website with online ordering',
                        billingDate: '2024-03-01',
                        paidDate: '2024-03-05',
                        dueDate: '2024-04-01',
                        status: 'paid',
                        taxAmount: 315
                    }
                ],
                futureBillings: [
                    {
                        id: 'FB002',
                        scheduledInvoiceNumber: 'INV-2025-011',
                        estimatedAmount: 800,
                        service: 'Digital Marketing',
                        description: 'Monthly social media management',
                        scheduledDate: '2025-10-01',
                        dueDate: '2025-11-01',
                        status: 'scheduled',
                        isRecurring: true,
                        recurringFrequency: 'monthly'
                    }
                ],
                overduePayments: [
                    {
                        id: 'OD001',
                        invoiceNumber: 'INV-2024-008',
                        originalAmount: 800,
                        remainingAmount: 800,
                        service: 'Digital Marketing',
                        description: 'September marketing services',
                        originalDueDate: '2024-09-30',
                        daysPastDue: 22,
                        contactAttempts: 3,
                        status: 'overdue',
                        priority: 'medium',
                        lastContactDate: '2024-10-15'
                    }
                ],
                createdDate: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                isActive: true,
                totalLifetimeValue: 3500,
                averageMonthlyRevenue: 800
            },
            {
                companyName: 'Fitness First Gym',
                contactEmail: 'admin@fitnessfirst.com',
                contactPhone: '(555) 456-7890',
                address: {
                    street: '789 Health Avenue',
                    city: 'Denver',
                    state: 'CO',
                    zipCode: '80202'
                },
                services: ['Web Development', 'Brand Kit', 'Digital Marketing'],
                contractStartDate: '2023-12-01',
                paymentMethod: 'credit_card',
                billingFrequency: 'quarterly',
                pastBillings: [
                    {
                        id: 'PB004',
                        invoiceNumber: 'INV-2023-015',
                        amount: 6500,
                        paidAmount: 6500,
                        service: 'Web Development',
                        description: 'Gym website with member portal',
                        billingDate: '2023-12-01',
                        paidDate: '2023-12-10',
                        dueDate: '2024-01-01',
                        status: 'paid',
                        taxAmount: 585
                    },
                    {
                        id: 'PB005',
                        invoiceNumber: 'INV-2024-005',
                        amount: 3000,
                        paidAmount: 2000,
                        service: 'Digital Marketing',
                        description: 'Q1 2024 marketing campaign',
                        billingDate: '2024-03-01',
                        paidDate: '2024-03-15',
                        dueDate: '2024-04-01',
                        status: 'partially_paid',
                        taxAmount: 270
                    }
                ],
                futureBillings: [
                    {
                        id: 'FB003',
                        scheduledInvoiceNumber: 'INV-2025-012',
                        estimatedAmount: 3500,
                        service: 'Digital Marketing',
                        description: 'Q4 2025 marketing campaign',
                        scheduledDate: '2025-12-01',
                        dueDate: '2026-01-01',
                        status: 'scheduled',
                        isRecurring: true,
                        recurringFrequency: 'quarterly'
                    }
                ],
                overduePayments: [
                    {
                        id: 'OD002',
                        invoiceNumber: 'INV-2024-005',
                        originalAmount: 3000,
                        remainingAmount: 1000,
                        service: 'Digital Marketing',
                        description: 'Outstanding balance from Q1 campaign',
                        originalDueDate: '2024-04-01',
                        daysPastDue: 174,
                        contactAttempts: 8,
                        status: 'in_collections',
                        priority: 'high',
                        lastContactDate: '2024-09-15',
                        penaltyAmount: 100,
                        interestAmount: 50
                    }
                ],
                createdDate: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                isActive: true,
                totalLifetimeValue: 8500,
                averageMonthlyRevenue: 1167
            }
        ];

        try {
            for (const company of dummyCompanies) {
                await this.addCompany(company);
            }
            console.log('Dummy companies created successfully');
        } catch (error) {
            console.error('Error creating dummy companies:', error);
            throw error;
        }
    }
}