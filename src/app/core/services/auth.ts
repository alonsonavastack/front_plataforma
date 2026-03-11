// core/services/auth.service.ts
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal, effect, Injector } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tap, catchError, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { LoggerService } from './logger.service';
import { ToastService } from './toast.service';

export interface User {
  _id: string;
  rol: 'admin' | 'instructor' | 'cliente'; // 'cliente' en backend, NO 'customer'
  name: string;
  surname: string;
  email: string;
  avatar?: string;
  phone?: string;
  profession?: string;
  description?: string;
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

  // Signals inicializados de forma segura
  // Unificamos el estado de la sesión
  user = signal<User | null>(this.getFromStorage('user', true));
  token = signal<string | null>(this.getFromStorage('token'));

  isSessionLoaded = signal<boolean>(false);
  isAuthenticating = signal<boolean>(false);
  isLoggedIn = computed(() => !!this.user() && !!this.token());

  // Estado para la verificación de la sesión, siguiendo el patrón httpResource
  private sessionState = signal<{
    user: User | null;
    error: any;
    isLoading: boolean;
    isLoaded: boolean;
  }>({ user: null, error: null, isLoading: false, isLoaded: false });

  // Computed signal para construir la URL del avatar de forma segura
  currentUserAvatar = computed(() => {
    const user = this.user();
    if (user?.avatar) {
      return `${environment.images.user}${user.avatar}`;
    }
    return 'https://i.pravatar.cc/128'; // Fallback
  });

