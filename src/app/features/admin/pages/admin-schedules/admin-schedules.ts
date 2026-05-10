import { Component, DestroyRef, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, Subscription, of, switchMap, timer } from 'rxjs';
import { catchError, distinctUntilChanged, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../../../../core/admin/admin-api.service';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { AdminJob, SchedulerStateItem } from '../../../../core/admin/admin.types';
import { TPipe } from '../../../../core/i18n/t.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';

type RunStatus = 'idle' | 'running' | 'skipped' | 'error';
type SourceError = { source: 'catalog' | 'user-assets'; message: string; status?: number };
type SchedulesState = {
  status: 'loading' | 'ready' | 'error';
  items: SchedulerStateItem[];
  sourceErrors: SourceError[];
  error?: string;
  lastRefreshAt?: number;
  /** map job_name -> last manual run state */
  manualRuns: Record<string, { status: RunStatus; message?: string; at: number }>;
};

const initial: SchedulesState = { status: 'loading', items: [], sourceErrors: [], manualRuns: {} };

const FAST_POLL_MS = 3000;
const SLOW_POLL_MS = 30000;

@Component({
  selector: 'app-admin-schedules',
  standalone: true,
  imports: [CommonModule, TPipe],
  templateUrl: './admin-schedules.html',
  styleUrl: './admin-schedules.scss',
})
export class AdminSchedulesPage implements OnInit, OnDestroy {
  private api = inject(AdminApiService);
  private confirm = inject(ConfirmDialogService);
  private i18n = inject(I18nService);
  private destroyRef = inject(DestroyRef);

  private stateSubject = new BehaviorSubject<SchedulesState>(initial);
  state$ = this.stateSubject.asObservable();

  private pollSub?: Subscription;

  ngOnInit(): void {
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  private startPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = this.state$.pipe(
      map(s => s.items.some(i => i.status === 'running')),
      distinctUntilChanged(),
      switchMap(anyRunning => timer(0, anyRunning ? FAST_POLL_MS : SLOW_POLL_MS)),
      switchMap(() => this.api.getMergedSchedulerState()),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ items, errors }) => {
      this.patch({ status: 'ready', items, sourceErrors: errors, lastRefreshAt: Date.now(), error: undefined });
    });
  }

  refresh(): void {
    this.api.getMergedSchedulerState().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ items, errors }) => {
      this.patch({ status: 'ready', items, sourceErrors: errors, lastRefreshAt: Date.now(), error: undefined });
    });
  }

  async runNow(item: SchedulerStateItem): Promise<void> {
    const ok = await this.confirm.confirm({
      title: this.i18n.t('admin.schedules.runConfirmTitle'),
      message: this.i18n.t('admin.schedules.runConfirmMessage', { job: this.jobLabel(item.job_name) }),
      confirmLabel: this.i18n.t('admin.schedules.runNow'),
    });
    if (!ok) return;

    if (item.job_name === 'price_history_sync') {
      this.triggerJob(item.job_name, this.api.startPriceSync());
    } else if (item.job_name.startsWith('catalog_import_')) {
      const game = item.job_name.replace('catalog_import_', '');
      this.triggerJob(item.job_name, this.api.startCatalogImport({ game }));
    } else if (item.job_name === 'price_alert_dispatch') {
      // sync endpoint, no job_id
      this.markRun(item.job_name, 'running');
      this.api.sendPriceAlerts({ force_send: false }).pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          this.markRun(item.job_name, 'error', String(err?.message ?? err));
          return of(null);
        }),
      ).subscribe(res => {
        if (res) this.markRun(item.job_name, 'idle', `sent ${res.emails_sent}/${res.users_checked}`);
        this.refresh();
      });
    } else {
      this.markRun(item.job_name, 'error', `unknown job_name: ${item.job_name}`);
    }
  }

  private triggerJob(jobName: string, req$: ReturnType<AdminApiService['startPriceSync']>): void {
    this.markRun(jobName, 'running');
    req$.pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        this.markRun(jobName, 'error', String(err?.message ?? err));
        return of(null as AdminJob | null);
      }),
    ).subscribe(job => {
      if (!job) return;
      if (job.status === 'skipped') {
        this.markRun(jobName, 'skipped', job.error ?? 'lock busy');
      } else {
        this.markRun(jobName, 'idle', `job ${job.id}`);
      }
      this.refresh();
    });
  }

  private markRun(jobName: string, status: RunStatus, message?: string): void {
    const cur = this.stateSubject.value.manualRuns;
    this.patch({
      manualRuns: { ...cur, [jobName]: { status, message, at: Date.now() } },
    });
  }

  jobLabel(jobName: string): string {
    const map: Record<string, string> = {
      'price_history_sync': this.i18n.t('admin.schedules.job.priceHistorySync'),
      'catalog_import_warframe': this.i18n.t('admin.schedules.job.catalogImportWarframe'),
      'catalog_import_eve': this.i18n.t('admin.schedules.job.catalogImportEve'),
      'catalog_import_tarkov': this.i18n.t('admin.schedules.job.catalogImportTarkov'),
      'price_alert_dispatch': this.i18n.t('admin.schedules.job.priceAlertDispatch'),
    };
    return map[jobName] ?? jobName;
  }

  statusClass(status: string): string {
    return `status status--${status}`;
  }

  formatDate(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatRelative(input?: string | number | null): string {
    if (input == null) return '—';
    const t = typeof input === 'number' ? input : new Date(input).getTime();
    const sec = Math.round((Date.now() - t) / 1000);
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
    return `${Math.round(sec / 86400)}d ago`;
  }

  formatNextRun(iso?: string | null): { label: string; status: 'soon' | 'overdue' | 'normal' } {
    if (!iso) return { label: '—', status: 'normal' };
    const t = new Date(iso).getTime();
    const sec = Math.round((t - Date.now()) / 1000);
    if (sec <= 0) {
      const ago = this.shortDuration(-sec);
      return sec > -30
        ? { label: this.i18n.t('admin.schedules.dueNow'), status: 'soon' }
        : { label: this.i18n.t('admin.schedules.overdue', { ago }), status: 'overdue' };
    }
    return { label: `in ${this.shortDuration(sec)}`, status: sec < 60 ? 'soon' : 'normal' };
  }

  formatInterval(seconds?: number | null): string {
    if (!seconds || seconds <= 0) return this.i18n.t('admin.schedules.manualOnly');
    return this.i18n.t('admin.schedules.every', { interval: this.shortDuration(seconds) });
  }

  /** Returns running duration label + stuck flag (running far longer than expected). */
  runningFor(item: SchedulerStateItem): { label: string; stuck: boolean } | null {
    if (item.status !== 'running' || !item.last_started_at) return null;
    const sec = Math.max(0, Math.round((Date.now() - new Date(item.last_started_at).getTime()) / 1000));
    // For scheduled jobs: stuck if running > 3x interval. For manual jobs: stuck if > 30 minutes.
    const limit = item.interval_seconds && item.interval_seconds > 0 ? item.interval_seconds * 3 : 1800;
    return { label: this.shortDuration(sec), stuck: sec > limit };
  }

  private shortDuration(sec: number): string {
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.round(sec / 60)}m`;
    if (sec < 86400) {
      const h = Math.floor(sec / 3600);
      const m = Math.round((sec % 3600) / 60);
      return m > 0 && h < 6 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${Math.round(sec / 86400)}d`;
  }

  formatNum(n: number | undefined | null): string {
    if (n == null) return '—';
    return new Intl.NumberFormat('en-US').format(n);
  }

  trackByJob(_: number, item: SchedulerStateItem): string { return item.job_name; }

  private patch(p: Partial<SchedulesState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...p });
  }
}
