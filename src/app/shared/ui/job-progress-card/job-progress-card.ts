import { Component, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AdminJobPoller } from '../../../core/admin/admin-job-poller';
import { AdminJob } from '../../../core/admin/admin.types';
import { jobLabel } from '../../../core/admin/admin-job-label';
import { ProgressBarComponent } from '../progress-bar/progress-bar';

@Component({
  selector: 'app-job-progress-card',
  standalone: true,
  imports: [CommonModule, ProgressBarComponent],
  templateUrl: './job-progress-card.html',
  styleUrl: './job-progress-card.scss',
})
export class JobProgressCardComponent implements OnChanges, OnDestroy {
  @Input() jobId!: string;

  job: AdminJob | null = null;
  error: string | null = null;
  jobLabel = jobLabel;

  private sub: Subscription | null = null;

  constructor(private poller: AdminJobPoller) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['jobId'] && this.jobId) {
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private startPolling(): void {
    this.sub?.unsubscribe();
    this.job = null;
    this.error = null;
    this.sub = this.poller.poll(this.jobId).subscribe({
      next: job => { this.job = job; },
      error: err => { this.error = String(err?.message ?? err); },
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status--pending';
      case 'running': return 'status--running';
      case 'completed': return 'status--completed';
      case 'failed': return 'status--failed';
      case 'cancelled': return 'status--cancelled';
      default: return 'status--pending';
    }
  }

  isRunning(status: string): boolean { return status === 'running'; }
  isTerminal(status: string): boolean {
    return status === 'completed' || status === 'failed' || status === 'cancelled';
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
