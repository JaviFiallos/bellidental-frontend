import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Profile } from '../auth/auth.models';
import { SessionStore } from '../auth/session.store';

/**
 * Protege rutas verificando que el perfil activo del usuario se encuentre
 * en la lista de perfiles permitidos. Si no lo está, redirige a su homeRoute.
 */
export function profileGuard(...allowedProfiles: Profile[]): CanActivateFn {
  return (): boolean | UrlTree => {
    const sessionStore = inject(SessionStore);
    const router = inject(Router);

    const userProfile = sessionStore.profile();
    if (userProfile && allowedProfiles.includes(userProfile)) {
      return true;
    }

    return router.createUrlTree([sessionStore.homeRoute()]);
  };
}
