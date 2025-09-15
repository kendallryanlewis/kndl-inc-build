import { Component, OnInit } from '@angular/core';
import { filteredSubscriptionPlans, oneTimeAddons, Addon } from '../kndl/addons.data';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-package-detail',
    templateUrl: './package-detail.component.html',
    styleUrls: ['./package-detail.component.scss']
})
export class PackageDetailComponent implements OnInit {
    public packageData: any = null;
    public packageIndex: number = 0;
    public selectedAddOns: any[] = [];
    public totalPrice: number = 0;
    public basePrice: number = 0;
    public amountDueToday: number = 0;
    public monthlyAmount: number = 0;

    // Pixel & Post Business Plan v2 — Dev-Only Packages, all other services as Add-Ons/Subscriptions
    packages = [
        {
            id: 'starter',
            name: 'Starter',
            tagline: 'Brand Essentials',
            heroTitle: 'SINGLE PAGE',
            heroSubtitle: 'One-page WordPress build: ~4 sections, contact form, core SEO & performance.',
            description: 'For solo founders, local service pros, and small businesses who need a credible web presence fast.',
            detailedDescription: 'Single-page WordPress site (responsive). Up to 4 sections (Hero, Services, About, Contact). 1 reusable page template + global header/footer. Contact form + basic anti-spam. Core technical SEO (titles/meta, sitemap, robots). Performance setup (caching plugin configured).',
            price: '$325 – $780',
            originalPrice: '',
            icon: 'fa fa-rocket',
            color: '#364074',
            text: '#ffffff',
            video: 'assets/Video/foggy.mp4',
            includesTitle: 'Included in Starter',
            deliverables: [
                {
                    icon: 'fa fa-file',
                    title: 'One-Page WordPress Site',
                    description: 'Up to 4 sections, contact form, core SEO, performance setup',
                    details: [
                        'Responsive design',
                        '1 reusable template',
                        'Global header/footer',
                        'Contact form + anti-spam',
                        'Technical SEO',
                        'Caching plugin setup'
                    ]
                }
            ],
            features: [
                'Single-page build',
                'Contact form',
                'SEO & performance',
                'WordPress core setup',
                'Custom Dev available'
            ],
            process: [
                { step: 1, title: 'Discover', description: 'Goals, audience, sitemap, KPIs.' },
                { step: 2, title: 'Brand', description: 'Logo/refresh, palette, type, patterns.' },
                { step: 3, title: 'Site', description: 'Wireframes → design → build → QA → launch.' },
                { step: 4, title: 'SEO & Content', description: 'On-page, metadata, schema, 1–2 pieces of content.' },
                { step: 5, title: 'Launch & Care Plan', description: 'Launch & enroll in care plan.' }
            ],
            portfolio: [
                { image: '', title: 'Local Plumber Website', category: 'Service Business', description: 'Simple one-page site with contact form and service areas' },
                { image: '', title: 'Personal Trainer Profile', category: 'Fitness', description: 'Clean website with booking info and testimonials' },
                { image: '', title: 'Hair Salon Online', category: 'Beauty', description: 'Professional site with hours, services, and contact' }
            ]
        },
        {
            id: 'growth',
            name: 'Growth',
            tagline: 'Digital + Print',
            heroTitle: 'DEV-ONLY MULTI-PAGE',
            heroSubtitle: '5–12 pages, 2–3 templates, blog setup, 1 simple CPT, enhanced forms, reservations/appointments with payments.',
            description: 'For growing businesses ready for a multi-page site, blog, and enhanced forms or bookings.',
            detailedDescription: 'Multi-page WordPress site (5–12 pages). 2–3 reusable templates (e.g., Service detail, Blog index). Blog setup (categories/tags). 1 simple Custom Post Type (CPT) + taxonomy. Enhanced forms (conditional fields, multi-step if needed). Reservations/appointments with payments (booking calendars, deposits). Core technical SEO & performance setup.',
            price: '$1,040 – $1,950',
            originalPrice: '',
            icon: 'fa fa-chart-line',
            color: '#197c65ff',
            text: '#ffffff',
            video: 'assets/Video/office.mp4',
            includesTitle: 'Included in Growth',
            deliverables: [
                {
                    icon: 'fa fa-files-o',
                    title: 'Multi-Page WordPress Site',
                    description: '5–12 pages, 2–3 templates, blog, CPT, enhanced forms, bookings',
                    details: [
                        '5–12 pages',
                        '2–3 reusable templates',
                        'Blog setup',
                        '1 simple CPT + taxonomy',
                        'Enhanced forms',
                        'Reservations/appointments with payments',
                        'Technical SEO & performance'
                    ]
                }
            ],
            features: [
                'Multi-page build',
                'Blog & CPT',
                'Enhanced forms',
                'Bookings/payments',
                'Custom Dev available'
            ],
            process: [
                { step: 1, title: 'Discover', description: 'Goals, audience, sitemap, KPIs.' },
                { step: 2, title: 'Brand', description: 'Logo/refresh, palette, type, patterns.' },
                { step: 3, title: 'Site', description: 'Wireframes → design → build → QA → launch.' },
                { step: 4, title: 'SEO & Content', description: 'On-page, metadata, schema, 1–2 pieces of content.' },
                { step: 5, title: 'Launch & Care Plan', description: 'Launch & enroll in care plan.' }
            ],
            portfolio: [
                { image: '', title: 'Fitness Studio Complete', category: 'Health & Wellness', description: 'Multi-page site with class schedules and online booking' },
                { image: '', title: 'Restaurant Digital Presence', category: 'Food & Beverage', description: 'Website with menu, social media, and Google optimization' },
                { image: '', title: 'Consulting Firm Brand', category: 'Professional Services', description: 'Professional multi-page site with service pages and testimonials' }
            ]
        },
        {
            id: 'pro',
            name: 'Pro',
            tagline: 'Total Brand Presence',
            heroTitle: 'DEV-ONLY ADVANCED',
            heroSubtitle: 'Heavy custom dev: bookings, memberships/roles, WooCommerce, integrations, advanced search/filters, headless components.',
            description: 'For teams needing advanced custom development, integrations, and scalable WordPress solutions.',
            detailedDescription: 'Advanced WordPress build with heavy custom development. Reservations/appointments with payments. User registration & roles (memberships, gated content, customer portals). WooCommerce (store or subscriptions). Multiple CPTs & taxonomies; advanced search/filters. Third-party integrations (CRM, accounting, Zapier/Make). Headless/Angular components & custom APIs as needed. Performance & security hardening (caching/CDN/backups).',
            price: '$2,600 – $4,550+',
            originalPrice: '',
            icon: 'fa fa-crown',
            color: '#d2b48c',
            text: '#000000',
            video: 'assets/Video/city.mp4',
            includesTitle: 'Included in Pro',
            deliverables: [
                {
                    icon: 'fa fa-cogs',
                    title: 'Advanced WordPress Build',
                    description: 'Heavy custom dev, bookings, memberships, WooCommerce, integrations, headless',
                    details: [
                        'Heavy custom development',
                        'Bookings/appointments/payments',
                        'User registration & roles',
                        'WooCommerce (store/subscriptions)',
                        'Multiple CPTs & taxonomies',
                        'Advanced search/filters',
                        'Third-party integrations',
                        'Performance & security hardening'
                    ]
                }
            ],
            features: [
                'Custom dev & integrations',
                'WooCommerce',
                'Memberships/roles',
                'Custom Dev available'
            ],
            process: [
                { step: 1, title: 'Discover', description: 'Goals, audience, sitemap, KPIs.' },
                { step: 2, title: 'Brand', description: 'Logo/refresh, palette, type, patterns.' },
                { step: 3, title: 'Site', description: 'Wireframes → design → build → QA → launch.' },
                { step: 4, title: 'SEO & Content', description: 'On-page, metadata, schema, 1–2 pieces of content.' },
                { step: 5, title: 'Launch & Care Plan', description: 'Launch & enroll in care plan.' }
            ],
            portfolio: [
                { image: '', title: 'E-Commerce Storefront', category: 'Retail', description: 'WooCommerce store with custom product filters and checkout' },
                { image: '', title: 'Membership Portal', category: 'Education', description: 'Custom portal with user registration, gated content, and payments' },
                { image: '', title: 'Integrated CRM Site', category: 'Professional Services', description: 'Advanced WordPress build with CRM and third-party integrations' }
            ]
        }
    ];

