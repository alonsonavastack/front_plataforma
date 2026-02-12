import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Earning } from '../models/instructor-earning.model';

export interface InstructorWithEarnings {
  instructor: {
    _id: string;
    name: string;
    email: string;
    surname?: string;
    avatar?: string;
    country?: string;
  };
  earnings: {
    total: number;
    count: number;
    oldestDate: string;
    newestDate: string;
    paymentMethods?: {
      wallet: { count: number; total: number };
      paypal: { count: number; total: number };
      mixed_paypal: { count: number; total: number };
    };
    breakdown: {
      organic: { count: number; total: number };
      referral: { count: number; total: number };
    };
  };
  paymentConfig: {
    preferredMethod: string;
    paypalConnected: boolean;
    country?: string;
  };
}

export interface InstructorEarningsDetail {
  instructor: any;
  earnings: Earning[];
  paymentConfig: any;
  totals: {
    total: number;
    available: number;
    pending: number;
    paid: number;
    count: number;
  };
}

export interface CreatePaymentRequest {
  earnings_ids: string[];
  deductions?: number;
  notes?: string;
}

export interface PaymentResponse {
  _id: string;
  instructor: any;
  total_earnings: number;
  platform_deductions: number;
  final_amount: number;
  currency: string;
  payment_method: string;
  status: string;
  earnings_included: string[];
  created_by_admin_at: string;
  createdAt?: string;
  admin_notes?: string;
  payment_details?: any;
}

