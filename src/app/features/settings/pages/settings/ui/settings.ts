import {Component, computed, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router, RouterModule} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {distinctUntilChanged, map} from 'rxjs';
import {AppLanguage, GameMode, SearchLanguage, SettingsService} from '../../../../../core/services/settings-service';
import {AuthService} from '../../../../../core/auth/auth.service';
import {TrackedItemsService} from '../../../../../core/services/items-tracked';
import {TPipe} from '../../../../../core/i18n/t.pipe';
import {I18nService} from '../../../../../core/i18n/i18n.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, TPipe],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
})
export class SettingsPage {
  private settings = inject(SettingsService);
  private auth = inject(AuthService);
  private tracked = inject(TrackedItemsService);
  private i18n = inject(I18nService);
  private router = inject(Router);

  private state = toSignal(this.settings.settings$, { initialValue: this.settings.snapshot });
  appLanguage = computed<AppLanguage>(() => this.state().appLanguage);
  searchLanguage = computed<SearchLanguage>(() => this.state().searchLanguage);
  mode = computed<GameMode>(() => this.state().mode);

  private authState = toSignal(this.auth.state$.pipe(distinctUntilChanged()), { initialValue: { status: 'guest' } as any });
  isAuthed = computed(() => this.authState()?.status === 'auth');
  isAdmin = computed(() => this.authState()?.status === 'auth' && this.authState().user?.role === 'admin');

  trackedCount = toSignal(this.tracked.tracked$.pipe(map(t => t.length)), { initialValue: 0 });

  setAppLanguage(lang: AppLanguage) { this.settings.setAppLanguage(lang); }
  setSearchLanguage(lang: SearchLanguage) { this.settings.setSearchLanguage(lang); }
  setMode(mode: GameMode) { this.settings.setMode(mode); }

  clearWatchlist() {
    if (this.trackedCount() === 0) return;
    if (confirm(this.i18n.t('settings.clearWatchlist.confirm'))) this.tracked.clear();
  }

  logout() { this.auth.logout(); this.router.navigateByUrl('/items'); }
}
