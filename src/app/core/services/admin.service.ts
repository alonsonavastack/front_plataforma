import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ProfileResponse, User as ProfileUser } from '../models/home.models';
import { AuthService, User } from './auth';

type AdminState = { profile: ProfileResponse | null, isLoading: boolean, error: any };

@Injectable({ providedIn: 'root' })
export class AdminService {
  http = inject(HttpClient);
  authService = inject(AuthService);
  base = environment.url;

  private state = signal<AdminState>({
    profile: null,
    isLoading: false,
    error: null,
  });

  constructor() {
    effect(() => {
      // Recargar el perfil cuando el usuario inicie sesión como admin
      // y solo si aún no tenemos los datos del perfil. Esto evita bucles infinitos.
      const currentUser = this.authService.user();
      const isAdmin = currentUser?.rol === 'admin';
      const profileNotLoaded = !this.state().profile;
      const isSessionLoaded = this.authService.isSessionLoaded();
      const hasToken = this.authService.token();

      if (isAdmin && profileNotLoaded && hasToken && isSessionLoaded) {
        this.reload();
      }
    });
  }

  profile = computed(() => this.state().profile);
  isLoading = computed(() => this.state().isLoading);

  reload() {
    const isAdmin = this.authService.user()?.rol === 'admin';
    if (!this.authService.token() || !isAdmin) {
      return;
    }

    // Evitar múltiples cargas simultáneas
    if (this.state().isLoading) {
      return;
    }

    this.state.update((s: AdminState) => ({ ...s, isLoading: true, error: null }));
    this.http.get<ProfileResponse>(`${this.base}profile-admin/profile`).subscribe({
      next: (data) => {
        // Actualizamos el estado local
        this.state.update((s: AdminState) => ({ ...s, profile: data, isLoading: false }));
      },
      error: (err) => {
        this.state.update((s: AdminState) => ({ ...s, isLoading: false, error: err }));
      }
    });
  }
}
