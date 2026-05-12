// src/app/core/services/sync.service.ts
import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, catchError, forkJoin, map, Observable, of, switchMap, tap, throwError} from 'rxjs';

import {API_BASE_URL} from '../api/api.config';
import {AuthService} from '../auth/auth.service';
import {TrackedItem} from '../models/item';
import {TrackedItemsService} from './items-tracked';
import {buildCompare, normalizeTracked, SyncCompare} from '../util/sync.diff';


export type SyncStrategy = 'localToServer' | 'serverToLocal' | 'merge';

type WatchlistCatalogItem = {
  id: string;
  image_url?: string | null;
};

type WatchlistEntry = {
  id: number;
  user_id: number;
  item_id: string;
  notify_enabled: boolean;
  item?: WatchlistCatalogItem | null;
  created_at: string;
};

type WatchlistResponse = { items: WatchlistEntry[] };
type AddWatchlistRequest = { user_id: number; item_id: string };

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
          return this.syncServerToMatch(localItems).pipe(
            tap(items => this.local.replaceAll(items)),
            map(() => this.local.snapshot()),
          );
        }

        // merge
        const merged = mergeByUpdatedAt(localItems, serverItems);
        this.local.replaceAll(merged);

        return this.syncServerToMatch(merged).pipe(
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

  pushLocalToServer(): Observable<TrackedItem[]> {
    if (!this.auth.isAuthed) return of(this.local.snapshot());

    const localItems = this.local.snapshot().map(normalizeTracked);
    return this.syncServerToMatch(localItems).pipe(
      tap(items => this.local.replaceAll(items)),
    );
  }

  private getServer(): Observable<TrackedItem[]> {
    return this.getServerEntries().pipe(
      map(entries => entries.map(entry => this.toTrackedItem(entry))),
    );
  }

  private syncServerToMatch(targetItems: TrackedItem[]): Observable<TrackedItem[]> {
    const desiredItems = targetItems.map(normalizeTracked).filter(item => item.id);

    return this.getServerEntries().pipe(
      switchMap(serverEntries => {
        const desiredIds = new Set(desiredItems.map(item => item.id));
        const serverByItemId = new Map(serverEntries.map(entry => [entry.item_id, entry] as const));

        const createOps = desiredItems
          .filter(item => !serverByItemId.has(item.id))
          .map(item => this.addWatchlistItem(item.id));

        const deleteOps = serverEntries
          .filter(entry => !desiredIds.has(entry.item_id))
          .map(entry => this.deleteWatchlistItem(entry.id));

        const ops = [...createOps, ...deleteOps];
        if (!ops.length) return of(this.mergeLocalWithServer(desiredItems, serverEntries));

        return forkJoin(ops).pipe(
          map(() => desiredItems),
        );
      }),
    );
  }

  private getServerEntries(): Observable<WatchlistEntry[]> {
    return this.http
      .get<WatchlistResponse>(`${API_BASE_URL}/watchlist`, { params: { user_id: String(this.requireUserId()) } })
      .pipe(map(res => res.items ?? []));
  }

  private addWatchlistItem(itemId: string): Observable<WatchlistEntry> {
    const body: AddWatchlistRequest = { user_id: this.requireUserId(), item_id: itemId };
    return this.http.post<WatchlistEntry>(`${API_BASE_URL}/watchlist`, body);
  }

  private deleteWatchlistItem(watchlistId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/watchlist/${watchlistId}`, {
      params: { user_id: String(this.requireUserId()) },
    });
  }

  private mergeLocalWithServer(localItems: TrackedItem[], serverEntries: WatchlistEntry[]): TrackedItem[] {
    const serverByItemId = new Map(serverEntries.map(entry => [entry.item_id, entry] as const));
    return localItems.map(item => {
      const entry = serverByItemId.get(item.id);
      if (!entry) return item;

      return {
        id: item.id,
        updatedAt: item.updatedAt,
        iconLink: item.iconLink ?? entry.item?.image_url ?? null,
      };
    });
  }

  private toTrackedItem(entry: WatchlistEntry): TrackedItem {
    return normalizeTracked({
      id: entry.item_id,
      iconLink: entry.item?.image_url ?? null,
      updatedAt: Date.parse(entry.created_at) || Date.now(),
    });
  }

  private requireUserId(): number {
    const value = Number(this.auth.userId);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('Authenticated numeric user id is required for watchlist sync');
    }
    return value;
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
