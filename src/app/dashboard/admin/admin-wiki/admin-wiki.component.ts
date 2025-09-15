import { ChangeDetectorRef, Component, Input, SimpleChanges } from '@angular/core';

export interface WikiPage {
  id: string;
  title: string;
  content: string;
  section: 'notes' | 'walkthroughs' | 'troubleshooting';
  category: string;
  tags: string[];
  createdDate: string;
  lastModified: string;
  author: string;
  views: number;
  isPublished: boolean;
  slug: string;
  priority?: 'low' | 'medium' | 'high';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface WikiCategory {
  name: string;
  icon: string;
  count: number;
  color: string;
}

@Component({
  selector: 'app-admin-wiki',
  templateUrl: './admin-wiki.component.html',
  styleUrls: ['./admin-wiki.component.scss']
})
export class AdminWikiComponent {

  // Allow parent to set the selected tab by id
  @Input() selectedTab: string = 'overview';

  // Current view state
  currentView: 'overview' | 'list' | 'page' | 'edit' | 'create' | 'section' | 'search' | 'wordpress' | 'services' = 'list';
  selectedSection: string = 'overview';
  selectedPage: WikiPage | null = null;
  searchTerm = '';
  selectedCategory = 'All';

  // Modal states
  showCreateModal = false;
  showDeleteModal = false;

  // Form data
  newPage: Partial<WikiPage> = {
    title: '',
    content: '',
    section: 'notes',
    category: '',
    tags: [],
    isPublished: true,
    priority: 'medium',
    difficulty: 'intermediate'
  };

  // Categories
  categories: WikiCategory[] = [
    { name: 'Documentation', icon: 'fa-file-text', count: 12, color: '#3498db' },
    { name: 'Tutorials', icon: 'fa-graduation-cap', count: 8, color: '#e74c3c' },
    { name: 'How-to Guides', icon: 'fa-wrench', count: 15, color: '#2ecc71' },
    { name: 'Processes', icon: 'fa-cogs', count: 6, color: '#9b59b6' },
    { name: 'Templates', icon: 'fa-file-code-o', count: 4, color: '#f39c12' },
    { name: 'Resources', icon: 'fa-database', count: 7, color: '#e67e22' },
    { name: 'FAQ', icon: 'fa-question-circle', count: 9, color: '#34495e' }
  ];

