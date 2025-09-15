// This file exports the add-ons arrays organized by category per Business Plan v2.
// Usage: import { digitalGrowthAddons, creativeBrandAddons, strategyConsultingAddons } from './addons.data';

export interface Addon {
    title: string;
    desc: string;
    price: string;
}

export const subscriptionPlans: Addon[] = [
    { title: 'Reputation Management', desc: 'Monitor and encourage reviews across Google and Yelp to build trust and credibility.', price: '$100–$300/mo' },
    { title: 'Local SEO Domination', desc: 'Complete local SEO setup with ongoing optimization for maximum visibility in your area.', price: '$500–$1,200 setup + $300–$600/mo' },
    { title: 'Marketing Automation', desc: 'CRM setup with email and SMS workflows to nurture leads and engage customers automatically.', price: '$500+ setup' },
    { title: 'Retargeting Ads', desc: 'Google and Meta pixel setup with campaign management to re-engage website visitors.', price: '$200–$500/mo mgmt' },
    { title: 'Domain/Hosting Setup', desc: 'Help with domain registration, DNS, or hosting migration for a smooth launch.', price: '$75–$200' },
    { title: 'Social Media Setup', desc: 'Create or refresh your business profiles on Facebook, Instagram, LinkedIn, and more.', price: '$150–$400' },
    { title: 'Content Creation', desc: 'Blog posts, articles, and website content to engage your audience and improve SEO.', price: '$100–$300/post' },
];

export const creativeBrandAddons: Addon[] = [
    { title: 'Logo Refresh', desc: 'Modernize your brand with a fresh logo update or complete redesign to stay current.', price: 'Custom quote' },
    { title: 'Business Cards & Print Materials', desc: 'Professional business cards, flyers, postcards, and branded collateral.', price: 'Custom quote' },
    { title: 'Branded Merch', desc: 'Custom shirts, mugs, pens, stickers, and promotional items to build brand awareness.', price: 'Cost + markup' },
    { title: 'Landing Pages & Funnels', desc: 'High-converting standalone pages for campaigns, offers, and lead generation.', price: '$250–$600/page' },
    { title: 'Social Posting Packages', desc: 'Professional social media content creation with 2, 4, or 6 posts per month.', price: '$50 static / $100 animated per post' },
    { title: 'Print Materials', desc: 'Flyers, brochures, banners, and signage designed to match your brand.', price: '$100–$300 each' },
    { title: 'Email Design', desc: 'Branded, clickable emails for you and your team.', price: '$50–$100 each' },
];

export const strategyConsultingAddons: Addon[] = [
    { title: 'Analytics Dashboards', desc: 'Custom Looker Studio dashboards to track performance and measure ROI.', price: '$200–$500 setup + $100–$300/mo' },
    { title: 'PPC Campaigns', desc: 'Setup and management of Google Ads and social media ad campaigns to drive targeted traffic.', price: '$300–$1,000/mo mgmt' },
    { title: 'WordPress Care Plans', desc: 'Monthly backups, updates, security monitoring to keep your site running smoothly.', price: '$75–$200/mo' },
    { title: 'Email + SMS Campaigns', desc: 'Professional email marketing and SMS automation campaigns for customer engagement.', price: 'Custom quote' },
    { title: 'SEO Implementation', desc: 'Technical SEO optimization, keyword research, and ongoing search ranking improvements.', price: 'Custom quote' },
    { title: 'Monthly Reporting', desc: 'Detailed performance reports with insights and recommendations for growth.', price: '$100–$300/mo' }
];

// Legacy exports for backward compatibility
export const filteredSubscriptionPlans: Addon[] = [
    ...subscriptionPlans
];

export const oneTimeAddons: Addon[] = [
    ...creativeBrandAddons,
    ...strategyConsultingAddons,
];

export const allAddons: Addon[] = [
    ...subscriptionPlans,
    ...creativeBrandAddons,
    ...strategyConsultingAddons
];


