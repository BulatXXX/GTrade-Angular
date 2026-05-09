import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../../../../core/admin/admin-api.service';
import { CatalogStats, AdminJob } from '../../../../core/admin/admin.types';

type Status = 'idle' | 'loading' | 'ready' | 'error';
type DashboardState = {
  status: Status;
  stats: CatalogStats | null;
  jobs: AdminJob[];
  error?: string;
};

const initial: DashboardState = { status: 'idle', stats: null, jobs: [] };

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboardPage {
  private api = inject(AdminApiService);
  private destroyRef = inject(DestroyRef);
  private stateSubject = new BehaviorSubject<DashboardState>(initial);
  state$ = this.stateSubject.asObservable();

  constructor() {
    this.load();
  }

  load() {
    this.patch({ status: 'loading', error: undefined });
    this.api.getStats().pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        this.patch({ status: 'error', error: String(err?.message ?? err) });
        return of(null);
      }),
    ).subscribe(stats => {
      if (!stats) return;
      this.patch({ stats });
      this.api.listJobs().pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([])),
      ).subscribe(jobs => {
        this.patch({ status: 'ready', jobs: jobs.slice(0, 8) });
      });
    });
  }

  formatNum(n: number | undefined): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('en-US').format(n);
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'status--pending',
      running: 'status--running',
      completed: 'status--completed',
      failed: 'status--failed',
      cancelled: 'status--cancelled',
    };
    return map[status] ?? 'status--pending';
  }

  private patch(patch: Partial<DashboardState>) {
    this.stateSubject.next({ ...this.stateSubject.value, ...patch });
  }
}
