import {Component, computed, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {distinctUntilChanged, map} from 'rxjs';
import {Mode, ProfileViewModel} from '../profile-view-model';
import {SettingsService} from '../../../../../core/services/settings-service';
import {AuthService} from '../../../../../core/auth/auth.service';
import {TrackedItemsService} from '../../../../../core/services/items-tracked';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
  providers: [ProfileViewModel],
})
export class Profile {
  private vm = inject(ProfileViewModel);
  private settings = inject(SettingsService);
  private auth = inject(AuthService);
  private tracked = inject(TrackedItemsService);
  rows = toSignal(this.vm.rows$, { initialValue: [] });
  isEmpty = computed(() => this.rows().length === 0);
  mode = toSignal(this.settings.settings$.pipe(map(s => (s.mode as Mode) ?? 'pvp'), distinctUntilChanged()), { initialValue: 'pvp' as Mode });
  private authState = toSignal(this.auth.state$, { initialValue: { status: 'guest' } as any });
  isAuthed = computed(() => this.authState()?.status === 'auth');
  userName = computed(() => (this.authState()?.status === 'auth' ? this.authState().user.name : 'Guest'));
  setMode(mode: Mode) { this.settings.setMode(mode); }
  remove(id: string) { this.tracked.remove(id); }
  clear() { this.tracked.clear(); }
  logout() { this.auth.logout(); }
  placeholder = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
}
