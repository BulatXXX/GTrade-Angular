// src/app/core/services/sync.service.ts
import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, catchError, map, Observable, of, switchMap, tap, throwError} from 'rxjs';

import {API_BASE_URL} from '../api/api.config';
import {AuthService} from '../auth/auth.service';
import {TrackedItem} from '../models/item';
import {TrackedItemsService} from './items-tracked';
import {buildCompare, normalizeTracked, SyncCompare} from '../util/sync.diff';


export type SyncStrategy = 'localToServer' | 'serverToLocal' | 'merge';

type GetTrackedResp = { items: TrackedItem[] };
type PutTrackedReq = { items: TrackedItem[] };
type PutTrackedResp = { items: TrackedItem[] };

export type SyncUiState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'inSync'; compare: SyncCompare }
  | { status: 'outOfSync'; compare: SyncCompare }
  | { status: 'syncing'; compare?: SyncCompare }
  | { status: 'error'; message: string; compare?: SyncCompare };

@Injectable({ providedIn: 'root' })
export class SyncService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private local = inject(TrackedItemsService);

  private uiStateSubject = new BehaviorSubject<SyncUiState>({ status: 'idle' });
  readonly uiState$ = this.uiStateSubject.asObservable();

  /** Пересчитать diff локал vs сервер */
  compare(): Observable<SyncCompare> {
    if (!this.auth.isAuthed) {
      this.uiStateSubject.next({ status: 'idle' });
      return of({
        localCount: this.local.snapshot().length,
        serverCount: 0,
        inSync: true,
        onlyLocal: [],
        onlyServer: [],
        conflicts: [],
      });
    }

    this.uiStateSubject.next({ status: 'checking' });

    const localItems = this.local.snapshot().map(normalizeTracked);

    return this.getServer().pipe(
      map(serverItems => {
        const compare = buildCompare(localItems, serverItems);
        this.uiStateSubject.next(compare.inSync ? { status: 'inSync', compare } : { status: 'outOfSync', compare });
        return compare;
      }),
      catchError(err => {
        const msg = String((err as any)?.message ?? err);
        this.uiStateSubject.next({ status: 'error', message: msg });
        return throwError(() => err);
      }),
    );
  }

  /** Выполнить синк по выбранной стратегии + обновить diff */
  sync(strategy: SyncStrategy): Observable<TrackedItem[]> {
    if (!this.auth.isAuthed) return of(this.local.snapshot());

    const prev = this.uiStateSubject.value;
    this.uiStateSubject.next({ status: 'syncing', compare: 'compare' in prev ? prev.compare : undefined });

    return this.getServer().pipe(
      switchMap(serverItems => {
        const localItems = this.local.snapshot().map(normalizeTracked);

        if (strategy === 'serverToLocal') {
          this.local.replaceAll(serverItems);
          return of(this.local.snapshot());
        }

        if (strategy === 'localToServer') {
          return this.putServer(localItems).pipe(
            tap(items => this.local.replaceAll(items)),
            map(() => this.local.snapshot()),
          );
        }

        // merge
        const merged = mergeByUpdatedAt(localItems, serverItems);
        this.local.replaceAll(merged);

        return this.putServer(merged).pipe(
          tap(items => this.local.replaceAll(items)),
          map(() => this.local.snapshot()),
        );
      }),
      tap(() => {
        // после синка — пересчитаем diff (и uiState обновится)
        this.compare().subscribe({ error: () => {} });
      }),
      catchError(err => {
        const msg = String((err as any)?.message ?? err);
        const prev2 = this.uiStateSubject.value;
        this.uiStateSubject.next({ status: 'error', message: msg, compare: 'compare' in prev2 ? prev2.compare : undefined });
        return throwError(() => err);
      }),
    );
  }

  private getServer(): Observable<TrackedItem[]> {
    return this.http
      .get<GetTrackedResp>(`${API_BASE_URL}/tracked?mode=pve`)
      .pipe(map(res => (res.items ?? []).map(normalizeTracked)));
  }

  private putServer(items: TrackedItem[]): Observable<TrackedItem[]> {
    const body: PutTrackedReq = { items: items.map(normalizeTracked) };
    return this.http
      .put<PutTrackedResp>(`${API_BASE_URL}/tracked?mode=pve`, body)
      .pipe(map(res => (res.items ?? []).map(normalizeTracked)));
  }
}

/** LWW merge + аккуратно тянем iconLink если у победителя null */
function mergeByUpdatedAt(local: TrackedItem[], server: TrackedItem[]): TrackedItem[] {
  const byId = new Map<string, TrackedItem>();

  for (const x of server ?? []) {
    const n = normalizeTracked(x);
    if (n.id) byId.set(n.id, n);
  }

  for (const x of local ?? []) {
    const n = normalizeTracked(x);
    if (!n.id) continue;

    const prev = byId.get(n.id);
    if (!prev) {
      byId.set(n.id, n);
      continue;
    }

    const winner = n.updatedAt >= prev.updatedAt ? n : prev;
    const loser = winner === n ? prev : n;

    byId.set(n.id, {
      id: n.id,
      updatedAt: winner.updatedAt,
      iconLink: winner.iconLink ?? loser.iconLink ?? null,
    });
  }

  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}
