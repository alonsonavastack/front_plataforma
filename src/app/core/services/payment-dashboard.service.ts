// services/payment-dashboard.service.ts
// 📊 SERVICIO PARA DASHBOARD DE ADMINISTRACIÓN DE PAGOS

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap, catchError, of, forkJoin } from 'rxjs';

// Interfaces
export interface SalesByStatus {
  pending: { count: number; total_amount: number };
  paid: { count: number; total_amount: number };
  cancelled: { count: number; total_amount: number };
}

export interface PaymentMethodStats {
  method: string;
  count: number;
  total_amount: number;
  percentage: number;
}

export interface WalletStats {
  total_balance: number;
  total_wallets: number;
  avg_balance: number;
  max_balance: number;
  top_users: any[];
}

export interface DashboardStats {
  sales: {
    byStatus: SalesByStatus;
    byMethod: PaymentMethodStats[];
    recent: { count: number; total_amount: number };
    byDay: { _id: string; count: number; total: number }[];
  };
  wallets: WalletStats;
  refunds: {
    byStatus: {
      pending: { count: number; total_amount: number };
      approved: { count: number; total_amount: number };
      rejected: { count: number; total_amount: number };
    };
  };
  alerts: {
    pending_transfers: number;
    pending_refunds: number;
  };
}

export interface SaleItem {
  _id: string;
  user: {
    _id: string;
    name: string;
    surname: string;
    email: string;
    avatar?: string;
  };
  method_payment: string;
  currency_total: string;
  status: 'Pendiente' | 'Pagado' | 'Cancelado';
  total: number;
  n_transaccion: string;
  wallet_amount: number;
  remaining_amount: number;
  detail: any[];
  createdAt: string;
  updatedAt: string;
  transfer_receipt?: any;
}

export interface SalesFilter {
  status?: string;
  method_payment?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface DashboardState {
  stats: DashboardStats | null;
  sales: SaleItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  walletsStats: any;
  refundsSummary: any;
  paymentMethodsAnalysis: any;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentDashboardService {
  private http = inject(HttpClient);
  private API_URL = `${environment.url}payment-dashboard`;

  // 🎯 STATE CON SIGNALS
  private state = signal<DashboardState>({
    stats: null,
    sales: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    walletsStats: null,
    refundsSummary: null,
    paymentMethodsAnalysis: null,
    isLoading: false,
    error: null
  });

  // 📊 COMPUTED SIGNALS
  stats = computed(() => this.state().stats);
  sales = computed(() => this.state().sales);
  pagination = computed(() => this.state().pagination);
  walletsStats = computed(() => this.state().walletsStats);
  refundsSummary = computed(() => this.state().refundsSummary);
  paymentMethodsAnalysis = computed(() => this.state().paymentMethodsAnalysis);
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);

  // Alertas
  pendingTransfers = computed(() => this.state().stats?.alerts.pending_transfers || 0);
  pendingRefunds = computed(() => this.state().stats?.alerts.pending_refunds || 0);
  hasAlerts = computed(() => this.pendingTransfers() > 0 || this.pendingRefunds() > 0);

  // Totales rápidos
  totalPaidAmount = computed(() => this.state().stats?.sales.byStatus.paid.total_amount || 0);
  totalPendingAmount = computed(() => this.state().stats?.sales.byStatus.pending.total_amount || 0);
  totalWalletBalance = computed(() => this.state().stats?.wallets.total_balance || 0);

  /**
   * 📊 CARGAR ESTADÍSTICAS GENERALES
   */
  loadStats(): Observable<DashboardStats> {
    this.state.update(s => ({ ...s, isLoading: true, error: null }));

    return this.http.get<DashboardStats>(`${this.API_URL}/stats`).pipe(
      tap({
        next: (stats) => {
          this.state.update(s => ({
            ...s,
            stats,
            isLoading: false
          }));
        },
        error: (error) => {
          this.state.update(s => ({
            ...s,
            isLoading: false,
            error: error.message || 'Error al cargar estadísticas'
          }));
        }
      })
    );
  }

  /**
   * 📋 CARGAR VENTAS CON FILTROS
   */
  loadSales(filters?: SalesFilter): Observable<any> {
    this.state.update(s => ({ ...s, isLoading: true, error: null }));

    const params: any = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.method_payment) params.method_payment = filters.method_payment;
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    if (filters?.userId) params.userId = filters.userId;
    if (filters?.search) params.search = filters.search;
    params.page = filters?.page || 1;
    params.limit = filters?.limit || 20;

    return this.http.get<{ sales: SaleItem[]; pagination: any }>(`${this.API_URL}/sales`, { params }).pipe(
      tap({
        next: (response) => {
          this.state.update(s => ({
            ...s,
            sales: response.sales,
            pagination: response.pagination,
            isLoading: false
          }));
        },
        error: (error) => {
          this.state.update(s => ({
            ...s,
            isLoading: false,
            error: error.message || 'Error al cargar ventas'
          }));
        }
      })
    );
  }

