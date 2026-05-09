import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShellComponent {
  private auth = inject(AuthService);
  private state = toSignal(this.auth.state$, { initialValue: { status: 'guest' } as any });

  userName = computed(() => this.state()?.status === 'auth' ? this.state().user.name : 'Admin');

  navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: '◈' },
    { label: 'Catalog', path: '/admin/catalog', icon: '⊞' },
    { label: 'Prices', path: '/admin/prices', icon: '↑' },
    { label: 'Users', path: '/admin/users', icon: '◉' },
    { label: 'Notifications', path: '/admin/notifications', icon: '◎' },
  ];
}
