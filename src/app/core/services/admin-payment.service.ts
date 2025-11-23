import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Earning } from '../models/instructor-earning.model';

export interface InstructorWithEarnings {
  instructor: {
    _id: string;
    name: string;
    email: string;
    surname?: string;
    avatar?: string;
  };
  earnings: {
    total: number;
    count: number;
    oldestDate: string;
    newestDate: string;
  };
  paymentConfig: {
    hasConfig: boolean;
    preferredMethod: string;
    paypalConnected: boolean;
    bankVerified: boolean;
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
  instructor: string;
  total_earnings: number;
  platform_deductions: number;
  final_amount: number;
  currency: string;
  payment_method: string;
  status: string;
  earnings_included: string[];
  created_by_admin_at: string;
  admin_notes?: string;
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
    bank_transfer: boolean;
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

  /**
   * Obtener instructores con ganancias disponibles
   */
  getInstructorsWithEarnings(
    status: string = 'available',
    minAmount: number = 0
  ): Observable<{
    success: boolean;
    instructors: InstructorWithEarnings[];
    summary: {
      totalInstructors: number;
      totalEarnings: string;
    };
  }> {
    const params = new HttpParams()
      .set('status', status)
      .set('minAmount', minAmount.toString());

    return this.http.get<any>(`${this.apiUrl}/instructors/payments`, { params });
  }

  /**
   * Obtener ganancias detalladas de un instructor específico
   */
  getInstructorEarnings(
    instructorId: string,
    filters: {
      status?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Observable<{
    success: boolean;
    instructor: any;
    earnings: Earning[];
    paymentConfig: any;
    totals: any;
  }> {
    let params = new HttpParams();

    if (filters.status) params = params.set('status', filters.status);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);

    return this.http.get<any>(
      `${this.apiUrl}/instructors/${instructorId}/earnings`,
      { params }
    );
  }

  /**
   * Crear un nuevo pago para un instructor
   */
  createPayment(
    instructorId: string,
    data: CreatePaymentRequest
  ): Observable<{
    success: boolean;
    message: string;
    payment: PaymentResponse;
  }> {
    return this.http.post<any>(
      `${this.apiUrl}/instructors/${instructorId}/payment`,
      data
    );
  }

  /**
   * Procesar un pago (cambiar a status processing)
   */
  processPayment(
    paymentId: string,
    data: {
      transaction_id?: string;
      receipt_url?: string;
    }
  ): Observable<{
    success: boolean;
    message: string;
    payment: PaymentResponse;
  }> {
    return this.http.put<any>(
      `${this.apiUrl}/payments/${paymentId}/process`,
      data
    );
  }

  /**
   * Completar un pago (cambiar a status completed)
   */
  completePayment(
    paymentId: string
  ): Observable<{
    success: boolean;
    message: string;
    payment: PaymentResponse;
  }> {
    return this.http.put<any>(
      `${this.apiUrl}/payments/${paymentId}/complete`,
      {}
    );
  }

  /**
   * Obtener historial de todos los pagos
   */
  getPaymentHistory(
    filters: {
      status?: string;
      instructor?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Observable<{
    success: boolean;
    payments: PaymentResponse[];
    pagination: any;
  }> {
    let params = new HttpParams();

    if (filters.status) params = params.set('status', filters.status);
    if (filters.instructor) params = params.set('instructor', filters.instructor);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());

    return this.http.get<any>(`${this.apiUrl}/payments`, { params });
  }

  /**
   * Obtener configuración de comisiones
   */
  getCommissionSettings(): Observable<{
    success: boolean;
    settings: CommissionSettings;
  }> {
    return this.http.get<any>(`${this.apiUrl}/commission-settings`);
  }

  /**
   * Actualizar configuración global de comisiones
   */
  updateCommissionSettings(
    data: {
      default_commission_rate?: number;
      days_until_available?: number;
      minimum_payment_threshold?: number;
      exchange_rate_usd_to_mxn?: number;
    }
  ): Observable<{
    success: boolean;
    message: string;
    settings: CommissionSettings;
  }> {
    return this.http.put<any>(`${this.apiUrl}/commission-settings`, data);
  }

  /**
   * Establecer comisión personalizada para un instructor
   */
  setCustomCommission(
    data: {
      instructor_id: string;
      commission_rate: number;
      reason: string;
    }
  ): Observable<{
    success: boolean;
    message: string;
    settings: CommissionSettings;
  }> {
    return this.http.post<any>(
      `${this.apiUrl}/commission-settings/custom`,
      data
    );
  }

  /**
   * Eliminar comisión personalizada de un instructor
   */
  removeCustomCommission(
    instructorId: string
  ): Observable<{
    success: boolean;
    message: string;
    settings: CommissionSettings;
  }> {
    return this.http.delete<any>(
      `${this.apiUrl}/commission-settings/custom/${instructorId}`
    );
  }

  /**
   * Obtener reporte de ganancias
   */
  getEarningsReport(
    filters: {
      period?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Observable<{
    success: boolean;
    report: any;
  }> {
    let params = new HttpParams();

    if (filters.period) params = params.set('period', filters.period);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);

    return this.http.get<any>(`${this.apiUrl}/earnings/report`, { params });
  }

  /**
   * 🔥 NUEVO: Obtener datos bancarios COMPLETOS (sin encriptar) de un instructor
   * Este endpoint devuelve números de cuenta, CLABE y datos completos
   * SOLO accesible por administradores
   */
  getInstructorPaymentMethodFull(
    instructorId: string
  ): Observable<{
    success: boolean;
    data: {
      instructor: {
        _id: string;
        name: string;
        email: string;
        surname?: string;
      };
      paymentMethod: 'bank_transfer' | 'paypal' | null;
      paymentDetails: {
        type: string;
        bankName?: string;
        accountNumber?: string; // 🔥 Número completo sin asteriscos
        clabe?: string; // 🔥 CLABE completa sin asteriscos
        accountHolder?: string;
        accountType?: string;
        cardBrand?: string;
        swiftCode?: string;
        verified?: boolean;
        email?: string; // Para PayPal
        merchantId?: string;
        connected?: boolean;
      } | null;
    };
  }> {
    return this.http.get<any>(
      `${this.apiUrl}/instructors/${instructorId}/payment-method-full`
    );
  }

  /**
   * 🔧 Procesar ventas existentes (crear ganancias para ventas que no las tengan)
   * Este endpoint escanea todas las ventas 'paid' y crea InstructorEarnings automáticamente
   * si aún no existen.
   */
  processExistingSales(): Observable<{
    success: boolean;
    message: string;
    processed: number;
    skipped: number;
    total: number;
    sales_reviewed: number;
    // Detalles para diagnóstico (opcionales)
    processed_details?: Array<{ sale: string; product: string; title?: string }>;
    skipped_details?: Array<{ sale: string; product: string; title?: string; reason?: string; error?: string }>;
  }> {
    return this.http.post<any>(
      `${environment.url}sales/process-existing-sales`,
      {}
    );
  }
}
