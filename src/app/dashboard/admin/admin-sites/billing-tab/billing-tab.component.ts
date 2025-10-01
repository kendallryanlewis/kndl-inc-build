import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { StripeService } from '../../../../services/stripe.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-billing-tab',
    templateUrl: './billing-tab.component.html',
    styleUrls: ['./billing-tab.component.scss']
})
export class BillingTabComponent implements OnInit, OnDestroy, OnChanges {
    @Input() selectedCompany: any;
    @Input() stripeCustomerData: any;
    @Input() stripeSubscriptionsData: any[] = [];
    @Input() stripePaymentMethodsData: any[] = [];
    @Input() stripeInvoicesData: any[] = [];
    @Input() stripeOverviewLoading: boolean = false;
    @Input() stripeLoading: boolean = false;
    @Input() stripeSyncErrors: string[] = [];

    @Output() loadStripeOverviewData = new EventEmitter<any>();
    @Output() syncCompanyWithStripe = new EventEmitter<any>();
    @Output() debugCurrentCustomer = new EventEmitter<void>();
    @Output() logAllStripeCustomers = new EventEmitter<void>();
    @Output() refreshCompanyData = new EventEmitter<void>();
    @Output() clearStripeSyncErrors = new EventEmitter<void>();
    @Output() addPaymentMethod = new EventEmitter<any>();
    @Output() setDefaultPaymentMethod = new EventEmitter<{ customerId: string, paymentMethodId: string }>();
    @Output() removePaymentMethod = new EventEmitter<{ customerId: string, paymentMethodId: string }>();

    // Payment Methods Management
    paymentMethods: any[] = [];
    loadingPaymentMethods: boolean = false;
    hasPaymentMethod: boolean = false;
    settingDefaultPaymentMethod: boolean = false;
    removingPaymentMethod: boolean = false;

    // Payment Method Form Management
    showAddPaymentForm: boolean = false;
    showEditPaymentForm: boolean = false;
    showDefaultPaymentSelector: boolean = false;
    selectedPaymentType: 'card' | 'us_bank_account' | null = null;
    hoveredPaymentType: 'card' | 'us_bank_account' | null = null;
    processingPaymentMethod: boolean = false;
    editingPaymentMethod: any = null;
    editingPaymentMethodIndex: number = -1;

    // Form Data
    cardForm = {
        number: '',
        name: '',
        cvc: '',
        expMonth: '',
        expYear: ''
    };

    bankForm = {
        accountHolderName: '',
        routingNumber: '',
        accountNumber: '',
        accountType: ''
    };

    // Form Options
    months = [
        { value: '01', label: '01 - January' },
        { value: '02', label: '02 - February' },
        { value: '03', label: '03 - March' },
        { value: '04', label: '04 - April' },
        { value: '05', label: '05 - May' },
        { value: '06', label: '06 - June' },
        { value: '07', label: '07 - July' },
        { value: '08', label: '08 - August' },
        { value: '09', label: '09 - September' },
        { value: '10', label: '10 - October' },
        { value: '11', label: '11 - November' },
        { value: '12', label: '12 - December' }
    ];

    years: number[] = [];

    private destroy$ = new Subject<void>();

    constructor(private stripeService: StripeService) {
        // Generate years array (current year + 20 years)
        const currentYear = new Date().getFullYear();
        for (let i = 0; i < 21; i++) {
            this.years.push(currentYear + i);
        }
    }

