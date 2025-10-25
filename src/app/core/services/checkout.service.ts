import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  clabe: string;
}

export interface CheckoutData {
  method_payment: string;
  currency_total: string;
  currency_payment: string;
  total: number;
  price_dolar?: number;
  n_transaccion: string;
}

export interface CheckoutResponse {
  message: string;
  sale?: any;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.url}checkout`; // Aseguramos que la ruta base es /checkout

  // Métodos de pago disponibles
  readonly paymentMethods: PaymentMethod[] = [
    {
      id: 'paypal',
      name: 'PayPal',
      icon: '💳',
      description: 'Paga de forma segura con tu cuenta PayPal'
    },
    {
      id: 'stripe',
      name: 'Tarjeta de Crédito/Débito',
      icon: '💳',
      description: 'Visa, Mastercard, American Express'
    },
    {
      id: 'mercadopago',
      name: 'Mercado Pago',
      icon: '💰',
      description: 'Paga con Mercado Pago'
    },
    {
      id: 'transfer',
      name: 'Transferencia Bancaria',
      icon: '🏦',
      description: 'Transferencia directa a cuenta bancaria'
    }
  ];

  // 🔥 Datos bancarios centralizados para transferencia (solo frontend)
  readonly bankDetails: BankDetails = {
    bankName: 'BBVA Bancomer',
    accountNumber: '1167021895',
    clabe: '01242611670218951'
  };

  /**
   * Procesa el pago y crea la orden de venta
   */
  processSale(data: CheckoutData): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.API_URL}/register`, data);
  }

  /**
   * Genera un número de transacción único
   */
  generateTransactionNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `TXN-${timestamp}-${random}`;
  }

  /**
   * Obtiene la tasa de cambio actual (esto podría venir de una API externa)
   */
  getExchangeRate(): number {
    // Por ahora retornamos una tasa fija, pero podrías integrar una API de tasas de cambio
    return 3.66; // 1 USD = 3.66 (tu moneda local)
  }
}
