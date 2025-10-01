import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Company } from '../../../../models/User';

@Component({
    selector: 'app-overview-tab',
    templateUrl: './overview-tab.component.html',
    styleUrls: ['./overview-tab.component.scss']
})
export class OverviewTabComponent {
    @Input() selectedCompany: any;

    constructor() { }

    getRecentActivity(company: any): any[] {
        // Mock activity data - this should be replaced with actual service call
        return [
            {
                icon: 'fa-user-plus',
                description: 'New user registered',
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                icon: 'fa-credit-card',
                description: 'Payment processed successfully',
                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            },
            {
                icon: 'fa-cog',
                description: 'Settings updated',
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
        ];
    }

    formatDate(date: Date | string): string {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString();
    }
}