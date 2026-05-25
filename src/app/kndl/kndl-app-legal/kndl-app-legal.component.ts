import { Component, Input, Output, EventEmitter } from '@angular/core';
import { KndlProductApp } from '../../models/kndl-product-app';


type LegalPageType = 'privacy' | 'terms' | 'support';

@Component({
    selector: 'app-kndl-app-legal',
    templateUrl: './kndl-app-legal.component.html',
    styleUrls: ['./kndl-app-legal.component.scss']
})
export class KndlAppLegalComponent {
    @Input() app: KndlProductApp | null = null;
    @Input() pageType: LegalPageType = 'privacy';
    @Output() closePanel = new EventEmitter<void>();
    readonly currentYear = new Date().getFullYear();

    get pageTitle(): string {
        const map: Record<LegalPageType, string> = {
            privacy: 'Privacy Policy',
            terms: 'Terms of Use',
            support: 'Support',
        };
        return map[this.pageType];
    }

    get pageIcon(): string {
        const map: Record<LegalPageType, string> = {
            privacy: 'fas fa-shield-alt',
            terms: 'fas fa-file-contract',
            support: 'fas fa-life-ring',
        };
        return map[this.pageType];
    }

    get artworkUrl(): string {
        return this.app?.artworkUrl512 ?? this.app?.artworkUrl100 ?? this.app?.screenImageUrl ?? '';
    }

    get appInitials(): string {
        if (!this.app?.name) return '?';
        return this.app.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
    }

    /** Returns the app’s own official URL for the current page type, if provided. */
    get officialUrl(): string {
        const map: Record<LegalPageType, string | undefined> = {
            privacy: this.app?.privacyPolicyUrl,
            terms: this.app?.termsUrl,
            support: this.app?.supportUrl,
        };
        return map[this.pageType] ?? '';
    }

    get eulaText(): string {
        return this.app?.eulaText ?? '';
    }

    get formattedReleaseDate(): string {
        if (!this.app?.releaseDate) return `${this.currentYear}`;
        try {
            return new Date(this.app.releaseDate).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
            });
        } catch {
            return this.app.releaseDate;
        }
    }
}
