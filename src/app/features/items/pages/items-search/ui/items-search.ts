import {Component, DestroyRef, effect, ElementRef, HostListener, inject, signal, viewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {ItemSearchViewModel, GameFilter} from '../item-search-view-model';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TPipe} from '../../../../../core/i18n/t.pipe';
@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TPipe],
  templateUrl: './items-search.html',
  styleUrl: './items-search.scss',
})
export class ItemsSearch {
  private vm = inject(ItemSearchViewModel);
  private destroyRef = inject(DestroyRef);
  query = new FormControl(this.vm.getState.query, { nonNullable: true });
  viewModel$ = this.vm.state$;
  history$ = this.vm.history$;
  sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  games: Array<{code: GameFilter; labelKey: string}> = [
    { code: 'all', labelKey: 'profile.games.all' },
    { code: 'tarkov', labelKey: 'profile.games.tarkov' },
    { code: 'warframe', labelKey: 'profile.games.warframe' },
    { code: 'eve', labelKey: 'profile.games.eve' },
  ];

  constructor() {
    this.query.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(v => this.vm.setQuery(v));

    effect((onCleanup) => {
      const ref = this.sentinel();
      if (!ref) return;
      const observer = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) this.vm.loadMore();
      }, { rootMargin: '300px 0px' });
      observer.observe(ref.nativeElement);
      onCleanup(() => observer.disconnect());
    });
  }

  setGame(game: GameFilter) { this.vm.setGame(game); }
  clearHistory() { this.vm.clearHistory(); }
  loadMore() { this.vm.loadMore(); }
  get isQueryEmpty(): boolean { return this.query.value.trim().length === 0; }
  placeholder = 'assets/item-placeholder.svg';

  showScrollTop = signal(false);
  isHeaderStuck = signal(false);

  @HostListener('window:scroll')
  onWindowScroll() {
    const y = window.scrollY;
    this.showScrollTop.set(y > 480);
    this.isHeaderStuck.set(y > 40);
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.src.endsWith(this.placeholder)) return;
    img.src = this.placeholder;
  }
}
