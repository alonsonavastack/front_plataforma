import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si el usuario ha iniciado sesión (sin importar el rol), permite el acceso.
  if (authService.isLoggedIn()) {
    return true;
  }

  // Si no, redirige a la página de login.
  return router.createUrlTree(['/login']);
};
