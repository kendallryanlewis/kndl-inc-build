import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { KndlProductApp } from '../../models/kndl-product-app';

@Component({
    selector: 'app-kndl-products',
    templateUrl: './kndl-products.component.html',
    styleUrls: ['./kndl-products.component.scss']
})
export class KndlProductsComponent implements OnChanges, OnDestroy {
    @Input() apps: KndlProductApp[] = [];

    activeAppIndex = 0;
    isHeroSwitching = false;
    catalogFilter: 'all' | 'Live' | 'In Progress' | 'Planned' = 'all';

    private heroSwitchTimerId: number | null = null;

    private readonly statusOrder: Record<string, number> = {
        'Live': 0,
        'In Progress': 1,
        'Planned': 2
    };

    get sortedApps(): KndlProductApp[] {
        console.log('Sorting apps with statuses:', this.apps);
        return [...this.apps].sort((a, b) => {
            const aRank = this.statusOrder[a.status ?? ''] ?? 3;
            const bRank = this.statusOrder[b.status ?? ''] ?? 3;
            return aRank - bRank;
        });
    }

    get heroApps(): KndlProductApp[] {
        return this.sortedApps.filter(a => !!a.screenImageUrl);
    }

    get activeApp(): KndlProductApp | null {
        return this.heroApps[this.activeAppIndex] ?? null;
    }

    get filteredApps(): KndlProductApp[] {
        if (this.catalogFilter === 'all') return this.sortedApps;
        return this.sortedApps.filter(a => a.status === this.catalogFilter);
    }

    ngOnChanges(): void {
        this.activeAppIndex = 0;
    }

    ngOnDestroy(): void {
        if (this.heroSwitchTimerId !== null) {
            window.clearTimeout(this.heroSwitchTimerId);
        }
    }

    private switchApp(changeFn: () => void): void {
        if (this.heroSwitchTimerId !== null) {
            window.clearTimeout(this.heroSwitchTimerId);
        }
        this.isHeroSwitching = true;
        this.heroSwitchTimerId = window.setTimeout(() => {
            changeFn();
            this.isHeroSwitching = false;
            this.heroSwitchTimerId = null;
        }, 500);
    }

    selectApp(index: number): void {
        if (index === this.activeAppIndex) return;
        this.switchApp(() => { this.activeAppIndex = index; });
    }

    nextApp(): void {
        if (this.heroApps.length > 1) {
            this.switchApp(() => {
                this.activeAppIndex = (this.activeAppIndex + 1) % this.heroApps.length;
            });
        }
    }

    prevApp(): void {
        if (this.heroApps.length > 1) {
            this.switchApp(() => {
                this.activeAppIndex = (this.activeAppIndex - 1 + this.heroApps.length) % this.heroApps.length;
            });
        }
    }

    statusClass(status?: string): string {
        return (status ?? 'planned').toLowerCase().replace(/\s+/g, '-');
    }

    getAppInitials(name: string): string {
        return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }
}

