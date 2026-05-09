import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthed) {
    return router.createUrlTree(['/auth/login']);
  }
  if (!auth.isAdmin) {
    return router.createUrlTree(['/items']);
  }
  return true;
};
