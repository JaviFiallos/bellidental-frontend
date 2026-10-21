import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SessionStore } from '../auth/session.store';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const sessionStore = inject(SessionStore);
  const router = inject(Router);

  return authService.restoreSession().pipe(
    map((hasSession) => (hasSession ? router.createUrlTree([sessionStore.homeRoute()]) : true))
  );
};
