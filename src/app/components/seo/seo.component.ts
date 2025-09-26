import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { SEOService, SEOData } from '../../services/seo.service';

@Component({
    selector: 'app-seo',
    template: '', // This component has no template as it only manages SEO
    styleUrls: []
})
export class SeoComponent implements OnInit, OnDestroy {
    @Input() seoData?: SEOData;
    @Input() pageType?: 'home' | 'about' | 'services' | 'addons' | 'contact' | 'custom';

    constructor(private seoService: SEOService) { }

    ngOnInit(): void {
        this.updateSEO();
    }

    ngOnDestroy(): void {
        // Reset to default SEO when component is destroyed
        this.seoService.setHomeSEO();
    }

    private updateSEO(): void {
        if (this.seoData) {
            // Use custom SEO data
            this.seoService.updateSEO(this.seoData);
        } else if (this.pageType) {
            // Use predefined SEO based on page type
            switch (this.pageType) {
                case 'home':
                    this.seoService.setHomeSEO();
                    break;
                case 'about':
                    this.seoService.setAboutSEO();
                    break;
                case 'services':
                    this.seoService.setServicesSEO();
                    break;
                case 'addons':
                    this.seoService.updateSEO({
                        title: 'Add-ons & Subscriptions - Kndl Inc',
                        description: 'Enhance your brand with our flexible add-on services and subscription plans for ongoing support and growth.',
                        keywords: 'web development add-ons, marketing subscriptions, ongoing support, brand enhancement'
                    });
                    break;
                case 'contact':
                    this.seoService.updateSEO({
                        title: 'Contact Us - Kndl Inc',
                        description: 'Get in touch with Kndl Inc for your web development and branding needs. Let\'s discuss your project today.',
                        keywords: 'contact kndl inc, web development consultation, branding consultation'
                    });
                    break;
            }
        }
    }
}