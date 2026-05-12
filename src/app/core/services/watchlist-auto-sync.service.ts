import {DestroyRef, inject, Injectable} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {EMPTY} from 'rxjs';
import {catchError, debounceTime, distinctUntilChanged, filter, finalize, map, switchMap, tap} from 'rxjs/operators';
import {AuthService} from '../auth/auth.service';
import {TrackedItem} from '../models/item';
import {normalizeTracked} from '../util/sync.diff';
import {TrackedItemsService} from './items-tracked';
import {SyncService} from './sync.service';

@Injectable({ providedIn: 'root' })
export class WatchlistAutoSyncService {
  private readonly auth = inject(AuthService);
  private readonly tracked = inject(TrackedItemsService);
  private readonly sync = inject(SyncService);
  private readonly destroyRef = inject(DestroyRef);

  private isHydrated = !this.auth.isAuthed;
  private lastSyncedSignature = '';

  constructor() {
    this.auth.state$
      .pipe(
        map(state => state.status === 'auth'),
        distinctUntilChanged(),
        switchMap(isAuthed => {
          if (!isAuthed) {
            this.isHydrated = true;
            this.lastSyncedSignature = '';
            return EMPTY;
          }

          this.isHydrated = false;

          return this.sync.sync('merge').pipe(
            tap(items => {
              this.lastSyncedSignature = this.signature(items);
            }),
            catchError(() => EMPTY),
            finalize(() => {
              this.isHydrated = true;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.tracked.tracked$
      .pipe(
        map(items => this.signature(items)),
        debounceTime(400),
        distinctUntilChanged(),
        filter(() => this.auth.isAuthed && this.isHydrated),
        filter(signature => signature !== this.lastSyncedSignature),
        switchMap(() =>
          this.sync.pushLocalToServer().pipe(
            tap(items => {
              this.lastSyncedSignature = this.signature(items);
            }),
            catchError(() => EMPTY),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private signature(items: TrackedItem[]): string {
    return JSON.stringify((items ?? []).map(normalizeTracked));
  }
}
