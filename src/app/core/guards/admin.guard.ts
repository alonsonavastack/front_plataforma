import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUser();

  // Si el usuario está logueado y es admin, permite el acceso.
  if (authService.isLoggedIn() && currentUser?.rol === 'admin') {
    return true;
  }

  // Si no, redirige a la página de login.
  return router.createUrlTree(['/login']);
};
