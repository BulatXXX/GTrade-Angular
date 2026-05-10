import {DestroyRef, inject, Injectable} from '@angular/core';
import {BehaviorSubject, of} from 'rxjs';
import {catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ItemApiService} from '../../../../core/services/item-api.service';
import {ItemsHistoryService} from '../../../../core/services/items-history';
import {TrackedItemsService} from '../../../../core/services/items-tracked';
import {SettingsService} from '../../../../core/services/settings-service';
import {GameMode, ItemDetails, ItemPreview} from '../../../../core/models/item';

type Status = 'idle' | 'loading' | 'ready' | 'error';
export type DetailsUiState = { id: string | null; mode: GameMode; status: Status; item?: ItemDetails; tracked: boolean; priceLoading?: boolean; errorMessage?: string };
const initialState: DetailsUiState = { id: null, mode: 'regular', status: 'idle', tracked: false, priceLoading: false };

@Injectable({ providedIn: 'root' })
export class ItemDetailsViewModel {
  private api = inject(ItemApiService);
  private history = inject(ItemsHistoryService);
  private trackedService = inject(TrackedItemsService);
  private settings = inject(SettingsService);
  private destroyRef = inject(DestroyRef);
  private stateSubject = new BehaviorSubject<DetailsUiState>(initialState);
  state$ = this.stateSubject.asObservable();
  get snapshot(): DetailsUiState { return this.stateSubject.value; }

  constructor() {
    this.state$.pipe(
      map(s => ({ id: s.id, mode: s.mode })),
      debounceTime(0),
      distinctUntilChanged((a, b) => a.id === b.id && a.mode === b.mode),
      switchMap(({ id, mode }) => this.settings.resolvedSearchLanguage$.pipe(
        distinctUntilChanged(),
        switchMap(lang => {
        if (!id) return of({ ...this.snapshot, status: 'idle' as const, item: undefined, tracked: false, priceLoading: false });
        const prev = this.snapshot;
        const sameItemReload = prev.status === 'ready' && !!prev.item && prev.item.id === id;
        const startState: DetailsUiState = sameItemReload
          ? { ...prev, id, mode, priceLoading: true, errorMessage: undefined }
          : { ...prev, id, mode, status: 'loading', item: undefined, tracked: false, priceLoading: false, errorMessage: undefined };
        return this.api.getItemById({ id, lang, gameMode: mode }).pipe(
          map(item => {
            const preview: ItemPreview = { id: item.id, game: item.game, source: item.source, externalId: item.externalId, name: item.name, iconLink: item.iconLink };
            this.history.add(preview);
            return { ...this.snapshot, id, mode, status: 'ready' as const, item, tracked: this.trackedService.isTracked(item.id), priceLoading: false, errorMessage: undefined };
          }),
          startWith(startState),
          catchError(err => of(sameItemReload
            ? { ...prev, id, mode, priceLoading: false, errorMessage: String(err?.error?.error ?? err?.message ?? err) }
            : { ...prev, id, mode, status: 'error' as const, item: undefined, tracked: false, priceLoading: false, errorMessage: String(err?.error?.error ?? err?.message ?? err) })),
        );
        }),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(next => this.stateSubject.next(next));
  }

  load(id: string) { if (this.snapshot.id !== id) this.patch({ id }); }
  setMode(mode: GameMode) { if (this.snapshot.mode !== mode) this.patch({ mode }); }
  toggleTracked() {
    const s = this.snapshot;
    if (s.status !== 'ready' || !s.item) return;
    this.trackedService.toggle({ id: s.item.id, iconLink: s.item.iconLink ?? null });
    this.patch({ tracked: this.trackedService.isTracked(s.item.id) });
  }
  private patch(patch: Partial<DetailsUiState>) { this.stateSubject.next({ ...this.snapshot, ...patch }); }
}
