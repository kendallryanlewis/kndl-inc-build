import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class PerformanceService {

    constructor() {
        this.initPerformanceOptimizations();
    }

    private initPerformanceOptimizations(): void {
        // Preload critical resources
        this.preloadCriticalResources();

        // Lazy load non-critical resources
        this.lazyLoadResources();

        // Monitor Core Web Vitals
        this.monitorCoreWebVitals();
    }

    /**
     * Preload critical resources for better performance
     */
    private preloadCriticalResources(): void {
        const criticalResources = [
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
            // Add other critical resources here
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = resource.includes('fonts') ? 'style' : 'script';
            link.href = resource;
            if (resource.includes('fonts')) {
                link.onload = () => {
                    link.rel = 'stylesheet';
                };
            }
            document.head.appendChild(link);
        });
    }

    /**
     * Lazy load non-critical resources
     */
    private lazyLoadResources(): void {
        // Implement intersection observer for lazy loading images
        if ('IntersectionObserver' in window) {
            const lazyImages = document.querySelectorAll('img[data-src]');
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target as HTMLImageElement;
                        img.src = img.dataset['src'] || '';
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            lazyImages.forEach(img => imageObserver.observe(img));
        }
    }

    /**
     * Monitor Core Web Vitals for SEO
     */
    private monitorCoreWebVitals(): void {
        // This would typically integrate with Google Analytics or other monitoring tools
        if (typeof window !== 'undefined') {
            // Monitor Largest Contentful Paint (LCP)
            this.observeLCP();

            // Monitor First Input Delay (FID)
            this.observeFID();

            // Monitor Cumulative Layout Shift (CLS)
            this.observeCLS();
        }
    }

    private observeLCP(): void {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                console.log('LCP:', lastEntry.startTime);
                // Send to analytics
            });
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
        }
    }

    private observeFID(): void {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry: any) => {
                    console.log('FID:', entry.processingStart - entry.startTime);
                    // Send to analytics
                });
            });
            observer.observe({ entryTypes: ['first-input'] });
        }
    }

    private observeCLS(): void {
        if ('PerformanceObserver' in window) {
            let clsValue = 0;
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry: any) => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                        console.log('CLS:', clsValue);
                        // Send to analytics
                    }
                });
            });
            observer.observe({ entryTypes: ['layout-shift'] });
        }
    }

    /**
     * Add structured data to page
     */
    addStructuredData(data: any): void {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(data);
        document.head.appendChild(script);
    }

    /**
     * Optimize images for better performance
     */
    optimizeImages(): void {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            // Add loading="lazy" attribute if not present
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }

            // Add proper alt text if missing (for SEO)
            if (!img.hasAttribute('alt') || img.alt === '') {
                console.warn('Image missing alt text:', img.src);
            }
        });
    }

    /**
     * Minify and compress resources
     */
    compressResources(): void {
        // Enable gzip compression headers (usually done at server level)
        // This method can be used to check if compression is enabled
        if (typeof window !== 'undefined' && 'navigator' in window) {
            const connection = (navigator as any).connection;
            if (connection && connection.effectiveType) {
                console.log('Network speed:', connection.effectiveType);
                // Adapt resource loading based on network speed
                if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                    // Load minimal resources for slow connections
                    this.loadMinimalResources();
                }
            }
        }
    }

    private loadMinimalResources(): void {
        // Remove non-essential resources for slow connections
        const nonEssential = document.querySelectorAll('.non-essential');
        nonEssential.forEach(element => {
            element.remove();
        });
    }
}