  constructor() {
    // 🔥 VERIFICACIÓN INMEDIATA AL CARGAR LA APP
    this.checkTokenOnLoad();

    // Effect para sincronizar localStorage cuando cambien los signals
    effect(() => {
      const userValue = this.user();
      const tokenValue = this.token();

      if (typeof window !== 'undefined' && window.localStorage) {
        if (userValue && tokenValue) {
          localStorage.setItem('user', JSON.stringify(userValue));
          localStorage.setItem('token', tokenValue);
          // 🔇 Logs silenciados - solo toasts para usuario
        } else {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          // 🔇 Logs silenciados - solo toasts para usuario
        }
      }
    });

    // Efecto para manejar el resultado de la verificación de sesión
    effect(() => {
      const state = this.sessionState();
      this.isAuthenticating.set(state.isLoading);

      if (state.isLoaded) {
        if (state.user) {
          // Sesión válida, actualizamos el usuario
          this.user.set(state.user);
          // 🔇 Logs silenciados - solo toasts para usuario
        } else if (state.error) {
          // Error de autenticación (401/403), limpiamos la sesión
          // 🔇 Logs silenciados - solo toasts para usuario
          this.token.set(null);
          this.user.set(null);
        }
        // Si no hay error ni usuario, es porque no había token, no hacemos nada.
        this.isSessionLoaded.set(true);
      }
    });

    // La verificación de la sesión se inicia de forma asíncrona para evitar
    // dependencias circulares con HttpClient y sus interceptores.
    setTimeout(() => {
      this.verifyStoredSession();
    }, 0);

    // 🔥 Escuchar cuando el usuario regresa a la pestaña (por si el token expiró o se cerró sesión en otra)
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          // Verificar localStorage nuevamente de forma silenciosa
          const currentToken = this.getFromStorage('token');
          const currentUserJson = this.getFromStorage('user', true);

          if (!currentToken || !currentUserJson) {
            // Si ya no hay token (cerró sesión en otra pestaña) o se borró
            if (this.token() || this.user()) {
              this.token.set(null);
              this.user.set(null);
              this.router.navigate(['/login'], { queryParams: { sessionExpired: 'true' } });
            }
          } else {
            // Si el token aún existe, revalidar su expiración sin golpear la API
            this.checkTokenOnLoad();
          }
        }
      });
    }
  }

  // 🔥 MÉTODOS DE GESTIÓN AUTOMÁTICA DE SESIÓN

  /**
   * Verifica el token inmediatamente al cargar la página
   * Si el token ya expiró, hace logout inmediato
   */
  private checkTokenOnLoad(): void {
    const token = this.token();

    if (!token) {
      return; // No hay token, no hacer nada
    }

    try {
      const payload = this.decodeTokenPayload(token);

      if (!payload) {

        this.forceLogout('Token inválido');
        return;
      }

      const now = Date.now();
      const exp = payload.exp * 1000; // Convertir a millisegundos
      const isExpired = now > exp;

      if (isExpired) {

        this.forceLogout('Tu sesión ha expirado');
      } else {
        // Token válido, programar logout para cuando expire
        const expiresIn = exp - now;

        this.scheduleLogoutOnExpiration(expiresIn);
      }
    } catch (error) {

      this.forceLogout('Error de autenticación');
    }
  }

  private scheduleLogoutOnExpiration(expiresIn: number): void {
    // Limpiar timer anterior si existe
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }

    // El límite máximo para setTimeout es un entero de 32 bits (aprox 24.8 días).
    // Si expiresIn es mayor, setTimeout fallará silenciosamente y se ejecutará de inmediato.
    const MAX_TIMEOUT = 2147483647;

    if (expiresIn > MAX_TIMEOUT) {
      // Si el tiempo excede el máximo, programamos el timer para el máximo.
      // Cuando despierte, volverá a evaluar cuánto falta.
      this.logoutTimer = setTimeout(() => {
        this.checkTokenOnLoad();
      }, MAX_TIMEOUT);
    } else {
      // Programar logout para cuando expire el token
      this.logoutTimer = setTimeout(() => {
        this.forceLogout('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
      }, expiresIn);
    }
  }

  /**
   * Decodifica el payload del JWT sin verificar la firma
   * @param token JWT token
   * @returns Payload decodificado o null si es inválido
   */
  private decodeTokenPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      return JSON.parse(atob(parts[1]));
    } catch (error) {
      return null;
    }
  }

  /**
   * Fuerza el logout inmediato sin preguntar
   * Se usa cuando el token expira o es inválido
   * @param message Mensaje a mostrar al usuario
   */
  private forceLogout(message: string): void {


    // Limpiar timer si existe
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }

    // Limpiar signals
    this.token.set(null);
    this.user.set(null);

    // Limpiar compras
    import('./purchases.service').then(module => {
      const purchasesService = this.injector.get(module.PurchasesService);
      purchasesService.clearPurchases();
    });

    // Mostrar toast
    this.toast.warning('Sesión expirada', message);

    // Redirigir a login
    this.router.navigate(['/login'], {
      queryParams: { sessionExpired: 'true' }
    });
  }

  private verifyStoredSession() {
    const token = this.token();
    const storedUser = this.user();

    if (token && storedUser) {
      // 🔇 Logs silenciados - solo toasts para usuario
      this.isAuthenticating.set(true);

      this.http.get<{ user: User, profile?: any }>(`${environment.url}users/profile`)
        .pipe(
          catchError((error) => {
            // 🔇 Logs silenciados - solo toasts para usuario

            // Solo limpiar la sesión si es un error de autenticación (401)
            // Para otros errores, mantener la sesión almacenada
            if (error.status === 401 || error.status === 403) {
              // 🔇 Logs silenciados - solo toasts para usuario
              this.token.set(null);
              this.user.set(null);
            } else {
              // Para errores de red u otros, mantener los datos actuales
              // 🔇 Logs silenciados - solo toasts para usuario
            }
            return of(null);
          })
        )
        .subscribe({
          next: (response) => {
            if (response) {
              // El backend devuelve { user: { _id, rol }, profile: { ...datos completos } }
              // Necesitamos combinar ambos para tener el objeto User completo
              if (response.profile) {
                // response.profile ya contiene toda la información incluyendo _id y rol
                const userToSet = response.profile as User;
                // 🔇 Logs silenciados - solo toasts para usuario
                this.user.set(userToSet);
              } else if (response.user) {
                // Fallback si solo viene el user básico
                // 🔇 Logs silenciados - solo toasts para usuario
                this.user.set(response.user as User);
              }

              // 🔥 Cargar billetera cuando se verifica la sesión almacenada
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
      // No hay token, marcar como cargado inmediatamente
      // 🔇 Logs silenciados - solo toasts para usuario
      this.isSessionLoaded.set(true);
    }
  }

  login(email: string, password: string) {
    // 🔇 Logs silenciados - solo toasts para usuario
    this.isAuthenticating.set(true);

    return this.http.post<LoginResponse>(`${environment.url}users/login`, { email, password })
      .pipe(
        tap(response => {
          // ℹ️ El interceptor ya logueó la petición HTTP exitosa

          const { token, user, profile } = response.USER;
          const fullUser = { ...user, ...profile };

          this.token.set(token);
          this.user.set(fullUser as User);

          // 🔇 Logs silenciados - solo toasts para usuario

          // ✅ Toast de bienvenida (usar fullUser que tiene todos los datos)
          this.toast.success(
            `¡Bienvenido ${fullUser.name}!`,
            fullUser.rol === 'admin' ? 'Acceso como administrador' :
              fullUser.rol === 'instructor' ? 'Acceso como instructor' :
                'Has iniciado sesión correctamente'
          );

          // Cargar las compras del usuario después del login
          // Importamos PurchasesService de manera lazy para evitar dependencias circulares
          import('./purchases.service').then(module => {
            const purchasesService = this.injector.get(module.PurchasesService);
            purchasesService.loadPurchasedProducts();
          });

          // 🔥 Navegación basada en rol SOLO en login manual (no en refresh)
          setTimeout(() => {
            if (user.rol === 'admin' || user.rol === 'instructor') {
              this.router.navigate(['/dashboard']);
            } else {
              this.router.navigate(['/']);
            }
          }, 100);
        }),
        catchError(error => {
          // 🔇 Logs silenciados - solo toasts para usuario
          // ✅ NO mostrar toast aquí - se maneja en el componente
          // porque necesitamos lógica específica para verificación OTP
          this.isAuthenticating.set(false);
          throw error;
        }),
        tap(() => this.isAuthenticating.set(false))
      );
  }

  logout() {
    // 🔇 Logs silenciados - solo toasts para usuario

    this.token.set(null);
    this.user.set(null);

    // Limpiar las compras al cerrar sesión
    import('./purchases.service').then(module => {
      const purchasesService = this.injector.get(module.PurchasesService);
      purchasesService.clearPurchases();
    });


    // �🔇 Logs silenciados - solo toasts para usuario
    this.toast.info('Sesión cerrada', 'Has cerrado sesión correctamente');

    this.router.navigate(['/']);
  }

  /**
   * Actualiza la señal del usuario con nuevos datos.
   * Útil después de que un componente actualiza el perfil del usuario.
   * @param updatedUser El objeto de usuario actualizado recibido del backend.
   */
  updateUser(updatedUser: User): void {
    // 🔇 Logs silenciados - solo toasts para usuario
    this.user.set(updatedUser);
  }

  register(userData: any) {
    // 🔇 Logs silenciados - solo toasts para usuario
    return this.http.post(`${environment.url}users/register`, userData)
      .pipe(
        tap(() => {
          // 🔇 Logs silenciados - solo toasts para usuario
          this.toast.success(
            '¡Registro exitoso!',
            'Revisa tu correo para verificar tu cuenta'
          );
        }),
        catchError(error => {
          // 🔇 Logs silenciados - solo toasts para usuario
          throw error;
        })
      );
  }

  // Métodos de verificación OTP
  verifyOtp(userId: string, code: string) {
    // 🔇 Logs silenciados - solo toasts para usuario

    return this.http.post<LoginResponse>(`${environment.url}users/verify-otp`, { userId, code })
      .pipe(
        tap(response => {
          if (response.USER) {
            const { token, user, profile } = response.USER;
            const fullUser = { ...user, ...profile };

            this.token.set(token);
            this.user.set(fullUser as User);

            // 🔇 Logs silenciados - solo toasts para usuario

            // ✅ Toast de éxito (usar fullUser que tiene todos los datos)
            this.toast.success(
              '¡Cuenta verificada!',
              `Bienvenido ${fullUser.name}, tu cuenta ha sido verificada`
            );

            // Cargar las compras del usuario después de verificar
            import('./purchases.service').then(module => {
              const purchasesService = this.injector.get(module.PurchasesService);
              purchasesService.loadPurchasedProducts();
            });

            // Navegar según el rol
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
          // 🔇 Logs silenciados - solo toasts para usuario

          // ✅ Toast de error
          this.toast.error(
            'Código inválido',
            'El código de verificación es incorrecto o ha expirado'
          );

          throw error;
        })
      );
  }

  resendOtp(userId: string) {
    // 🔇 Logs silenciados - solo toasts para usuario

    return this.http.post(`${environment.url}users/resend-otp`, { userId })
      .pipe(
        tap(() => {
          // 🔇 Logs silenciados - solo toasts para usuario

          // ✅ Toast informativo
          this.toast.info(
            'Código enviado',
            'Revisa tu correo electrónico'
          );
        }),
        catchError(error => {
          // 🔇 Logs silenciados - solo toasts para usuario

          // ✅ Toast de error
          this.toast.error(
            'Error al reenviar',
            'No se pudo reenviar el código de verificación'
          );

          throw error;
        })
      );
  }

  // Helper para verificar rol
  hasRole(role: string): boolean {
    return this.user()?.rol === role;
  }

  // Helper para verificar múltiples roles
  hasAnyRole(roles: string[]): boolean {
    const userRole = this.user()?.rol;
    return userRole ? roles.includes(userRole) : false;
  }
}
