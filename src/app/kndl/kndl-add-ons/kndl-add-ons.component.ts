
import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  filteredSubscriptionPlans,
  oneTimeAddons
} from '../addons.data';
import { AddOnsContent } from 'src/app/models/AddOnsContent';

@Component({
  selector: 'app-kndl-add-ons',
  templateUrl: './kndl-add-ons.component.html',
  styleUrls: ['./kndl-add-ons.component.scss']
})
export class KndlAddOnsComponent {
  @Input() editMode: boolean = false;
  @Output() dataChange = new EventEmitter<AddOnsContent>();

  showAllAddons = false;
  popularAddonsCount = 6;

  // Legacy data for backward compatibility
  subscriptions = filteredSubscriptionPlans;
  oneTimeAddons = oneTimeAddons;

  // Editable content object
  @Input() content: AddOnsContent = {
    subscriptionSection: {
      title: 'Subscription',
      highlight: 'Plans',
      description: 'For businesses looking for ongoing support and growth, our monthly plans offer a cost-effective way to keep your brand fresh, your website updated, and your marketing efforts consistent. Choose the plan that fits your needs, then add on extra services as you grow.'
    },
    addonsSection: {
      title: 'Enhance Your Plan with Add-Ons',
      description: 'Every business is unique, and sometimes you just need that extra boost. Our add-ons give you flexibility to expand your brand presence, amplify your reach, and manage growth without committing to a whole new package.'
    },
    buttonText: {
      showMore: 'Show More Add-Ons',
      showLess: 'Show Less'
    },
    styling: {
      hrWidth: '200px'
    }
  };

  constructor() {
    // Load content from localStorage if it exists
    this.loadContent();
  }

  // Emit content changes to parent component
  private emitContentChange(): void {
    this.dataChange.emit({ ...this.content });
  }

  // Method to handle any content change and emit to parent
  onContentChange(): void {
    this.emitContentChange();
  }

  // Load content from localStorage
  loadContent() {
    try {
      const savedContent = localStorage.getItem('add-ons-content');
      if (savedContent) {
        this.content = JSON.parse(savedContent);
      }
    } catch (error) {
      console.error('Error loading content:', error);
    }
  }

  // Save content as JSON to localStorage
  saveContent() {
    try {
      const jsonContent = JSON.stringify(this.content, null, 2);
      localStorage.setItem('add-ons-content', jsonContent);

      // Also create downloadable JSON file
      this.downloadJSON();

      // Emit changes to parent
      this.emitContentChange();

      alert('Content saved successfully!');
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Error saving content');
    }
  }

  // Download content as JSON file
  downloadJSON() {
    const jsonContent = JSON.stringify(this.content, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'add-ons-content.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  // Toggle show all addons
  toggleShowAllAddons() {
    this.showAllAddons = !this.showAllAddons;
  }
}
