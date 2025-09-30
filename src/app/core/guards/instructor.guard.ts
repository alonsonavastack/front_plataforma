import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const instructorGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.user();

  // Si el usuario está logueado y es instructor, permite el acceso.
  if (authService.isLoggedIn() && currentUser?.rol === 'instructor') {
    return true;
  }

  // Si no, redirige a la página de login.
  return router.createUrlTree(['/login']);
};
