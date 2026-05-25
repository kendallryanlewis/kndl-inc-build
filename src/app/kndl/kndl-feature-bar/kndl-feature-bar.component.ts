import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-kndl-feature-bar',
    templateUrl: './kndl-feature-bar.component.html',
    styleUrls: ['./kndl-feature-bar.component.scss']
})
export class KndlFeatureBarComponent {
    @Input() isVisible = true;
    @Output() panelOpen = new EventEmitter<string>();

    open(panel: string): void {
        this.panelOpen.emit(panel);
    }
}
