import { AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { SEOService } from '../../services/seo.service';

type KndlTopTab = 'home' | 'products' | 'about' | 'contact';

interface Testimonial { quote: string; name: string; company: string; }

@Component({
    selector: 'app-kndl-about',
    templateUrl: './kndl-about.component.html',
    styleUrls: ['./kndl-about.component.scss']
})
export class KndlAboutComponent implements OnInit, AfterViewInit {
    @Output() panelOpen = new EventEmitter<KndlTopTab>();
    @Output() slideoutOpen = new EventEmitter<void>();
    @ViewChild('exploreTarget') private exploreTarget?: ElementRef<HTMLElement>;

    constructor(private seoService: SEOService, private el: ElementRef) { }

    ngOnInit(): void {
        this.seoService.setAboutSEO();
    }

    ngAfterViewInit(): void {
        const observer = new IntersectionObserver(
            (entries) => entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('ab-in-view');
                    observer.unobserve(e.target);
                }
            }),
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
        );
        this.el.nativeElement.querySelectorAll('.ab-reveal')
            .forEach((el: Element) => observer.observe(el));
    }

    scrollToExplore(): void {
        this.exploreTarget?.nativeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    readonly testimonials: Testimonial[] = [
        {
            quote: 'KNDL Inc transformed our online presence completely. Within three months we saw a significant increase in inbound inquiries directly from our website — couldn\'t be happier.',
            name: 'Marcus T.',
            company: 'MT Landscaping — DFW'
        },
        {
            quote: 'The team was fast, professional, and actually listened. Our new brand identity looks exactly like what we envisioned. They nailed the direction on the first round.',
            name: 'Priya D.',
            company: 'Bloomed Floral Studio'
        },
        {
            quote: 'Simple process, beautiful result. They handled everything from logo design to a full website launch in under six weeks. Clear communication the entire time.',
            name: 'James R.',
            company: 'Riverside Auto Detailing'
        }
    ];
}


