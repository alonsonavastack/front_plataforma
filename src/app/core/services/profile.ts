// src/app/core/services/profile.service.ts
import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { catchError, throwError } from 'rxjs';
import { ProfileResponse } from '../models/home.models';
import { AuthService } from './auth';

type ProfileState = { profile: ProfileResponse | null, isLoading: boolean, error: any };

@Injectable({ providedIn: 'root' })
export class ProfileService {
  http = inject(HttpClient);
  authService = inject(AuthService);
  base = environment.url;

  private state = signal<ProfileState>({
    profile: null,
    isLoading: false,
    error: null,
  });

  constructor() {
    effect(() => {
      // Recargar el perfil cuando el token cambie (inicio de sesión)
      if (this.authService.clientToken()) {
        this.reload();
      } else {
        // Limpiar el estado si el usuario cierra sesión
        this.state.set({ profile: null, isLoading: false, error: null });
      }
    });
  }

  profile = computed(() => this.state().profile);
  isLoading = computed(() => this.state().isLoading);

  reload() {
    const token = this.authService.clientToken();
    if (!token) {
      return;
    }

    const user = this.authService.currentUser();
    let url: string | undefined;

    switch (user?.rol) {
      case 'admin':
        url = `${this.base}profile-admin/profile`;
        break;
      case 'instructor':
        url = `${this.base}profile-instructor/profile`;
        break;
      case 'cliente':
        url = `${this.base}profile/client`;
        break;
      default:
        url = undefined;
    }

    if (!url) return;

    this.state.update((s: ProfileState) => ({ ...s, isLoading: true }));
    this.http.get<ProfileResponse>(url).subscribe({
      next: (data) => {
        this.state.update((s: ProfileState) => ({ ...s, profile: data, isLoading: false }));
      },
      error: (err) => {
        this.state.update((s: ProfileState) => ({ ...s, isLoading: false, error: err }));
      }
    });
  }

  update(body: any) {
    // Determina el endpoint correcto basado en el rol del usuario
    const user = this.authService.currentUser();
    let endpoint = '';
    if (user?.rol === 'admin') {
      endpoint = 'profile-admin/update'; // Asumiendo que tendrás este endpoint
    } else if (user?.rol === 'instructor') {
      endpoint = 'profile-instructor/update';
    } else {
      endpoint = 'profile/update';
    }

    return this.http.post<any>(`${this.base}${endpoint}`, body)
      .pipe(catchError(err => throwError(() => err)));
  }

  updateAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    // Hacemos que el endpoint sea dinámico según el rol
    const user = this.authService.currentUser();
    let endpoint = '';
    if (user?.rol === 'admin' || user?.rol === 'instructor') {
      endpoint = 'profile-instructor/update-avatar'; // El backend ya maneja ambos roles aquí
    } else {
      endpoint = 'profile/update'; // El endpoint de estudiante ya maneja archivos
    }
    return this.http.post<any>(`${this.base}${endpoint}`, formData);
  }
}