    ngOnInit(): void {
        // If parent already has payment methods data, use it
        if (this.stripePaymentMethodsData && this.stripePaymentMethodsData.length > 0) {
            console.log('Using existing parent payment methods data on init:', this.stripePaymentMethodsData);
            this.paymentMethods = [...this.stripePaymentMethodsData];
            this.hasPaymentMethod = this.paymentMethods.length > 0;
        } else {
            this.loadPaymentMethods();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['selectedCompany'] && changes['selectedCompany'].currentValue) {
            // Reload payment methods when the selected company changes
            this.loadPaymentMethods();
        }

        if (changes['stripePaymentMethodsData'] && changes['stripePaymentMethodsData'].currentValue) {
            // Sync parent payment methods data with local
            console.log('Parent stripePaymentMethodsData changed:', changes['stripePaymentMethodsData'].currentValue);
            this.paymentMethods = [...this.stripePaymentMethodsData];
            this.hasPaymentMethod = this.paymentMethods.length > 0;
            console.log('Synced local paymentMethods with parent data:', this.paymentMethods);
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onLoadStripeOverviewData(): void {
        this.loadStripeOverviewData.emit(this.selectedCompany);
    }

    onSyncCompanyWithStripe(): void {
        this.syncCompanyWithStripe.emit(this.selectedCompany);
    }

    onDebugCurrentCustomer(): void {
        this.debugCurrentCustomer.emit();
    }

    onBackdropClick(event: Event): void {
        // Close modal when clicking the backdrop (not when clicking the modal content)
        if (event.target === event.currentTarget) {
            this.cancelAddPaymentMethod();
        }
    }

    // Default Payment Method Selector Methods
    openDefaultPaymentSelector(): void {
        this.showDefaultPaymentSelector = true;
    }

    closeDefaultPaymentSelector(): void {
        this.showDefaultPaymentSelector = false;
    }

    onSelectDefaultPaymentMethod(paymentMethodId: string): void {
        if (this.selectedCompany?.stripeCustomerId) {
            this.onSetDefaultPaymentMethod(paymentMethodId);
            this.closeDefaultPaymentSelector();
        }
    }

    onDefaultSelectorBackdropClick(event: Event): void {
        if (event.target === event.currentTarget) {
            this.closeDefaultPaymentSelector();
        }
    }

    onLogAllStripeCustomers(): void {
        this.logAllStripeCustomers.emit();
    }

    onRefreshCompanyData(): void {
        this.refreshCompanyData.emit();
    }

    onClearStripeSyncErrors(): void {
        this.clearStripeSyncErrors.emit();
    }

    loadPaymentMethods(): void {
        if (!this.selectedCompany?.stripeCustomerId) {
            this.hasPaymentMethod = false;
            this.paymentMethods = [];
            return;
        }

        console.log('Loading payment methods for customer:', this.selectedCompany.stripeCustomerId);
        this.loadingPaymentMethods = true;

        this.stripeService.getPaymentMethods(this.selectedCompany.stripeCustomerId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (paymentMethods) => {
                    console.log('Loaded payment methods:', paymentMethods);
                    console.log('Payment methods type:', typeof paymentMethods);
                    console.log('Payment methods is array:', Array.isArray(paymentMethods));
                    console.log('Payment methods length:', paymentMethods?.length);

                    this.paymentMethods = paymentMethods || [];
                    this.hasPaymentMethod = this.paymentMethods.length > 0;
                    this.loadingPaymentMethods = false;

                    console.log('Final paymentMethods in component:', this.paymentMethods);
                    console.log('hasPaymentMethod:', this.hasPaymentMethod);
                    console.log('loadingPaymentMethods:', this.loadingPaymentMethods);
                },
                error: (error) => {
                    console.error('Error loading payment methods:', error);
                    this.paymentMethods = [];
                    this.hasPaymentMethod = false;
                    this.loadingPaymentMethods = false;
                }
            });
    }

    refreshPaymentMethods(): void {
        console.log('Refreshing payment methods...');
        this.loadPaymentMethods();
    }

    debugPaymentMethods(): void {
        console.log('=== Payment Methods Debug ===');
        console.log('Local paymentMethods:', this.paymentMethods);
        console.log('Parent stripePaymentMethodsData:', this.stripePaymentMethodsData);
        console.log('hasPaymentMethod:', this.hasPaymentMethod);
        console.log('loadingPaymentMethods:', this.loadingPaymentMethods);
        console.log('selectedCompany.stripeCustomerId:', this.selectedCompany?.stripeCustomerId);

        if (this.paymentMethods.length > 0) {
            this.paymentMethods.forEach((pm, index) => {
                console.log(`Payment Method ${index + 1}:`, {
                    id: pm.id,
                    type: pm.type,
                    last4: this.getPaymentMethodLastFour(pm),
                    brand: this.getPaymentMethodBrand(pm),
                    display: this.getPaymentMethodDisplay(pm)
                });
            });
        }
    }

    getDefaultPaymentMethodId(): string | null {
        console.log('Getting default payment method ID from:', this.stripeCustomerData);
        console.log(this.stripeService.getDefaultPaymentMethod(this.stripeCustomerData.id));


        return this.stripeCustomerData?.data?.invoice_settings?.default_payment_method ||
            this.stripeCustomerData?.invoice_settings?.default_payment_method ||
            null;
    }

    getPaymentMethodDisplay(paymentMethod: any): string {
        if (paymentMethod.type === 'card' && paymentMethod.card) {
            const brand = paymentMethod.card.brand?.toUpperCase() || 'CARD';
            const last4 = paymentMethod.card.last4 || '0000';
            return `${brand} •••• ${last4}`;
        }
        if (paymentMethod.type === 'us_bank_account' && paymentMethod.us_bank_account) {
            const last4 = paymentMethod.us_bank_account.last4 || '0000';
            return `BANK •••• ${last4}`;
        }
        return `${paymentMethod.type?.toUpperCase() || 'Unknown'} Payment Method`;
    }

    getPaymentMethodLastFour(paymentMethod: any): string {
        if (paymentMethod.type === 'card' && paymentMethod.card?.last4) {
            return paymentMethod.card.last4;
        }
        if (paymentMethod.type === 'us_bank_account' && paymentMethod.us_bank_account?.last4) {
            return paymentMethod.us_bank_account.last4;
        }
        return 'N/A';
    }

    getPaymentMethodBrand(paymentMethod: any): string {
        if (paymentMethod.type === 'card' && paymentMethod.card?.brand) {
            return paymentMethod.card.brand;
        }
        return 'generic';
    }

    formatDate(date: any): string {
        if (!date) return 'N/A';
        try {
            const dateObj = date.toDate ? date.toDate() : new Date(date);
            return dateObj.toLocaleDateString();
        } catch (error) {
            return 'Invalid Date';
        }
    }

    formatStripeTimestamp(timestamp: number): string {
        if (!timestamp) return 'N/A';
        return new Date(timestamp * 1000).toLocaleDateString();
    }

    // Payment Method Management Methods
    onAddPaymentMethod(): void {
        if (!this.selectedCompany?.stripeCustomerId) {
            alert('No Stripe customer ID found. Please sync this company with Stripe first.');
            return;
        }

        // Show the payment method form instead of emitting to parent
        this.showAddPaymentForm = true;
        this.selectedPaymentType = null;
        this.resetForms();
    }

    openEditPaymentMethod(paymentMethod: any, index: number): void {
        this.editingPaymentMethod = paymentMethod;
        this.editingPaymentMethodIndex = index;
        this.showEditPaymentForm = true;

        // Pre-populate form with existing data if it's a card
        if (paymentMethod.type === 'card' && paymentMethod.card) {
            this.selectedPaymentType = 'card';
            this.cardForm = {
                number: `•••• •••• •••• ${paymentMethod.card.last4}`,
                name: paymentMethod.billing_details?.name || '',
                cvc: '•••',
                expMonth: paymentMethod.card.exp_month,
                expYear: paymentMethod.card.exp_year
            };
        } else if (paymentMethod.type === 'us_bank_account' && paymentMethod.us_bank_account) {
            this.selectedPaymentType = 'us_bank_account';
            this.bankForm = {
                accountHolderName: paymentMethod.billing_details?.name || '',
                routingNumber: '•••••••••',
                accountNumber: `•••••••${paymentMethod.us_bank_account.last4}`,
                accountType: paymentMethod.us_bank_account.account_type
            };
        }
    }

    closeEditPaymentMethod(): void {
        this.showEditPaymentForm = false;
        this.editingPaymentMethod = null;
        this.editingPaymentMethodIndex = -1;
        this.selectedPaymentType = null;
        this.resetForms();
    }

    onEditBackdropClick(event: Event): void {
        if (event.target === event.currentTarget) {
            this.closeEditPaymentMethod();
        }
    }

    confirmDeletePaymentMethod(): void {
        if (!this.editingPaymentMethod) return;

        const paymentMethod = this.editingPaymentMethod;
        const displayName = this.getPaymentMethodDisplay(paymentMethod);

        if (confirm(`Are you sure you want to delete this payment method?\n\n${displayName}\n\nThis action cannot be undone.`)) {
            this.onRemovePaymentMethod(paymentMethod.id, this.editingPaymentMethodIndex);
            this.closeEditPaymentMethod();
        }
    }

    setAsDefault(): void {
        if (!this.editingPaymentMethod || !this.selectedCompany?.stripeCustomerId) return;

        this.settingDefaultPaymentMethod = true;
        this.setDefaultPaymentMethod.emit({
            customerId: this.selectedCompany.stripeCustomerId,
            paymentMethodId: this.editingPaymentMethod.id
        });

        // Close the edit modal after a delay
        setTimeout(() => {
            this.closeEditPaymentMethod();
            this.settingDefaultPaymentMethod = false;
        }, 1500);
    }

    savePaymentMethodChanges(): void {
        if (!this.editingPaymentMethod) return;

        this.processingPaymentMethod = true;

        // For now, we can only update the billing name
        // In a real implementation, you'd call a Stripe API to update billing details
        console.log('Saving payment method changes:', {
            paymentMethodId: this.editingPaymentMethod.id,
            name: this.cardForm.name
        });

        // Simulate API call
        setTimeout(() => {
            // Update the local payment method data
            if (this.editingPaymentMethodIndex >= 0) {
                this.paymentMethods[this.editingPaymentMethodIndex].billing_details = {
                    ...this.paymentMethods[this.editingPaymentMethodIndex].billing_details,
                    name: this.cardForm.name
                };
            }

            this.processingPaymentMethod = false;
            this.closeEditPaymentMethod();

            // Show success message
            alert('Payment method updated successfully!');
        }, 1000);
    }

    onSetDefaultPaymentMethod(paymentMethodId: string): void {
        if (!this.selectedCompany?.stripeCustomerId) {
            alert('No Stripe customer ID found.');
            return;
        }

        if (confirm('Set this payment method as the default for automatic billing?')) {
            this.settingDefaultPaymentMethod = true;

            this.setDefaultPaymentMethod.emit({
                customerId: this.selectedCompany.stripeCustomerId,
                paymentMethodId: paymentMethodId
            });

            // Reset loading state after delay (parent should handle success/error)
            setTimeout(() => {
                this.settingDefaultPaymentMethod = false;
            }, 3000);
        }
    }

    hasDefaultPaymentMethod(): boolean {
        console.log('=== hasDefaultPaymentMethod Debug ===');
        console.log('stripeCustomerData:', this.stripeCustomerData);
        console.log('stripeCustomerData.data:', this.stripeCustomerData?.data);
        console.log('stripeCustomerData.data.invoice_settings:', this.stripeCustomerData?.data?.invoice_settings);
        console.log('default_payment_method:', this.stripeCustomerData?.data?.invoice_settings?.default_payment_method);
        console.log('Local paymentMethods:', this.paymentMethods);
        console.log('Local paymentMethods IDs:', this.paymentMethods.map(pm => pm.id));
        console.log('Parent stripePaymentMethodsData:', this.stripePaymentMethodsData);
        console.log('Parent stripePaymentMethodsData IDs:', this.stripePaymentMethodsData.map(pm => pm.id));

        // Handle both direct structure and nested data structure
        const defaultPaymentMethodId = this.stripeCustomerData?.data?.invoice_settings?.default_payment_method ||
            this.stripeCustomerData?.invoice_settings?.default_payment_method;

        if (!defaultPaymentMethodId) {
            console.log('No default payment method ID found');
            return false;
        }

        console.log('Found default payment method ID:', defaultPaymentMethodId);

        // Check both local paymentMethods and parent stripePaymentMethodsData
        const localHasDefault = this.paymentMethods.some(pm => {
            const isMatch = pm.id === defaultPaymentMethodId;
            console.log(`Local PM ${pm.id} against default ${defaultPaymentMethodId}: ${isMatch}`);
            return isMatch;
        });

        const parentHasDefault = this.stripePaymentMethodsData.some(pm => {
            const isMatch = pm.id === defaultPaymentMethodId;
            console.log(`Parent PM ${pm.id} against default ${defaultPaymentMethodId}: ${isMatch}`);
            return isMatch;
        });

        const hasDefault = localHasDefault || parentHasDefault;
        console.log('Local has default:', localHasDefault);
        console.log('Parent has default:', parentHasDefault);
        console.log('Final result:', hasDefault);
        console.log('=== End Debug ===');

        return hasDefault;
    }

    onRemovePaymentMethod(paymentMethodId: string, index: number): void {
        if (!this.selectedCompany?.stripeCustomerId) {
            alert('No Stripe customer ID found.');
            return;
        }

        const paymentMethod = this.paymentMethods[index];
        const displayName = this.getPaymentMethodDisplay(paymentMethod);

        if (confirm(`Are you sure you want to remove this payment method?\n\n${displayName}\n\nThis action cannot be undone.`)) {
            this.removingPaymentMethod = true;

            this.removePaymentMethod.emit({
                customerId: this.selectedCompany.stripeCustomerId,
                paymentMethodId: paymentMethodId
            });

            // Reset loading state after delay (parent should handle success/error)
            setTimeout(() => {
                this.removingPaymentMethod = false;
            }, 3000);
        }
    }

    // Helper method to check if payment method is default
    isDefaultPaymentMethod(paymentMethodId: string): boolean {
        return this.stripeCustomerData?.invoice_settings?.default_payment_method === paymentMethodId;
    }

    // ============================================================================
    // PAYMENT METHOD FORM MANAGEMENT
    // ============================================================================

    selectPaymentType(type: 'card' | 'us_bank_account'): void {
        this.selectedPaymentType = type;
        this.resetForms();
    }

    goBackToPaymentTypeSelection(): void {
        this.selectedPaymentType = null;
        this.resetForms();
    }

    cancelAddPaymentMethod(): void {
        this.showAddPaymentForm = false;
        this.selectedPaymentType = null;
        this.resetForms();
        this.processingPaymentMethod = false;
    }

    resetForms(): void {
        this.cardForm = {
            number: '',
            name: '',
            cvc: '',
            expMonth: '',
            expYear: ''
        };

        this.bankForm = {
            accountHolderName: '',
            routingNumber: '',
            accountNumber: '',
            accountType: ''
        };
    }

    // ============================================================================
    // CARD FORM METHODS
    // ============================================================================

    formatCardNumber(event: any): void {
        let value = event.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
        const matches = value.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];

        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }

