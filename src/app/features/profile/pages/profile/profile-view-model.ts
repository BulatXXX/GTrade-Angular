import {inject, Injectable} from '@angular/core';
import {BehaviorSubject, combineLatest, of} from 'rxjs';
import {catchError, distinctUntilChanged, map, shareReplay, startWith, switchMap} from 'rxjs/operators';
import {TrackedItemsService} from '../../../../core/services/items-tracked';
import {ItemApiService} from '../../../../core/services/item-api.service';
import {SettingsService} from '../../../../core/services/settings-service';
import {GameCode, TrackedItem} from '../../../../core/models/item';

type ProfileRowState = TrackedItem & { status: 'loading' | 'ready' | 'error'; name?: string; game?: GameCode | string; avg24hPrice?: number | null; error?: string };
export type Mode = 'pvp' | 'pve';
export type GameFilter = 'all' | GameCode;

@Injectable()
export class ProfileViewModel {
  private tracked = inject(TrackedItemsService);
  private api = inject(ItemApiService);
  private settings = inject(SettingsService);
  private gameFilterSubject = new BehaviorSubject<GameFilter>('all');
  private querySubject = new BehaviorSubject<string>('');

  readonly mode$ = this.settings.settings$.pipe(map(s => ((s.mode as Mode) ?? 'pvp')), distinctUntilChanged());
  readonly gameFilter$ = this.gameFilterSubject.asObservable();
  readonly query$ = this.querySubject.asObservable();

  private readonly allRows$ = combineLatest([this.tracked.tracked$, this.mode$, this.settings.resolvedSearchLanguage$]).pipe(
    switchMap(([tracked, mode, lang]) => {
      if (!tracked.length) return of([] as ProfileRowState[]);
      const loadingRows: ProfileRowState[] = tracked.map(t => ({ ...t, status: 'loading' as const })).sort((a, b) => b.updatedAt - a.updatedAt);
      return this.api.getItemsByIdsForProfile({ ids: tracked.map(t => t.id), lang, gameMode: mode === 'pve' ? 'pve' : 'regular' }).pipe(
        map(items => {
          const byId = new Map(items.map(i => [i.id, i]));
          return tracked.map(t => {
            const it = byId.get(t.id);
            return it ? { ...t, status: 'ready' as const, name: it.name, game: it.game, avg24hPrice: it.avg24hPrice, iconLink: t.iconLink ?? it.iconLink ?? null } : { ...t, status: 'error' as const, name: '—', avg24hPrice: null, error: 'Item not found' };
          }).sort((a, b) => b.updatedAt - a.updatedAt);
        }),
        catchError(err => of(tracked.map(t => ({ ...t, status: 'error' as const, name: '—', avg24hPrice: null, error: String(err?.message ?? err) })).sort((a, b) => b.updatedAt - a.updatedAt))),
        startWith(loadingRows),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly rows$ = combineLatest([this.allRows$, this.gameFilter$, this.query$]).pipe(
    map(([rows, game, query]) => {
      const q = query.trim().toLowerCase();
      return rows.filter(r => {
        if (game !== 'all' && r.status === 'ready' && r.game !== game) return false;
        if (q.length > 0 && r.status === 'ready') return (r.name ?? '').toLowerCase().includes(q);
        return true;
      });
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  setGameFilter(g: GameFilter) { if (this.gameFilterSubject.value !== g) this.gameFilterSubject.next(g); }
  setQuery(q: string) { if (this.querySubject.value !== q) this.querySubject.next(q); }
}
