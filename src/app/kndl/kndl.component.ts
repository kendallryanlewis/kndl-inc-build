import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { Subscription } from 'rxjs';
import { SEOService } from '../services/seo.service';
import {
    DEFAULT_ABOUT_DATA
} from '../config/default-site-content';
import { KndlProductApp } from '../models/kndl-product-app';
import { AppleAppCatalogService } from '../services/apple-app-catalog.service';
import { BackgroundService } from '../services/background.service';

type KndlTopTab = 'home' | 'products' | 'about' | 'contact';

interface KndlHomeSlide {
    eyebrow: string;
    scriptWord: string;
    titleOne: string;
    titleTwo: string;
    approachHeadingTop: string;
    approachHeadingBottom: string;
    approachBody: string;
    bottomLeftTitle: string;
    bottomLeftBody: string;
    bottomRightTitle: string;
    bottomRightBody: string;
}

interface KndlStrengthItem {
    icon: string;
    title: string;
    body: string;
}

interface KndlProcessStep {
    num: string;
    title: string;
    body: string;
}

interface KndlDifferenceItem {
    icon: string;
    title: string;
    body: string;
    statValue: string;
    statLabel: string;
}

interface KndlStatItem {
    value: string;
    label: string;
}

interface KndlTopTabContent {
    layout: 'landing' | 'split-media' | 'full-bleed' | 'feature-grid' | 'about-strengths' | 'about-stats' | 'process';
    eyebrow: string;
    title: string;
    description: string;
    ctaLabel: string;
    bottomLeftTitle: string;
    bottomLeftBody: string;
    bottomRightTitle: string;
    bottomRightBody: string;
    mediaTitle?: string;
    mediaSubtitle?: string;
    mediaImageUrl?: string;
    featureTitle?: string;
    featureBody?: string;
    featureItems?: string[];
    strengthItems?: KndlStrengthItem[];
    statsItems?: KndlStatItem[];
    highlightQuote?: string;
    highlightAuthor?: string;
    processSteps?: KndlProcessStep[];
}

@Component({
    selector: 'app-kndl',
    templateUrl: './kndl.component.html',
    styleUrls: ['./kndl.component.scss']
})
export class KndlComponent implements OnInit, OnDestroy {
    isMegaMenuOpen = false;
    isSlideoutOpen = false;
    slideoutPage: 'builder' | 'privacy' | 'terms' | 'policy' = 'builder';
    activeTopTab: KndlTopTab = 'home';
    private readonly TAB_KEY = 'kndl_active_tab';
    private routeTabSyncSub: Subscription | null = null;
    videoLoaded = false; // kept for template compat — actual video lives in AppComponent
    isTopTabTransitioning = false;
    activeSectionIndex = 0;
    currentSlideIndex = 0;
    contactFormSubmitted = false;
    readonly contactForm = {
        name: '',
        email: '',
        company: '',
        message: ''
    };

