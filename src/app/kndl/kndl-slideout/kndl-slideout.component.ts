import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface AddonItem {
    id: string;
    label: string;
    price: number;
    priceDisplay: string;
    category: string;
    selected: boolean;
}

export interface CarePlan {
    id: string;
    name: string;
    price: number;
    priceDisplay: string;
    desc: string;
    features: string[];
}

@Component({
    selector: 'app-kndl-slideout',
    templateUrl: './kndl-slideout.component.html',
    styleUrls: ['./kndl-slideout.component.scss']
})
export class KndlSlideoutComponent {
    @Input() isOpen = false;
    @Input() page: 'builder' | 'privacy' | 'terms' | 'policy' = 'builder';
    @Output() closePanel = new EventEmitter<void>();

    // ── expand / ui state
    isExpanded = false;
    showCompare = false;
    showRetainers = false;

    // ── accordion state (used in builder step 2)
    openAddon = '';

    // ── builder step
    builderStep = 1;

    // ── step 1: base package
    selectedBase: string | null = null;
    readonly basePackages = [
        {
            id: 'mini',
            name: 'Mini Site',
            badge: 'Quick Launch',
            price: 499,
            priceDisplay: '$499',
            desc: 'A fast, affordable one-page presence.',
            meta: ['1 page', '3 sections', '5 images', '3–5 days', '1 revision'],
            carePlanId: 'basic'
        },
        {
            id: 'starter',
            name: 'Starter Site',
            badge: 'Most Popular',
            featured: true,
            price: 899,
            priceDisplay: '$899',
            desc: 'Polished one-pager with lead capture.',
            meta: ['1 page', '5 sections', '10 images', '5–7 days', '2 revisions'],
            carePlanId: 'standard'
        },
        {
            id: 'local',
            name: 'Local Business Site',
            badge: 'Local Growth',
            price: 1750,
            priceDisplay: '$1,750',
            desc: 'Multi-page site for local credibility.',
            meta: ['3 pages', '8 sections', '15 images', '1–2 weeks', '2 revisions'],
            carePlanId: 'growth'
        }
    ];

    // ── step 2: add-ons
    readonly addonCategories = [
        { id: 'pages', label: 'Pages', icon: 'fa-file-circle-plus' },
        { id: 'sections', label: 'Sections', icon: 'fa-table-cells-large' },
        { id: 'forms', label: 'Forms', icon: 'fa-envelope-open-text' },
        { id: 'features', label: 'Features', icon: 'fa-puzzle-piece' },
        { id: 'branding', label: 'Branding', icon: 'fa-palette' },
        { id: 'seo', label: 'SEO', icon: 'fa-magnifying-glass-chart' },
        { id: 'content', label: 'Content', icon: 'fa-pen-nib' },
        { id: 'media', label: 'Media', icon: 'fa-photo-film' },
    ];

