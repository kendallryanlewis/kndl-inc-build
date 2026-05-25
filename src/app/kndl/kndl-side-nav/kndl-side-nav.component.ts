import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-kndl-side-nav',
    templateUrl: './kndl-side-nav.component.html',
    styleUrls: ['./kndl-side-nav.component.scss']
})
export class KndlSideNavComponent {
    @Input() isMegaMenuOpen = false;
    @Output() megaMenuToggle = new EventEmitter<void>();
    @Output() legalPageOpen = new EventEmitter<string>();

    toggleMenu(): void {
        this.megaMenuToggle.emit();
    }

    openLegalPage(page: string): void {
        this.legalPageOpen.emit(page);
    }
}
