
export const DEFAULT_SITE_CONTENT = {
    aboutData: {
        headerText: 'Brand + Web Studio. Real Results.'
    },

    aboutUsData: {
        mainHeading: 'About',
        subHeading: 'Us',
        processTitle: 'Our Process',
        processSteps: [
            {
                number: '1',
                title: 'Consultation',
                description: 'We discuss your needs and goals to understand your vision and requirements.',
                delay: '0.1s'
            },
            {
                number: '2',
                title: 'Design',
                description: 'We create custom designs that reflect your brand identity and values.',
                delay: '0.2s'
            },
            {
                number: '3',
                title: 'Development',
                description: 'We build your website and brand assets with modern technologies.',
                delay: '0.3s'
            },
            {
                number: '4',
                title: 'Launch',
                description: 'We launch your brand and provide ongoing support for continued success.',
                delay: '0.4s'
            }
        ],
        brandTitle: 'Why Choose Us',
        brandDescription: [
            'We help local businesses and solo founders create professional brands that stand out in their market.',
            'Our comprehensive approach ensures consistency across all platforms and touchpoints.',
            'From initial concept to final launch, we work closely with you to bring your vision to life.',
            'We believe in delivering real results that drive business growth and customer engagement.'
        ],
        brandFeatures: [
            {
                title: 'Professional Design',
                description: 'Custom designs tailored to your brand and audience'
            },
            {
                title: 'Fast Delivery',
                description: 'Quick turnaround times without compromising quality'
            },
            {
                title: 'Ongoing Support',
                description: 'Continuous support and maintenance for your digital presence'
            },
            {
                title: 'Results-Driven',
                description: 'Strategies focused on measurable business outcomes'
            }
        ],
        styling: {
            hrWidth: '200px',
            processColors: {
                text: 'tan',
                background: 'blue'
            }
        },
        isActive: true,
        version: 1,
        author: 'Kndl Inc',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString()
    },

    detailedServicesData: {
        headerTitle: 'Web Development',
        headerHighlight: 'Packages',
        headerDescription: 'Development-focused packages with clean WordPress builds, fast delivery, and transparent pricing. Add‑ons & subscriptions available for everything else.',
        processTitle: 'Process: Discover → Build → Launch → Care Plan',
        processDescription: [
            'We keep things simple: Discover your goals, audience, refs, sitemap, KPIs → Brand & Build logo/refresh, palette, wireframes → design → build → QA → Launch & Care Plan enrollment with optional ongoing management.',
            'You\'ll work directly with our team—no account managers or middlemen. Projects are delivered with staged payments (50% deposit; 40% at design approval; 10% at launch), upfront pricing, and clear scope guardrails.',
            'Ready for total brand presence with measurable results? Get a dev quote and we\'ll provide a menu of add‑ons/subscriptions.'
        ],
        ctaText: 'Get Your Quote Today',
        styling: {
            hrWidth: '200px'
        }
    },

    addOnsData: {
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
    },

    callToActionData: {
        title: 'Ready to Build Your Brand?',
        description: 'Pixel & Post helps local businesses and solo founders launch fast, look credible, be found, and grow smart. Complete brand kits, high-converting websites, and ongoing digital marketing support—delivered with no agency fluff and real results.',
        buttonText: 'Start Your Project',
        styling: {
            hrWidth: '200px'
        }
    },

    headerSubText: 'We help local businesses and solo founders launch fast, look credible, be found, and grow smart with complete brand kits, high-converting websites, and ongoing digital marketing support.'
};

// Export individual sections for easier access
export const DEFAULT_ABOUT_DATA = DEFAULT_SITE_CONTENT.aboutData;
export const DEFAULT_ABOUT_US_DATA = DEFAULT_SITE_CONTENT.aboutUsData;
export const DEFAULT_DETAILED_SERVICES_DATA = DEFAULT_SITE_CONTENT.detailedServicesData;
export const DEFAULT_ADDONS_DATA = DEFAULT_SITE_CONTENT.addOnsData;
export const DEFAULT_CALL_TO_ACTION_DATA = DEFAULT_SITE_CONTENT.callToActionData;
export const DEFAULT_HEADER_SUB_TEXT = DEFAULT_SITE_CONTENT.headerSubText;