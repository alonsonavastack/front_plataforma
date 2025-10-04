// src/app/core/services/profile.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { AuthService } from './auth';
import { Enrollment, ProfileResponse } from '../models/home.models';

type ProfileState = {
  data: ProfileResponse | null;
  isLoading: boolean;
  error: any;
};

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly base = environment.url;

  private state = signal<ProfileState>({
    data: null,
    isLoading: false,
    error: null,
  });

  // Señales públicas para el componente
  public profile = computed(() => this.state().data?.profile);
  public isLoading = computed(() => this.state().isLoading);

  /**
   * Expone la lista de cursos en los que el usuario está inscrito.
   * Devuelve un array vacío si no hay datos o no hay cursos.
   */
  public enrolledCourses = computed<Enrollment[]>(() => {
    return this.state().data?.enrolled_courses ?? [];
  });

  /**
   * Carga o recarga los datos del perfil del usuario desde el backend.
   */
  public reloadProfile(): void {
    if (!this.authService.isLoggedIn()) return;

    this.state.update(s => ({ ...s, isLoading: true }));
    // Usamos el endpoint de cliente que trae los cursos inscritos
    this.http.get<ProfileResponse>(`${this.base}profile-student/client`).subscribe({
      next: (response) => this.state.set({ data: response, isLoading: false, error: null }),
      error: (err) => this.state.set({ data: null, isLoading: false, error: err }),
    });
  }

  /**
   * Actualiza los datos del perfil del usuario.
   */
  public update(body: any) {
    const user = this.authService.user();
    let endpoint = '';
    if (user?.rol === 'admin') endpoint = 'users/update';
    else if (user?.rol === 'instructor') endpoint = 'profile-instructor/update';
    else if (user?.rol === 'cliente') endpoint = 'profile-student/update';
    else endpoint = 'users/update';

    return this.http.put<any>(`${this.base}${endpoint}`, body).pipe(
      tap(response => {
        const updatedUser = response.profile || response.user || response;
        if (updatedUser) {
          // Actualizamos el usuario en AuthService para que se refleje globalmente
          this.authService.user.update(currentUser => ({ ...currentUser, ...updatedUser }));
          // Y recargamos el perfil para mantener la consistencia
          this.reloadProfile();
        }
      })
    );
  }

  /**
   * Actualiza el avatar del usuario.
   */
  public updateAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    const user = this.authService.user();
    let endpoint = '';
    if (user?.rol === 'admin') endpoint = 'users/update';
    else if (user?.rol === 'instructor') endpoint = 'profile-instructor/update';
    else if (user?.rol === 'cliente') endpoint = 'profile-student/update-avatar';
    else endpoint = 'users/update';

    return this.http.put<any>(`${this.base}${endpoint}`, formData).pipe(
      tap(response => {
        const updatedUser = response.user || response;
        if (updatedUser) {
          // Actualizamos el usuario en AuthService para que se refleje globalmente
          this.authService.user.update(currentUser => ({ ...currentUser, ...updatedUser }));
        }
      })
    );
  }
}

import { tap } from 'rxjs';