    addons: AddonItem[] = [
        // pages
        { id: 'p1', label: 'Extra simple page', price: 250, priceDisplay: '$250', category: 'pages', selected: false },
        { id: 'p2', label: 'Extra standard page', price: 400, priceDisplay: '$400', category: 'pages', selected: false },
        { id: 'p3', label: 'Extra premium page', price: 600, priceDisplay: '$600', category: 'pages', selected: false },
        { id: 'p4', label: 'Landing page', price: 500, priceDisplay: '$500', category: 'pages', selected: false },
        { id: 'p5', label: 'Thank-you page', price: 150, priceDisplay: '$150', category: 'pages', selected: false },
        { id: 'p6', label: 'Legal/privacy page setup', price: 150, priceDisplay: '$150', category: 'pages', selected: false },
        // sections
        { id: 's1', label: 'Extra standard section', price: 100, priceDisplay: '$100', category: 'sections', selected: false },
        { id: 's2', label: 'Premium designed section', price: 200, priceDisplay: '$200', category: 'sections', selected: false },
        { id: 's3', label: 'Hero section redesign', price: 150, priceDisplay: '$150', category: 'sections', selected: false },
        { id: 's4', label: 'About section', price: 100, priceDisplay: '$100', category: 'sections', selected: false },
        { id: 's5', label: 'Services section', price: 150, priceDisplay: '$150', category: 'sections', selected: false },
        { id: 's6', label: 'Gallery section', price: 150, priceDisplay: '$150', category: 'sections', selected: false },
        { id: 's7', label: 'Testimonials section', price: 100, priceDisplay: '$100', category: 'sections', selected: false },
        { id: 's8', label: 'FAQ section', price: 100, priceDisplay: '$100', category: 'sections', selected: false },
        { id: 's9', label: 'Pricing section', price: 150, priceDisplay: '$150', category: 'sections', selected: false },
        { id: 's10', label: 'Team section', price: 150, priceDisplay: '$150', category: 'sections', selected: false },
        { id: 's11', label: 'Process/how-it-works', price: 150, priceDisplay: '$150', category: 'sections', selected: false },
        { id: 's12', label: 'Service area section', price: 150, priceDisplay: '$150', category: 'sections', selected: false },
        { id: 's13', label: 'Call-to-action section', price: 100, priceDisplay: '$100', category: 'sections', selected: false },
        { id: 's14', label: 'Before/after section', price: 150, priceDisplay: '$150', category: 'sections', selected: false },
        { id: 's15', label: 'Reviews section', price: 100, priceDisplay: '$100', category: 'sections', selected: false },
        // forms
        { id: 'f1', label: 'Add contact form (Mini only)', price: 100, priceDisplay: '$100', category: 'forms', selected: false },
        { id: 'f2', label: 'Quote request form', price: 250, priceDisplay: '$250', category: 'forms', selected: false },
        { id: 'f3', label: 'Appointment request form', price: 250, priceDisplay: '$250', category: 'forms', selected: false },
        { id: 'f4', label: 'Multi-step form', price: 500, priceDisplay: '$500', category: 'forms', selected: false },
        { id: 'f5', label: 'File upload form', price: 300, priceDisplay: '$300', category: 'forms', selected: false },
        { id: 'f6', label: 'Form + Google Sheets', price: 250, priceDisplay: '$250', category: 'forms', selected: false },
        // features
        { id: 'ft1', label: 'Booking link button', price: 50, priceDisplay: '$50', category: 'features', selected: false },
        { id: 'ft2', label: 'Booking embed', price: 250, priceDisplay: '$250', category: 'features', selected: false },
        { id: 'ft3', label: 'Calendar embed', price: 150, priceDisplay: '$150', category: 'features', selected: false },
        { id: 'ft4', label: 'Instagram feed embed', price: 200, priceDisplay: '$200', category: 'features', selected: false },
        { id: 'ft5', label: 'Facebook page embed', price: 150, priceDisplay: '$150', category: 'features', selected: false },
        { id: 'ft6', label: 'Reviews embed', price: 200, priceDisplay: '$200', category: 'features', selected: false },
        { id: 'ft7', label: 'Chat widget setup', price: 150, priceDisplay: '$150', category: 'features', selected: false },
        { id: 'ft8', label: 'Newsletter signup', price: 250, priceDisplay: '$250', category: 'features', selected: false },
        { id: 'ft9', label: 'Stripe/PayPal button', price: 250, priceDisplay: '$250', category: 'features', selected: false },
        { id: 'ft10', label: 'Downloadable PDF/menu', price: 100, priceDisplay: '$100', category: 'features', selected: false },
        { id: 'ft11', label: 'Pop-up announcement', price: 150, priceDisplay: '$150', category: 'features', selected: false },
        { id: 'ft12', label: 'Coupon/promo banner', price: 100, priceDisplay: '$100', category: 'features', selected: false },
        // branding
        { id: 'b1', label: 'Basic color palette', price: 75, priceDisplay: '$75', category: 'branding', selected: false },
        { id: 'b2', label: 'Font pairing', price: 75, priceDisplay: '$75', category: 'branding', selected: false },
        { id: 'b3', label: 'Simple text logo', price: 150, priceDisplay: '$150', category: 'branding', selected: false },
        { id: 'b4', label: 'Logo refresh', price: 300, priceDisplay: '$300', category: 'branding', selected: false },
        { id: 'b5', label: 'Mini brand guide', price: 300, priceDisplay: '$300', category: 'branding', selected: false },
        { id: 'b6', label: 'Social profile graphics', price: 150, priceDisplay: '$150', category: 'branding', selected: false },
        { id: 'b7', label: 'Business card design', price: 150, priceDisplay: '$150', category: 'branding', selected: false },
        // seo
        { id: 'e1', label: 'Local SEO setup', price: 300, priceDisplay: '$300', category: 'seo', selected: false },
        { id: 'e2', label: 'Google Business Profile setup', price: 200, priceDisplay: '$200', category: 'seo', selected: false },
        { id: 'e3', label: 'Google Business optimization', price: 300, priceDisplay: '$300', category: 'seo', selected: false },
        { id: 'e4', label: 'Search Console setup', price: 100, priceDisplay: '$100', category: 'seo', selected: false },
        { id: 'e5', label: 'Google Analytics setup', price: 100, priceDisplay: '$100', category: 'seo', selected: false },
        { id: 'e6', label: 'Keyword research mini-pack', price: 250, priceDisplay: '$250', category: 'seo', selected: false },
        { id: 'e7', label: 'Blog setup', price: 300, priceDisplay: '$300', category: 'seo', selected: false },
        // content
        { id: 'c1', label: 'Light copy cleanup', price: 100, priceDisplay: '$100', category: 'content', selected: false },
        { id: 'c2', label: 'Homepage copywriting', price: 300, priceDisplay: '$300', category: 'content', selected: false },
        { id: 'c3', label: 'About section writing', price: 150, priceDisplay: '$150', category: 'content', selected: false },
        { id: 'c4', label: 'Services section writing', price: 200, priceDisplay: '$200', category: 'content', selected: false },
        { id: 'c5', label: 'Full one-page copywriting', price: 500, priceDisplay: '$500', category: 'content', selected: false },
        { id: 'c6', label: 'FAQ writing', price: 150, priceDisplay: '$150', category: 'content', selected: false },
        // media
        { id: 'm1', label: 'Image optimization', price: 75, priceDisplay: '$75', category: 'media', selected: false },
        { id: 'm2', label: 'Gallery setup', price: 150, priceDisplay: '$150', category: 'media', selected: false },
        { id: 'm3', label: 'Portfolio gallery', price: 250, priceDisplay: '$250', category: 'media', selected: false },
        { id: 'm4', label: 'Before/after gallery', price: 250, priceDisplay: '$250', category: 'media', selected: false },
        { id: 'm5', label: 'Stock photo sourcing', price: 100, priceDisplay: '$100', category: 'media', selected: false },
        { id: 'm6', label: 'Video embed', price: 100, priceDisplay: '$100', category: 'media', selected: false },
        { id: 'm7', label: 'Hero background video', price: 200, priceDisplay: '$200', category: 'media', selected: false },
        { id: 'm8', label: 'Simple animation effects', price: 200, priceDisplay: '$200', category: 'media', selected: false },
    ];

