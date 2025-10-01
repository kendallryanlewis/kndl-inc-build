import { Component, Input, Output, EventEmitter } from '@angular/core';

interface Company {
    id: string;
    name: string;
    domain: string;
    logo?: string;
    contactEmail: string;
    phone?: string;
    status: 'active' | 'inactive' | 'pending' | 'suspended';
    subscriptionPlan: 'basic' | 'professional' | 'enterprise';
    monthlyAmount: number;
    userCount: number;
    lastBilling: Date;
    nextBilling: Date;
    createdDate: Date;
    billingCycle: 'monthly' | 'yearly';
    lastFourDigits: string;
    autoRenewal: boolean;
    monthlyPageViews: number;
    activeAddons: number[];
}

@Component({
    selector: 'app-settings-tab',
    templateUrl: './settings-tab.component.html',
    styleUrls: ['./settings-tab.component.scss']
})
export class SettingsTabComponent {
    @Input() selectedCompany: Company | null = null;

    @Output() updateCompanyName = new EventEmitter<string>();
    @Output() updateCompanyDomain = new EventEmitter<string>();
    @Output() updateCompanyEmail = new EventEmitter<string>();
    @Output() updateCompanyPhone = new EventEmitter<string>();
    @Output() updateCompanyStatus = new EventEmitter<string>();
    @Output() saveCompanySettings = new EventEmitter<void>();
    @Output() cancelSettingsChanges = new EventEmitter<void>();

    onUpdateCompanyName(value: string): void {
        this.updateCompanyName.emit(value);
    }

    onUpdateCompanyDomain(value: string): void {
        this.updateCompanyDomain.emit(value);
    }

    onUpdateCompanyEmail(value: string): void {
        this.updateCompanyEmail.emit(value);
    }

    onUpdateCompanyPhone(value: string): void {
        this.updateCompanyPhone.emit(value);
    }

    onUpdateCompanyStatus(value: string): void {
        this.updateCompanyStatus.emit(value);
    }

    onSaveCompanySettings(): void {
        this.saveCompanySettings.emit();
    }

    onCancelSettingsChanges(): void {
        this.cancelSettingsChanges.emit();
    }
}