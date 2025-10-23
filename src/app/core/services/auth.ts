// core/services/auth.service.ts
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal, effect, Injector } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tap, catchError, of, throwError } from 'rxjs';
import { Router } from '@angular/router';

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
    // Effect para sincronizar localStorage cuando cambien los signals
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

    // Efecto para manejar el resultado de la verificación de sesión
    effect(() => {
      const state = this.sessionState();
      this.isAuthenticating.set(state.isLoading);

      if (state.isLoaded) {
        if (state.user) {
          // Sesión válida, actualizamos el usuario
          this.user.set(state.user);
        } else if (state.error) {
          // Error de autenticación (401/403), limpiamos la sesión
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
  }

  private verifyStoredSession() {
    const token = this.token();
    const storedUser = this.user();

    if (token && storedUser) {
      this.isAuthenticating.set(true);

      this.http.get<{ user: User, profile?: any }>(`${environment.url}users/profile`)
        .pipe(
          catchError((error) => {
            console.error('Error verifying session:', error);
            console.error('Status:', error.status);
            console.error('Error details:', error.error);

            // Solo limpiar la sesión si es un error de autenticación (401)
            // Para otros errores, mantener la sesión almacenada
            if (error.status === 401 || error.status === 403) {
              console.log('Token inválido o expirado, limpiando sesión');
              this.token.set(null);
              this.user.set(null);
            } else {
              // Para errores de red u otros, mantener los datos actuales
              console.log('Error de red o servidor, manteniendo sesión almacenada');
            }
            return of(null);
          })
        )
        .subscribe({
          next: (response) => {
            console.log('Respuesta completa de /users/profile:', response);
            if (response) {
              // El backend devuelve { user: { _id, rol }, profile: { ...datos completos } }
              // Necesitamos combinar ambos para tener el objeto User completo
              if (response.profile) {
                // response.profile ya contiene toda la información incluyendo _id y rol
                const userToSet = response.profile as User;
                console.log('Usuario extraído de la respuesta:', userToSet);
                console.log('Sesión verificada correctamente, actualizando usuario');
                this.user.set(userToSet);
              } else if (response.user) {
                // Fallback si solo viene el user básico
                console.log('Solo se recibió user básico:', response.user);
                this.user.set(response.user as User);
              } else {
                console.warn('No se pudo extraer el usuario de la respuesta');
              }
            } else {
              console.warn('Respuesta vacía de /users/profile');
            }
          },
          complete: () => {
            this.isSessionLoaded.set(true);
            this.isAuthenticating.set(false);
          }
        });
    } else {
      // No hay token, marcar como cargado inmediatamente
      this.isSessionLoaded.set(true);
    }
  }

  login(email: string, password: string) {
    this.isAuthenticating.set(true);

    return this.http.post<LoginResponse>(`${environment.url}users/login`, { email, password })
      .pipe(
        tap(response => {
          console.log('Login response:', response);

          const { token, user, profile } = response.USER;
          const fullUser = { ...user, ...profile };

          this.token.set(token);
          this.user.set(fullUser as User);

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
          console.error('Login error:', error);
          this.isAuthenticating.set(false);
          throw error;
        }),
        tap(() => this.isAuthenticating.set(false))
      );
  }

  logout() {
    this.token.set(null);
    this.user.set(null);
    
    // Limpiar las compras al cerrar sesión
    import('./purchases.service').then(module => {
      const purchasesService = this.injector.get(module.PurchasesService);
      purchasesService.clearPurchases();
    });
    
    this.router.navigate(['/']);
  }

  /**
   * Actualiza la señal del usuario con nuevos datos.
   * Útil después de que un componente actualiza el perfil del usuario.
   * @param updatedUser El objeto de usuario actualizado recibido del backend.
   */
  updateUser(updatedUser: User): void {
    this.user.set(updatedUser);
  }

  register(userData: any) {
    return this.http.post(`${environment.url}users/register`, userData);
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
