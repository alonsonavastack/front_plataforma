import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const customerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.user();

  // Si el usuario está logueado Y es un cliente, permite el acceso.
  if (authService.isLoggedIn() && currentUser?.rol === 'cliente') {
    return true;
  }

  // Si no está logueado, o si está logueado pero no es un cliente,
  // lo redirigimos a la página de login.
  return router.createUrlTree(['/login']);
};
