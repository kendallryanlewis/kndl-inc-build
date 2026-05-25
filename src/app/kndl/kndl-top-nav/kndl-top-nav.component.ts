import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-kndl-top-nav',
    templateUrl: './kndl-top-nav.component.html',
    styleUrls: ['./kndl-top-nav.component.scss']
})
export class KndlTopNavComponent {
    @Input() activeTab = 'home';
    @Output() tabChange = new EventEmitter<string>();

    select(tab: string): void {
        this.tabChange.emit(tab);
    }
}