    // Expose shared add-ons for use in the template
    publicRecurringAddons = filteredSubscriptionPlans;
    publicOneTimeAddons = oneTimeAddons;

    constructor(private route: ActivatedRoute, private router: Router) { }

    toggleAddOn(addon: any): void {
        const index = this.selectedAddOns.findIndex(selected => selected.title === addon.title);
        if (index > -1) {
            this.selectedAddOns.splice(index, 1);
        } else {
            this.selectedAddOns.push(addon);
        }
        this.calculateTotal();
    }

    isAddOnSelected(addon: any): boolean {
        return this.selectedAddOns.some(selected => selected.title === addon.title);
    }

    calculateTotal(): void {
        let addonOneTimeTotal = 0;
        let addonMonthlyTotal = 0;

        this.selectedAddOns.forEach(addon => {
            const pricing = this.parsePrice(addon.price);
            addonOneTimeTotal += pricing.oneTime;
            addonMonthlyTotal += pricing.monthly;
        });

        this.amountDueToday = this.basePrice + addonOneTimeTotal;
        this.monthlyAmount = addonMonthlyTotal;
        this.totalPrice = this.amountDueToday; // For display compatibility
    }

    parsePrice(priceString: string): { oneTime: number, monthly: number } {
        let oneTime = 0;
        let monthly = 0;

        // Handle different price formats from your business plan
        if (priceString.includes('setup + ') && priceString.includes('/mo')) {
            // Format: "$500–$1,200 setup + $300–$600/mo"
            const setupMatch = priceString.match(/\$(\d+)(?:–\$(\d+))?\s*setup/);
            const monthlyMatch = priceString.match(/\$(\d+)(?:–\$(\d+))?\s*\/mo/);

            if (setupMatch) {
                oneTime = parseInt(setupMatch[2] || setupMatch[1]) || 0;
            }
            if (monthlyMatch) {
                monthly = parseInt(monthlyMatch[2] || monthlyMatch[1]) || 0;
            }
        } else if (priceString.includes('/mo')) {
            // Format: "$100–$300/mo" or "$200–$500/mo mgmt"
            const monthlyMatch = priceString.match(/\$(\d+)(?:–\$(\d+))?\/mo/);
            if (monthlyMatch) {
                monthly = parseInt(monthlyMatch[2] || monthlyMatch[1]) || 0;
            }
        } else if (priceString.includes('setup')) {
            // Format: "$500+ setup"
            const setupMatch = priceString.match(/\$(\d+)\+?\s*setup/);
            if (setupMatch) {
                oneTime = parseInt(setupMatch[1]) || 0;
            }
        } else if (priceString.includes('/page') || priceString.includes('/post') || priceString.includes('each')) {
            // Format: "$250–$600/page" or "$50 static / $100 animated per post"
            const priceMatch = priceString.match(/\$(\d+)(?:–\$(\d+))?/);
            if (priceMatch) {
                oneTime = parseInt(priceMatch[2] || priceMatch[1]) || 0;
            }
        } else if (priceString.includes('Custom quote') || priceString.includes('Cost + markup')) {
            // Handle custom quotes - could add a base estimate
            oneTime = 0;
            monthly = 0;
        } else {
            // Default: try to extract first price range "$100–$300"
            const priceMatch = priceString.match(/\$(\d+)(?:–\$(\d+))?/);
            if (priceMatch) {
                oneTime = parseInt(priceMatch[2] || priceMatch[1]) || 0;
            }
        }

        return { oneTime, monthly };
    }

