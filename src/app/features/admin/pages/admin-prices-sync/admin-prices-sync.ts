import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../../../../core/admin/admin-api.service';
import { AdminJob } from '../../../../core/admin/admin.types';
import { jobLabel } from '../../../../core/admin/admin-job-label';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { JobProgressCardComponent } from '../../../../shared/ui/job-progress-card/job-progress-card';
import { TPipe } from '../../../../core/i18n/t.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';

type SyncStatus = 'idle' | 'running' | 'done' | 'error';
type PricesState = {
  syncStatus: SyncStatus;
  syncJobId?: string;
  syncError?: string;
  historyStatus: 'idle' | 'loading' | 'ready';
  historyJobs: AdminJob[];
};

const initial: PricesState = { syncStatus: 'idle', historyStatus: 'idle', historyJobs: [] };

@Component({
  selector: 'app-admin-prices-sync',
  standalone: true,
  imports: [CommonModule, JobProgressCardComponent, TPipe],
  templateUrl: './admin-prices-sync.html',
  styleUrl: './admin-prices-sync.scss',
})
export class AdminPricesSyncPage implements OnInit {
  private api = inject(AdminApiService);
  private confirm = inject(ConfirmDialogService);
  private destroyRef = inject(DestroyRef);
  private i18n = inject(I18nService);
  private stateSubject = new BehaviorSubject<PricesState>(initial);
  state$ = this.stateSubject.asObservable();
  jobLabel = jobLabel;

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.patch({ historyStatus: 'loading' });
    this.api.listJobs().pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of([])),
    ).subscribe(jobs => {
      const syncJobs = jobs.filter(j => j.type === 'price-history-sync');
      this.patch({ historyStatus: 'ready', historyJobs: syncJobs });
    });
  }

  async startSync(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: this.i18n.t('admin.catalog.syncStartTitle'),
      message: this.i18n.t('admin.catalog.syncStartMessage'),
      confirmLabel: this.i18n.t('admin.catalog.syncStartConfirm'),
    });
    if (!ok) return;

    this.patch({ syncStatus: 'running', syncError: undefined });
    this.api.startPriceSync().pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        this.patch({ syncStatus: 'error', syncError: String(err?.message ?? err) });
        return of(null);
      }),
    ).subscribe(job => {
      if (!job) return;
      if (job.status === 'skipped') {
        this.patch({ syncStatus: 'error', syncError: this.i18n.t('admin.schedules.run.skipped') + (job.error ? ` · ${job.error}` : '') });
        return;
      }
      this.patch({ syncJobId: job.id });
    });
  }

  resetSync(): void {
    this.patch({ syncStatus: 'idle', syncJobId: undefined, syncError: undefined });
    this.loadHistory();
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'status--pending', running: 'status--running',
      completed: 'status--completed', failed: 'status--failed', cancelled: 'status--cancelled',
    };
    return map[status] ?? 'status--pending';
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private patch(p: Partial<PricesState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...p });
  }
}
