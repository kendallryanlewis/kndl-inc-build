import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { DetailedServicesContent } from 'src/app/models/detailed-service-content';

interface ServicePlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  status: 'Active' | 'Inactive' | 'Deprecated';
  lastModified: string;
  isPopular?: boolean;
}

@Component({
  selector: 'app-kndl-detailed-services',
  templateUrl: './kndl-detailed-services.component.html',
  styleUrls: ['./kndl-detailed-services.component.scss']
})
export class KndlDetailedServicesComponent implements OnInit {
  @Input() editMode: boolean = false;
  @Output() dataChange = new EventEmitter<DetailedServicesContent>();

  servicePlans: ServicePlan[] = [];
  private servicePlansCollection = 'servicePlans';

  // Editable content object
  @Input() content: DetailedServicesContent = {
    headerTitle: 'Web Development',
    headerHighlight: 'Packages',
    headerDescription: 'Development-focused packages with clean WordPress builds, fast delivery, and transparent pricing. Add‑ons & subscriptions available for everything else.',
    processTitle: 'Process: Discover → Build → Launch → Care Plan',
    processDescription: [
      'We keep things simple: Discover your goals, audience, refs, sitemap, KPIs → Brand & Build logo/refresh, palette, wireframes → design → build → QA → Launch & Care Plan enrollment with optional ongoing management.',
      'You\'ll work directly with our team—no account managers or middlemen. Projects are delivered with staged payments (50% deposit; 40% at design approval; 10% at launch), upfront pricing, and clear scope guardrails.',
      'Ready for total brand presence with measurable results? Get a dev quote and we\'ll provide a menu of add‑ons/subscriptions.'
    ],
    ctaText: 'Get a dev quote',
    styling: {
      hrWidth: '200px'
    }
  };

  constructor(private router: Router) {
    // Load content from localStorage if it exists
    this.loadContent();
  }

  ngOnInit(): void {
    this.loadServicePlansFromDb();
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
      const savedContent = localStorage.getItem('detailed-services-content');
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
      localStorage.setItem('detailed-services-content', jsonContent);

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
    link.download = 'detailed-services-content.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  // Add new process description paragraph
  addProcessDescription() {
    this.content.processDescription.push('New paragraph');
    this.emitContentChange();
  }

  // Remove process description paragraph
  removeProcessDescription(index: number) {
    this.content.processDescription.splice(index, 1);
    this.emitContentChange();
  }

  async loadServicePlansFromDb() {
    try {
      const db = getFirestore();
      const querySnapshot = await getDocs(collection(db, this.servicePlansCollection));
      this.servicePlans = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data['name'] || '',
          description: data['description'] || '',
          monthlyPrice: data['monthlyPrice'] || 0,
          yearlyPrice: data['yearlyPrice'] || 0,
          features: data['features'] || [],
          status: data['status'] || 'Active',
          lastModified: data['lastModified'] || new Date().toISOString().split('T')[0],
          isPopular: data['isPopular'] || false,
        };
      }) as ServicePlan[];

      // Filter to only show active plans
      this.servicePlans = this.servicePlans.filter(plan => plan.status === 'Active');
      console.log('Filtered active service plans:', this.servicePlans);
      console.log('Loaded service plans:', this.servicePlans);
    } catch (error) {
      console.error('Error loading service plans:', error);
      // Fallback to default plans if Firebase fails
      this.servicePlans = [];
    }
  }

  selectPackage(packageName: string) {
    this.router.navigate(['/package', packageName]);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  }
}
