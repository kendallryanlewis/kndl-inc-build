
import { Component } from '@angular/core';
import {
  filteredSubscriptionPlans,
  oneTimeAddons
} from '../addons.data';

@Component({
  selector: 'app-kndl-add-ons',
  templateUrl: './kndl-add-ons.component.html',
  styleUrls: ['./kndl-add-ons.component.scss']
})
export class KndlAddOnsComponent {
  showAllAddons = false;
  popularAddonsCount = 6;

  // Legacy data for backward compatibility
  subscriptions = filteredSubscriptionPlans;
  oneTimeAddons = oneTimeAddons;
}
