// src/app/core/interceptors/auth-token.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const isAuth = /\/users\/login(_admin)?$/.test(req.url);
  if (isAuth) return next(req);

  const token = localStorage.getItem('adminToken') ?? localStorage.getItem('clientToken');
  if (token && req.headers && req.url.startsWith('http://localhost:3000/api')) {
    req = req.clone({ setHeaders: { token } });
  }
  return next(req);
};
