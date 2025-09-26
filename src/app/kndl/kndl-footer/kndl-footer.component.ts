import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-kndl-footer',
  templateUrl: './kndl-footer.component.html',
  styleUrls: ['./kndl-footer.component.scss']
})
export class KndlFooterComponent {
  @Input() editMode: boolean = false;
  @Input() content: { headerText: string } | null = null;

}
