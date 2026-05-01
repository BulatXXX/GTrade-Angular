import {inject, Injectable} from '@angular/core';
import {combineLatest, of} from 'rxjs';
import {catchError, distinctUntilChanged, map, shareReplay, startWith, switchMap} from 'rxjs/operators';
import {TrackedItemsService} from '../../../../core/services/items-tracked';
import {ItemApiService} from '../../../../core/services/item-api.service';
import {SettingsService} from '../../../../core/services/settings-service';
import {TrackedItem} from '../../../../core/models/item';

type ProfileRowState = TrackedItem & { status: 'loading' | 'ready' | 'error'; name?: string; avg24hPrice?: number | null; error?: string };
export type Mode = 'pvp' | 'pve';

@Injectable()
export class ProfileViewModel {
  private tracked = inject(TrackedItemsService);
  private api = inject(ItemApiService);
  private settings = inject(SettingsService);
  readonly mode$ = this.settings.settings$.pipe(map(s => ((s.mode as Mode) ?? 'pvp')), distinctUntilChanged());

  readonly rows$ = combineLatest([this.tracked.tracked$, this.mode$]).pipe(
    switchMap(([tracked, mode]) => {
      if (!tracked.length) return of([] as ProfileRowState[]);
      const loadingRows: ProfileRowState[] = tracked.map(t => ({ ...t, status: 'loading' as const })).sort((a, b) => b.updatedAt - a.updatedAt);
      return this.api.getItemsByIdsForProfile({ ids: tracked.map(t => t.id), lang: 'en', gameMode: mode === 'pve' ? 'pve' : 'regular' }).pipe(
        map(items => {
          const byId = new Map(items.map(i => [i.id, i]));
          return tracked.map(t => {
            const it = byId.get(t.id);
            return it ? { ...t, status: 'ready' as const, name: it.name, avg24hPrice: it.avg24hPrice, iconLink: t.iconLink ?? it.iconLink ?? null } : { ...t, status: 'error' as const, name: '—', avg24hPrice: null, error: 'Item not found' };
          }).sort((a, b) => b.updatedAt - a.updatedAt);
        }),
        catchError(err => of(tracked.map(t => ({ ...t, status: 'error' as const, name: '—', avg24hPrice: null, error: String(err?.message ?? err) })).sort((a, b) => b.updatedAt - a.updatedAt))),
        startWith(loadingRows),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}