    readonly topTabContent: Record<KndlTopTab, KndlTopTabContent[]> = {
        home: [
            {
                layout: 'landing',
                eyebrow: 'KNDL Inc Studio',
                title: 'KNDL INC',
                description: 'KNDL Inc designs and develops modern digital experiences for growing businesses, with strategy and execution in one team.',
                ctaLabel: 'Explore Home',
                bottomLeftTitle: 'Studio Overview',
                bottomLeftBody: 'See how we think, build, and support long-term growth.',
                bottomRightTitle: 'Featured Work',
                bottomRightBody: 'Explore selected outcomes and productized solutions.'
            }
        ],
        products: [
            {
                layout: 'landing',
                eyebrow: 'KNDL Inc Products',
                title: 'APP PRODUCTS',
                description: 'Discover productized app experiences for portals, estimators, and internal operations designed to improve retention.',
                ctaLabel: 'View Products',
                bottomLeftTitle: 'Product Gallery',
                bottomLeftBody: 'See featured app concepts and implementation-ready product ideas.',
                bottomRightTitle: 'Use Cases',
                bottomRightBody: 'Solutions for onboarding, quoting, support, and client management.'
            },
            {
                layout: 'feature-grid',
                eyebrow: 'Operations Products',
                title: 'TEAM WORKFLOWS',
                description: 'Internal productivity tools reduce handoff friction, accelerate delivery, and keep teams aligned around client outcomes.',
                ctaLabel: 'View Products',
                bottomLeftTitle: 'Ops Dashboards',
                bottomLeftBody: 'Real-time visibility into delivery and bottlenecks.',
                bottomRightTitle: 'Automation Paths',
                bottomRightBody: 'Repeatable systems for approvals, updates, and reporting.',
                featureItems: [
                    'Cross-team status dashboards',
                    'Approval pipelines with audit trail',
                    'Reusable templates for handoff quality',
                    'Delivery intelligence and SLA alerts'
                ]
            },
            {
                layout: 'full-bleed',
                eyebrow: 'Client Experience Products',
                title: 'CLIENT PORTALS',
                description: 'Purpose-built interfaces that centralize files, billing, timeline updates, and support communication in one secure place.',
                ctaLabel: 'View Products',
                bottomLeftTitle: 'Retention Tools',
                bottomLeftBody: 'UX patterns that keep clients informed and engaged.',
                bottomRightTitle: 'Revenue Support',
                bottomRightBody: 'Billing visibility and delivery confidence that improve renewals.',
                featureTitle: 'A full client command center designed around trust and transparency.',
                featureBody: 'Centralized documents, service updates, billing health, and support messaging create a premium delivery experience that clients feel immediately.',
                featureItems: ['Project timeline visibility', 'Shared asset vault', 'Billing and renewal readiness', 'Support communication stream']
            },
            {
                layout: 'split-media',
                eyebrow: 'Commerce Products',
                title: 'REVENUE SYSTEMS',
                description: 'From lead qualification to conversion and retention, we design productized flows that reduce friction and improve customer confidence.',
                ctaLabel: 'View Products',
                bottomLeftTitle: 'Conversion Focused',
                bottomLeftBody: 'Checkout and onboarding flows optimized for trust and completion.',
                bottomRightTitle: 'Retention Ready',
                bottomRightBody: 'Lifecycle messaging and account visibility designed for repeat value.',
                mediaTitle: 'Digital Products That Move Revenue',
                mediaSubtitle: 'Each product combines UX, automation, and reporting so teams can see exactly where growth happens and where to optimize next.',
                mediaImageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1000&q=80',
                featureItems: [
                    'Lead qualification with package matching logic',
                    'Checkout-ready proposal and invoicing experiences',
                    'Client onboarding with milestone visibility',
                    'Retention insights and post-purchase reporting'
                ]
            }
        ],
        about: [
            {
                layout: 'landing',
                eyebrow: 'Dallas–Fort Worth, TX',
                title: 'ABOUT KNDL',
                description: 'KNDL Inc is a boutique web studio built for service businesses that are ready to grow. We combine strategy, design, and development into one streamlined team — no agencies, no middlemen, just direct execution from kick-off to launch and beyond.',
                ctaLabel: 'Our Story',
                bottomLeftTitle: 'Founded in DFW',
                bottomLeftBody: 'Based in Dallas–Fort Worth, serving clients locally and remotely across the US.',
                bottomRightTitle: 'Full-Service Studio',
                bottomRightBody: 'Strategy, design, development, and ongoing care under one roof.'
            },
            {
                layout: 'about-strengths',
                eyebrow: 'What We Do',
                title: 'OUR DISCIPLINES',
                description: 'We operate across four core disciplines that work together to build and sustain your digital presence.',
                ctaLabel: 'Learn More',
                bottomLeftTitle: 'End-to-End',
                bottomLeftBody: 'From brand strategy to launch — every discipline covered by one team.',
                bottomRightTitle: 'Integrated Workflow',
                bottomRightBody: 'No handoffs between agencies. Design, build, and grow in sync.',
                strengthItems: [
                    {
                        icon: 'fas fa-chess-rook',
                        title: 'Strategy',
                        body: 'We start with clarity. Through discovery and research, we define positioning, audience, and objectives that align with your business goals.'
                    },
                    {
                        icon: 'fas fa-pen-nib',
                        title: 'Design',
                        body: 'We craft modern, conversion-focused designs that communicate value clearly and create trust at every customer touchpoint.'
                    },
                    {
                        icon: 'fas fa-code',
                        title: 'Development',
                        body: 'Clean, scalable, and secure builds engineered for performance, accessibility, and long-term maintainability.'
                    },
                    {
                        icon: 'fas fa-chart-line',
                        title: 'Growth',
                        body: 'We don\'t stop at launch. We help you attract, convert, and retain more customers with data-driven optimization.'
                    }
                ]
            },
            {
                layout: 'process',
                eyebrow: 'How We Work',
                title: 'OUR PROCESS',
                description: 'A proven, collaborative process that turns vision into measurable results.',
                ctaLabel: 'Start a Project',
                bottomLeftTitle: '',
                bottomLeftBody: '',
                bottomRightTitle: '',
                bottomRightBody: '',
                processSteps: [
                    { num: '1', title: 'DISCOVER', body: 'We dive deep into your business, audience, and goals to uncover opportunities that drive impact.' },
                    { num: '2', title: 'DEFINE', body: 'We define the strategy, structure, and roadmap aligned to your objectives and market.' },
                    { num: '3', title: 'DESIGN', body: 'We craft the experience and message that communicate value clearly and convert visitors.' },
                    { num: '4', title: 'BUILD', body: 'We develop clean, scalable solutions with precision and attention to every detail.' },
                    { num: '5', title: 'LAUNCH', body: 'We launch with confidence and continue optimizing for growth and long-term success.' }
                ]
            },
            {
                layout: 'about-stats',
                eyebrow: 'By the Numbers',
                title: 'TRACK RECORD',
                description: 'Four years of focused studio work across industries, project types, and client sizes.',
                ctaLabel: 'See Our Work',
                bottomLeftTitle: 'Proven Retention',
                bottomLeftBody: 'Clients stay because results compound — care plans and ongoing strategy keep momentum.',
                bottomRightTitle: 'DFW & Beyond',
                bottomRightBody: 'Rooted in Dallas–Fort Worth with clients across the US.',
                statsItems: [
                    { value: '50+', label: 'Projects Delivered' },
                    { value: '4+', label: 'Years in Business' },
                    { value: '98%', label: 'Client Retention' },
                    { value: 'DFW', label: 'Headquartered' }
                ],
                highlightQuote: 'KNDL didn\'t just build us a website — they helped us figure out what we were actually trying to say and who we were saying it to.',
                highlightAuthor: 'Client, Home Services Industry'
            },
            {
                layout: 'full-bleed',
                eyebrow: 'What Makes Us Different',
                title: 'BUILT DIFFERENT',
                description: 'We hold a higher standard for every site we build — because a website that underperforms costs you more than you think.',
                ctaLabel: 'Start a Project',
                bottomLeftTitle: 'No Templates',
                bottomLeftBody: 'Every design is original — built from your brand up, not a purchased theme.',
                bottomRightTitle: 'Lasting Quality',
                bottomRightBody: 'We build for longevity: clean code, clear CMS, and a site your team can grow into.',
                featureTitle: 'Six principles that define every KNDL build.',
                featureBody: 'These aren\'t marketing claims — they\'re the measurable standards we hold ourselves to on every engagement.',
                featureItems: [
                    'No-template, custom-built designs',
                    'Accessibility-first implementation (WCAG 2.1 AA)',
                    'Performance-optimized: 90+ Lighthouse scores targeted',
                    'Full content ownership — no vendor lock-in',
                    'Transparent pricing with no hidden scope creep',
                    'Partnership model: we grow alongside you'
                ]
            }
        ],
        contact: [
            {
                layout: 'landing',
                eyebrow: 'Get In Touch',
                title: 'CONTACT KNDL',
                description: 'Tell us about your project and timeline. We respond quickly with clear next steps and recommended package direction.',
                ctaLabel: 'Send Message',
                bottomLeftTitle: 'Studio Location',
                bottomLeftBody: 'Serving Dallas-Fort Worth and remote clients nationwide.',
                bottomRightTitle: 'Response Window',
                bottomRightBody: 'Most inquiries receive a response within one business day.',
                featureItems: [
                    'Strategy-first discovery call and goals alignment',
                    'Recommended package direction based on your timeline',
                    'Transparent scope, milestones, and delivery sequence'
                ]
            },
            {
                layout: 'landing',
                eyebrow: 'New Build Requests',
                title: 'PROJECT INTAKE',
                description: 'Share your current challenges, target audience, and launch goals so we can structure an execution plan that matches your growth stage.',
                ctaLabel: 'Request Consultation',
                bottomLeftTitle: 'Clarity First',
                bottomLeftBody: 'We map priorities before design or development begins.',
                bottomRightTitle: 'Structured Scope',
                bottomRightBody: 'Defined pages, integrations, and phases with no ambiguous handoffs.',
                featureItems: [
                    'Ideal launch window and business deadlines',
                    'Current site issues and conversion bottlenecks',
                    'Desired functionality and integrations',
                    'Preferred budget range and support cadence'
                ]
            },
            {
                layout: 'landing',
                eyebrow: 'Partnership Model',
                title: 'LONG-TERM SUPPORT',
                description: 'After launch, we continue improving your website through updates, experimentation, and support operations that protect long-term momentum.',
                ctaLabel: 'Book Intro Call',
                bottomLeftTitle: 'Care Plans',
                bottomLeftBody: 'Maintenance, updates, and growth experimentation in one service lane.',
                bottomRightTitle: 'Direct Access',
                bottomRightBody: 'Work directly with the same team that built your platform.',
                featureItems: [
                    'Prioritized improvement roadmap by quarter',
                    'Performance and UX enhancement cycles',
                    'Support requests with clearly defined turnaround',
                    'Data-informed iteration for conversion gains'
                ]
            }
        ]
    };

