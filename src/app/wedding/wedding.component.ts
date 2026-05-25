import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-wedding',
  templateUrl: './wedding.component.html',
  styleUrls: ['./wedding.component.scss']
})
export class WeddingComponent implements OnInit, OnDestroy {
  readonly weddingDate = new Date('2026-10-10T17:00:00');
  countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  rsvp = {
    name: '',
    email: '',
    attending: '',
    guests: 1,
    message: ''
  };
  rsvpSubmitted = false;

  ngOnInit(): void {
    this.tick();
    this.countdownInterval = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  submitRsvp(): void {
    if (this.rsvp.name.trim() && this.rsvp.email.trim() && this.rsvp.attending) {
      this.rsvpSubmitted = true;
    }
  }

  pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  private tick(): void {
    const diff = this.weddingDate.getTime() - Date.now();
    if (diff <= 0) {
      this.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return;
    }
    this.countdown = {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
      seconds: Math.floor((diff % 60_000) / 1000)
    };
  }
}
