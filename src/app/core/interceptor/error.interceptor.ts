import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ToastService } from '../services/toast.service';
import { environment } from '../../../environments/environment';

/**
 * Interceptor que captura TODOS los errores HTTP
 * Maneja errores de autenticación (401/403) automáticamente
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      // 🔥 MANEJAR ERRORES DE AUTENTICACIÓN
      if (error.status === 401 || error.status === 403) {


        // 🎯 DISTINGUIR entre error de autenticación y validación de negocio
        const isBusinessValidation = error.error?.message_text &&
          error.error?.message === 403 &&
          (error.error?.blockedBy || error.error?.count !== undefined);

        const isAuthError = error.error?.message === 'NO ESTA PERMITIDO VISITAR ESTA PÁGINA' ||
          error.error?.message === 'EL TOKEN ES INVÁLIDO' ||
          error.error?.message === 'No se proporcionó un token de autenticación.' ||
          error.error?.message === 'Formato de token inválido. Se esperaba "Bearer <token>".';

        // Solo hacer logout si NO es la petición de login/profile y SI es un error de autenticación
        const isLoginRequest = req.url.includes('/login');
        const isProfileRequest = req.url.includes('/profile');
        const isVerifyOtpRequest = req.url.includes('/verify-otp');

        if (!isLoginRequest && !isProfileRequest && !isVerifyOtpRequest) {
          // 🔒 Solo cerrar sesión si es un error de AUTENTICACIÓN, no de validación de negocio
          if (isAuthError || (error.status === 401 && !isBusinessValidation)) {
            // Limpiar localStorage
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }

            // Mostrar toast
            toast.warning(
              'Sesión expirada',
              'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
            );

            // Redirigir a login
            setTimeout(() => {
              router.navigate(['/login'], {
                queryParams: { sessionExpired: 'true' }
              });
            }, 500);
          } else if (isBusinessValidation) {
            // ✅ Es una validación de negocio, NO hacer logout
            // El componente manejará el mensaje

          }
        }
      }

      // 🔥 MANEJAR RATE LIMITING (429)
      if (error.status === 429) {
        const retryAfter = error.error?.retryAfter || 60;
        const minutes = Math.ceil(retryAfter / 60);

        toast.warning(
          'Demasiadas peticiones',
          `Por favor espera ${minutes} minuto${minutes > 1 ? 's' : ''} antes de intentar nuevamente.`
        );
      }

      // 🔥 MANEJAR ERROR DE RED (0)
      if (error.status === 0) {
        toast.networkError();
      }

      // 🔥 MANEJAR ERROR DE SERVIDOR (500)
      if (error.status === 500) {
        toast.serverError();
      }

      // Re-lanzar el error para que los servicios puedan manejarlo
      return throwError(() => error);
    })
  );
};
