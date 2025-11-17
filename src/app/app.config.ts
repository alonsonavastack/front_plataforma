import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from "@angular/core";
import { provideRouter, withHashLocation } from "@angular/router";

import { routes } from "./app.routes";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { authTokenInterceptor } from "./core/interceptor/auth-token-interceptor";
import { errorInterceptor } from "./core/interceptor/error.interceptor";
import { GlobalErrorHandler } from "./core/handlers/global-error.handler";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
    // ✅ Interceptores HTTP (errorInterceptor primero)
    provideHttpClient(withInterceptors([errorInterceptor, authTokenInterceptor])),
    // ✅ Manejador global de errores (captura TODO)
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
