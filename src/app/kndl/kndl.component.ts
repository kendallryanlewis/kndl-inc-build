import { Component, HostListener, OnInit } from '@angular/core';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { AboutUsContent } from '../models/about-us-content';
import { DetailedServicesContent } from '../models/detailed-service-content';
import { AddOnsContent } from '../models/AddOnsContent';
import { CallToActionContent } from '../models/CallToActionContent';
import { SEOService } from '../services/seo.service';
import {
  DEFAULT_SITE_CONTENT,
  DEFAULT_ABOUT_DATA,
  DEFAULT_ABOUT_US_DATA,
  DEFAULT_DETAILED_SERVICES_DATA,
  DEFAULT_ADDONS_DATA,
  DEFAULT_CALL_TO_ACTION_DATA,
  DEFAULT_HEADER_SUB_TEXT
} from '../config/default-site-content';

@Component({
  selector: 'app-kndl',
  templateUrl: './kndl.component.html',
  styleUrls: ['./kndl.component.scss']
})

export class KndlComponent implements OnInit {
  atTop = true;
  atBottom = false;
  activeView: 'home' | 'aboutus' | 'services' | 'addons' | 'subscription-addons' = 'home';

  // Firebase
  private firestore = getFirestore();

  // Content objects for child components
  isLoading = true;
  aboutData: { headerText: string } = { ...DEFAULT_ABOUT_DATA };
  aboutUsData: AboutUsContent | null = null;
  detailedServicesData: DetailedServicesContent | null = null;
  addOnsData: AddOnsContent | null = null;
  callToActionData: CallToActionContent | null = null;
  footerData: { headerText: string } = { headerText: '' };
  headerSubText: string = DEFAULT_HEADER_SUB_TEXT;

  constructor(private seoService: SEOService) { }

  async ngOnInit(): Promise<void> {
    // Set initial SEO
    this.seoService.setHomeSEO();

    await this.loadSiteLayout();
  }

  async loadSiteLayout(): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'siteLayout', 'main');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('Loading site layout from Firebase:', data);

        // Load content for each component, using defaults as fallbacks
        this.aboutData = data['aboutData'] || { ...DEFAULT_ABOUT_DATA };
        this.aboutUsData = data['aboutUsData'] || null;
        this.detailedServicesData = data['detailedServicesData'] || null;
        this.addOnsData = data['addOnsData'] || null;
        this.callToActionData = data['callToActionData'] || null;
        this.footerData = data['footerData'] || { headerText: '' };
        this.headerSubText = data['headerSubText'] || DEFAULT_HEADER_SUB_TEXT;

        console.log('Site layout loaded successfully, aboutData:', this.aboutData);

        // Update SEO with dynamic content if available
        if (this.aboutData.headerText) {
          this.seoService.updateTitle(this.aboutData.headerText + ' - Kndl Inc');
        }
        if (this.headerSubText) {
          this.seoService.updateDescription(this.headerSubText);
        }
      } else {
        console.log('No site layout found in Firebase, using defaults');
        // Data is already set to defaults, just log it
        console.log('Using default aboutData:', this.aboutData);
      }
    } catch (error) {
      console.error('Error loading site layout:', error);
    } finally {
      this.isLoading = false;
    }
  }


  scrollToSection(section: 'home' | 'aboutus' | 'services' | 'addons' | 'subscription-addons') {
    const element = document.querySelector(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      this.activeView = section;

      // Update SEO based on active section
      this.updateSEOForSection(section);
    }
  }

  private updateSEOForSection(section: string): void {
    switch (section) {
      case 'aboutus':
        this.seoService.setAboutSEO();
        break;
      case 'services':
        this.seoService.setServicesSEO();
        break;
      case 'addons':
        this.seoService.updateSEO({
          title: 'Add-ons & Subscriptions - Kndl Inc',
          description: 'Enhance your brand with our flexible add-on services and subscription plans for ongoing support and growth.'
        });
        break;
      default:
        this.seoService.setHomeSEO();
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.atTop = window.scrollY === 0;

    // threshold in pixels for being "atBottom"
    const threshold = 2;
    const scrollPosition = window.scrollY + window.innerHeight;
    const pageHeight = window.document.documentElement.scrollHeight;

    this.atBottom = (pageHeight - scrollPosition) <= threshold;

    const sections = [
      { id: 'home', element: document.querySelector('app-kndl-about-us') },
      { id: 'aboutus', element: document.querySelector('app-kndl-detailed-services') },
      { id: 'services', element: document.querySelector('app-kndl-pricing') },
      { id: 'pricing', element: document.querySelector('app-kndl-add-ons') }
    ];

    for (const section of sections) {
      if (section.element) {
        const rect = section.element.getBoundingClientRect();
        if (rect.top <= 0 && rect.bottom > 0) {
          this.activeView = section.id as 'home' | 'aboutus' | 'services' | 'addons' | 'subscription-addons';
          break;
        }
      }
    }
  }
}


