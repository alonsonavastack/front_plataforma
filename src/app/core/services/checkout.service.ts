import { Injectable, inject, signal, computed, resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
// rxResource removed
import { environment } from '../../../environments/environment';

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}



export interface CheckoutData {
  method_payment: string;
  currency_total: string;
  currency_payment: string;
  total: number;
  price_dolar?: number;
  n_transaccion: string;
  detail: Array<{
    product: string;
    product_type: 'course' | 'project';
    title: string;
    price_unit: number;
    discount?: number;
    type_discount?: number;
  }>;
  use_wallet?: boolean;
  wallet_amount?: number;
  remaining_amount?: number;
  country?: string;
}

export interface CheckoutResponse {
  message: string;
  sale?: any;
  init_point?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.url}checkout`;

  // 🔥 Signal para controlar la recarga de configuración
  private configReloadTrigger = signal(0);

  // 🔥 rxResource para configuración de pagos (países soportados + métodos)
  // 🔥 rxResource reemplazado por resource standard
  private paymentConfigResource = resource({
    loader: () => {
      this.configReloadTrigger();
      return firstValueFrom(this.http.get<any>(`${environment.url}payment-settings/public`));
    }
  });

  // 🔥 rxResource reemplazado por resource standard
  private countriesResource = resource({
    loader: () => {
      this.configReloadTrigger();
      return firstValueFrom(this.http.get<any>(`${environment.url}system-config/supported-countries`));
    }
  });

  // 🔥 Señales públicas derivadas
  public paymentConfig = computed(() => this.paymentConfigResource.value()?.settings ?? null);
  public supportedCountries = computed(() => this.countriesResource.value()?.countries ?? []);
  public isLoadingConfig = computed(() =>
    this.paymentConfigResource.isLoading() || this.countriesResource.isLoading()
  );

  // 🔥 Métodos de pago filtrados dinámicamente según configuración
  public availablePaymentMethods = computed<PaymentMethod[]>(() => {
    const config = this.paymentConfig();
    if (!config) return [];

    const allMethods: PaymentMethod[] = [
      {
        id: 'wallet',
        name: 'Billetera Digital',
        icon: '💰',
        description: 'Usa tu saldo disponible de forma instantánea'
      },
      {
        id: 'paypal',
        name: 'PayPal',
        icon: '🅿️',
        description: 'Paga de forma segura con PayPal'
      }
    ];

    // Filtrar métodos según configuración activa
    return allMethods.filter(method => {
      if (method.id === 'wallet') return true; // Siempre disponible
      if (method.id === 'paypal') return config.paypal?.active === true;
      return false;
    });
  });

  // 🔥 Procesar venta
  processSale(data: CheckoutData) {
    return this.http.post<CheckoutResponse>(`${this.API_URL}/register`, data);
  }

  // 🔥 Generar número de transacción único
  generateTransactionNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `TXN-${timestamp}-${random}`;
  }

  // 🔥 Obtener tasa de cambio (hardcoded por ahora)
  getExchangeRate(): number {
    return 3.66;
  }

  // 🔥 Recargar configuración manualmente
  reloadConfig(): void {
    this.configReloadTrigger.update(v => v + 1);
  }
}
