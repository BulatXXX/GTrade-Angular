import {Component, computed, DestroyRef, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {GameFilter, ProfileViewModel} from '../profile-view-model';
import {AuthService} from '../../../../../core/auth/auth.service';
import {TrackedItemsService} from '../../../../../core/services/items-tracked';
import {TPipe} from '../../../../../core/i18n/t.pipe';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TPipe],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
  providers: [ProfileViewModel],
})
export class Profile {
  private vm = inject(ProfileViewModel);
  private auth = inject(AuthService);
  private tracked = inject(TrackedItemsService);
  private destroyRef = inject(DestroyRef);

  rows = toSignal(this.vm.rows$, { initialValue: [] });
  trackedItems = toSignal(this.tracked.tracked$, { initialValue: [] });
  isWatchlistEmpty = computed(() => this.trackedItems().length === 0);
  isFilteredEmpty = computed(() => !this.isWatchlistEmpty() && this.rows().length === 0);
  gameFilter = toSignal(this.vm.gameFilter$, { initialValue: 'all' as GameFilter });
  query = new FormControl('', { nonNullable: true });

  private authState = toSignal(this.auth.state$, { initialValue: { status: 'guest' } as any });
  isAuthed = computed(() => this.authState()?.status === 'auth');
  userName = computed(() => (this.authState()?.status === 'auth' ? this.authState().user.name : 'Guest'));

  games: Array<{ code: GameFilter; labelKey: string }> = [
    { code: 'all', labelKey: 'profile.games.all' },
    { code: 'tarkov', labelKey: 'profile.games.tarkov' },
    { code: 'warframe', labelKey: 'profile.games.warframe' },
    { code: 'eve', labelKey: 'profile.games.eve' },
  ];

  constructor() {
    this.query.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(v => this.vm.setQuery(v));
  }

  setGame(g: GameFilter) { this.vm.setGameFilter(g); }
  remove(id: string) { this.tracked.remove(id); }
  placeholder = 'assets/item-placeholder.svg';

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement | null;
    if (!img || img.src.endsWith(this.placeholder)) return;
    img.src = this.placeholder;
  }
}