    readonly homeSlides: KndlHomeSlide[] = [
        {
            eyebrow: 'KNDL Inc Website Studio',
            scriptWord: 'fluid',
            titleOne: 'KNDL INC',
            titleTwo: 'WEBSITES',
            approachHeadingTop: 'Brand',
            approachHeadingBottom: 'Foundation',
            approachBody: 'KNDL Inc designs and builds custom websites that help service businesses look credible, rank better, and convert more visitors into clients.',
            bottomLeftTitle: 'Website Strategy',
            bottomLeftBody: 'Positioning-first page structure, messaging, and calls-to-action tailored to your services.',
            bottomRightTitle: 'Design + Build',
            bottomRightBody: 'Modern visual systems and responsive development delivered as one streamlined process.'
        },
        {
            eyebrow: 'KNDL Inc Digital Presence',
            scriptWord: 'motion',
            titleOne: 'SERVICE',
            titleTwo: 'SITES',
            approachHeadingTop: 'Content',
            approachHeadingBottom: 'Clarity',
            approachBody: 'Every KNDL Inc website is structured to explain your offer fast, build trust quickly, and guide users to book, call, or request a quote.',
            bottomLeftTitle: 'Conversion Paths',
            bottomLeftBody: 'Intentional layouts that lead users from first impression to action with less friction.',
            bottomRightTitle: 'SEO Ready',
            bottomRightBody: 'Performance-focused builds with strong technical SEO and clean content architecture.'
        },
        {
            eyebrow: 'KNDL Inc Growth Systems',
            scriptWord: 'signal',
            titleOne: 'ONLINE',
            titleTwo: 'GROWTH',
            approachHeadingTop: 'Retention',
            approachHeadingBottom: 'Focused',
            approachBody: 'From launch to long-term support, KNDL Inc keeps your site updated, optimized, and aligned to your business goals as you scale.',
            bottomLeftTitle: 'Ongoing Support',
            bottomLeftBody: 'Content updates, enhancements, and site care plans to keep momentum after launch.',
            bottomRightTitle: 'Business Impact',
            bottomRightBody: 'A website that works like a 24/7 sales asset for your company, not just a brochure.'
        }
    ];

