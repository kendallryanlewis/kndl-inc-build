import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-kndl-detailed-services',
  templateUrl: './kndl-detailed-services.component.html',
  styleUrls: ['./kndl-detailed-services.component.scss']
})
export class KndlDetailedServicesComponent {

  constructor(private router: Router) { }

  selectPackage(packageName: string) {
    this.router.navigate(['/package', packageName]);
  }
}
