import { Component, EventEmitter, Output } from '@angular/core';

type KndlPanel = 'about' | 'pricing' | 'services';

@Component({
    selector: 'app-kndl-home',
    templateUrl: './kndl-home.component.html',
    styleUrls: ['./kndl-home.component.scss']
})
export class KndlHomeComponent {
    @Output() panelOpen = new EventEmitter<KndlPanel>();
}
