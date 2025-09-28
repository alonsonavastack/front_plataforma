import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from "@angular/core";
import { provideRouter } from "@angular/router";

import { routes } from "./app.routes";
import { HttpInterceptorFn, provideHttpClient, withInterceptors } from "@angular/common/http";
import { AuthService } from "./core/services/auth";

const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.clientToken();

  if (!token) {
    return next(req);
  }

  const clonedReq = req.clone({ headers: req.headers.set('token', token) });
  return next(clonedReq);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
