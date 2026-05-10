import {DestroyRef, inject, Injectable} from '@angular/core';
import {BehaviorSubject, of} from 'rxjs';
import {catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ItemApiService} from '../../../../core/services/item-api.service';
import {GameCode, ItemPreview} from '../../../../core/models/item';
import {ItemsHistoryService} from '../../../../core/services/items-history';
import {SettingsService} from '../../../../core/services/settings-service';

export type GameFilter = 'all' | GameCode;
export type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';
export type SearchUiState = {
  query: string;
  game: GameFilter;
  status: SearchStatus;
  items: ItemPreview[];
  errorMessage?: string;
  offset: number;
  hasMore: boolean;
  loadingMore: boolean;
};

const PAGE_SIZE = 30;
const initialState: SearchUiState = {
  query: '', game: 'all', status: 'idle', items: [],
  offset: 0, hasMore: false, loadingMore: false,
};

@Injectable({ providedIn: 'root' })
export class ItemSearchViewModel {
  private api = inject(ItemApiService);
  private history = inject(ItemsHistoryService);
  private settings = inject(SettingsService);
  private destroyRef = inject(DestroyRef);
  private stateSubject = new BehaviorSubject<SearchUiState>(initialState);
  state$ = this.stateSubject.asObservable();
  history$ = this.history.history$;
  get getState(): SearchUiState { return this.stateSubject.value; }

  constructor() {
    this.state$.pipe(
      map(s => ({ q: s.query.trim(), game: s.game })),
      debounceTime(300),
      distinctUntilChanged((a, b) => a.q === b.q && a.game === b.game),
      switchMap(({ q, game }) => this.settings.resolvedSearchLanguage$.pipe(
        distinctUntilChanged(),
        switchMap(lang => {
        const request$ = q.length >= 2
          ? this.api.searchItems({ name: q, game, lang, limit: PAGE_SIZE, offset: 0 })
          : this.api.listItems({ game, lang, limit: PAGE_SIZE, offset: 0 });
        return request$.pipe(
          map(items => ({
            ...this.getState,
            status: 'ready' as const,
            items,
            errorMessage: undefined,
            offset: items.length,
            hasMore: items.length === PAGE_SIZE,
            loadingMore: false,
          })),
          startWith({
            ...this.getState,
            status: 'loading' as const,
            items: [],
            errorMessage: undefined,
            offset: 0,
            hasMore: false,
            loadingMore: false,
          }),
          catchError(err => of({
            ...this.getState,
            status: 'error' as const,
            items: [],
            errorMessage: String(err?.error?.error ?? err?.message ?? err),
            offset: 0,
            hasMore: false,
            loadingMore: false,
          })),
        );
        }),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(next => this.stateSubject.next(next));
  }

  setQuery(query: string) { this.patch({ query }); }
  setGame(game: GameFilter) { this.patch({ game }); }
  clearHistory() { this.history.clear(); }

  loadMore(): void {
    const s = this.getState;
    if (s.loadingMore || !s.hasMore || s.status !== 'ready') return;
    const q = s.query.trim();
    const game = s.game;
    const lang = this.settings.resolvedSearchLanguage;
    this.patch({ loadingMore: true });
    const request$ = q.length >= 2
      ? this.api.searchItems({ name: q, game, lang, limit: PAGE_SIZE, offset: s.offset })
      : this.api.listItems({ game, lang, limit: PAGE_SIZE, offset: s.offset });
    request$.pipe(
      catchError(() => of([] as ItemPreview[])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(more => {
      const cur = this.getState;
      if (cur.query.trim() !== q || cur.game !== game) return;
      const items = [...cur.items, ...more];
      this.patch({
        items,
        offset: items.length,
        hasMore: more.length === PAGE_SIZE,
        loadingMore: false,
      });
    });
  }

  private patch(patch: Partial<SearchUiState>) { this.stateSubject.next({ ...this.getState, ...patch }); }
}
