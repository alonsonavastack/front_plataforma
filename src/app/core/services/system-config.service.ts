import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SystemConfig } from '../models/system-config.interface';
import { Observable, tap, catchError, of } from 'rxjs';

interface SystemConfigState {
  config: SystemConfig | null;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SystemConfigService {
  private http = inject(HttpClient);
  private API_URL = `${environment.url}system-config`;

  // Estado con signal
  private state = signal<SystemConfigState>({
    config: null,
    isLoading: false,
    error: null
  });

  // Computed signals para acceso fácil
  config = computed(() => this.state().config);
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);

  /**
   * Obtener configuración del sistema (pública)
   */
  getConfig(): void {
    console.log('📋 [SystemConfigService] Obteniendo configuración del sistema (pública)');

    this.state.set({
      ...this.state(),
      isLoading: true,
      error: null
    });

    this.http.get<{ config: SystemConfig }>(`${this.API_URL}/get-public`).pipe(
      tap(response => {
        console.log('✅ [SystemConfigService] Configuración obtenida:', response.config);
        this.state.set({
          config: response.config,
          isLoading: false,
          error: null
        });
      }),
      catchError(error => {
        console.error('❌ [SystemConfigService] Error al obtener configuración:', error);
        this.state.set({
          ...this.state(),
          isLoading: false,
          error: error.error?.message || 'Error al cargar configuración'
        });
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Actualizar configuración del sistema
   */
  updateConfig(formData: FormData): Observable<any> {
    console.log('🔄 [SystemConfigService] Actualizando configuración');

    return this.http.put<{ message: string; config: SystemConfig }>(`${this.API_URL}/update`, formData).pipe(
      tap((response) => {
        console.log('✅ [SystemConfigService] Configuración actualizada:', response);

        // Actualizar estado local
        this.state.set({
          config: response.config,
          isLoading: false,
          error: null
        });
      }),
      catchError(error => {
        console.error('❌ [SystemConfigService] Error al actualizar:', error);
        throw error;
      })
    );
  }

  /**
   * Construir URL completa para el logo
   */
  buildLogoUrl(logoName?: string | null): string {
    if (!logoName) {
      return 'https://via.placeholder.com/200x80?text=Logo';
    }
    const cleanLogoName = logoName.trim();
    return `${environment.url}system-config/logo/${cleanLogoName}`;
  }

  /**
   * Construir URL completa para el favicon
   */
  buildFaviconUrl(faviconName?: string | null): string {
    if (!faviconName) {
      return 'https://via.placeholder.com/32x32?text=Fav';
    }
    const cleanFaviconName = faviconName.trim();
    return `${environment.url}system-config/favicon/${cleanFaviconName}`;
  }

  /**
   * Resetear estado
   */
  resetState(): void {
    this.state.set({
      config: null,
      isLoading: false,
      error: null
    });
  }
}
