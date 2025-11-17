import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface PaymentConfig {
  paypal_email?: string;
  paypal_merchant_id?: string;
  paypal_connected?: boolean;
  paypal_verified?: boolean;
  bank_account?: {
    account_holder_name?: string;
    bank_name?: string;
    account_number?: string;
    account_number_masked?: string;
    clabe?: string;
    clabe_masked?: string;
    swift_code?: string;
    account_type?: 'ahorros' | 'corriente' | 'debito' | 'credito';
    card_brand?: string;
    verified?: boolean;
  };
  preferred_payment_method?: 'paypal' | 'bank_transfer';
}

export interface Earning {
  _id: string;
  // Legacy support (cursos antiguos)
  course?: {
    _id: string;
    title: string;
    image: string;
  };
  // Nuevo sistema unificado (cursos y proyectos)
  product?: {
    _id: string;
    title: string;
    image?: string;  // Para cursos
    imagen?: string; // Para proyectos
  };
  product_type?: 'course' | 'project';
  sale: any;
  sale_price: number;
  currency: string;
  platform_commission_rate: number;
  platform_commission_amount: number;
  instructor_earning: number;
  status: 'pending' | 'available' | 'paid' | 'disputed';
  earned_at: string;
  available_at: string;
  paid_at?: string;

  isRefunded?: boolean;  // Si la venta fue reembolsada
  status_display?: 'pending' | 'available' | 'paid' | 'disputed' | 'refunded';
  instructor_earning_original?: number;  // Ganancia antes del reembolso
}


export interface EarningsStats {
  pending: { total: number; count: number };
  available: { total: number; count: number };
  paid: { total: number; count: number };
    refunds: { count: number; total: number };

  total: { total: number; count: number };
  total_earned: number;
  total_sales: number;
  average_per_sale: number;
  earnings_by_month?: Array<{ month: string; total: number; count: number }>;
}

export interface Payment {
  _id: string;
  total_earnings: number;
  amount_to_pay: number;
  platform_deductions: number;
  final_amount: number;
  currency: string;
  payment_method: string;
  payment_details: any;
  earnings_included: string[];
  status: string;
  requested_at?: string;
  created_by_admin_at: string;
  processed_at?: string;
  completed_at?: string;
  admin_notes?: string;
}

export interface EarningsFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class InstructorPaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.url}instructor`;

  /**
   * Obtiene la configuración de pago del instructor
   */
  getPaymentConfig(): Observable<{ success: boolean; data: PaymentConfig }> {
    return this.http.get<{ success: boolean; config: PaymentConfig }>(
      `${this.apiUrl}/payment-config`
    ).pipe(
      map(response => ({ success: response.success, data: response.config }))
    );
  }

  /**
   * Actualiza la configuración de PayPal
   */
  updatePaypalConfig(data: {
    paypal_email: string;
    paypal_merchant_id?: string;
  }): Observable<{ success: boolean; message: string; data: PaymentConfig }> {
    return this.http.post<{ success: boolean; message: string; config: PaymentConfig }>(
      `${this.apiUrl}/payment-config/paypal`,
      data
    ).pipe(
      map(response => ({ ...response, data: response.config }))
    );
  }

  /**
   * Actualiza la configuración de cuenta bancaria
   */
  updateBankConfig(data: {
    account_holder_name: string;
    bank_name: string;
    account_number: string;
    clabe?: string;
    swift_code?: string;
    account_type: 'ahorros' | 'corriente' | 'debito' | 'credito';
    card_brand?: string;
  }): Observable<{ success: boolean; message: string; data: PaymentConfig }> {
    return this.http.post<{ success: boolean; message: string; config: PaymentConfig }>(
      `${this.apiUrl}/payment-config/bank`,
      data
    ).pipe(
      map(response => ({ ...response, data: response.config }))
    );
  }

  /**
   * Actualiza el método de pago preferido
   */
  updatePreferredMethod(
    method: 'paypal' | 'bank_transfer'
  ): Observable<{ success: boolean; message: string; data: PaymentConfig }> {
    return this.http.put<{ success: boolean; message: string; config: PaymentConfig }>(
      `${this.apiUrl}/payment-config`,
      { preferred_payment_method: method }
    ).pipe(
      map(response => ({ ...response, data: response.config }))
    );
  }

  /**
   * Elimina la configuración de PayPal
   */
  deletePaypalConfig(): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/payment-config/paypal`
    );
  }

  /**
   * Elimina la configuración de cuenta bancaria
   */
  deleteBankConfig(): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/payment-config/bank`
    );
  }

  /**
   * Obtiene las ganancias del instructor con filtros
   */
  getEarnings(filters: EarningsFilters = {}): Observable<{
    success: boolean;
    data: Earning[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  }> {
    let params = new HttpParams();

    if (filters.status) params = params.set('status', filters.status);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());

    return this.http.get<{
      success: boolean;
      earnings: Earning[];
      pagination: any;
    }>(`${this.apiUrl}/earnings`, { params }).pipe(
      map(response => ({
        success: response.success,
        data: response.earnings,
        pagination: response.pagination
      }))
    );
  }

  /**
   * Obtiene las estadísticas de ganancias
   */
  getEarningsStats(): Observable<{
    success: boolean;
    data: EarningsStats;
  }> {
    return this.http.get<{
      success: boolean;
      stats: any;
    }>(`${this.apiUrl}/earnings/stats`).pipe(
      map(response => {
        // Normalizar el formato de stats para el frontend
        const stats = response.stats;
        const normalized: EarningsStats = {
          pending: stats.pending || { total: 0, count: 0 },
          available: stats.available || { total: 0, count: 0 },
          paid: stats.paid || { total: 0, count: 0 },
          refunds: stats.refunds || { total: 0, count: 0 },
          total: stats.total || { total: 0, count: 0 },
          total_earned: stats.total?.total || 0,
          total_sales: stats.totalCoursesSold || 0,
          average_per_sale: parseFloat(stats.averagePerSale || 0),
          earnings_by_month: stats.byMonth || []
        };
        return { success: response.success, data: normalized };
      })
    );
  }

  /**
   * Obtiene el historial de pagos recibidos
   */
  getPaymentHistory(
    page: number = 1,
    limit: number = 10
  ): Observable<{
    success: boolean;
    data: Payment[];
    pagination: any;
  }> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<{
      success: boolean;
      payments: Payment[];
      pagination: any;
    }>(`${this.apiUrl}/payments/history`, { params }).pipe(
      map(response => ({
        success: response.success,
        data: response.payments,
        pagination: response.pagination
      }))
    );
  }
}
