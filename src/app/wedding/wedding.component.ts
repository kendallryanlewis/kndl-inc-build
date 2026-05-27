import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BackgroundService } from '../services/background.service';

@Component({
  selector: 'app-wedding',
  templateUrl: './wedding.component.html',
  styleUrls: ['./wedding.component.scss']
})
export class WeddingComponent implements OnInit, OnDestroy {
  @ViewChild('parallaxFg') parallaxFg!: ElementRef<HTMLElement>;

  showCover = true;
  coverFading = false;
  pageReady = false;
  activeSection = 'home';
  weddingDate = 'Saturday, October 5, 2024';
  weddingTime = '4:30 PM';
  weddingVenue = 'The Cedar Room at The Cedar Room';
  weddingAddress = '123 Main Street, Charleston, SC 29401';
  weddingCity = 'Dallas';
  weddingState = 'Texas';
  weddingLocation = `${this.weddingCity}, ${this.weddingState}`;

  constructor(private bg: BackgroundService) { }

  ngOnInit(): void {
    this.bg.setTab('wedding', true);
    setTimeout(() => { this.coverFading = true; }, 3000);
    setTimeout(() => { this.showCover = false; }, 3700);
    setTimeout(() => { this.pageReady = true; }, 4700);
  }

  ngOnDestroy(): void {
    this.bg.setTab('home', false);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    // Active section tracking
    const sections = ['rsvp', 'gallery', 'travel', 'weekend', 'story', 'home'];
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 120) {
        this.activeSection = id;
        break;
      }
    }

    // Parallax: shift fg image at 40% of scroll speed, preserving horizontal flip
    if (this.parallaxFg?.nativeElement) {
      const el = this.parallaxFg.nativeElement;
      const rect = el.parentElement!.getBoundingClientRect();
      const offset = rect.top * 0.4;
      el.style.transform = `scaleX(-1) translateY(${offset}px)`;
    }
  }

  scrollToSection(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
