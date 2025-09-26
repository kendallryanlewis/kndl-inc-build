import { Component, OnInit } from '@angular/core';
import { PerformanceService } from './services/performance.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Kndl';

  constructor(private performanceService: PerformanceService) { }

  ngOnInit(): void {
    // Performance service is automatically initialized via constructor
    // Additional optimizations can be added here if needed
  }
}