  constructor(private cdr: ChangeDetectorRef) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedTab']) {
      this.onTabChange(this.selectedTab);
    }
  }

  onTabChange(tab: string) {
    this.handleTabSelection(tab);
    this.cdr.detectChanges();
  }

  /**
   * Call this to handle tab selection by id (stat card or nav id)
   * @param tabId The id of the tab/section (e.g. 'notes', 'walkthroughs', etc)
   */
  handleTabSelection(tabId: string): void {
    switch (tabId) {
      case 'overview':
        this.selectedSection = 'overview';
        this.currentView = 'list';
        break;
      case 'notes':
        this.selectedSection = 'notes';
        this.currentView = 'section';
        break;
      case 'walkthroughs':
        this.selectedSection = 'walkthroughs';
        this.currentView = 'section';
        break;
      case 'troubleshooting':
        this.selectedSection = 'troubleshooting';
        this.currentView = 'section';
        break;
      case 'wordpress':
        this.selectedSection = 'wordpress';
        this.currentView = 'wordpress';
        break;
      case 'services':
        this.selectedSection = 'services';
        this.currentView = 'services';
        break;
      case 'add-new':
        this.currentView = 'create';
        break;
      default:
        // fallback to overview
        this.selectedSection = 'overview';
        this.currentView = 'list';
    }
  }

  // Sample wiki pages with sections
  pages: WikiPage[] = [
    {
      id: 'WIKI-001',
      title: 'Getting Started Guide',
      content: `# Welcome to Our Wiki

This comprehensive guide will help you get started with our platform and understand the basic concepts.

## What is This Platform?

Our platform is designed to help you manage your digital presence effectively. It includes tools for:

- **Website Management**: Create and maintain professional websites
- **Domain Administration**: Register, transfer, and manage domain names
- **Content Creation**: Build engaging content with our editor tools
- **Analytics**: Track performance and user engagement

## Quick Start Steps

### 1. Set Up Your Account
Before you begin, make sure your account is properly configured:
- Verify your email address
- Complete your profile information
- Set up two-factor authentication for security

### 2. Choose Your Plan
Select the plan that best fits your needs:
- **Starter**: Perfect for small websites and personal projects
- **Professional**: Ideal for business websites and portfolios
- **Enterprise**: Comprehensive solution for large organizations

### 3. Create Your First Website
Follow these steps to create your first website:

\`\`\`bash
# Navigate to the website builder
cd /dashboard/websites
# Click "Create New Website"
# Choose a template or start from scratch
\`\`\`

## Need Help?

If you run into any issues, check out our other documentation pages or contact support.`,
      section: 'notes',
      category: 'Documentation',
      tags: ['getting-started', 'beginner', 'setup'],
      createdDate: '2025-01-15',
      lastModified: '2025-02-01',
      author: 'Admin Team',
      views: 245,
      isPublished: true,
      slug: 'getting-started-guide',
      priority: 'high',
      difficulty: 'beginner'
    },
    {
      id: 'WIKI-002',
      title: 'Domain Transfer Process',
      content: `# How to Transfer a Domain

This guide explains the complete process of transferring a domain from one registrar to another.

## Before You Start

**Important Requirements:**
- Domain must be at least 60 days old
- Domain lock must be disabled
- You need the authorization (EPP) code
- Administrative contact email must be accessible

## Transfer Process

### Step 1: Unlock Your Domain
Log into your current registrar and:
1. Go to domain management
2. Find the "Domain Lock" or "Registrar Lock" setting
3. Disable the lock
4. Wait for confirmation email

### Step 2: Get Authorization Code
The EPP (Extensible Provisioning Protocol) code is required:
- Request it from your current registrar
- This code is usually sent to the administrative contact email
- Keep this code secure - treat it like a password

### Step 3: Initiate Transfer
At the new registrar:
1. Start the domain transfer process
2. Enter your domain name
3. Provide the authorization code
4. Complete payment for the transfer

### Step 4: Approve the Transfer
- Check emails from both old and new registrars
- Follow approval instructions promptly
- **Note**: You typically have 5 days to approve

## Timeline and Expectations

| Stage | Duration | What Happens |
|-------|----------|-------------|
| Initiation | Immediate | Transfer request submitted |
| Approval Period | 5 days | Waiting for owner approval |
| Registry Processing | 2-7 days | Official transfer processing |
| Completion | Up to 7 days total | Domain active at new registrar |

## Troubleshooting

**Common Issues:**
- **Transfer Denied**: Check if domain is locked or too new
- **No Approval Email**: Check spam folder, verify contact info
- **Authorization Failed**: Double-check the EPP code

**Contact Support** if you encounter persistent issues.`,
      section: 'walkthroughs',
      category: 'How-to Guides',
      tags: ['domain', 'transfer', 'registrar', 'dns'],
      createdDate: '2025-01-20',
      lastModified: '2025-01-25',
      author: 'Technical Team',
      views: 189,
      isPublished: true,
      slug: 'domain-transfer-process',
      priority: 'medium',
      difficulty: 'intermediate'
    },
    {
      id: 'WIKI-003',
      title: 'Website Creation Workflow',
      content: `# Complete Website Creation Workflow

This document outlines our standard process for creating professional websites from concept to launch.

## Phase 1: Planning & Discovery

### Client Consultation
- **Initial Meeting**: Understand client goals, target audience, and requirements
- **Scope Definition**: Define project scope, timeline, and deliverables
- **Technical Requirements**: Identify hosting, domain, and special functionality needs

### Content Strategy
1. **Sitemap Creation**: Map out all pages and navigation structure
2. **Content Audit**: Review existing content or plan new content creation
3. **SEO Planning**: Research keywords and plan SEO strategy

## Phase 2: Design & Development

### Design Process
\`\`\`
Wireframes → Mockups → Interactive Prototypes → Final Design
\`\`\`

**Tools Used:**
- Figma for design and prototyping
- Adobe Creative Suite for graphics
- Browser testing tools for compatibility

### Development Workflow
\`\`\`bash
# 1. Set up development environment
git clone project-repo
npm install

# 2. Create feature branches
git checkout -b feature/homepage-design

# 3. Develop and test
npm run dev
npm run test

# 4. Deploy to staging
git push origin feature/homepage-design
# Create pull request for review
\`\`\`

## Phase 3: Content & Testing

### Content Management
- Import or create all written content
- Optimize images and media files
- Set up SEO meta tags and descriptions
- Configure analytics tracking

### Quality Assurance
**Testing Checklist:**
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness on various devices
- [ ] Page load speed optimization
- [ ] Form functionality testing
- [ ] Contact forms and email delivery
- [ ] SSL certificate installation
- [ ] 404 error page setup

## Phase 4: Launch & Handoff

### Pre-Launch
1. **Final Review**: Client approval of staging site
2. **DNS Configuration**: Point domain to production server
3. **SSL Setup**: Ensure secure HTTPS connection
4. **Backup System**: Configure automated backups

### Post-Launch
- **Training**: Provide client training on content management
- **Documentation**: Deliver user manuals and technical docs
- **Support Plan**: Establish ongoing maintenance agreement
- **Performance Monitoring**: Set up uptime and performance monitoring

## Tools & Resources

### Development Tools
- **Code Editor**: VS Code with extensions
- **Version Control**: Git with GitHub/GitLab
- **Task Runner**: npm scripts or Gulp
- **Testing**: Jest, Cypress for end-to-end testing

### Design Resources
- **Stock Photos**: Unsplash, Pexels
- **Icons**: Font Awesome, Feather Icons
- **Fonts**: Google Fonts, Adobe Fonts
- **Color Palettes**: Coolors, Adobe Color

## Project Timeline

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| Planning | 1-2 weeks | Sitemap, wireframes, content strategy |
| Design | 2-3 weeks | Visual designs, interactive prototypes |
| Development | 3-4 weeks | Functional website on staging server |
| Testing & Launch | 1 week | Live website with full functionality |

*Note: Timeline may vary based on project complexity and client feedback cycles.*`,
      section: 'walkthroughs',
      category: 'Processes',
      tags: ['website', 'workflow', 'development', 'design', 'process'],
      createdDate: '2025-01-10',
      lastModified: '2025-01-30',
      author: 'Project Management',
      views: 156,
      isPublished: true,
      slug: 'website-creation-workflow',
      priority: 'high',
      difficulty: 'advanced'
    },
    // Additional sample entries for different sections
    {
      id: 'WIKI-004',
      title: 'CSS Grid Layout Discovery',
      content: `# CSS Grid Layout Investigation

## Problem
Need to understand CSS Grid for better layout control in responsive designs.

## Research Findings
- CSS Grid is superior to Flexbox for 2D layouts
- \`grid-template-areas\` provides semantic layout naming
- \`fr\` unit distributes available space proportionally

## Code Examples
\`\`\`css
.container {
  display: grid;
  grid-template-columns: 1fr 3fr 1fr;
  grid-template-areas: 
    "header header header"
    "sidebar main aside"
    "footer footer footer";
  gap: 1rem;
}
\`\`\`

## Next Steps
- Test browser compatibility
- Create reusable grid templates
- Document best practices`,
      section: 'notes',
      category: 'Development',
      tags: ['css', 'grid', 'layout', 'responsive'],
      createdDate: '2025-02-05',
      lastModified: '2025-02-05',
      author: 'Developer',
      views: 34,
      isPublished: true,
      slug: 'css-grid-discovery',
      priority: 'medium',
      difficulty: 'intermediate'
    },
    {
      id: 'WIKI-005',
      title: 'Server Memory Issues - Feb 2025',
      content: `# Server Memory Investigation - February 2025

## Issue Description
Production server experiencing memory leaks causing 503 errors during peak traffic.

## Symptoms Observed
- Memory usage climbing to 95%+ during business hours
- Application becoming unresponsive
- Database connections timing out

## Root Cause Analysis
\`\`\`bash
# Memory analysis commands used
top -p $(pgrep node)
htop
cat /proc/meminfo
\`\`\`

## Solution Applied
1. **Immediate Fix**: Increased swap space from 2GB to 4GB
2. **Code Fix**: Fixed memory leak in image processing module
3. **Monitoring**: Added memory alerts at 80% usage

## Prevention Measures
- Implemented garbage collection monitoring
- Added memory usage dashboards
- Scheduled weekly memory audits

## Files Modified
- \`/server/image-processor.js\` - Fixed buffer cleanup
- \`/config/monitoring.yml\` - Added memory alerts
- \`/scripts/memory-check.sh\` - Weekly audit script`,
      section: 'troubleshooting',
      category: 'Infrastructure',
      tags: ['server', 'memory', 'debugging', 'performance'],
      createdDate: '2025-02-12',
      lastModified: '2025-02-14',
      author: 'DevOps Team',
      views: 67,
      isPublished: true,
      slug: 'server-memory-issues-feb-2025',
      priority: 'high',
      difficulty: 'advanced'
    },
    {
      id: 'WIKI-006',
      title: 'Quick Note: API Rate Limiting',
      content: `# API Rate Limiting Implementation

Quick note on implementing rate limiting for our API endpoints.

## Key Points
- Use Redis for distributed rate limiting
- Implement sliding window algorithm
- Different limits for different user tiers

## Code Snippet
\`\`\`javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
\`\`\`

## References
- Express Rate Limit docs
- Redis sliding window pattern`,
      section: 'notes',
      category: 'Development',
      tags: ['api', 'rate-limiting', 'redis', 'express'],
      createdDate: '2025-02-10',
      lastModified: '2025-02-10',
      author: 'Backend Developer',
      views: 23,
      isPublished: true,
      slug: 'api-rate-limiting-note',
      priority: 'low',
      difficulty: 'intermediate'
    },
    // Pixel & Post Business Plan v2 Entries
    {
      id: 'WIKI-007',
      title: 'Pixel & Post - Business Plan v2 Executive Summary',
      content: `# Pixel & Post Business Plan v2 - Executive Summary

**Last Updated:** September 14, 2025

## Company Overview
Pixel & Post is a brand + web studio helping local businesses launch or level-up their online presence with clean design, fast builds, and measurable growth. We sell one-time build packages plus monthly management to drive recurring revenue.

## 2025 Objectives
- Close 6–10 new build projects across Starter/Growth/Pro tiers
- Grow to 12+ monthly retainers at $400–$2,500+/mo
- Ship reusable templates/components to reduce build hours by 25–40%
- Showcase 3 flagship case studies (before/after SEO, lead gen, revenue lift)

## What We Do
Brand identity, websites, on-page SEO, content & social setup, print collateral, analytics, and paid acquisition frameworks.

**Positioning:** "Total brand presence, measurable results."

## Key Service Tiers
- **Starter** — "Brand Essentials" ($325–$780)
- **Growth** — "Digital + Print" ($1,040–$1,950)  
- **Pro** — "Total Brand Presence" ($2,600–$4,550+)

## Target Metrics
- Builds/month: 1 Starter + 1 Growth (+ Pro every 1–2 months)
- MRR goal: $4k–$8k from 10–15 retainers
- Effective rate: $55/hr mid-range

## Next Steps
See related wiki entries for detailed service tiers, pricing strategy, and implementation roadmap.`,
      section: 'notes',
      category: 'Business Planning',
      tags: ['business-plan', 'pixel-post', 'executive-summary', 'strategy'],
      createdDate: '2025-09-14',
      lastModified: '2025-09-14',
      author: 'Business Owner',
      views: 12,
      isPublished: true,
      slug: 'pixel-post-executive-summary',
      priority: 'high',
      difficulty: 'intermediate'
    },
    {
      id: 'WIKI-008',
      title: 'Service Catalogue & Pricing Tiers',
      content: `# Pixel & Post Service Catalogue & Pricing Tiers

*Tiers cover web development scope only. All other services are offered as Add-Ons or subscription packages.*

## Starter — "Brand Essentials" ($325–$780)

**Dev Scope (included):**
- Single-page WordPress site (responsive)
- Up to 4 sections (Hero, Services, About, Contact)
- 1 reusable page template + global header/footer
- Contact form + basic anti-spam
- Core technical SEO (titles/meta, sitemap, robots)
- Performance setup (caching plugin configured)
- Custom development available at custom-dev rate

## Growth — "Digital + Print" ($1,040–$1,950)

**Dev Scope (included):**
- Multi-page WordPress site (5–12 pages)
- 2–3 reusable page templates (e.g., Service detail, Blog index)
- Blog setup (categories/tags)
- 1 simple Custom Post Type (CPT) + taxonomy (e.g., Services or Portfolio)
- Enhanced forms (conditional fields, multi-step if needed)
- Reservations/appointments with payments (booking calendars, deposits)
- Core technical SEO & performance setup
- Custom development available at custom-dev rate

## Pro — "Total Brand Presence" ($2,600–$4,550+)

**Dev Scope (included):**
- Advanced WordPress build with heavy custom development
- Reservations/appointments with payments (booking calendars, deposits)
- User registration & roles (memberships, gated content, customer portals)
- WooCommerce (store or subscriptions)
- Multiple CPTs & taxonomies; advanced search/filters
- Third-party integrations (CRM, accounting, Zapier/Make)
- Headless/Angular components & custom APIs as needed
- Performance & security hardening (caching/CDN/backups)

## Pricing Strategy
- **Anchor:** Internal rate of $50–$60/hr
- **One-time builds:** 50% deposit; 40% at design approval; 10% at launch
- **Recurring:** Month-to-month (cancel anytime) or 6-month commitment (-10% price)
- **Scope guardrails:** One round of revisions included per milestone

## Standard Workflow
1. **Discover:** Goals, audience, refs, sitemap, KPIs
2. **Brand:** Logo/refresh, palette, type, patterns, brand guide
3. **Site:** Wireframes → design → build → QA → launch
4. **SEO & Content:** On-page, metadata, schema, 1–2 pieces of content
5. **Launch & Care Plan enrollment**`,
      section: 'notes',
      category: 'Business Planning',
      tags: ['pricing', 'services', 'tiers', 'wordpress', 'development'],
      createdDate: '2025-09-14',
      lastModified: '2025-09-14',
      author: 'Business Owner',
      views: 8,
      isPublished: true,
      slug: 'service-catalogue-pricing-tiers',
      priority: 'high',
      difficulty: 'intermediate'
    },
    {
      id: 'WIKI-009',
      title: 'Add-Ons & Upsells Portfolio',
      content: `# Add-Ons & Upsells (Available for Any Tier)

*All non-development services are available as Add-Ons or subscription-based packages at any tier (Starter, Growth, Pro).*

## Digital Growth Services

### Reputation Management
- **Service:** Reviews monitoring and response
- **Pricing:** $100–$300/mo

### Local SEO Domination  
- **Service:** Complete local SEO optimization
- **Pricing:** $500–$1,200 setup + $300–$600/mo

### Marketing Automation
- **Service:** CRM, email/SMS workflows
- **Pricing:** $500+ setup

### Retargeting Ads
- **Service:** Google + Meta pixels setup and management
- **Pricing:** $200–$500/mo management

## Creative & Brand Services

### Branded Merchandise
- **Service:** Shirts, mugs, pens, stickers
- **Pricing:** Cost + markup

### Landing Pages & Funnels
- **Service:** Custom conversion-focused pages
- **Pricing:** $250–$600/page

## Strategy & Consulting

### Analytics Dashboards
- **Service:** Looker Studio custom dashboards
- **Pricing:** $200–$500 setup + $100–$300/mo

## Popular Subscription Packages

### Social Media Management
- 2/4/6 posts per month packages
- Per-post add-ons: $50 static / $100 animated

### WordPress Care Plans
- Backups, updates, security monitoring
- $75–$200/mo depending on site complexity

### Email + SMS Campaigns
- Automation setup and ongoing management
- Custom pricing based on list size and complexity

## Process
1. Get a dev quote for base tier
2. We provide a menu of add-ons/subscriptions
3. Client selects desired services
4. Integrated delivery and care plan enrollment`,
      section: 'notes',
      category: 'Business Planning',
      tags: ['add-ons', 'upsells', 'recurring-revenue', 'services'],
      createdDate: '2025-09-14',
      lastModified: '2025-09-14',
      author: 'Business Owner',
      views: 5,
      isPublished: true,
      slug: 'add-ons-upsells-portfolio',
      priority: 'medium',
      difficulty: 'intermediate'
    },
    {
      id: 'WIKI-010',
      title: 'Target Market & Customer Personas',
      content: `# Market & Customer Segments Analysis

## Primary Target Market
**Local SMBs** requiring fast, credible WordPress sites with simple customer interaction methods:
- Home services companies
- Medical/dental clinics  
- Gyms and fitness centers
- Restaurants and eateries
- Professional services
- Solo founders
- Community organizations

## Secondary Market
**Multi-location or mid-size teams** needing:
- Custom WordPress development
- Reservations/appointments systems
- Memberships/roles management
- WooCommerce integration
- Customer portals
- Third-party integrations
- Site migrations
- Ongoing reliable updates

## Buyer Pain Points
- Outdated or DIY websites
- No online booking or poor booking UX
- Slow loading/mobile responsiveness issues
- Plugin bloat and security concerns
- Confusing navigation structure
- Thin or outdated content
- No time for site maintenance

## Customer Personas

### 1. Owner-Operator (Service Professionals)
**Needs:** Phone calls and online bookings
**Tech Comfort:** Low - hates dealing with technology
**Values:** Simplicity, clear pricing, done-for-you updates
**Decision Factors:** Time savings, professional appearance, lead generation

### 2. Office Manager / Coordinator  
**Needs:** Repeatable workflows for site updates
**Tech Comfort:** Medium - can handle basic tasks
**Values:** Reliable systems, clear processes, responsive support
**Decision Factors:** Form functionality, notification systems, dependable care plans

### 3. Growing Team (Multi-location/E-commerce/Programs)
**Needs:** Scalable WordPress with custom features
**Tech Comfort:** Medium to High - understands business systems
**Values:** Custom functionality, integrations, operational efficiency  
**Decision Factors:** Memberships, ecommerce capability, workflow automation

## Value Proposition Alignment
- **Launch fast:** Clean, SEO-friendly builds with clear CTAs
- **Look credible:** Cohesive brand kit + on-brand collateral
- **Be found:** On-page SEO + Google Business Profile setup
- **Grow smart:** Optional monthly management and analytics
- **Flex up:** Custom apps with databases and integrations when needed`,
      section: 'notes',
      category: 'Market Research',
      tags: ['target-market', 'personas', 'customer-research', 'smb'],
      createdDate: '2025-09-14',
      lastModified: '2025-09-14',
      author: 'Business Owner',
      views: 15,
      isPublished: true,
      slug: 'target-market-customer-personas',
      priority: 'high',
      difficulty: 'advanced'
    },
    {
      id: 'WIKI-011',
      title: 'Financial Model & Revenue Projections',
      content: `# Financial Model & Revenue Projections

## Core Assumptions
- **Effective hourly rate:** $55/hr mid-range
- **Monthly capacity:** ~60 production hours (solo operation alongside other commitments)
- **Close rate:** 25–35% on qualified leads
- **Pricing anchor:** $50–$60/hr internal rate

## Monthly Targets
- **Builds per month:** 1 Starter + 1 Growth (+ Pro every 1–2 months)
- **MRR goal:** $4k–$8k from 10–15 monthly retainers
- **Total capacity:** 60 production hours/month

## Example Monthly Revenue (@$55/hr)
\`\`\`
1 Starter (8 hrs → $440)
+ 1 Growth (24 hrs → $1,320)  
+ 0.5 Pro (30 hrs → $1,650)
= One-time revenue: ~$3,410

Recurring (10 retainers avg $600): $6,000
Total monthly: ~$9,410 (before costs)
\`\`\`

## Hour → Price Mapping (Internal)
- 6 hrs → ~$360
- 12 hrs → ~$720
- 24 hrs → ~$1,440
- 48 hrs → ~$2,880
- 60 hrs → ~$3,600

## Operating Costs (Monthly Estimates)
- **Hosting/SaaS/plugins:** $150–$300/mo
- **Subcontractors:** $50–$70/hr pass-through + margin (as needed)
- **Marketing/Ads:** $100–$300/mo
- **Business expenses:** Insurance, software, equipment

## Non-Development Service Rates
- **Strategy & consulting:** $75–$100/hr
- **Design/UI & prototyping:** $55–$70/hr
- **Content/copywriting/editing:** $45–$65/hr
- **SEO & analytics/reporting:** $55–$85/hr
- **Project management & meetings:** $35–$50/hr
- **QA/testing & cross-browser checks:** $45–$60/hr
- **Admin/data entry/asset sourcing:** $25–$35/hr
- **Rush/emergency (nights/weekends):** 1.5×–2× applicable hourly rate

## Payment Structure
- **One-time builds:** 50% deposit; 40% at design approval; 10% at launch
- **Recurring services:** Month-to-month (cancel anytime) or 6-month commitment (-10% discount)
- **Maintenance plans:** $75–$200/mo depending on site size and plugin complexity

## Growth Projections
**Year 1 Goals:**
- 6–10 new build projects across all tiers
- 12+ monthly retainers
- $48k–$96k annual MRR
- Template/component reuse reducing build time by 25–40%`,
      section: 'notes',
      category: 'Financial Planning',
      tags: ['financial-model', 'revenue-projections', 'pricing-strategy', 'business-metrics'],
      createdDate: '2025-09-14',
      lastModified: '2025-09-14',
      author: 'Business Owner',
      views: 22,
      isPublished: true,
      slug: 'financial-model-revenue-projections',
      priority: 'high',
      difficulty: 'advanced'
    },
    {
      id: 'WIKI-012',
      title: '90-Day Implementation Roadmap',
      content: `# Implementation Roadmap (90 Days)

## Weeks 1–2: Foundation Setup
### Website & Portfolio
- [ ] Finalize Pixel & Post website design and content
- [ ] Publish 2 case studies (adapted from Orica/AA Union for SMB audience)
- [ ] Create professional portfolio section with before/after examples

### Sales Materials
- [ ] Create tier one-pagers for client presentations
- [ ] Develop proposal template with standardized pricing
- [ ] Build onboarding checklist and asset collection process

## Weeks 3–6: Lead Generation & Templates
### Marketing Infrastructure  
- [ ] Launch lead magnet: "Local Visibility Audit" (automated report)
- [ ] Set up 3-email nurture sequence for captured leads
- [ ] Create slide deck with 3 case studies and ROI snapshots

### Outreach Campaign
- [ ] Identify and research 30 local businesses
- [ ] Execute outreach campaign (email, LinkedIn, local networking)
- [ ] Target: Book 6 discovery calls

### Development Templates
- [ ] Build WordPress starter theme with reusable components
- [ ] Create 2-3 page templates (landing, service detail, blog index)
- [ ] Set up Elementor/Block template library

## Weeks 7–12: Revenue Generation & Optimization
### Project Acquisition
- [ ] Close 3–4 build projects across different tiers
- [ ] Enroll at least 6 clients in monthly retainer programs
- [ ] Generate first recurring revenue stream

### Analytics & Reporting
- [ ] Ship 1 Looker Studio KPI dashboard template
- [ ] Set up tracking for key business metrics
- [ ] Implement client reporting workflows

### Social Proof Development
- [ ] Gather testimonials from completed projects
- [ ] Document and publish before/after metrics
- [ ] Create case study templates for future projects

## Success Metrics by End of 90 Days
- **Projects:** 3-4 completed builds
- **MRR:** $2,400+ from 6+ retainer clients
- **Pipeline:** 10+ qualified leads in CRM
- **Templates:** WordPress starter + 3 reusable templates
- **Case Studies:** 3 published with measurable results

## Tools & Resources Setup
### Development Stack
- [ ] WordPress/Elementor workflow optimization
- [ ] Azure hosting and deployment pipeline
- [ ] Version control and backup systems

### Business Operations
- [ ] CRM setup (contact management and pipeline tracking)
- [ ] Invoice and payment processing automation
- [ ] Time tracking and project management tools

## Risk Mitigation
- **Scope creep:** Implement strict revision limits and change order process
- **Capacity management:** Establish subcontractor network for overflow
- **Lead generation:** Maintain weekly outreach cadence regardless of current pipeline`,
      section: 'walkthroughs',
      category: 'Business Planning',
      tags: ['implementation', 'roadmap', '90-day-plan', 'business-launch'],
      createdDate: '2025-09-14',
      lastModified: '2025-09-14',
      author: 'Business Owner',
      views: 18,
      isPublished: true,
      slug: '90-day-implementation-roadmap',
      priority: 'high',
      difficulty: 'advanced'
    },
    {
      id: 'WIKI-013',
      title: 'Sales & Marketing Strategy Walkthrough',
      content: `# Sales & Marketing Strategy - Complete Walkthrough

## Acquisition Channels Setup

### 1. Google Business Profile & Local SEO
\`\`\`
Step 1: Claim and optimize Google Business Profile
Step 2: Set up local citations (Yelp, YellowPages, local directories)
Step 3: Implement local SEO best practices on website
Step 4: Monitor and respond to reviews regularly
\`\`\`

### 2. Portfolio Website with Lead Magnets
- **Homepage:** Clear value proposition and service tiers
- **Case Studies:** Before/after visuals with specific metrics
- **Free Resources:** "Local Visibility Audit" lead magnet
- **Pricing Guide:** PDF download requiring email capture

### 3. Social Proof Development
- **Visual Portfolio:** Before/after website transformations
- **Client Testimonials:** Video and written testimonials
- **Google Reviews:** Strategy for generating positive reviews
- **Case Study Metrics:** Traffic increases, lead generation results

### 4. Partnership Network
- **Print Shops:** Cross-referral partnerships
- **Photographers:** Bundled service offerings  
- **Co-working Hubs:** Networking and presentation opportunities
- **Complementary Services:** Marketing agencies, consultants

### 5. Direct Outreach Strategy
- **Local Chambers:** Membership and networking events
- **Facebook Groups:** Value-first engagement in local business groups
- **LinkedIn:** Professional connection and content strategy
- **Email Campaigns:** Cold/warm outreach with value-first approach

## Sales Funnel Implementation

### Top of Funnel: Lead Capture
1. **Free "Local Visibility Audit"**
   - Automated report generation
   - Email capture requirement
   - Immediate value delivery
   - Follow-up email sequence trigger

2. **Content Marketing**
   - Weekly blog posts on local SEO, web design tips
   - Social media presence with helpful tips
   - Local business feature spotlights

### Middle of Funnel: Nurture & Qualify
1. **15-Minute Discovery Call Process**
   \`\`\`
   Pre-call: Send intake form and portfolio examples
   During call: Understand goals, budget, timeline, decision process
   Post-call: Proposal delivery within 48 hours
   Follow-up: Scheduled check-ins until decision
   \`\`\`

2. **Email Nurture Sequence (3 emails)**
   - Email 1: Welcome + case study highlight
   - Email 2: Service tier explanation with examples
   - Email 3: Call-to-action for discovery call

### Bottom of Funnel: Close & Onboard
1. **Proposal to Deposit Process**
   \`\`\`
   Step 1: Custom proposal sent within 48 hours
   Step 2: Follow-up call to address questions
   Step 3: Deposit collection to reserve start date
   Step 4: Onboarding form + asset upload portal
   \`\`\`

2. **Onboarding Excellence**
   - Welcome packet with project timeline
   - Asset collection checklist
   - Communication preferences setup
   - Expectation setting for revision process

## Key Performance Indicators (KPIs)

### Acquisition Metrics
- Discovery calls booked per week
- Proposals sent vs. calls held
- Close rate percentage by tier
- Average time from lead to close

### Delivery Metrics  
- Project cycle time by tier
- Revision rounds per project
- On-time launch percentage
- Client satisfaction scores

### Revenue Metrics
- Monthly recurring revenue (MRR) growth
- Average revenue per user (ARPU)
- One-time vs. recurring revenue mix
- Customer lifetime value (CLV)

## Monthly Execution Checklist
- [ ] 30 new business contacts per month
- [ ] 6-8 discovery calls booked
- [ ] 2-3 proposals sent  
- [ ] 1-2 projects closed
- [ ] Follow up with all active prospects
- [ ] Update portfolio with completed projects
- [ ] Gather testimonials and reviews
- [ ] Analyze metrics and adjust strategy`,
      section: 'walkthroughs',
      category: 'Marketing & Sales',
      tags: ['sales-strategy', 'marketing-funnel', 'lead-generation', 'client-acquisition'],
      createdDate: '2025-09-14',
      lastModified: '2025-09-14',
      author: 'Business Owner',
      views: 25,
      isPublished: true,
      slug: 'sales-marketing-strategy-walkthrough',
      priority: 'high',
      difficulty: 'advanced'
    }
  ];

  // Get filtered pages
  get filteredPages(): WikiPage[] {
    return this.pages.filter(page => {
      const matchesSearch = !this.searchTerm ||
        page.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        page.content.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        page.tags.some((tag: string) => tag.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchesCategory = this.selectedCategory === 'All' || page.category === this.selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }

  // Get all category names
  get categoryNames(): string[] {
    return ['All', ...this.categories.map(cat => cat.name)];
  }

  // View methods
  viewPage(page: WikiPage): void {
    this.selectedPage = page;
    this.currentView = 'page';
    page.views++;
  }

  editPage(page: WikiPage): void {
    this.selectedPage = page;
    this.newPage = { ...page };
    this.currentView = 'edit';
  }

  backToList(): void {
    this.currentView = 'list';
    this.selectedPage = null;
    this.resetNewPage();
  }

  // Modal methods
  openCreateModal(): void {
    this.showCreateModal = true;
    this.resetNewPage();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetNewPage();
  }

  openDeleteModal(page: WikiPage): void {
    this.selectedPage = page;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedPage = null;
  }

  // Page management
  createPage(): void {
    if (this.newPage.title && this.newPage.content) {
      const page: WikiPage = {
        id: 'WIKI-' + String(this.pages.length + 1).padStart(3, '0'),
        title: this.newPage.title!,
        content: this.newPage.content!,
        section: this.newPage.section || 'notes',
        category: this.newPage.category!,
        tags: this.newPage.tags || [],
        createdDate: new Date().toISOString().split('T')[0],
        lastModified: new Date().toISOString().split('T')[0],
        author: 'Current User',
        views: 0,
        isPublished: this.newPage.isPublished || true,
        slug: this.generateSlug(this.newPage.title!),
        priority: this.newPage.priority || 'medium',
        difficulty: this.newPage.difficulty || 'intermediate'
      };

      this.pages.push(page);
      this.closeCreateModal();
    }
  }

  // Section-specific methods for the new wiki structure
  getNotesCount(): number {
    return this.pages.filter(page => page.section === 'notes').length;
  }

  getWalkthroughsCount(): number {
    return this.pages.filter(page => page.section === 'walkthroughs').length;
  }

  getTroubleshootingCount(): number {
    return this.pages.filter(page => page.section === 'troubleshooting').length;
  }

  getSectionPages(section: string): WikiPage[] {
    return this.pages.filter(page => page.section === section).sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
  }

  getRecentPages(limit: number = 5): WikiPage[] {
    return [...this.pages]
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, limit);
  }

  getPopularTags(limit: number = 10): Array<{ name: string, count: number }> {
    const tagCounts: { [key: string]: number } = {};
    this.pages.forEach(page => {
      page.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getSectionIcon(section: string): string {
    const icons = {
      'notes': 'fa-sticky-note',
      'findings': 'fa-lightbulb',
      'walkthroughs': 'fa-route',
      'troubleshooting': 'fa-tools'
    };
    return icons[section as keyof typeof icons] || 'fa-file';
  }

  getSectionColor(section: string): string {
    const colors = {
      'notes': 'primary',
      'findings': 'success',
      'walkthroughs': 'info',
      'troubleshooting': 'warning'
    };
    return colors[section as keyof typeof colors] || 'secondary';
  }

  // Quick creation methods
  createQuickNote(): void {
    this.newPage = {
      title: '',
      content: '',
      section: 'notes',
      category: 'Quick Notes',
      tags: ['quick-note'],
      isPublished: true,
      priority: 'low',
      difficulty: 'beginner'
    };
    this.currentView = 'create';
  }

  createFinding(): void {
    this.newPage = {
      title: '',
      content: '# Research Finding\n\n## Problem\n[Describe the problem or question]\n\n## Investigation\n[Detail your research process]\n\n## Findings\n[Key discoveries]\n\n## Conclusion\n[Summary and next steps]',
      section: 'notes',
      category: 'Research',
      tags: ['finding'],
      isPublished: true,
      priority: 'medium',
      difficulty: 'intermediate'
    };
    this.currentView = 'create';
  }

  createWalkthrough(): void {
    this.newPage = {
      title: '',
      content: '# Step-by-Step Walkthrough\n\n## Prerequisites\n[What\'s needed before starting]\n\n## Steps\n\n### Step 1: [Title]\n[Detailed instructions]\n\n### Step 2: [Title]\n[Detailed instructions]\n\n## Verification\n[How to confirm success]\n\n## Troubleshooting\n[Common issues and solutions]',
      section: 'walkthroughs',
      category: 'Tutorials',
      tags: ['walkthrough', 'tutorial'],
      isPublished: true,
      priority: 'high',
      difficulty: 'intermediate'
    };
    this.currentView = 'create';
  }

  filterByTag(tagName: string): void {
    this.searchTerm = tagName;
    this.selectedSection = 'overview';
    this.currentView = 'search';
  }

  updatePage(): void {
    if (this.selectedPage && this.newPage.title && this.newPage.content) {
      const index = this.pages.findIndex(p => p.id === this.selectedPage!.id);
      if (index !== -1) {
        this.pages[index] = {
          ...this.selectedPage,
          ...this.newPage,
          lastModified: new Date().toISOString().split('T')[0],
          slug: this.generateSlug(this.newPage.title!)
        } as WikiPage;
        this.backToList();
      }
    }
  }

  deletePage(): void {
    if (this.selectedPage) {
      this.pages = this.pages.filter(p => p.id !== this.selectedPage!.id);
      this.closeDeleteModal();
      this.backToList();
    }
  }

  // Utility methods
  resetNewPage(): void {
    this.newPage = {
      title: '',
      content: '',
      section: 'notes',
      category: '',
      tags: [],
      isPublished: true,
      priority: 'medium',
      difficulty: 'intermediate'
    };
  }

  generateSlug(title: string): string {
    return title.toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  getCategoryIcon(categoryName: string): string {
    const category = this.categories.find(c => c.name === categoryName);
    return category ? category.icon : 'fa-file-text';
  }

  getCategoryColor(categoryName: string): string {
    const category = this.categories.find(c => c.name === categoryName);
    return category ? category.color : '#6c757d';
  }

  // Handle tags input
  updateTags(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newPage.tags = input.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  }

  // Simple markdown parser for rendering content
  parseMarkdown(markdown: string): string {
    if (!markdown) return '';

    let html = markdown;

    // Escape HTML characters first
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Code blocks (must be done before inline code)
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers (must be done before other processing)
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

    // Bold text (must be done before italic)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic text
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Blockquotes
    html = html.replace(/^> (.*$)/gm, '<blockquote><p>$1</p></blockquote>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');

    // Lists - handle ordered and unordered
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let inList = false;
    let listType = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';

      // Check for unordered list
      if (line.match(/^- (.+)/)) {
        if (!inList || listType !== 'ul') {
          if (inList) processedLines.push(`</${listType}>`);
          processedLines.push('<ul>');
          inList = true;
          listType = 'ul';
        }
        processedLines.push(`<li>${line.replace(/^- /, '')}</li>`);
      }
      // Check for ordered list
      else if (line.match(/^\d+\. (.+)/)) {
        if (!inList || listType !== 'ol') {
          if (inList) processedLines.push(`</${listType}>`);
          processedLines.push('<ol>');
          inList = true;
          listType = 'ol';
        }
        processedLines.push(`<li>${line.replace(/^\d+\. /, '')}</li>`);
      }
      // Not a list item
      else {
        if (inList) {
          processedLines.push(`</${listType}>`);
          inList = false;
          listType = '';
        }
        processedLines.push(line);
      }
    }

    // Close any remaining list
    if (inList) {
      processedLines.push(`</${listType}>`);
    }

    html = processedLines.join('\n');

    // Convert line breaks to paragraphs
    const paragraphs = html.split('\n\n').filter(p => p.trim());
    const processedParagraphs = paragraphs.map(paragraph => {
      paragraph = paragraph.trim();

      // Skip if it's already a block element
      if (paragraph.match(/^<(h[1-6]|ul|ol|blockquote|pre|hr)/)) {
        return paragraph;
      }

      // Convert single line breaks to <br> within paragraphs
      paragraph = paragraph.replace(/\n/g, '<br>');

      // Wrap in paragraph tags if not empty
      if (paragraph) {
        return `<p>${paragraph}</p>`;
      }

      return '';
    }).filter(p => p);

    html = processedParagraphs.join('\n');

    // Clean up extra line breaks and spaces
    html = html.replace(/\n+/g, '\n').trim();

    return html;
  }

  // Text formatting helpers for rich text editing
  formatText(command: string, value?: string): void {
    document.execCommand(command, false, value);
  }

  insertText(text: string): void {
    const textarea = document.querySelector('.content-editor') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentContent = this.newPage.content || '';

      this.newPage.content = currentContent.substring(0, start) + text + currentContent.substring(end);

      // Move cursor to end of inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + text.length, start + text.length);
      });
    }
  }

  // Markdown-style formatting shortcuts
  insertMarkdown(type: string): void {
    const textarea = document.querySelector('.content-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let replacement = '';

    switch (type) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`;
        break;
      case 'code':
        replacement = `\`${selectedText || 'code'}\``;
        break;
      case 'codeblock':
        replacement = `\`\`\`\n${selectedText || 'code block'}\n\`\`\``;
        break;
      case 'heading1':
        replacement = `# ${selectedText || 'Heading 1'}`;
        break;
      case 'heading2':
        replacement = `## ${selectedText || 'Heading 2'}`;
        break;
      case 'heading3':
        replacement = `### ${selectedText || 'Heading 3'}`;
        break;
      case 'list':
        replacement = `- ${selectedText || 'List item'}`;
        break;
      case 'numberlist':
        replacement = `1. ${selectedText || 'Numbered item'}`;
        break;
      case 'link':
        replacement = `[${selectedText || 'link text'}](url)`;
        break;
      case 'quote':
        replacement = `> ${selectedText || 'Quote'}`;
        break;
    }

    this.insertText(replacement);
  }
}