    productApps: KndlProductApp[] = [];

    readonly kndlDifference: KndlDifferenceItem[] = [
        {
            icon: 'fas fa-landmark',
            title: 'Built For Service Brands',
            body: 'We specialize in service-based businesses and understand what drives trust, leads, and long-term growth.',
            statValue: '10+',
            statLabel: 'Years Experience'
        },
        {
            icon: 'fas fa-user-tie',
            title: 'Senior-Level Execution',
            body: 'You work directly with senior strategists, designers, and developers — no handoffs, no layers.',
            statValue: '50+',
            statLabel: 'Successful Launches'
        },
        {
            icon: 'fas fa-chart-line',
            title: 'Growth-Minded Systems',
            body: 'Every decision is rooted in strategy and measured by results. Beautiful by design. Built to perform.',
            statValue: '100%',
            statLabel: 'Focused On Your Growth'
        }
    ];

    private slideTimerId: number | null = null;
    private topTabTransitionTimerId: number | null = null;
    private wheelTransitionLockTimerId: number | null = null;
    private loadingSafetyTimerId: number | null = null;
    private isDataReady = false;
    private isMapReady = false;
    private isAboutImageReady = false;

    // Firebase
    private firestore = getFirestore();

    // Content loaded for dynamic page text.
    isLoading = true;
    aboutData: { headerText: string } = { ...DEFAULT_ABOUT_DATA };

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private seoService: SEOService,
        private appleAppCatalogService: AppleAppCatalogService,
        private bg: BackgroundService
    ) { }

    async ngOnInit(): Promise<void> {
        this.startLoadingSafetyTimeout();
        void this.preloadAboutHeroImage();

        // Restore tab from previous session
        const saved = sessionStorage.getItem(this.TAB_KEY) as KndlTopTab | null;
        const validTabs: KndlTopTab[] = ['home', 'about', 'products', 'contact'];
        const routeTab = this.parseTopTab(this.route.snapshot.queryParamMap.get('tab'));
        if (routeTab) {
            this.activeTopTab = routeTab;
        } else if (saved && validTabs.includes(saved)) {
            this.activeTopTab = saved;
        }

        // Keep URL in sync with initial restored state so back/forward can track tabs.
        if (!routeTab && this.activeTopTab !== 'home') {
            this.syncTabToUrl(this.activeTopTab, true);
        }

        this.routeTabSyncSub = this.route.queryParamMap.subscribe((params) => {
            const nextTab = this.parseTopTab(params.get('tab')) ?? 'home';
            this.applyTopTab(nextTab, false);
        });

        // Sync persistent background with the restored/default tab
        this.bg.setTab(this.activeTopTab, this.activeTopTab === 'contact');

        // Set initial SEO
        this.seoService.setHomeSEO();

        this.startAutoSlideSwitch();

        try {
            await Promise.all([
                this.loadSiteLayout(),
                this.loadAppCatalog()
            ]);
        } finally {
            this.isDataReady = true;
            this.completeLoadingIfReady();
        }
    }

    ngOnDestroy(): void {
        if (this.loadingSafetyTimerId !== null) {
            window.clearTimeout(this.loadingSafetyTimerId);
            this.loadingSafetyTimerId = null;
        }

        if (this.routeTabSyncSub) {
            this.routeTabSyncSub.unsubscribe();
            this.routeTabSyncSub = null;
        }

        if (this.slideTimerId !== null) {
            window.clearInterval(this.slideTimerId);
            this.slideTimerId = null;
        }

        if (this.topTabTransitionTimerId !== null) {
            window.clearTimeout(this.topTabTransitionTimerId);
            this.topTabTransitionTimerId = null;
        }

        if (this.wheelTransitionLockTimerId !== null) {
            window.clearTimeout(this.wheelTransitionLockTimerId);
            this.wheelTransitionLockTimerId = null;
        }
    }

    get activeSlide(): KndlHomeSlide {
        return this.homeSlides[this.currentSlideIndex];
    }

    get activeTopTabSections(): KndlTopTabContent[] {
        return this.topTabContent[this.activeTopTab];
    }

    get activeTopTabContent(): KndlTopTabContent {
        return this.activeTopTabSections[this.activeSectionIndex] ?? this.activeTopTabSections[0];
    }

    get sectionDots(): number[] {
        return this.activeTopTabSections.map((_, index) => index);
    }

    get activeTopThemeStyle(): Record<string, string> {
        if (this.activeTopTab === 'contact') {
            return {
                '--reel-tint-top': 'rgba(12 12 13 / 0.72)',
                '--reel-tint-mid': 'rgba(14 14 15 / 0.78)',
                '--reel-tint-bottom': 'rgba(8 8 9 / 0.84)',
                '--tab-accent-bg': 'rgba(205 205 210 / 0.2)',
                '--tab-accent-border': 'rgba(224 224 228 / 0.38)',
                '--tab-accent-fg': 'rgba(236 236 240 / 0.92)'
            };
        }

        if (this.activeTopTab === 'products') {
            return {
                '--reel-tint-top': 'rgba(24 31 45 / 0.44)',
                '--reel-tint-mid': 'rgba(22 40 60 / 0.3)',
                '--reel-tint-bottom': 'rgba(8 19 33 / 0.62)',
                '--tab-accent-bg': 'rgba(90 125 176 / 0.34)',
                '--tab-accent-border': 'rgba(148 187 236 / 0.52)',
                '--tab-accent-fg': 'rgba(227 240 255 / 0.92)'
            };
        }

        if (this.activeTopTab === 'about') {
            return {
                '--reel-tint-top': 'rgba(36 29 20 / 0.36)',
                '--reel-tint-mid': 'rgba(52 38 23 / 0.24)',
                '--reel-tint-bottom': 'rgba(26 17 10 / 0.56)',
                '--tab-accent-bg': 'rgba(190 143 82 / 0.3)',
                '--tab-accent-border': 'rgba(232 188 131 / 0.58)',
                '--tab-accent-fg': 'rgba(255 241 219 / 0.93)'
            };
        }

        return {
            '--reel-tint-top': 'rgba(20 28 40 / 0.36)',
            '--reel-tint-mid': 'rgba(29 42 62 / 0.2)',
            '--reel-tint-bottom': 'rgba(9 14 24 / 0.5)',
            '--tab-accent-bg': '#c9a96e',
            '--tab-accent-border': '#c9a96e',
            '--tab-accent-fg': '#0a0c12'
        };
    }

    nextSlide(): void {
        this.setSlideByDelta(1);
    }

    prevSlide(): void {
        this.setSlideByDelta(-1);
    }

    private async loadAppCatalog(): Promise<void> {
        this.productApps = await this.appleAppCatalogService.loadAppPageApps();
    }

    async loadSiteLayout(): Promise<void> {
        try {
            const docRef = doc(this.firestore, 'siteLayout', 'main');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                this.aboutData = data['aboutData'] || { ...DEFAULT_ABOUT_DATA };

                if (this.aboutData.headerText) {
                    this.seoService.updateTitle(this.aboutData.headerText + ' - Kndl Inc');
                    this.seoService.updateDescription(this.aboutData.headerText);
                }
            }
        } catch (error) {
            console.error('Error loading site layout:', error);
        }
    }

    toggleMegaMenu(): void {
        this.isMegaMenuOpen = !this.isMegaMenuOpen;
    }

    openSlideout(page: 'builder' | 'privacy' | 'terms' | 'policy' = 'builder'): void {
        this.slideoutPage = page;
        this.isSlideoutOpen = true;
    }

    closeSlideout(): void {
        this.isSlideoutOpen = false;
    }

    onFeatureBarOpen(panel: string): void {
        if (panel === 'about') {
            this.selectTopTab('about');
        } else {
            this.openSlideout('builder');
        }
    }

    openServiceBuilder(service: string): void {
        this.openSlideout('builder');
    }

    selectTopTab(tab: KndlTopTab): void {
        if (this.activeTopTab === tab) {
            return;
        }

        this.applyTopTab(tab, true);
    }

    private applyTopTab(tab: KndlTopTab, syncToUrl: boolean): void {
        if (this.activeTopTab === tab) {
            return;
        }

        if (this.topTabTransitionTimerId !== null) {
            window.clearTimeout(this.topTabTransitionTimerId);
            this.topTabTransitionTimerId = null;
        }

        this.activeTopTab = tab;
        this.activeSectionIndex = 0;
        sessionStorage.setItem(this.TAB_KEY, tab);
        this.bg.setTab(tab, tab === 'contact');

        if (syncToUrl) {
            this.syncTabToUrl(tab);
        }

        if (tab === 'products') {
            // Pull the latest synced Apple catalog whenever Products is opened.
            void this.loadAppCatalog();
        }

        this.runTabTransition();
    }

    private parseTopTab(value: string | null): KndlTopTab | null {
        if (value === 'home' || value === 'products' || value === 'about' || value === 'contact') {
            return value;
        }

        return null;
    }

    private syncTabToUrl(tab: KndlTopTab, replaceUrl = false): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                tab: tab === 'home' ? null : tab
            },
            queryParamsHandling: 'merge',
            replaceUrl
        });
    }

    runTopTabAction(): void {
        if (this.activeTopTab === 'contact') {
            this.contactFormSubmitted = true;
            return;
        }

        if (this.activeTopTab === 'products') {
            this.openSlideout('builder');
            return;
        }
    }

    selectSection(index: number): void {
        if (index < 0 || index >= this.activeTopTabSections.length || index === this.activeSectionIndex) {
            return;
        }

        this.activeSectionIndex = index;
        this.runTabTransition();
    }

    nextSection(): void {
        if (this.activeTopTabSections.length <= 1) {
            return;
        }

        const nextIndex = (this.activeSectionIndex + 1) % this.activeTopTabSections.length;
        this.selectSection(nextIndex);
    }

    prevSection(): void {
        if (this.activeTopTabSections.length <= 1) {
            return;
        }

        const prevIndex = (this.activeSectionIndex - 1 + this.activeTopTabSections.length) % this.activeTopTabSections.length;
        this.selectSection(prevIndex);
    }

    handleMainWheel(event: WheelEvent): void {
        if (this.activeTopTab !== 'home') {
            return;
        }

        if (this.activeTopTabSections.length <= 1 || Math.abs(event.deltaY) < 20) {
            return;
        }

        event.preventDefault();

        if (this.wheelTransitionLockTimerId !== null) {
            return;
        }

        if (event.deltaY > 0) {
            this.nextSection();
        } else {
            this.prevSection();
        }

        this.wheelTransitionLockTimerId = window.setTimeout(() => {
            this.wheelTransitionLockTimerId = null;
        }, 460);
    }

    submitContactForm(): void {
        this.contactFormSubmitted = true;
    }

    private startAutoSlideSwitch(): void {
        this.slideTimerId = window.setInterval(() => {
            this.nextSlide();
        }, 6000);
    }

    private setSlideByDelta(delta: number): void {
        const slideCount = this.homeSlides.length;
        this.currentSlideIndex = (this.currentSlideIndex + delta + slideCount) % slideCount;
    }

    private runTabTransition(): void {
        this.isTopTabTransitioning = false;

        requestAnimationFrame(() => {
            this.isTopTabTransitioning = true;
            this.topTabTransitionTimerId = window.setTimeout(() => {
                this.isTopTabTransitioning = false;
                this.topTabTransitionTimerId = null;
            }, 420);
        });
    }

    onMapReady(): void {
        this.isMapReady = true;
        this.completeLoadingIfReady();
    }

    private preloadAboutHeroImage(): void {
        const image = new Image();

        const markReady = () => {
            this.isAboutImageReady = true;
            this.completeLoadingIfReady();
        };

        image.onload = markReady;
        image.onerror = markReady;
        image.src = 'assets/Images/team.jpg';
    }

    private startLoadingSafetyTimeout(): void {
        this.loadingSafetyTimerId = window.setTimeout(() => {
            this.isMapReady = true;
            this.isAboutImageReady = true;
            this.completeLoadingIfReady();
        }, 12000);
    }

    private completeLoadingIfReady(): void {
        if (!this.isDataReady || !this.isMapReady || !this.isAboutImageReady) {
            return;
        }

        if (this.loadingSafetyTimerId !== null) {
            window.clearTimeout(this.loadingSafetyTimerId);
            this.loadingSafetyTimerId = null;
        }

        this.isLoading = false;
    }
}