  /**
   * 📈 CARGAR ANÁLISIS DE MÉTODOS DE PAGO
   */
  loadPaymentMethodsAnalysis(months: number = 6): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/payment-methods-analysis`, {
      params: { months: months.toString() }
    }).pipe(
      tap({
        next: (data) => {
          this.state.update(s => ({
            ...s,
            paymentMethodsAnalysis: data
          }));
        },
        error: (error) => {
        }
      })
    );
  }

  /**
   * 💰 CARGAR ESTADÍSTICAS DE BILLETERAS
   */
  loadWalletsStats(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/wallets-stats`).pipe(
      tap({
        next: (data) => {
          this.state.update(s => ({
            ...s,
            walletsStats: data
          }));
        },
        error: (error) => {
        }
      })
    );
  }

  /**
   * 🔄 CARGAR RESUMEN DE REEMBOLSOS
   */
  loadRefundsSummary(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/refunds-summary`).pipe(
      tap({
        next: (data) => {
          this.state.update(s => ({
            ...s,
            refundsSummary: data
          }));
        },
        error: (error) => {
        }
      })
    );
  }

  /**
   * 🔄 CARGAR TODO EL DASHBOARD
   */
  loadAll(): void {

    forkJoin({
      stats: this.loadStats(),
      sales: this.loadSales({ limit: 20 }),
      wallets: this.loadWalletsStats(),
      refunds: this.loadRefundsSummary()
    }).subscribe({
      next: () => {
      },
      error: (error) => {
      }
    });
  }

  /**
   * 📤 EXPORTAR VENTAS A CSV
   */
  exportSales(filters?: SalesFilter): void {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.method_payment) params.append('method_payment', filters.method_payment);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);

    const url = `${this.API_URL}/export-sales?${params.toString()}`;
    window.open(url, '_blank');
  }

  /**
   * 🧹 LIMPIAR ESTADO
   */
  clearState(): void {
    this.state.set({
      stats: null,
      sales: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      walletsStats: null,
      refundsSummary: null,
      paymentMethodsAnalysis: null,
      isLoading: false,
      error: null
    });
  }

  // ============ HELPERS ============

  /**
   * 💰 FORMATEAR MONEDA
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * 🎨 OBTENER COLOR POR ESTADO
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'Pendiente': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'Pagado': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'Cancelado': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  }

  /**
   * 🎨 OBTENER COLOR POR MÉTODO DE PAGO
   */
  getMethodColor(method: string): string {
    switch (method) {
      case 'wallet': return 'bg-lime-500/20 text-lime-300';
      case 'transfer': return 'bg-blue-500/20 text-blue-300';
      case 'paypal': return 'bg-indigo-500/20 text-indigo-300';
      case 'stripe': return 'bg-purple-500/20 text-purple-300';
      case 'mercadopago': return 'bg-cyan-500/20 text-cyan-300';
      default: return 'bg-slate-500/20 text-slate-300';
    }
  }

  /**
   * 🏷️ OBTENER ICONO POR MÉTODO DE PAGO
   */
  getMethodIcon(method: string): string {
    switch (method) {
      case 'wallet': return '💰';
      case 'transfer': return '🏦';
      case 'paypal': return '💳';
      case 'stripe': return '💳';
      case 'mercadopago': return '💳';
      default: return '💵';
    }
  }

  /**
   * 📛 OBTENER NOMBRE DE MÉTODO DE PAGO
   */
  getMethodName(method: string): string {
    switch (method) {
      case 'wallet': return 'Billetera Digital';
      case 'transfer': return 'Transferencia';
      case 'paypal': return 'PayPal';
      case 'stripe': return 'Stripe';
      case 'mercadopago': return 'MercadoPago';
      default: return method || 'Desconocido';
    }
  }
}
