import {Component, DestroyRef, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {ItemSearchViewModel, GameFilter} from '../item-search-view-model';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './items-search.html',
  styleUrl: './items-search.scss',
})
export class ItemsSearch {
  private vm = inject(ItemSearchViewModel);
  private destroyRef = inject(DestroyRef);
  query = new FormControl(this.vm.getState.query, { nonNullable: true });
  viewModel$ = this.vm.state$;
  history$ = this.vm.history$;
  games: Array<{code: GameFilter; label: string}> = [
    { code: 'all', label: 'All games' },
    { code: 'tarkov', label: 'Tarkov' },
    { code: 'warframe', label: 'Warframe' },
    { code: 'eve', label: 'EVE Online' },
  ];

  constructor() {
    this.query.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(v => this.vm.setQuery(v));
  }

  setGame(game: GameFilter) { this.vm.setGame(game); }
  clearHistory() { this.vm.clearHistory(); }
  get isQueryEmpty(): boolean { return this.query.value.trim().length === 0; }
  placeholder = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
}
