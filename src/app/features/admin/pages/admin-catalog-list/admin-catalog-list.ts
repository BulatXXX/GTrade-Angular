import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { BehaviorSubject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../../../../core/admin/admin-api.service';
import { CatalogItem } from '../../../../core/models/item';
import { AdminJob, CatalogImportRequest } from '../../../../core/admin/admin.types';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { JobProgressCardComponent } from '../../../../shared/ui/job-progress-card/job-progress-card';

type Status = 'idle' | 'loading' | 'ready' | 'error';
type ImportStatus = 'idle' | 'form' | 'running' | 'done' | 'error';
type SyncStatus = 'idle' | 'confirming' | 'running' | 'done' | 'error';

type CatalogListState = {
  status: Status;
  items: CatalogItem[];
  error?: string;
  offset: number;
  hasMore: boolean;
  importStatus: ImportStatus;
  importJobId?: string;
  importError?: string;
  syncStatus: SyncStatus;
  syncJobId?: string;
  syncError?: string;
};

const PAGE_SIZE = 20;
const initial: CatalogListState = {
  status: 'idle', items: [], offset: 0, hasMore: false,
  importStatus: 'idle', syncStatus: 'idle',
};

@Component({
  selector: 'app-admin-catalog-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, JobProgressCardComponent],
  templateUrl: './admin-catalog-list.html',
  styleUrl: './admin-catalog-list.scss',
})
export class AdminCatalogListPage implements OnInit {
  private api = inject(AdminApiService);
  private confirm = inject(ConfirmDialogService);
  private destroyRef = inject(DestroyRef);
  private stateSubject = new BehaviorSubject<CatalogListState>(initial);
  state$ = this.stateSubject.asObservable();

  filterForm = new FormGroup({
    query: new FormControl(''),
    game: new FormControl(''),
    language: new FormControl('en'),
    active_only: new FormControl(false),
  });

  importForm = new FormGroup({
    game: new FormControl('warframe'),
    source: new FormControl(''),
    language: new FormControl(''),
  });

  ngOnInit(): void {
    this.filterForm.valueChanges.pipe(
      startWith(this.filterForm.value),
      debounceTime(250),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.patch({ offset: 0, items: [] });
      this.loadPage(0);
    });
  }

  loadPage(offset: number): void {
    const { query, game, language, active_only } = this.filterForm.value;
    this.patch({ status: 'loading' });

    const req$ = query?.trim()
      ? this.api.searchItems({ q: query.trim(), game: game || undefined, language: language || undefined, limit: PAGE_SIZE, offset })
      : this.api.listItems({ game: game || undefined, language: language || undefined, active_only: active_only ?? false, limit: PAGE_SIZE, offset });

    req$.pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        this.patch({ status: 'error', error: String(err?.message ?? err) });
        return of([]);
      }),
    ).subscribe(items => {
      const current = offset === 0 ? [] : this.stateSubject.value.items;
      this.patch({
        status: 'ready',
        items: [...current, ...items],
        offset: offset + items.length,
        hasMore: items.length === PAGE_SIZE,
      });
    });
  }

  loadMore(): void {
    this.loadPage(this.stateSubject.value.offset);
  }

  async deleteItem(item: CatalogItem): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete item',
      message: `Delete "${item.name}"? This cannot be undone.`,
      danger: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    let errored = false;
    this.api.deleteItem(item.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        errored = true;
        alert('Delete failed: ' + String(err?.message ?? err));
        return of(undefined as void);
      }),
    ).subscribe(() => {
      if (!errored) {
        this.patch({ items: this.stateSubject.value.items.filter(i => i.id !== item.id) });
      }
    });
  }

  showImportForm(): void {
    this.patch({ importStatus: 'form', importError: undefined });
  }

  cancelImport(): void {
    this.patch({ importStatus: 'idle' });
  }

  resetImport(): void {
    this.patch({ importStatus: 'idle', importJobId: undefined, importError: undefined });
  }

  submitImport(): void {
    const val = this.importForm.value;
    if (!val.game) return;
    const req: CatalogImportRequest = {
      game: val.game,
      source: val.source || undefined,
      language: val.language || undefined,
    };
    this.patch({ importStatus: 'running', importError: undefined });
    this.api.startCatalogImport(req).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(err => {
        this.patch({ importStatus: 'error', importError: String(err?.message ?? err) });
        return of(null);
      }),
    ).subscribe(job => {
      if (!job) return;
      this.patch({ importJobId: job.id });
    });
  }

  onImportJobTerminal(status: string): void {
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      this.patch({ importStatus: 'done' });
    }
  }

  async startSync(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Sync Price History',
      message: 'Start a price history sync job? This may take several minutes.',
      confirmLabel: 'Start Sync',
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
      this.patch({ syncJobId: job.id });
    });
  }

  resetSync(): void {
    this.patch({ syncStatus: 'idle', syncJobId: undefined, syncError: undefined });
  }

  formatDate(iso?: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  truncate(s: string, n = 24): string {
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  private patch(patch: Partial<CatalogListState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...patch });
  }
}
