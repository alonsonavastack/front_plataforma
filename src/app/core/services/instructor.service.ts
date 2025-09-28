import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ProfileResponse } from '../models/home.models';
import { AuthService } from './auth';

type InstructorState = { profile: ProfileResponse | null, isLoading: boolean, error: any };

@Injectable({ providedIn: 'root' })
export class InstructorService {
  http = inject(HttpClient);
  authService = inject(AuthService);
  base = environment.url;

  private state = signal<InstructorState>({
    profile: null,
    isLoading: false,
    error: null,
  });

  constructor() {
    // Este efecto se encargará de actualizar la señal global del usuario
    // cada vez que se carguen los datos del perfil del instructor.
    effect(() => {
      const profileData = this.state().profile;
      if (profileData?.profile?.email) {
        this.authService.currentUser.set(profileData.profile);
      }

      // Recargar el perfil cuando el usuario inicie sesión como instructor
      const isInstructor = this.authService.currentUser()?.rol === 'instructor';
      if (this.authService.clientToken() && isInstructor) {
        this.reload();
      }
    });
  }

  profile = computed(() => this.state().profile);
  isLoading = computed(() => this.state().isLoading);

  reload() {
    const isInstructor = this.authService.currentUser()?.rol === 'instructor';
    if (!this.authService.clientToken() || !isInstructor) {
      return;
    }

    this.state.update((s: InstructorState) => ({ ...s, isLoading: true }));
    this.http.get<ProfileResponse>(`${this.base}profile-instructor/profile`).subscribe({
      next: (data) => {
        this.state.update((s: InstructorState) => ({ ...s, profile: data, isLoading: false }));
      },
      error: (err) => {
        this.state.update((s: InstructorState) => ({ ...s, isLoading: false, error: err }));
      }
    });
  }
}
