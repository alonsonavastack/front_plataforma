import { Injectable, inject, signal, computed, resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
// rxResource removed
import { environment } from '../../../environments/environment';

export interface PaymentSettings {
  stripe: {
    mode: 'test' | 'live';
    active: boolean;
    secretKey?: string;
    publishableKey?: string;
    webhookSecret?: string;
  };
  paypal?: any; // Legacy — ya no se usa
}

@Injectable({
  providedIn: 'root'
})
export class PaymentSettingsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.url}payment-settings`;

  // 🔥 Signal para recargar configuración
  private reloadTrigger = signal(0);

  // 🔥 rxResource para configuración de administrador
  // 🔥 rxResource reemplazado por resource standard
  private adminSettingsResource = resource({
    loader: () => {
      this.reloadTrigger();
      return firstValueFrom(this.http.get<{ settings: PaymentSettings }>(`${this.apiUrl}/admin`));
    }
  });

  // 🔥 Señales públicas para configuración de admin
  public adminSettings = computed(() => this.adminSettingsResource.value()?.settings ?? null);
  public isLoadingAdminSettings = computed(() => this.adminSettingsResource.isLoading());
  public adminSettingsError = computed(() => this.adminSettingsResource.error());

  // 🔥 Signal separado para configuración pública (no requiere auth)
  private publicReloadTrigger = signal(0);

  // 🔥 rxResource reemplazado por resource standard
  private publicSettingsResource = resource({
    loader: () => {
      this.publicReloadTrigger();
      return firstValueFrom(this.http.get<{ settings: any }>(`${this.apiUrl}/public`));
    }
  });

  // 🔥 Señales públicas para configuración pública
  public publicSettings = computed(() => this.publicSettingsResource.value()?.settings ?? null);
  public isLoadingPublicSettings = computed(() => this.publicSettingsResource.isLoading());
  public publicSettingsError = computed(() => this.publicSettingsResource.error());

  // 🔥 Recargar configuraciones manualmente
  reloadAdminSettings(): void {
    this.reloadTrigger.update(v => v + 1);
  }

  reloadPublicSettings(): void {
    this.publicReloadTrigger.update(v => v + 1);
  }

  // 🔥 Métodos imperativos para actualizar
  updateSettings(settings: any) {
    return this.http.put(`${this.apiUrl}/admin`, settings);
  }

  // 🔥 Métodos heredados (compatibility)
  getSettings() {
    return this.http.get<{ settings: PaymentSettings }>(`${this.apiUrl}/admin`);
  }

  getPublicSettings() {
    return this.http.get<{ settings: any }>(`${this.apiUrl}/public`);
  }
}
