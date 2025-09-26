import { Injectable } from '@angular/core';

export interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
}

@Injectable({
    providedIn: 'root'
})
export class SitemapService {
    private baseUrl = 'https://kndl-inc.com'; // Update with your actual domain

    constructor() { }

    /**
     * Generate sitemap URLs
     */
    generateSitemapUrls(): SitemapUrl[] {
        const currentDate = new Date().toISOString();

        return [
            {
                loc: this.baseUrl + '/',
                lastmod: currentDate,
                changefreq: 'weekly',
                priority: 1.0
            },
            {
                loc: this.baseUrl + '/login',
                lastmod: currentDate,
                changefreq: 'monthly',
                priority: 0.3
            }
            // Add more URLs as needed
        ];
    }

    /**
     * Generate XML sitemap
     */
    generateXMLSitemap(): string {
        const urls = this.generateSitemapUrls();

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        urls.forEach(url => {
            xml += '  <url>\n';
            xml += `    <loc>${url.loc}</loc>\n`;
            if (url.lastmod) xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
            if (url.changefreq) xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
            if (url.priority) xml += `    <priority>${url.priority}</priority>\n`;
            xml += '  </url>\n';
        });

        xml += '</urlset>';

        return xml;
    }

    /**
     * Generate robots.txt content
     */
    generateRobotsTxt(): string {
        return `User-agent: *
Allow: /

# Sitemap
Sitemap: ${this.baseUrl}/sitemap.xml

# Disallow admin areas
Disallow: /dashboard/
Disallow: /login/
`;
    }
}