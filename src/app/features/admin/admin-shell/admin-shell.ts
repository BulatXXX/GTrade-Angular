import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/auth/auth.service';
import { TPipe } from '../../../core/i18n/t.pipe';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, TPipe],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShellComponent {
  private auth = inject(AuthService);
  private state = toSignal(this.auth.state$, { initialValue: { status: 'guest' } as any });

  userName = computed(() => this.state()?.status === 'auth' ? this.state().user.name : 'Admin');

  navItems = [
    { labelKey: 'admin.nav.dashboard', path: '/admin/dashboard', icon: '◈' },
    { labelKey: 'admin.nav.catalog', path: '/admin/catalog', icon: '⊞' },
    { labelKey: 'admin.nav.prices', path: '/admin/prices', icon: '↑' },
    { labelKey: 'admin.nav.users', path: '/admin/users', icon: '◉' },
    { labelKey: 'admin.nav.notifications', path: '/admin/notifications', icon: '◎' },
    { labelKey: 'admin.nav.schedules', path: '/admin/schedules', icon: '⏱' },
  ];
}