    // ── step 3: care plan
    selectedCare: string | null = null;
    readonly carePlans: CarePlan[] = [
        { id: 'none', name: 'No care plan', price: 0, priceDisplay: '$0/mo', desc: 'You handle maintenance yourself.', features: [] },
        { id: 'basic', name: 'Basic Care', price: 49, priceDisplay: '$49/mo', desc: 'Best for Mini Site clients and light upkeep.', features: ['Website monitoring', 'Monthly backup', 'Security & plugin updates', '1 small content update/month', 'Basic support'] },
        { id: 'standard', name: 'Standard Care', price: 99, priceDisplay: '$99/mo', desc: 'Best for Starter Site clients needing regular updates.', features: ['Everything in Basic Care', 'Up to 30 min edits/month', 'Performance check', 'Form testing', 'Priority support'] },
        { id: 'growth', name: 'Growth Care', price: 199, priceDisplay: '$199/mo', desc: 'Best for Local Business clients wanting monthly improvements.', features: ['Everything in Standard Care', 'Up to 1hr edits/month', 'Monthly report', 'SEO title & meta adjustments', 'Google Business updates', 'Priority support'] },
    ];

    readonly retainerPlans = [
        { name: 'Mini Retainer', hours: '2 hours/month', priceDisplay: '$300/mo', desc: 'Small businesses needing regular monthly changes.', features: ['Website edits + content updates', 'Minor design changes', 'Basic consulting'] },
        { name: 'Standard Retainer', hours: '5 hours/month', priceDisplay: '$600/mo', desc: 'Businesses running promos or regularly updating their site.', features: ['Website improvements', 'Small landing pages', 'SEO updates + monthly planning call'] },
        { name: 'Premium Solo Retainer', hours: '8 hours/month', priceDisplay: '$1,000/mo', desc: 'Businesses wanting ongoing support from a digital partner.', features: ['Priority support', 'Website updates + conversion improvements', 'Email/newsletter updates', 'SEO & content improvements'] },
    ];

