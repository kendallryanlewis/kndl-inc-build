import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-generic-button',
  templateUrl: './generic-button.component.html',
  styleUrls: ['./generic-button.component.scss']
})
export class GenericButtonComponent {
  @Input({ required: true }) action!: () => void;
  @Input() title: string = 'Button';
  @Input() icon: string = 'check';

  callParent() {
    this.action?.(); // call the parent-supplied function
  }
}
