import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { AboutUsContent } from 'src/app/models/about-us-content';


@Component({
  selector: 'app-kndl-about-us',
  templateUrl: './kndl-about-us.component.html',
  styleUrls: ['./kndl-about-us.component.scss', '../kndl.component.scss']
})
export class KndlAboutUsComponent implements OnInit {
  @Input() editMode: boolean = false;
  @Output() dataChange = new EventEmitter<AboutUsContent>();
  longStory = false;

  // Content object - will be initialized with default or input values
  content: AboutUsContent = {
    mainHeading: 'About',
    subHeading: 'Us',
    processTitle: 'Our Process',
    processSteps: [
      { number: '1', title: 'Consultation', description: 'We discuss your needs and goals' },
      { number: '2', title: 'Design', description: 'We create custom designs for your brand' },
      { number: '3', title: 'Development', description: 'We build your website and brand assets' },
      { number: '4', title: 'Launch', description: 'We launch your brand and provide ongoing support' }
    ],
    brandTitle: 'Brand Features',
    brandDescription: [
      'We help businesses create professional brands that stand out.',
      'Our comprehensive approach ensures consistency across all platforms.'
    ],
    brandFeatures: [
      { title: 'Professional Design', description: 'Custom designs that reflect your brand' },
      { title: 'Fast Delivery', description: 'Quick turnaround times for all projects' }
    ],
    styling: {
      hrWidth: '200px',
      processColors: {
        text: 'tan',
        background: 'blue'
      }
    },
    isActive: true
  };

  // Input from parent component
  @Input() set inputContent(value: AboutUsContent | null) {
    if (value) {
      this.content = { ...value };
    }
  }

  constructor() {
  }

  ngOnInit(): void {
    console.log('KndlAboutUsComponent initialized with content:', this.content);
  }

  // Emit content changes to parent component
  private emitContentChange(): void {
    if (this.content) {
      this.dataChange.emit({ ...this.content });
    }
  }

  // Method to handle any content change and emit to parent
  onContentChange(): void {
    this.emitContentChange();
  }

  toggleStory() {
    this.longStory = !this.longStory;
  }
  // Download content as JSON file
  downloadJSON() {
    const jsonContent = JSON.stringify(this.content, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'about-us-content.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  // Add new process step
  addProcessStep() {
    if (this.content?.processSteps) {
      this.content.processSteps.push({
        number: (this.content.processSteps.length + 1).toString(),
        title: 'New Step',
        description: 'Step description'
      });
      this.emitContentChange();
    }
  }

  // Remove process step
  removeProcessStep(index: number) {
    if (this.content?.processSteps) {
      this.content.processSteps.splice(index, 1);
      this.emitContentChange();
    }
  }

  // Add new brand feature
  addBrandFeature() {
    if (this.content?.brandFeatures) {
      this.content.brandFeatures.push({
        title: 'New Feature',
        description: 'Feature description'
      });
      this.emitContentChange();
    }
  }

  // Remove brand feature
  removeBrandFeature(index: number) {
    if (this.content?.brandFeatures) {
      this.content.brandFeatures.splice(index, 1);
      this.emitContentChange();
    }
  }

  // Add new brand description paragraph
  addBrandDescription() {
    if (this.content?.brandDescription) {
      this.content.brandDescription.push('New paragraph');
      this.emitContentChange();
    }
  }

  // Remove brand description paragraph
  removeBrandDescription(index: number) {
    if (this.content?.brandDescription) {
      this.content.brandDescription.splice(index, 1);
      this.emitContentChange();
    }
  }
}
