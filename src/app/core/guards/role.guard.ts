import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, take, filter } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

/**
 * Función de fábrica para crear un guardián de roles.
 * @param allowedRoles - Un array de roles permitidos para la ruta.
 * @returns Una función CanActivateFn que protege la ruta.
 */
export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Convertimos la señal `currentUser` a un Observable.
    // `isSessionLoaded` nos dirá si la carga inicial ha terminado (con éxito o error).
    return toObservable(authService.isSessionLoaded).pipe(
      // filter(isLoaded => isLoaded) espera hasta que isSessionLoaded sea `true`.
      // Esto detiene al guardián hasta que la llamada a /users/profile termine.
      filter(isLoaded => isLoaded),
      take(1), // Tomamos solo el primer valor `true` para no dejar la suscripción abierta.
      map(() => {
        const currentUser = authService.user();

        // Una vez que la sesión está cargada, verificamos el rol.
        if (currentUser && allowedRoles.includes(currentUser.rol)) {
          return true; // El usuario tiene el rol correcto, permitir acceso.
        } else {
          // Si no hay usuario o el rol no es correcto, redirigir a login.
          return router.createUrlTree(['/login']);
        }
      })
    );
  };
}