    readonly exampleBuilds = [
        { title: 'Cheapest Option', base: 'Mini Site', oneTime: 499, monthly: 49, addons: [] },
        { title: 'Barber Website', base: 'Starter Site', oneTime: 1299, monthly: 99, addons: ['Booking embed', 'Gallery section'] },
        { title: 'Cleaning Business', base: 'Starter Site', oneTime: 1649, monthly: 99, addons: ['Quote form', 'Google Business', 'Local SEO'] },
        { title: 'Contractor', base: 'Local Business Site', oneTime: 2700, monthly: 199, addons: ['Extra page', 'Quote form', 'Local SEO'] },
        { title: 'Restaurant', base: 'Starter Site', oneTime: 1349, monthly: 99, addons: ['Menu PDF', 'Gallery section', 'Instagram feed'] },
    ];

    // ── computed totals
    get basePrice(): number {
        return this.basePackages.find(p => p.id === this.selectedBase)?.price ?? 0;
    }

    get addonTotal(): number {
        return this.addons.filter(a => a.selected).reduce((sum, a) => sum + a.price, 0);
    }

    get carePrice(): number {
        return this.carePlans.find(c => c.id === this.selectedCare)?.price ?? 0;
    }

    get oneTimeTotal(): number {
        return this.basePrice + this.addonTotal;
    }

    get selectedAddons(): AddonItem[] {
        return this.addons.filter(a => a.selected);
    }

    get selectedBasePkg() {
        return this.basePackages.find(p => p.id === this.selectedBase) ?? null;
    }

    get selectedCarePlan(): CarePlan | null {
        return this.carePlans.find(c => c.id === this.selectedCare) ?? null;
    }

    addonsForCategory(cat: string): AddonItem[] {
        return this.addons.filter(a => a.category === cat);
    }

    selectedCountForCategory(cat: string): number {
        return this.addons.filter(a => a.category === cat && a.selected).length;
    }

    selectBase(id: string): void {
        this.selectedBase = id;
        const rec = this.basePackages.find(p => p.id === id)?.carePlanId ?? null;
        this.selectedCare = rec;
    }

    toggleAddonItem(item: AddonItem): void {
        item.selected = !item.selected;
    }

    selectCare(id: string): void {
        this.selectedCare = id;
    }

    goToStep(n: number): void {
        this.builderStep = n;
    }

    resetBuilder(): void {
        this.selectedBase = null;
        this.selectedCare = null;
        this.addons.forEach(a => a.selected = false);
        this.builderStep = 1;
    }

    // ── reference tabs (non-builder sections)
    setSection(section: string): void {
        this.builderStep = 1;
    }

    toggleAddon(cat: string): void {
        this.openAddon = this.openAddon === cat ? '' : cat;
    }

    // ── expand / compare / retainer toggles
    toggleExpand(): void { this.isExpanded = !this.isExpanded; }
    toggleCompare(): void { this.showCompare = !this.showCompare; }
    toggleRetainers(): void { this.showRetainers = !this.showRetainers; }

    close(): void {
        this.closePanel.emit();
    }
}

