import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth/admin.guard';
import { AdminShellComponent } from './admin-shell/admin-shell';

export const routes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/admin-dashboard/admin-dashboard').then(m => m.AdminDashboardPage),
      },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./pages/admin-catalog-list/admin-catalog-list').then(m => m.AdminCatalogListPage),
      },
      {
        path: 'catalog/:id',
        loadComponent: () =>
          import('./pages/admin-catalog-edit/admin-catalog-edit').then(m => m.AdminCatalogEditPage),
      },
      {
        path: 'prices',
        loadComponent: () =>
          import('./pages/admin-prices-sync/admin-prices-sync').then(m => m.AdminPricesSyncPage),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/admin-users/admin-users').then(m => m.AdminUsersPage),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/admin-notifications/admin-notifications').then(m => m.AdminNotificationsPage),
      },
    ],
  },
];