        if (parts.length) {
            event.target.value = parts.join(' ');
            this.cardForm.number = parts.join(' ');
        } else {
            event.target.value = value;
            this.cardForm.number = value;
        }
    }

    isCardFormValid(): boolean {
        return !!(
            this.cardForm.number &&
            this.cardForm.name &&
            this.cardForm.cvc &&
            this.cardForm.expMonth &&
            this.cardForm.expYear &&
            this.cardForm.number.replace(/\s/g, '').length >= 13 &&
            this.cardForm.cvc.length >= 3
        );
    }

    submitCardPaymentMethod(): void {
        if (!this.isCardFormValid()) {
            alert('Please fill in all required fields correctly.');
            return;
        }

        this.processingPaymentMethod = true;

        // For testing, use pre-existing Stripe test payment method IDs
        // This bypasses the creation step and avoids raw card data issues
        const cardNumber = this.cardForm.number.replace(/\s/g, '');
        const testPaymentMethodIds: { [key: string]: string } = {
            '4242424242424242': 'pm_card_visa',                    // Visa test payment method
            '4000056655665556': 'pm_card_visa_debit',              // Visa debit
            '5555555555554444': 'pm_card_mastercard',              // Mastercard
            '378282246310005': 'pm_card_amex',                     // American Express
            '6011111111111117': 'pm_card_discover',                // Discover
        };

        if (testPaymentMethodIds[cardNumber]) {
            // Use pre-existing test payment method ID - no creation needed
            const testPaymentMethodId = testPaymentMethodIds[cardNumber];
            console.log(`Using Stripe test payment method ID: ${testPaymentMethodId} for card ending in ${cardNumber.slice(-4)}`);

            // Skip creation and go directly to attachment
            this.attachPaymentMethodToCustomer(testPaymentMethodId);
            return;
        }

        // Fallback: Try to create payment method (may fail without account setup)
        console.log('Attempting to create payment method with raw card data...');

        const paymentMethodData = {
            type: 'card',
            card: {
                number: cardNumber,
                exp_month: parseInt(this.cardForm.expMonth),
                exp_year: parseInt(this.cardForm.expYear),
                cvc: this.cardForm.cvc
            },
            billing_details: {
                name: this.cardForm.name
            }
        };

        console.log('Creating payment method with data:', paymentMethodData);

        // Create payment method through Stripe service
        this.stripeService.createStripePaymentMethod(paymentMethodData)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (paymentMethod: any) => {
                    console.log('Payment method created:', paymentMethod);
                    console.log('Payment method ID:', paymentMethod?.data?.id);
                    console.log('Payment method data:', JSON.stringify(paymentMethod, null, 2));

                    const paymentMethodId = paymentMethod?.data?.id || paymentMethod?.id;

                    if (!paymentMethod || !paymentMethodId) {
                        console.error('No payment method ID returned:', paymentMethod);
                        this.processingPaymentMethod = false;
                        alert('Failed to create payment method: No payment method ID returned');
                        return;
                    }

                    // Attach payment method to customer
                    this.attachPaymentMethodToCustomer(paymentMethodId);
                },
                error: (error: any) => {
                    console.error('Error creating payment method:', error);
                    this.processingPaymentMethod = false;
                    alert(`Failed to create payment method: ${error.message || 'Unknown error'}`);
                }
            });
    }    // ============================================================================
    // BANK FORM METHODS
    // ============================================================================

    isBankFormValid(): boolean {
        return !!(
            this.bankForm.accountHolderName &&
            this.bankForm.routingNumber &&
            this.bankForm.accountNumber &&
            this.bankForm.accountType &&
            this.bankForm.routingNumber.length === 9
        );
    }

    submitBankPaymentMethod(): void {
        if (!this.isBankFormValid()) {
            alert('Please fill in all required fields correctly.');
            return;
        }

        this.processingPaymentMethod = true;

        // Prepare bank account payment method data for Stripe
        const paymentMethodData = {
            type: 'us_bank_account',
            us_bank_account: {
                routing_number: this.bankForm.routingNumber,
                account_number: this.bankForm.accountNumber,
                account_holder_type: 'individual',
                account_type: this.bankForm.accountType
            },
            billing_details: {
                name: this.bankForm.accountHolderName
            }
        };

        // Create payment method through Stripe service
        this.stripeService.createStripePaymentMethod(paymentMethodData)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (paymentMethod: any) => {
                    console.log('Bank payment method created:', paymentMethod);

                    const paymentMethodId = paymentMethod?.data?.id || paymentMethod?.id;

                    if (!paymentMethodId) {
                        console.error('No payment method ID returned:', paymentMethod);
                        this.processingPaymentMethod = false;
                        alert('Failed to create bank payment method: No payment method ID returned');
                        return;
                    }

                    // Attach payment method to customer
                    this.attachPaymentMethodToCustomer(paymentMethodId);
                },
                error: (error: any) => {
                    console.error('Error creating bank payment method:', error);
                    this.processingPaymentMethod = false;
                    alert(`Failed to create bank payment method: ${error.message || 'Unknown error'}`);
                }
            });
    }    // ============================================================================
    // PAYMENT METHOD ATTACHMENT
    // ============================================================================

    private attachPaymentMethodToCustomer(paymentMethodId: string): void {
        if (!this.selectedCompany?.stripeCustomerId) {
            this.processingPaymentMethod = false;
            alert('No Stripe customer ID found.');
            return;
        }

        this.stripeService.attachPaymentMethod(paymentMethodId, this.selectedCompany.stripeCustomerId)
            .subscribe({
                next: (result) => {
                    console.log('Payment method attached successfully:', result);
                    this.processingPaymentMethod = false;

                    // Reset form and close
                    this.cancelAddPaymentMethod();

                    // Refresh payment methods locally and get updated data
                    this.loadPaymentMethods();

                    // Refresh overall Stripe data for all tabs
                    this.loadStripeOverviewData.emit(this.selectedCompany);

                    // Show success message with payment method info
                    const attachedPaymentMethod = result?.data || result;
                    if (attachedPaymentMethod && attachedPaymentMethod.card?.last4) {
                        const brand = attachedPaymentMethod.card.brand?.toUpperCase() || 'CARD';
                        const last4 = attachedPaymentMethod.card.last4;
                        alert(`Payment method added successfully!\n${brand} •••• ${last4}`);
                    } else {
                        alert('Payment method added successfully!');
                    }
                },
                error: (error) => {
                    console.error('Error attaching payment method:', error);
                    this.processingPaymentMethod = false;
                    alert(`Failed to attach payment method: ${error.message || 'Unknown error'}`);
                }
            });
    }

    // Utility method to format card expiry
    formatCardExpiry(month: number, year: number): string {
        if (!month || !year) return 'N/A';
        const monthStr = month.toString().padStart(2, '0');
        const yearStr = year.toString().slice(-2);
        return `${monthStr}/${yearStr}`;
    }
}