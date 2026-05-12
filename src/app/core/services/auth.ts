// core/services/auth.service.ts
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal, effect, Injector } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tap, catchError, of } from 'rxjs';
import { Router } from '@angular/router';
import { LoggerService } from './logger.service';
import { ToastService } from './toast.service';

export interface User {
  _id: string;
  rol: 'admin' | 'instructor' | 'cliente';
  name: string;
  surname: string;
  email: string;
  avatar?: string;
  phone?: string;
  profession?: string;
  description?: string;
  auth_provider?: 'local' | 'google';
  // ✅ REDES SOCIALES (campos planos desde el backend)
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  twitch?: string;
  website?: string;
  discord?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
  // ✅ REDES SOCIALES (objeto anidado - legacy)
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    twitch?: string;
    website?: string;
    discord?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
}

interface LoginResponse {
  USER: {
    token: string;
    user: User;
    profile?: any;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private injector = inject(Injector);
  private logger = inject(LoggerService);
  private toast = inject(ToastService);

  // 🔥 Timer para logout automático
  private logoutTimer: any = null;

  // Helper para acceso seguro a localStorage
  private getFromStorage(key: string, isJson = false): any {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = localStorage.getItem(key);
      if (!item) return null;
      try {
        return isJson ? JSON.parse(item) : item;
      } catch {
        return null;
      }
    }
    return null;
  }

  user = signal<User | null>(this.getFromStorage('user', true));
  token = signal<string | null>(this.getFromStorage('token'));

  isSessionLoaded = signal<boolean>(false);
  isAuthenticating = signal<boolean>(false);
  isLoggedIn = computed(() => !!this.user() && !!this.token());

  private sessionState = signal<{
    user: User | null;
    error: any;
    isLoading: boolean;
    isLoaded: boolean;
  }>({ user: null, error: null, isLoading: false, isLoaded: false });

