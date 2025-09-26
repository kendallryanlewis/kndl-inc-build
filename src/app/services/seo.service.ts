import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SEO_CONFIG, getPageSEO } from '../config/seo-config';

export interface SEOData {
    title?: string;
    description?: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
    ogType?: string;
    twitterCard?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    canonicalUrl?: string;
    robots?: string;
    author?: string;
    publishedDate?: string;
    modifiedDate?: string;
    schema?: any;
}

@Injectable({
    providedIn: 'root'
})
export class SEOService {
    private defaultSEO: SEOData = getPageSEO('home');

    constructor(
        private meta: Meta,
        private title: Title,
        private router: Router
    ) {
        // Set default SEO on route changes
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.updateDefaultSEO();
        });
    }

    /**
     * Update all SEO meta tags
     */
    updateSEO(seoData: SEOData): void {
        const data = { ...this.defaultSEO, ...seoData };

        // Update page title
        if (data.title) {
            this.title.setTitle(data.title);
        }

        // Update basic meta tags
        this.updateTag('description', data.description);
        this.updateTag('keywords', data.keywords);
        this.updateTag('author', data.author);
        this.updateTag('robots', data.robots);

        // Update Open Graph tags
        this.updateProperty('og:title', data.ogTitle || data.title);
        this.updateProperty('og:description', data.ogDescription || data.description);
        this.updateProperty('og:image', data.ogImage);
        this.updateProperty('og:url', data.ogUrl || this.getCurrentUrl());
        this.updateProperty('og:type', data.ogType);

        // Update Twitter Card tags
        this.updateName('twitter:card', data.twitterCard);
        this.updateName('twitter:title', data.twitterTitle || data.title);
        this.updateName('twitter:description', data.twitterDescription || data.description);
        this.updateName('twitter:image', data.twitterImage || data.ogImage);

        // Update article meta tags if provided
        if (data.publishedDate) {
            this.updateProperty('article:published_time', data.publishedDate);
        }
        if (data.modifiedDate) {
            this.updateProperty('article:modified_time', data.modifiedDate);
        }

        // Update canonical URL
        if (data.canonicalUrl) {
            this.updateCanonicalUrl(data.canonicalUrl);
        }

        // Add structured data if provided
        if (data.schema) {
            this.addStructuredData(data.schema);
        }
    }

    /**
     * Update page title only
     */
    updateTitle(title: string): void {
        this.title.setTitle(title);
        this.updateProperty('og:title', title);
        this.updateName('twitter:title', title);
    }

    /**
     * Update page description only
     */
    updateDescription(description: string): void {
        this.updateTag('description', description);
        this.updateProperty('og:description', description);
        this.updateName('twitter:description', description);
    }

    /**
     * Set default SEO for the current route
     */
    private updateDefaultSEO(): void {
        const currentUrl = this.getCurrentUrl();
        const routeBasedSEO = this.getRouteBasedSEO(currentUrl);
        this.updateSEO(routeBasedSEO);
    }

    /**
     * Get SEO data based on current route
     */
    private getRouteBasedSEO(url: string): SEOData {
        if (url.includes('/dashboard')) {
            return getPageSEO('dashboard');
        }

        if (url.includes('/login')) {
            return getPageSEO('login');
        }

        // Default home page SEO
        return getPageSEO('home');
    }

    /**
     * Update meta tag by name
     */
    private updateTag(name: string, content?: string): void {
        if (content) {
            this.meta.updateTag({ name, content });
        }
    }

    /**
     * Update meta tag by property
     */
    private updateProperty(property: string, content?: string): void {
        if (content) {
            this.meta.updateTag({ property, content });
        }
    }

    /**
     * Update meta tag by name attribute
     */
    private updateName(name: string, content?: string): void {
        if (content) {
            this.meta.updateTag({ name, content });
        }
    }

    /**
     * Update canonical URL
     */
    private updateCanonicalUrl(url: string): void {
        // Remove existing canonical link
        const existingCanonical = document.querySelector('link[rel="canonical"]');
        if (existingCanonical) {
            existingCanonical.remove();
        }

        // Add new canonical link
        const link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        link.setAttribute('href', url);
        document.head.appendChild(link);
    }

    /**
     * Add structured data (JSON-LD)
     */
    private addStructuredData(schema: any): void {
        // Remove existing structured data
        const existingScript = document.querySelector('script[type="application/ld+json"]');
        if (existingScript) {
            existingScript.remove();
        }

        // Add new structured data
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(schema);
        document.head.appendChild(script);
    }

    /**
     * Get current URL
     */
    private getCurrentUrl(): string {
        return this.router.url;
    }

    /**
     * Generate business schema for home page
     */
    getBusinessSchema(): any {
        return SEO_CONFIG.schemas.organization;
    }

    /**
     * Generate service schema
     */
    getServiceSchema(): any {
        return SEO_CONFIG.schemas.service;
    }

    /**
     * Set SEO for home page
     */
    setHomeSEO(): void {
        const homeData = getPageSEO('home');
        this.updateSEO({
            ...homeData,
            schema: this.getBusinessSchema()
        });
    }

    /**
     * Set SEO for services page
     */
    setServicesSEO(): void {
        const servicesData = getPageSEO('services');
        this.updateSEO({
            ...servicesData,
            schema: this.getServiceSchema()
        });
    }

    /**
     * Set SEO for about page
     */
    setAboutSEO(): void {
        const aboutData = getPageSEO('about');
        this.updateSEO(aboutData);
    }
}