export interface CommissionSettings {
  _id: string;
  default_commission_rate: number;
  days_until_available: number;
  minimum_payment_threshold: number;
  default_currency: string;
  exchange_rate_usd_to_mxn: number;
  enabled_payment_methods: {
    paypal: boolean;
    other: boolean;
  };
  instructor_custom_rates?: Array<{
    instructor: any;
    commission_rate: number;
    reason: string;
    effective_from: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AdminPaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.url}admin`;

  // 🔥 SIGNALS para estado (en lugar de resource)
  // Instructores con ganancias
  instructors = signal<InstructorWithEarnings[]>([]);
  instructorsSummary = signal<{ totalInstructors: number; totalEarnings: string } | null>(null);
  isLoadingInstructors = signal(false);
  instructorsError = signal<any>(null);

  // Ganancias de instructor específico
  earnings = signal<Earning[]>([]);
  instructor = signal<any>(null);
  paymentConfig = signal<any>(null);
  earningsTotals = signal<any>(null);
  isLoadingEarnings = signal(false);
  earningsError = signal<any>(null);

  // Historial de pagos
  paymentsHistory = signal<PaymentResponse[]>([]);
  paymentsPagination = signal<any>(null);
  isLoadingPaymentsHistory = signal(false);
  paymentsHistoryError = signal<any>(null);

  // Configuración de comisiones
  commissionSettings = signal<CommissionSettings | null>(null);
  isLoadingCommission = signal(false);
  commissionError = signal<any>(null);

  // 🔥 MÉTODOS PARA CARGAR DATOS

  /**
   * Cargar instructores con ganancias
   */
  loadInstructors(filters: {
    status?: string;
    minAmount?: number;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Observable<any> {
    // 🔒 LOG REMOVIDO POR SEGURIDAD

    this.isLoadingInstructors.set(true);
    this.instructorsError.set(null);

    let params = new HttpParams()
      .set('status', filters.status || 'all')
      .set('minAmount', (filters.minAmount || 0).toString());

    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      params = params.set('paymentMethod', filters.paymentMethod);
    }
    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    return this.http.get<{
      success: boolean;
      instructors: InstructorWithEarnings[];
      summary: { totalInstructors: number; totalEarnings: string };
    }>(`${this.apiUrl}/instructors/payments`, { params }).pipe(
      tap({
        next: (response) => {
          this.instructors.set(response.instructors);
          this.instructorsSummary.set(response.summary);
          this.isLoadingInstructors.set(false);
        },
        error: (error) => {
          console.error('❌ [AdminPaymentService] Error al cargar instructores:', error);
          this.instructorsError.set(error);
          this.isLoadingInstructors.set(false);
        }
      })
    );
  }

  /**
   * Cargar ganancias de un instructor específico
   */
  loadInstructorEarnings(instructorId: string, filters: {
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Observable<any> {
    // 🔒 LOG REMOVIDO POR SEGURIDAD

    this.isLoadingEarnings.set(true);
    this.earningsError.set(null);

    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);

    return this.http.get<{
      success: boolean;
      instructor: any;
      earnings: Earning[];
      paymentConfig: any;
      totals: any;
    }>(`${this.apiUrl}/instructors/${instructorId}/earnings`, { params }).pipe(
      tap({
        next: (response) => {
          this.earnings.set(response.earnings);
          this.instructor.set(response.instructor);
          this.paymentConfig.set(response.paymentConfig);
          this.earningsTotals.set(response.totals);
          this.isLoadingEarnings.set(false);
        },
        error: (error) => {
          console.error('❌ [AdminPaymentService] Error al cargar ganancias:', error);
          this.earningsError.set(error);
          this.isLoadingEarnings.set(false);
        }
      })
    );
  }

  /**
   * Cargar historial de pagos
   */
  loadPaymentsHistory(filters: {
    status?: string;
    instructor?: string;
    page?: number;
    limit?: number;
  } = {}): Observable<any> {
    this.isLoadingPaymentsHistory.set(true);
    this.paymentsHistoryError.set(null);

    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.instructor) params = params.set('instructor', filters.instructor);
    params = params.set('page', (filters.page || 1).toString());
    params = params.set('limit', (filters.limit || 10).toString());

    return this.http.get<{
      success: boolean;
      payments: PaymentResponse[];
      pagination: any;
    }>(`${this.apiUrl}/payments`, { params }).pipe(
      tap({
        next: (response) => {
          this.paymentsHistory.set(response.payments);
          this.paymentsPagination.set(response.pagination);
          this.isLoadingPaymentsHistory.set(false);
        },
        error: (error) => {
          this.paymentsHistoryError.set(error);
          this.isLoadingPaymentsHistory.set(false);
        }
      })
    );
  }

  /**
   * Cargar configuración de comisiones
   */
  loadCommissionSettings(): Observable<any> {
    this.isLoadingCommission.set(true);
    this.commissionError.set(null);

    return this.http.get<{
      success: boolean;
      settings: CommissionSettings;
    }>(`${this.apiUrl}/commission-settings`).pipe(
      tap({
        next: (response) => {
          this.commissionSettings.set(response.settings);
          this.isLoadingCommission.set(false);
        },
        error: (error) => {
          this.commissionError.set(error);
          this.isLoadingCommission.set(false);
        }
      })
    );
  }

  /**
   * Backwards-compatible wrapper used by components that expect
   * a `reloadCommissionSettings` method. Calls the existing
   * `loadCommissionSettings` and subscribes so callers don't need
   * to subscribe themselves when they just want the data refreshed.
   */
  reloadCommissionSettings(): void {
    this.loadCommissionSettings().subscribe({
      next: () => { },
      error: () => { }
    });
  }

  // 🔥 MÉTODOS IMPERATIVOS (para operaciones CRUD)

  createPayment(instructorId: string, data: CreatePaymentRequest) {
    return this.http.post<{
      success: boolean;
      message: string;
      payment: PaymentResponse;
    }>(`${this.apiUrl}/instructors/${instructorId}/payment`, data);
  }

  processPayment(paymentId: string, data: { transaction_id?: string; receipt_url?: string }) {
    return this.http.put<{
      success: boolean;
      message: string;
      payment: PaymentResponse;
    }>(`${this.apiUrl}/payments/${paymentId}/process`, data);
  }

  completePayment(paymentId: string) {
    return this.http.put<{
      success: boolean;
      message: string;
      payment: PaymentResponse;
    }>(`${this.apiUrl}/payments/${paymentId}/complete`, {});
  }

  updateCommissionSettings(data: {
    default_commission_rate?: number;
    days_until_available?: number;
    minimum_payment_threshold?: number;
    exchange_rate_usd_to_mxn?: number;
  }) {
    return this.http.put<{
      success: boolean;
      message: string;
      settings: CommissionSettings;
    }>(`${this.apiUrl}/commission-settings`, data);
  }

  setCustomCommission(data: {
    instructor_id: string;
    commission_rate: number;
    reason: string;
  }) {
    return this.http.post<{
      success: boolean;
      message: string;
      settings: CommissionSettings;
    }>(`${this.apiUrl}/commission-settings/custom`, data);
  }

  removeCustomCommission(instructorId: string) {
    return this.http.delete<{
      success: boolean;
      message: string;
      settings: CommissionSettings;
    }>(`${this.apiUrl}/commission-settings/custom/${instructorId}`);
  }

  getEarningsReport(filters: {
    period?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    let params = new HttpParams();
    if (filters.period) params = params.set('period', filters.period);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);

    return this.http.get<{ success: boolean; report: any }>(`${this.apiUrl}/earnings/report`, { params });
  }

  getInstructorPaymentMethodFull(instructorId: string) {
    return this.http.get<{
      success: boolean;
      data: {
        instructor: { _id: string; name: string; email: string; surname?: string };
        paymentMethod: 'paypal' | null;
        paymentDetails: any;
      };
    }>(`${this.apiUrl}/instructors/${instructorId}/payment-method-full`);
  }

  processExistingSales() {
    return this.http.post<{
      success: boolean;
      message: string;
      processed: number;
      skipped: number;
      total: number;
      sales_reviewed: number;
    }>(`${environment.url}sales/process-existing-sales`, {});
  }
}
