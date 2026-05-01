import {Routes} from '@angular/router';
import {NotFoundComponent} from './layout/not-found';
import {AuthLoginPage} from './features/auth/auth-login.page/auth-login.page';
import {AuthRegisterPage} from './features/auth/auth-register.page/auth-register.page';
import {PasswordResetRequestPage} from './features/auth/password-reset-request.page';
import {PasswordResetConfirmPage} from './features/auth/password-reset-confirm.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'items' },
  { path: 'items', loadComponent: () => import('./features/items/pages/items-search/ui/items-search').then(m => m.ItemsSearch) },
  { path: 'items/:id', loadComponent: () => import('./features/items/pages/item-details/ui/item-details').then(m => m.ItemDetailsPage) },
  { path: 'profile', loadComponent: () => import('./features/profile/pages/profile/ui/profile').then(m => m.Profile) },
  { path: 'auth/login', component: AuthLoginPage },
  { path: 'auth/register', component: AuthRegisterPage },
  { path: 'auth/password-reset', component: PasswordResetRequestPage },
  { path: 'auth/password-reset/confirm', component: PasswordResetConfirmPage },
  { path: '**', component: NotFoundComponent },
];
