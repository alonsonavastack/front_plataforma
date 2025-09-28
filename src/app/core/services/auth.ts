// core/services/auth.service.ts
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal, effect } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  adminJwt = signal<string | null>(localStorage.getItem('adminToken'));

  // Señales para el cliente
  currentUser = signal<any | null>(null);
  clientToken = signal<string | null>(localStorage.getItem('clientToken'));
  isLoggedIn = computed(() => !!this.currentUser());

  // Computed signal para construir la URL del avatar de forma segura
  currentUserAvatar = computed(() => {
    const user = this.currentUser();
    if (user?.avatar) {
      // Usamos la URL base de imágenes de usuario definida en el entorno.
      return `${environment.images.user}${user.avatar}`;
    }
    return 'https://i.pravatar.cc/128'; // Fallback
  });

  constructor() {
    this.loadClientSession();

    // Este efecto se encargará de mantener localStorage sincronizado.
    effect(() => {
      const user = this.currentUser();
      if (user) {
        localStorage.setItem('clientUser', JSON.stringify(user));
      }
    });
  }

  private loadClientSession() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('clientToken');
      const user = localStorage.getItem('clientUser');
      if (token && user) {
        this.clientToken.set(token);
        this.currentUser.set(JSON.parse(user));
      }
    }
  }

  login(email: string, password: string) {
    return this.http.post<{USER: {token: string, user: any}}>(`${environment.url}users/login`, { email, password })
      .pipe(tap(r => {
        const { token, user } = r.USER;
        // Guardamos el token en ambos para consistencia
        localStorage.setItem('clientToken', token);
        this.clientToken.set(token);
        this.currentUser.set(user);

        // Manejamos la redirección aquí para asegurar que el estado esté actualizado
        if (user.rol === 'admin' || user.rol === 'instructor') {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/']); // Redirige al home para clientes
        }
      }));
  }

  logoutClient() {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientUser');
    this.clientToken.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']); // Redirigir siempre a login al cerrar sesión.
  }

  logoutAll() { localStorage.clear(); this.clientToken.set(null); this.currentUser.set(null); }
}
