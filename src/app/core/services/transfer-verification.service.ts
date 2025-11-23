// services/transfer-verification.service.ts
// 🏦 SERVICIO PARA VERIFICACIÓN DE TRANSFERENCIAS BANCARIAS

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap, catchError, of } from 'rxjs';

export interface TransferReceipt {
  student_receipt?: {
    url: string | null;
    uploaded_at: Date | null;
    file_name: string | null;
  };
  admin_verification?: {
    receipt_url: string | null;
    receipt_file_name: string | null;
    verified_by: string | null;
    verified_at: Date | null;
    verification_notes: string | null;
  };
}

export interface TransferSale {
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
  transfer_receipt?: TransferReceipt;
  detail: Array<{
    product: any;
    product_type: 'course' | 'project';
    title: string;
    price_unit: number;
    discount: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface TransferStats {
  pending: { count: number; amount: number };
  paid: { count: number; amount: number };
  cancelled: { count: number; amount: number };
}

interface TransferState {
  transfers: TransferSale[];
  stats: TransferStats | null;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class TransferVerificationService {
  private http = inject(HttpClient);
  private API_URL = `${environment.url}transfers`;

  // 🎯 STATE CON SIGNALS
  private state = signal<TransferState>({
    transfers: [],
    stats: null,
    isLoading: false,
    error: null
  });

  // 📊 COMPUTED SIGNALS
  transfers = computed(() => this.state().transfers);
  stats = computed(() => this.state().stats);
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);
  
  pendingCount = computed(() => this.state().stats?.pending.count || 0);
  pendingAmount = computed(() => this.state().stats?.pending.amount || 0);

  /**
   * 📋 CARGAR TRANSFERENCIAS PENDIENTES
   */
  loadPendingTransfers(filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
  }): Observable<any> {
    this.state.update(s => ({ ...s, isLoading: true, error: null }));

    const params: any = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    if (filters?.userId) params.userId = filters.userId;

    return this.http.get<{ transfers: TransferSale[]; count: number }>(`${this.API_URL}/pending`, { params }).pipe(
      tap({
        next: (response) => {
          console.log('✅ [TransferService] Transferencias cargadas:', response.count);
          this.state.update(s => ({
            ...s,
            transfers: response.transfers,
            isLoading: false
          }));
        },
        error: (error) => {
          console.error('❌ [TransferService] Error al cargar transferencias:', error);
          this.state.update(s => ({
            ...s,
            isLoading: false,
            error: error.message || 'Error al cargar transferencias'
          }));
        }
      })
    );
  }

  /**
   * ✅ VERIFICAR Y APROBAR TRANSFERENCIA
   */
  verifyTransfer(saleId: string, data: {
    receipt?: File;
    verification_notes?: string;
  }): Observable<any> {
    const formData = new FormData();
    
    if (data.receipt) {
      formData.append('receipt', data.receipt);
    }
    
    if (data.verification_notes) {
      formData.append('verification_notes', data.verification_notes);
    }

    console.log('🔍 [TransferService] Verificando transferencia:', saleId);

    return this.http.post(`${this.API_URL}/verify/${saleId}`, formData).pipe(
      tap({
        next: (response: any) => {
          console.log('✅ [TransferService] Transferencia verificada:', response);
          
          // Actualizar la lista local
          this.state.update(s => ({
            ...s,
            transfers: s.transfers.filter(t => t._id !== saleId)
          }));
        },
        error: (error) => {
          console.error('❌ [TransferService] Error al verificar:', error);
        }
      })
    );
  }

  /**
   * 🔄 RECHAZAR TRANSFERENCIA
   */
  rejectTransfer(saleId: string, rejection_reason: string): Observable<any> {
    console.log('🚫 [TransferService] Rechazando transferencia:', saleId);

    return this.http.post(`${this.API_URL}/reject/${saleId}`, { rejection_reason }).pipe(
      tap({
        next: (response) => {
          console.log('✅ [TransferService] Transferencia rechazada:', response);
          
          // Actualizar la lista local
          this.state.update(s => ({
            ...s,
            transfers: s.transfers.filter(t => t._id !== saleId)
          }));
        },
        error: (error) => {
          console.error('❌ [TransferService] Error al rechazar:', error);
        }
      })
    );
  }

  /**
   * 📊 CARGAR ESTADÍSTICAS
   */
  loadStats(): Observable<TransferStats> {
    return this.http.get<TransferStats>(`${this.API_URL}/stats`).pipe(
      tap({
        next: (stats) => {
          console.log('📊 [TransferService] Estadísticas cargadas:', stats);
          this.state.update(s => ({ ...s, stats }));
        },
        error: (error) => {
          console.error('❌ [TransferService] Error al cargar estadísticas:', error);
        }
      })
    );
  }

  /**
   * 📄 CONSTRUIR URL DEL COMPROBANTE
   */
  buildReceiptUrl(filename: string): string {
    if (!filename) return '';
    return `${environment.url}transfers/receipt/${filename}`;
  }

  /**
   * 🔄 RECARGAR TODO
   */
  reloadAll(): void {
    this.loadPendingTransfers().subscribe();
    this.loadStats().subscribe();
  }

  /**
   * 🧹 LIMPIAR ESTADO
   */
  clearState(): void {
    this.state.set({
      transfers: [],
      stats: null,
      isLoading: false,
      error: null
    });
  }
}
