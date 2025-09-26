import { SEOData } from '../services/seo.service';

export const SEO_CONFIG = {
    // Global defaults
    global: {
        siteName: 'Kndl Inc',
        siteUrl: 'https://kndl-inc.com',
        defaultImage: '/assets/Images/og-image.png',
        twitterHandle: '@kndlinc', // Add your Twitter handle
        fbAppId: '', // Add your Facebook App ID if needed
    },

    // Page-specific SEO data
    pages: {
        home: {
            title: 'Kndl Inc - Brand + Web Studio. Real Results.',
            description: 'We help local businesses and solo founders launch fast, look credible, be found, and grow smart with complete brand kits, high-converting websites, and ongoing digital marketing support.',
            keywords: 'web development, branding, digital marketing, website design, local business, startup, brand identity, high-converting websites',
            ogType: 'website'
        } as SEOData,

        about: {
            title: 'About Us - Kndl Inc',
            description: 'Learn about Kndl Inc\'s process and why we\'re the right choice for your brand and web development needs. Professional design with fast delivery and ongoing support.',
            keywords: 'about kndl inc, web development process, branding process, professional design, fast delivery',
            ogType: 'website'
        } as SEOData,

        services: {
            title: 'Web Development Services - Kndl Inc',
            description: 'Professional web development packages with clean WordPress builds, fast delivery, and transparent pricing. Complete brand kits and ongoing support available.',
            keywords: 'web development services, website packages, brand kits, WordPress development, transparent pricing, fast delivery',
            ogType: 'website'
        } as SEOData,

        addons: {
            title: 'Add-ons & Subscriptions - Kndl Inc',
            description: 'Enhance your brand with our flexible add-on services and subscription plans. Monthly support options for ongoing growth and website maintenance.',
            keywords: 'web development add-ons, marketing subscriptions, ongoing support, brand enhancement, website maintenance',
            ogType: 'website'
        } as SEOData,

        contact: {
            title: 'Contact Us - Kndl Inc',
            description: 'Ready to build your brand? Get in touch with Kndl Inc for web development and branding consultation. Let\'s discuss your project today.',
            keywords: 'contact kndl inc, web development consultation, branding consultation, project discussion',
            ogType: 'website'
        } as SEOData,

        dashboard: {
            title: 'Dashboard - Kndl Inc',
            description: 'Manage your brand and website content with Kndl Inc\'s powerful admin dashboard.',
            keywords: 'kndl dashboard, content management, website admin',
            robots: 'noindex,nofollow',
            ogType: 'website'
        } as SEOData,

        login: {
            title: 'Login - Kndl Inc',
            description: 'Access your Kndl Inc account to manage your brand and website content.',
            keywords: 'kndl login, account access, admin login',
            robots: 'noindex,nofollow',
            ogType: 'website'
        } as SEOData
    },

    // Schema.org structured data templates
    schemas: {
        organization: {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Kndl Inc",
            "alternateName": "Kndl",
            "url": "https://kndl-inc.com",
            "logo": "https://kndl-inc.com/assets/Images/logo.png",
            "description": "We help local businesses and solo founders launch fast, look credible, be found, and grow smart with complete brand kits, high-converting websites, and ongoing digital marketing support.",
            "address": {
                "@type": "PostalAddress",
                "addressCountry": "US"
            },
            "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "availableLanguage": "English"
            },
            "sameAs": [
                // Add your social media URLs here
                // "https://facebook.com/kndlinc",
                // "https://twitter.com/kndlinc",
                // "https://linkedin.com/company/kndlinc",
                // "https://instagram.com/kndlinc"
            ]
        },

        service: {
            "@context": "https://schema.org",
            "@type": "Service",
            "serviceType": "Web Development and Branding",
            "provider": {
                "@type": "Organization",
                "name": "Kndl Inc",
                "url": "https://kndl-inc.com"
            },
            "description": "Complete brand kits, high-converting websites, and ongoing digital marketing support for local businesses and solo founders.",
            "areaServed": "United States",
            "offers": {
                "@type": "Offer",
                "availability": "https://schema.org/InStock",
                "category": "Web Development Services"
            }
        },

        breadcrumbList: {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": []
        },

        website: {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Kndl Inc",
            "url": "https://kndl-inc.com",
            "description": "Brand + Web Studio delivering real results for local businesses and solo founders.",
            "publisher": {
                "@type": "Organization",
                "name": "Kndl Inc"
            },
            "potentialAction": {
                "@type": "SearchAction",
                "target": "https://kndl-inc.com/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
            }
        }
    }
};

// Helper function to get page SEO data
export function getPageSEO(pageKey: keyof typeof SEO_CONFIG.pages): SEOData {
    const pageData = SEO_CONFIG.pages[pageKey];
    const globalConfig = SEO_CONFIG.global;

    return {
        ...pageData,
        ogUrl: pageData.ogUrl || `${globalConfig.siteUrl}${pageKey === 'home' ? '' : '/' + pageKey}`,
        ogImage: pageData.ogImage || `${globalConfig.siteUrl}${globalConfig.defaultImage}`,
        twitterImage: pageData.twitterImage || `${globalConfig.siteUrl}${globalConfig.defaultImage}`
    };
}

// Helper function to generate breadcrumbs
export function generateBreadcrumbs(path: string[]): any {
    const breadcrumbs = {
        ...SEO_CONFIG.schemas.breadcrumbList,
        itemListElement: path.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.charAt(0).toUpperCase() + item.slice(1),
            "item": `${SEO_CONFIG.global.siteUrl}${path.slice(0, index + 1).join('/')}`
        }))
    };

    return breadcrumbs;
}