    removeAddOn(addon: any): void {
        const index = this.selectedAddOns.findIndex(selected => selected.title === addon.title);
        if (index > -1) {
            this.selectedAddOns.splice(index, 1);
            this.calculateTotal();
        }
    }

    calculateSavings(originalPrice: string, currentPrice: string): number {
        const original = parseInt(originalPrice.replace(/[^\d]/g, ''));
        const current = parseInt(currentPrice.replace(/[^\d]/g, ''));
        return original - current;
    }

    ngOnInit() {
        this.route.params.subscribe(params => {
            const packageId = params['id'];

            // Check if it's a numeric index
            if (!isNaN(Number(packageId))) {
                this.packageIndex = parseInt(packageId);
                this.packageData = this.packages[this.packageIndex];
            } else {
                // Handle package name (starter, growth, pro)
                this.packageData = this.packages.find(pkg =>
                    pkg.id === packageId ||
                    pkg.name.toLowerCase() === packageId.toLowerCase()
                );
                this.packageIndex = this.packages.findIndex(pkg =>
                    pkg.id === packageId ||
                    pkg.name.toLowerCase() === packageId.toLowerCase()
                );
            }

            // Set base price based on package - use lower (cheaper) end of range, handle commas
            if (this.packageData) {
                const priceMatch = this.packageData.price.match(/\$([\d,]+)(?:–\s*\$([\d,]+))?/);
                if (priceMatch) {
                    // Use the lower price in the range, or the single price if no range
                    this.basePrice = parseInt(priceMatch[1].replace(/,/g, '')) || 0;
                } else {
                    this.basePrice = 0;
                }
                this.amountDueToday = this.basePrice;
                this.monthlyAmount = 0;
                this.totalPrice = this.basePrice;
            }

            if (!this.packageData) {
                console.error('Package not found for ID:', packageId);
                this.router.navigate(['/']);
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/']);
    }

    scrollToSection(sectionId: string): void {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }

    hexToRgba(hex: string, alpha: number): string {
        // Remove the hash if it exists
        hex = hex.replace('#', '');

        // Parse the hex values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    getGradientBackground(): string {
        return `linear-gradient(135deg, ${this.hexToRgba(this.packageData.color, 0.9)} 0%, ${this.hexToRgba(this.packageData.color, 0.7)} 100%)`;
    }

    getFeatureTitle(feature: string): string {
        // Extract the main title from feature strings
        return feature.split(':')[0] || feature;
    }

    getFeatureDescription(feature: string): string {
        // Extract description after colon, or return a generic description
        const parts = feature.split(':');
        return parts.length > 1 ? parts[1].trim() : 'Included in this package';
    }
}
