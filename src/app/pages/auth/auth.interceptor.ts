import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../core/services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Inyectamos el servicio de autenticación
  const authService = inject(AuthService);
  // Obtenemos el token desde la señal reactiva del servicio
  const token = authService.clientToken();

  // Si no hay token, dejamos pasar la petición sin modificarla.
  if (!token) {
    return next(req);
  }

  // Si hay token, clonamos la petición y añadimos la cabecera 'token' que espera la API.
  const clonedReq = req.clone({
    headers: req.headers.set('token', token),
  });

  // Pasamos la petición clonada al siguiente manejador.
  return next(clonedReq);
};
