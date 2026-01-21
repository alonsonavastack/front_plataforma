import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SystemConfig } from '../models/system-config.interface';
import { Observable, tap, catchError, of } from 'rxjs';

interface SystemConfigState {
  config: SystemConfig | null;
  exchange_rate: number | null; // 🔥 Tasa de cambio
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
    exchange_rate: null,
    isLoading: false,
    error: null
  });

  // Computed signals para acceso fácil
  config = computed(() => this.state().config);
  exchangeRate = computed(() => this.state().exchange_rate); // 🔥 Computado para usar en pipes
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);

  /**
   * Obtener configuración del sistema (pública)
   */
  getConfig(): void {
    this.state.set({
      ...this.state(),
      isLoading: true,
      error: null
    });

    this.http.get<{ config: SystemConfig, exchange_rate: number }>(`${this.API_URL}/get-public`).pipe(
      tap(response => {
        this.state.set({
          config: response.config,
          exchange_rate: response.exchange_rate,
          isLoading: false,
          error: null
        });
      }),
      catchError(error => {
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
    return this.http.put<{ message: string; config: SystemConfig }>(`${this.API_URL}/update`, formData).pipe(
      tap((response) => {
        // Actualizar estado local
        this.state.set({
          ...this.state(), // Mantiene el exchange_rate actual
          config: response.config,
          isLoading: false,
          error: null
        });
      }),
      catchError(error => {
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
      exchange_rate: null, // Resetear tasa
      isLoading: false,
      error: null
    });
  }

  /**
   * Descargar respaldo manual
   */
  downloadBackup(): Observable<any> {
    return this.http.get(`${this.API_URL}/backup/download`, {
      responseType: 'blob',
      reportProgress: true,
      observe: 'events'
    });
  }

  /**
   * Restaurar respaldo desde ZIP
   */
  restoreBackup(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.API_URL}/backup/restore`, formData, {
      reportProgress: true,
      observe: 'events'
    });
  }
}
