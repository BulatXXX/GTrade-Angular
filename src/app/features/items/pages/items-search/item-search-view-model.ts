import {DestroyRef, inject, Injectable} from '@angular/core';
import {BehaviorSubject, of} from 'rxjs';
import {catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ItemApiService} from '../../../../core/services/item-api.service';
import {GameCode, ItemPreview} from '../../../../core/models/item';
import {ItemsHistoryService} from '../../../../core/services/items-history';

export type GameFilter = 'all' | GameCode;
export type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';
export type SearchUiState = { query: string; game: GameFilter; status: SearchStatus; items: ItemPreview[]; errorMessage?: string };

const initialState: SearchUiState = { query: '', game: 'all', status: 'idle', items: [] };

@Injectable({ providedIn: 'root' })
export class ItemSearchViewModel {
  private api = inject(ItemApiService);
  private history = inject(ItemsHistoryService);
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
      switchMap(({ q, game }) => {
        const request$ = q.length >= 2
          ? this.api.searchItems({ name: q, game, lang: 'en' })
          : this.api.listItems({ game, lang: 'en', limit: 30 });
        return request$.pipe(
          map(items => ({ ...this.getState, status: 'ready' as const, items, errorMessage: undefined })),
          startWith({ ...this.getState, status: 'loading' as const, items: [], errorMessage: undefined }),
          catchError(err => of({ ...this.getState, status: 'error' as const, items: [], errorMessage: String(err?.error?.error ?? err?.message ?? err) })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(next => this.stateSubject.next(next));
  }

  setQuery(query: string) { this.patch({ query }); }
  setGame(game: GameFilter) { this.patch({ game }); }
  clearHistory() { this.history.clear(); }
  private patch(patch: Partial<SearchUiState>) { this.stateSubject.next({ ...this.getState, ...patch }); }
}
