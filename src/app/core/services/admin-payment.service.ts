import { Injectable, inject, signal, computed, resource } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
// rxResource removed
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
  };
  paymentConfig: {
    hasConfig: boolean;
    preferredMethod: string;
    paypalConnected: boolean;
    bankVerified: boolean;
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

interface InstructorFilters {
  status: string;
  minAmount: number;
}

interface EarningsFilters {
  instructorId: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface PaymentHistoryFilters {
  status?: string;
  instructor?: string;
  page: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminPaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.url}admin`;

  // 🔥 Signals para filtros de instructores con ganancias
  private instructorStatusInput = signal('available');
  private instructorMinAmountInput = signal(0);

  // 🔥 rxResource reemplazado por resource standard
  private instructorsResource = resource({
    loader: () => {
      const params = new HttpParams()
        .set('status', this.instructorStatusInput())
        .set('minAmount', this.instructorMinAmountInput().toString());

      return firstValueFrom(this.http.get<{
        success: boolean;
        instructors: InstructorWithEarnings[];
        summary: { totalInstructors: number; totalEarnings: string };
      }>(`${this.apiUrl}/instructors/payments`, { params }));
    }
  });

  // 🔥 Señales públicas derivadas
  public instructors = computed(() => this.instructorsResource.value()?.instructors ?? []);
  public summary = computed(() => this.instructorsResource.value()?.summary ?? null);
  public isLoadingInstructors = computed(() => this.instructorsResource.isLoading());
  public instructorsError = computed(() => this.instructorsResource.error());

  // 🔥 Signals para filtros de ganancias de instructor específico
  private earningsInstructorIdInput = signal('');
  private earningsStatusInput = signal<string | undefined>(undefined);
  private earningsStartDateInput = signal<string | undefined>(undefined);
  private earningsEndDateInput = signal<string | undefined>(undefined);

  // 🔥 rxResource reemplazado por resource standard
  private earningsResource = resource({
    loader: () => {
      const instructorId = this.earningsInstructorIdInput();
      if (!instructorId) return Promise.resolve(null);

      let params = new HttpParams();
      const status = this.earningsStatusInput();
      if (status) params = params.set('status', status);
      const startDate = this.earningsStartDateInput();
      if (startDate) params = params.set('startDate', startDate);
      const endDate = this.earningsEndDateInput();
      if (endDate) params = params.set('endDate', endDate);

      return firstValueFrom(this.http.get<{
        success: boolean;
        instructor: any;
        earnings: Earning[];
        paymentConfig: any;
        totals: any;
      }>(`${this.apiUrl}/instructors/${instructorId}/earnings`, { params }));
    }
  });

  // 🔥 Señales públicas para ganancias
  public earnings = computed(() => this.earningsResource.value()?.earnings ?? []);
  public instructor = computed(() => this.earningsResource.value()?.instructor ?? null);
  public paymentConfig = computed(() => this.earningsResource.value()?.paymentConfig ?? null);
  public earningsTotals = computed(() => this.earningsResource.value()?.totals ?? null);
  public isLoadingEarnings = computed(() => this.earningsResource.isLoading());
  public earningsError = computed(() => this.earningsResource.error());

  // 🔥 Signals para filtros de historial de pagos
  private paymentHistoryStatusInput = signal<string | undefined>(undefined);
  private paymentHistoryInstructorInput = signal<string | undefined>(undefined);
  private paymentHistoryPageInput = signal(1);
  private paymentHistoryLimitInput = signal(10);

  // 🔥 rxResource reemplazado por resource standard
  private paymentsHistoryResource = resource({
    loader: () => {
      let params = new HttpParams();
      const status = this.paymentHistoryStatusInput();
      if (status) params = params.set('status', status);
      const instructor = this.paymentHistoryInstructorInput();
      if (instructor) params = params.set('instructor', instructor);
      params = params.set('page', this.paymentHistoryPageInput().toString());
      params = params.set('limit', this.paymentHistoryLimitInput().toString());

      return firstValueFrom(this.http.get<{
        success: boolean;
        payments: PaymentResponse[];
        pagination: any;
      }>(`${this.apiUrl}/payments`, { params }));
    }
  });

  // 🔥 Señales públicas para historial
  public paymentsHistory = computed(() => this.paymentsHistoryResource.value()?.payments ?? []);
  public paymentsPagination = computed(() => this.paymentsHistoryResource.value()?.pagination ?? null);
  public isLoadingPaymentsHistory = computed(() => this.paymentsHistoryResource.isLoading());
  public paymentsHistoryError = computed(() => this.paymentsHistoryResource.error());

  // 🔥 Signal para configuración de comisiones
  private commissionReloadTrigger = signal(0);

  // 🔥 rxResource reemplazado por resource standard
  private commissionResource = resource({
    loader: () => {
      this.commissionReloadTrigger();
      return firstValueFrom(this.http.get<{
        success: boolean;
        settings: CommissionSettings;
      }>(`${this.apiUrl}/commission-settings`));
    }
  });

  // 🔥 Señales públicas para comisiones
  public commissionSettings = computed(() => this.commissionResource.value()?.settings ?? null);
  public isLoadingCommission = computed(() => this.commissionResource.isLoading());
  public commissionError = computed(() => this.commissionResource.error());

  // 🔥 Métodos para actualizar filtros de instructores
  setInstructorFilters(filters: Partial<InstructorFilters>): void {
    if (filters.status !== undefined) this.instructorStatusInput.set(filters.status);
    if (filters.minAmount !== undefined) this.instructorMinAmountInput.set(filters.minAmount);
  }

  // 🔥 Métodos para cargar ganancias de un instructor
  loadInstructorEarnings(instructorId: string, filters?: Partial<EarningsFilters>): void {
    this.earningsInstructorIdInput.set(instructorId);
    if (filters?.status !== undefined) this.earningsStatusInput.set(filters.status);
    if (filters?.startDate !== undefined) this.earningsStartDateInput.set(filters.startDate);
    if (filters?.endDate !== undefined) this.earningsEndDateInput.set(filters.endDate);
  }

  clearInstructorEarnings(): void {
    this.earningsInstructorIdInput.set('');
    this.earningsStatusInput.set(undefined);
    this.earningsStartDateInput.set(undefined);
    this.earningsEndDateInput.set(undefined);
  }

  // 🔥 Métodos para historial de pagos
  setPaymentHistoryFilters(filters: Partial<PaymentHistoryFilters>): void {
    if (filters.status !== undefined) this.paymentHistoryStatusInput.set(filters.status);
    if (filters.instructor !== undefined) this.paymentHistoryInstructorInput.set(filters.instructor);
    if (filters.page !== undefined) this.paymentHistoryPageInput.set(filters.page);
    if (filters.limit !== undefined) this.paymentHistoryLimitInput.set(filters.limit);
  }

  // 🔥 Recargar datos manualmente
  reloadInstructors(): void {
    this.instructorsResource.reload();
  }

  reloadEarnings(): void {
    this.earningsResource.reload();
  }

  reloadPaymentsHistory(): void {
    this.paymentsHistoryResource.reload();
  }

  reloadCommissionSettings(): void {
    this.commissionReloadTrigger.update(v => v + 1);
  }

  // 🔥 Métodos imperativos (para operaciones CRUD)
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
        paymentMethod: 'bank_transfer' | 'paypal' | null;
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
