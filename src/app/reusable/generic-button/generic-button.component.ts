import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-generic-button',
  templateUrl: './generic-button.component.html',
  styleUrls: ['./generic-button.component.scss']
})
export class GenericButtonComponent {
  @Input({ required: true }) action!: () => void;
  @Input() style: 'primary' | 'secondary' | 'danger' | 'info' = 'primary';
  @Input() title: string = 'Button';
  @Input() icon: string = 'check';
  @Input() width: string = 'auto';

  callParent() {
    this.action?.(); // call the parent-supplied function
  }
}
