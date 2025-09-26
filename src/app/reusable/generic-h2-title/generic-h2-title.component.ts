import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-generic-h2-title',
  templateUrl: './generic-h2-title.component.html',
  styleUrls: ['./generic-h2-title.component.scss']
})
export class GenericH2TitleComponent {
  @Input() title: string = 'Default Title';
  @Input() subTitle: string = '';
  @Input() icon: string = '';
}
