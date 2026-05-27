import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  trigger, transition, style, animate, query, group
} from '@angular/animations';
import { PerformanceService } from './services/performance.service';
import { BackgroundService, BgState } from './services/background.service';

export const routeAnimations = trigger('routeAnimations', [
  // kndl → detail: old content lifts up and fades, new rises in from below
  transition('kndl => detail', [
    query(':enter, :leave', [
      style({ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' })
    ], { optional: true }),
    group([
      query(':leave', [
        animate('280ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 0, transform: 'translateY(-24px) scale(0.98)' }))
      ], { optional: true }),
      query(':enter', [
        style({ opacity: 0, transform: 'translateY(32px) scale(0.99)' }),
        animate('460ms 100ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ], { optional: true })
    ])
  ]),
  // detail → kndl: old content drops down and fades, home slides in from above
  transition('detail => kndl', [
    query(':enter, :leave', [
      style({ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' })
    ], { optional: true }),
    group([
      query(':leave', [
        animate('280ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 0, transform: 'translateY(24px) scale(0.98)' }))
      ], { optional: true }),
      query(':enter', [
        style({ opacity: 0, transform: 'translateY(-28px) scale(0.99)' }),
        animate('460ms 100ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ], { optional: true })
    ])
  ]),
  // All other transitions: clean fade
  transition('* <=> *', [
    query(':enter, :leave', [
      style({ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' })
    ], { optional: true }),
    group([
      query(':leave', [
        animate('220ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 0 }))
      ], { optional: true }),
      query(':enter', [
        style({ opacity: 0 }),
        animate('380ms 80ms cubic-bezier(0.22, 1, 0.36, 1)', style({ opacity: 1 }))
      ], { optional: true })
    ])
  ])
]);

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [routeAnimations]
})
export class AppComponent implements OnInit {
  title = 'Kndl';
  bgState: BgState = { tab: 'home', videoHidden: false };
  videoLoaded = false;

  constructor(
    private performanceService: PerformanceService,
    private bg: BackgroundService
  ) { }

  ngOnInit(): void {
    this.bg.state$.subscribe(state => { this.bgState = state; });
  }

  prepareRoute(outlet: RouterOutlet): string {
    return outlet?.activatedRouteData?.['animation'] ?? '';
  }

  isScrollableRoute(outlet: RouterOutlet): boolean {
    const animation = this.prepareRoute(outlet);
    return animation === 'detail' || animation === 'wedding';
  }
}