  /**
   * ✅ Avatar inteligente:
   * - Si el avatar es una URL externa (http/https), úsala directamente (Google, Gravatar, etc.)
   * - Si el avatar es un nombre de archivo local, construye la URL del servidor
   * - Si no tiene avatar, usa un placeholder
   */
  currentUserAvatar = computed(() => {
    const user = this.user();

    const buildInitials = () => {
      if (!user) return 'U';
      const name = (user.name || '').trim();
      const surname = (user.surname || '').trim();
      if (name || surname) {
        const parts = `${name} ${surname}`.trim().split(/\s+/);
        const initials = parts.length === 1
          ? parts[0].charAt(0)
          : `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
        return initials.toUpperCase();
      }

      if (user.email) {
        const local = user.email.split('@')[0];
        const parts = local.split(/[._\-]/).filter(Boolean);
        const initials = parts.length
          ? parts.map(part => part.charAt(0)).join('').slice(0, 2)
          : local.charAt(0);
        return initials.toUpperCase();
      }

      return 'U';
    };

    if (!user?.avatar) {
      const initials = buildInitials();
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=a3e635&color=1e293b&bold=true&size=128`;
    }

    const avatar = user.avatar.trim();

    // Si ya es una URL completa (Google, Gravatar, etc.), usarla directamente
    if (/^https?:\/\//i.test(avatar)) {
      return avatar;
    }

    // Si es un nombre de archivo local, construir la URL del servidor
    return `${environment.images.user}${avatar}`;
  });

  constructor() {
    this.checkTokenOnLoad();

    effect(() => {
      const userValue = this.user();
      const tokenValue = this.token();

      if (typeof window !== 'undefined' && window.localStorage) {
        if (userValue && tokenValue) {
          localStorage.setItem('user', JSON.stringify(userValue));
          localStorage.setItem('token', tokenValue);
        } else {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
    });

    effect(() => {
      const state = this.sessionState();
      this.isAuthenticating.set(state.isLoading);

      if (state.isLoaded) {
        if (state.user) {
          this.user.set(state.user);
        } else if (state.error) {
          this.token.set(null);
          this.user.set(null);
        }
        this.isSessionLoaded.set(true);
      }
    });

    setTimeout(() => {
      this.verifyStoredSession();
    }, 0);

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          const currentToken = this.getFromStorage('token');
          const currentUserJson = this.getFromStorage('user', true);

          if (!currentToken || !currentUserJson) {
            if (this.token() || this.user()) {
              this.token.set(null);
              this.user.set(null);
              this.router.navigate(['/login'], { queryParams: { sessionExpired: 'true' } });
            }
          } else {
            this.checkTokenOnLoad();
          }
        }
      });
    }
  }

  private checkTokenOnLoad(): void {
    const token = this.token();
    if (!token) return;

    try {
      const payload = this.decodeTokenPayload(token);
      if (!payload) {
        this.forceLogout('Token inválido');
        return;
      }

      const now = Date.now();
      const exp = payload.exp * 1000;
      const isExpired = now > exp;

      if (isExpired) {
        this.forceLogout('Tu sesión ha expirado');
      } else {
        const expiresIn = exp - now;
        this.scheduleLogoutOnExpiration(expiresIn);
      }
    } catch (error) {
      this.forceLogout('Error de autenticación');
    }
  }

  private scheduleLogoutOnExpiration(expiresIn: number): void {
    if (this.logoutTimer) clearTimeout(this.logoutTimer);

    const MAX_TIMEOUT = 2147483647;

    if (expiresIn > MAX_TIMEOUT) {
      this.logoutTimer = setTimeout(() => {
        this.checkTokenOnLoad();
      }, MAX_TIMEOUT);
    } else {
      this.logoutTimer = setTimeout(() => {
        this.forceLogout('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
      }, expiresIn);
    }
  }

  private decodeTokenPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(atob(parts[1]));
    } catch (error) {
      return null;
    }
  }

  private forceLogout(message: string): void {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }

    this.token.set(null);
    this.user.set(null);

    import('./purchases.service').then(module => {
      const purchasesService = this.injector.get(module.PurchasesService);
      purchasesService.clearPurchases();
    });

    this.toast.warning('Sesión expirada', message);
    this.router.navigate(['/login'], { queryParams: { sessionExpired: 'true' } });
  }

  private verifyStoredSession() {
    const token = this.token();
    const storedUser = this.user();

    if (token && storedUser) {
      this.isAuthenticating.set(true);

      this.http.get<{ user: User, profile?: any }>(`${environment.url}users/profile`)
        .pipe(
          catchError((error) => {
            if (error.status === 401 || error.status === 403) {
              this.token.set(null);
              this.user.set(null);
            }
            return of(null);
          })
        )
        .subscribe({
          next: (response) => {
            if (response) {
              if (response.profile) {
                this.user.set(response.profile as User);
              } else if (response.user) {
                this.user.set(response.user as User);
              }

              import('./wallet.service').then(module => {
                const walletService = this.injector.get(module.WalletService);
                walletService.loadWallet();
              });
            }
          },
          complete: () => {
            this.isSessionLoaded.set(true);
            this.isAuthenticating.set(false);
          }
        });
    } else {
      this.isSessionLoaded.set(true);
    }
  }

  login(email: string, password: string) {
    this.isAuthenticating.set(true);

    return this.http.post<LoginResponse>(`${environment.url}users/login`, { email, password })
      .pipe(
        tap(response => {
          const { token, user, profile } = response.USER;
          const fullUser = { ...user, ...profile };

          this.token.set(token);
          this.user.set(fullUser as User);

          this.toast.success(
            `¡Bienvenido ${fullUser.name}!`,
            fullUser.rol === 'admin' ? 'Acceso como administrador' :
              fullUser.rol === 'instructor' ? 'Acceso como instructor' :
                'Has iniciado sesión correctamente'
          );

          import('./purchases.service').then(module => {
            const purchasesService = this.injector.get(module.PurchasesService);
            purchasesService.loadPurchasedProducts();
          });

          setTimeout(() => {
            if (user.rol === 'admin' || user.rol === 'instructor') {
              this.router.navigate(['/dashboard']);
            } else {
              this.router.navigate(['/']);
            }
          }, 100);
        }),
        catchError(error => {
          this.isAuthenticating.set(false);
          throw error;
        }),
        tap(() => this.isAuthenticating.set(false))
      );
  }

  /**
   * ✅ Login con Google:
   * - Envía el credential token de Google al backend
   * - El backend verifica, crea o vincula la cuenta, y retorna JWT propio
   * - Se construye fullUser combinando user + profile (compatibilidad con login normal)
   * - Se cargan las compras del usuario automáticamente
   */
  googleLogin(googleToken: string, rol?: string) {
    this.isAuthenticating.set(true);

    return this.http.post<LoginResponse>(`${environment.url}users/google-login`, { token: googleToken, rol })
      .pipe(
        tap(response => {
          const { token, user, profile } = response.USER;
          // Combinar user y profile igual que en login normal
          // profile puede venir undefined si el backend solo manda user (compatibilidad)
          const fullUser: User = { ...user, ...(profile || {}) };

          this.token.set(token);
          this.user.set(fullUser);

          this.toast.success(
            `¡Bienvenido ${fullUser.name}!`,
            'Has iniciado sesión con Google'
          );

          // Cargar compras del usuario
          import('./purchases.service').then(module => {
            const purchasesService = this.injector.get(module.PurchasesService);
            purchasesService.loadPurchasedProducts();
          });

          // Cargar billetera
          import('./wallet.service').then(module => {
            const walletService = this.injector.get(module.WalletService);
            walletService.loadWallet();
          });

          setTimeout(() => {
            if (fullUser.rol === 'admin' || fullUser.rol === 'instructor') {
              this.router.navigate(['/dashboard']);
            } else {
              this.router.navigate(['/']);
            }
          }, 100);
        }),
        catchError(error => {
          this.isAuthenticating.set(false);
          throw error;
        }),
        tap(() => this.isAuthenticating.set(false))
      );
  }

  logout() {
    this.token.set(null);
    this.user.set(null);

    import('./purchases.service').then(module => {
      const purchasesService = this.injector.get(module.PurchasesService);
      purchasesService.clearPurchases();
    });

    this.toast.info('Sesión cerrada', 'Has cerrado sesión correctamente');
    this.router.navigate(['/']);
  }

  updateUser(updatedUser: User): void {
    this.user.set(updatedUser);
  }

  register(userData: any) {
    this.isAuthenticating.set(true);
    return this.http.post<LoginResponse>(`${environment.url}users/register`, userData)
      .pipe(
        tap(response => {
          if (response.USER) {
            const { token, user, profile } = response.USER;
            const fullUser: User = { ...user, ...(profile || {}) };

            this.token.set(token);
            this.user.set(fullUser);

            this.toast.success(
              '¡Registro exitoso!',
              `Bienvenido ${fullUser.name}, tu cuenta ha sido creada`
            );

            import('./purchases.service').then(module => {
              const purchasesService = this.injector.get(module.PurchasesService);
              purchasesService.loadPurchasedProducts();
            });

            setTimeout(() => {
              if (user.rol === 'admin' || user.rol === 'instructor') {
                this.router.navigate(['/dashboard']);
              } else {
                this.router.navigate(['/']);
              }
            }, 100);
          }
        }),
        catchError(error => {
          this.isAuthenticating.set(false);
          throw error;
        }),
        tap(() => this.isAuthenticating.set(false))
      );
  }

  verifyOtp(userId: string, code: string) {
    return this.http.post<LoginResponse>(`${environment.url}users/verify-otp`, { userId, code })
      .pipe(
        tap(response => {
          if (response.USER) {
            const { token, user, profile } = response.USER;
            const fullUser = { ...user, ...(profile || {}) };

            this.token.set(token);
            this.user.set(fullUser as User);

            this.toast.success(
              '¡Cuenta verificada!',
              `Bienvenido ${fullUser.name}, tu cuenta ha sido verificada`
            );

            import('./purchases.service').then(module => {
              const purchasesService = this.injector.get(module.PurchasesService);
              purchasesService.loadPurchasedProducts();
            });

            setTimeout(() => {
              if (user.rol === 'admin' || user.rol === 'instructor') {
                this.router.navigate(['/dashboard']);
              } else {
                this.router.navigate(['/']);
              }
            }, 100);
          }
        }),
        catchError(error => {
          this.toast.error('Código inválido', 'El código de verificación es incorrecto o ha expirado');
          throw error;
        })
      );
  }

  resendOtp(userId: string) {
    return this.http.post(`${environment.url}users/resend-otp`, { userId })
      .pipe(
        tap(() => {
          this.toast.info('Código enviado', 'Revisa tu correo electrónico');
        }),
        catchError(error => {
          this.toast.error('Error al reenviar', 'No se pudo reenviar el código de verificación');
          throw error;
        })
      );
  }

  hasRole(role: string): boolean {
    return this.user()?.rol === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const userRole = this.user()?.rol;
    return userRole ? roles.includes(userRole) : false;
  }

  becomeInstructor(data: any) {
    this.isAuthenticating.set(true);

    return this.http.put<LoginResponse>(`${environment.url}users/become-instructor`, data)
      .pipe(
        tap(response => {
          const { token, user, profile } = response.USER;
          const fullUser: User = { ...user, ...(profile || {}) };

          this.token.set(token);
          this.user.set(fullUser);

          this.toast.success(
            '¡Felicidades!',
            'Ahora tienes acceso como Instructor'
          );

          // Recargar el navbar u otros componentes si es necesario
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 500);
        }),
        catchError(error => {
          this.isAuthenticating.set(false);
          this.toast.error('Error', error.error?.message || 'No se pudo actualizar tu perfil');
          throw error;
        }),
        tap(() => this.isAuthenticating.set(false))
      );
  }
}
