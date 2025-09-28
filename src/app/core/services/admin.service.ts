import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ProfileResponse } from '../models/home.models';
import { AuthService } from './auth';

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
      const profileData = this.state().profile;
      if (profileData?.profile?.email) {
        this.authService.currentUser.set(profileData.profile);
      }

      // Recargar el perfil cuando el usuario inicie sesión como admin
      const isAdmin = this.authService.currentUser()?.rol === 'admin';
      if (this.authService.clientToken() && isAdmin) {
        this.reload();
      }
    });
  }

  profile = computed(() => this.state().profile);
  isLoading = computed(() => this.state().isLoading);

  reload() {
    const isAdmin = this.authService.currentUser()?.rol === 'admin';
    if (!this.authService.clientToken() || !isAdmin) {
      return;
    }
    this.state.update((s: AdminState) => ({ ...s, isLoading: true }));
    this.http.get<ProfileResponse>(`${this.base}profile-admin/profile`).subscribe({
      next: (data) => {
        this.state.update((s: AdminState) => ({ ...s, profile: data, isLoading: false }));
      },
      error: (err) => {
        this.state.update((s: AdminState) => ({ ...s, isLoading: false, error: err }));
      }
    });
  }
}
