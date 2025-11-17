// src/app/core/services/profile.service.ts
import { HttpClient } from "@angular/common/http";
import { computed, inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { catchError, tap, throwError } from "rxjs";
import { AuthService } from "./auth";

@Injectable({ providedIn: "root" })
export class ProfileService {
  http = inject(HttpClient);
  authService = inject(AuthService);
  base = environment.url;

  // El perfil ahora es una señal computada que lee directamente de AuthService.
  // Ya no necesitamos un estado local (private state).
  profile = computed(() => this.authService.user());

  // El constructor ahora está vacío, ya que la lógica reactiva se maneja con `computed`.
  constructor() {}

  update(body: any) {
    // Determina el endpoint correcto basado en el rol del usuario
    const user = this.authService.user();
    let endpoint = "";
    if (user?.rol === "admin") {
      endpoint = "profile-admin/update"; // Admin usa el endpoint genérico de usuarios
    } else if (user?.rol === "instructor") {
      endpoint = "profile-instructor/update";
    } else if (user?.rol === "cliente") {
      endpoint = "profile-student/update";
    } else {
      endpoint = "users/update"; // Fallback genérico
    }

    return this.http.put<any>(`${this.base}${endpoint}`, body).pipe(
      // Después de actualizar, actualizamos la señal del perfil en AuthService.
      tap((response) => {

        // La respuesta puede venir como { profile: ... }, { user: ... }, o el objeto de usuario directamente.
        const updatedUser = response.profile || response.user || response;
        if (updatedUser) {
          // 🔥 CRÃTICO: Fusionar con usuario actual para mantener token y otros datos
          const currentUser = this.authService.user();
          const mergedUser = { ...currentUser, ...updatedUser };



          // Actualizar signal
          this.authService.user.set(mergedUser);

          // 🔥 IMPORTANTE: También actualizar localStorage para persistencia
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('user', JSON.stringify(mergedUser));
          }
        }
      }),
      catchError((err) => throwError(() => err))
    );
  }

  updateAvatar(file: File) {
    const formData = new FormData();
    formData.append("avatar", file);

    // Hacemos que el endpoint sea dinámico según el rol
    const user = this.authService.user();
    let endpoint = "";
    if (user?.rol === "admin") {
      endpoint = "profile-admin/update-avatar"; // Endpoint correcto y dedicado para el avatar del admin
    } else if (user?.rol === "instructor") {
      endpoint = "profile-instructor/update-avatar"; // Revertido: Instructor usa una ruta diferente para el avatar
    } else if (user?.rol === "cliente") {
      endpoint = "profile-student/update-avatar";
    } else {
      return throwError(
        () => new Error("Rol de usuario no reconocido para actualizar avatar.")
      );
    }

    const request = (user?.rol === 'admin' || user?.rol === 'instructor')
      ? this.http.post<any>(`${this.base}${endpoint}`, formData)
      : this.http.put<any>(`${this.base}${endpoint}`, formData); // Cliente usa PUT

    return request.pipe(
      // Después de actualizar el avatar, actualizamos la señal del usuario en AuthService.
      tap((response) => {

        // La respuesta puede venir como { user: ... } o el objeto de usuario directamente.
        const updatedUser = response.user || response;
        if (updatedUser) {
          const currentUser = this.authService.user();
          const userToSet = { ...currentUser, ...updatedUser };
          this.authService.user.set(userToSet);
        }
      }),
      catchError((err) => throwError(() => err))
    );
  }
}
