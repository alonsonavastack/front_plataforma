import { Injectable, inject, signal, computed, resource } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
// rxResource removed
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
  mercadopago?: {
    account_type: 'email' | 'phone' | 'cvu';
    account_value: string;
    country: string;
    verified: boolean;
  };
  preferred_payment_method?: 'paypal' | 'bank_transfer' | 'mercadopago';
}

export interface Earning {
  _id: string;
  course?: {
    _id: string;
    title: string;
    image: string;
  };
  product?: {
    _id: string;
    title: string;
    image?: string;
    imagen?: string;
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
  isRefunded?: boolean;
  status_display?: 'pending' | 'available' | 'paid' | 'disputed' | 'refunded';
  instructor_earning_original?: number;
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
  page: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class InstructorPaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.url}instructor`;

  // 🔥 Signal para recargar configuración de pago
  private paymentConfigReloadTrigger = signal(0);

  // 🔥 rxResource reemplazado por resource standard
  private paymentConfigResource = resource({
    loader: () => {
      this.paymentConfigReloadTrigger();
      return firstValueFrom(this.http.get<{ success: boolean; config: PaymentConfig }>(
        `${this.apiUrl}/payment-config`
      ));
    }
  });

  // 🔥 Señales públicas para configuración de pago
  public paymentConfig = computed(() => this.paymentConfigResource.value()?.config ?? null);
  public isLoadingPaymentConfig = computed(() => this.paymentConfigResource.isLoading());
  public paymentConfigError = computed(() => this.paymentConfigResource.error());

  // 🔥 Signals para filtros de ganancias
  private earningsStatusInput = signal<string | undefined>(undefined);
  private earningsStartDateInput = signal<string | undefined>(undefined);
  private earningsEndDateInput = signal<string | undefined>(undefined);
  private earningsPageInput = signal(1);
  private earningsLimitInput = signal(10);

  // 🔥 rxResource reemplazado por resource standard
  private earningsResource = resource({
    loader: () => {
      let params = new HttpParams();
      const status = this.earningsStatusInput();
      if (status) params = params.set('status', status);
      const startDate = this.earningsStartDateInput();
      if (startDate) params = params.set('startDate', startDate);
      const endDate = this.earningsEndDateInput();
      if (endDate) params = params.set('endDate', endDate);
      params = params.set('page', this.earningsPageInput().toString());
      params = params.set('limit', this.earningsLimitInput().toString());

      return firstValueFrom(this.http.get<{
        success: boolean;
        earnings: Earning[];
        pagination: any;
      }>(`${this.apiUrl}/earnings`, { params }));
    }
  });

  // 🔥 Señales públicas para ganancias
  public earnings = computed(() => this.earningsResource.value()?.earnings ?? []);
  public earningsPagination = computed(() => this.earningsResource.value()?.pagination ?? null);
  public isLoadingEarnings = computed(() => this.earningsResource.isLoading());
  public earningsError = computed(() => this.earningsResource.error());

  // 🔥 Signal para recargar estadísticas
  private statsReloadTrigger = signal(0);

  // 🔥 rxResource reemplazado por resource standard
  private statsResource = resource({
    loader: () => {
      this.statsReloadTrigger();
      return firstValueFrom(this.http.get<{ success: boolean; stats: any }>(
        `${this.apiUrl}/earnings/stats`
      ));
    }
  });

  // 🔥 Señales públicas para estadísticas (normalizadas)
  public earningsStats = computed<EarningsStats | null>(() => {
    const response = this.statsResource.value();
    if (!response) return null;

    const stats = response.stats;
    return {
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
  });
  public isLoadingStats = computed(() => this.statsResource.isLoading());
  public statsError = computed(() => this.statsResource.error());

  // 🔥 Signals para historial de pagos
  private paymentHistoryPageInput = signal(1);
  private paymentHistoryLimitInput = signal(10);

  // 🔥 rxResource reemplazado por resource standard
  private paymentHistoryResource = resource({
    loader: () => {
      const params = new HttpParams()
        .set('page', this.paymentHistoryPageInput().toString())
        .set('limit', this.paymentHistoryLimitInput().toString());

      return firstValueFrom(this.http.get<{
        success: boolean;
        payments: Payment[];
        pagination: any;
      }>(`${this.apiUrl}/payments/history`, { params }));
    }
  });

  // 🔥 Señales públicas para historial de pagos
  public paymentHistory = computed(() => this.paymentHistoryResource.value()?.payments ?? []);
  public paymentHistoryPagination = computed(() => this.paymentHistoryResource.value()?.pagination ?? null);
  public isLoadingPaymentHistory = computed(() => this.paymentHistoryResource.isLoading());
  public paymentHistoryError = computed(() => this.paymentHistoryResource.error());

  // 🔥 Métodos para actualizar filtros de ganancias
  setEarningsFilters(filters: Partial<EarningsFilters>): void {
    if (filters.status !== undefined) this.earningsStatusInput.set(filters.status);
    if (filters.startDate !== undefined) this.earningsStartDateInput.set(filters.startDate);
    if (filters.endDate !== undefined) this.earningsEndDateInput.set(filters.endDate);
    if (filters.page !== undefined) this.earningsPageInput.set(filters.page);
    if (filters.limit !== undefined) this.earningsLimitInput.set(filters.limit);
  }

  clearEarningsFilters(): void {
    this.earningsStatusInput.set(undefined);
    this.earningsStartDateInput.set(undefined);
    this.earningsEndDateInput.set(undefined);
    this.earningsPageInput.set(1);
    this.earningsLimitInput.set(10);
  }

  // 🔥 Métodos para paginación de historial
  setPaymentHistoryPage(page: number): void {
    this.paymentHistoryPageInput.set(page);
  }

  setPaymentHistoryLimit(limit: number): void {
    this.paymentHistoryLimitInput.set(limit);
  }

  // 🔥 Recargar datos manualmente
  reloadPaymentConfig(): void {
    this.paymentConfigReloadTrigger.update(v => v + 1);
  }

  reloadEarnings(): void {
    this.earningsResource.reload();
  }

  reloadStats(): void {
    this.statsReloadTrigger.update(v => v + 1);
  }

  reloadPaymentHistory(): void {
    this.paymentHistoryResource.reload();
  }

  // 🔥 Métodos imperativos para actualizar configuración
  updatePaypalConfig(data: { paypal_email: string; paypal_merchant_id?: string }) {
    return this.http.post<{ success: boolean; message: string; config: PaymentConfig }>(
      `${this.apiUrl}/payment-config/paypal`,
      data
    );
  }

  updateBankConfig(data: {
    account_holder_name: string;
    bank_name: string;
    account_number: string;
    clabe?: string;
    swift_code?: string;
    account_type: 'ahorros' | 'corriente' | 'debito' | 'credito';
    card_brand?: string;
  }) {
    return this.http.post<{ success: boolean; message: string; config: PaymentConfig }>(
      `${this.apiUrl}/payment-config/bank`,
      data
    );
  }

  updateMercadoPagoConfig(data: {
    account_type: string;
    account_value: string;
    country: string;
  }) {
    return this.http.post<{ success: boolean; message: string; config: PaymentConfig }>(
      `${this.apiUrl}/payment-config/mercadopago`,
      data
    );
  }

  deleteMercadoPagoConfig() {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/payment-config/mercadopago`
    );
  }

  updatePreferredMethod(method: 'paypal' | 'bank_transfer' | 'mercadopago') {
    return this.http.put<{ success: boolean; message: string; config: PaymentConfig }>(
      `${this.apiUrl}/payment-config`,
      { preferred_payment_method: method }
    );
  }

  deletePaypalConfig() {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/payment-config/paypal`
    );
  }

  deleteBankConfig() {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/payment-config/bank`
    );
  }
}
