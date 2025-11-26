import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface RefundCalculations {
  subtotal: number;
  iva: number;
  ivaRate: number;
  platformFee: number;
  platformFeeRate: number;
  processingFee: number;
  processingFeeRate: number;
  refundAmount: number;
  refundPercentage: number;
}

export interface RefundDetails {
  bankAccount?: string;
  bankName?: string;
  accountHolder?: string;
  receiptNumber?: string;
  receiptImage?: string;
}

export interface Refund {
  _id?: string;
  sale: any;
  user: any;
  course?: any;
  project?: any;
  originalAmount: number;
  currency: string;
  calculations: RefundCalculations;
  reason: {
    type: string;
    description: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  refundDetails: RefundDetails;
  requestedAt?: Date;
  reviewedAt?: Date;
  processedAt?: Date;
  completedAt?: Date;
  adminNotes?: string;
  reviewedBy?: any;
  taxInvoice?: {
    cfdiGenerated: boolean;
    cfdiUuid?: string;
    invoiceUrl?: string;
  };
  state?: number;
}

// ✅ NUEVA: Interfaz para elegibilidad
export interface RefundEligibility {
  isEligible: boolean;
  isWithinTimeLimit: boolean;
  hasExistingRefund: boolean;
  instructorAlreadyPaid: boolean;
  daysSincePurchase: number;
  daysRemaining: number;
  daysLimit: number;
  saleStatus: string;
  existingRefundStatus: string | null;
  reasons: {
    timeExpired: boolean;
    alreadyRequested: boolean;
    instructorPaid: boolean;
    notPaid: boolean;
  };
}

interface RefundState {
  refunds: Refund[];
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class RefundsService {
  private url = environment.url;

  // Estado con signals
  private state = signal<RefundState>({
    refunds: [],
    isLoading: false,
    error: null
  });

  // Computed signals
  refunds = computed(() => this.state().refunds);
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);

  // Filtros por estado
  pendingRefunds = computed(() =>
    this.refunds().filter(r => r.status === 'pending')
  );

  processingRefunds = computed(() =>
    this.refunds().filter(r => r.status === 'processing')
  );

  completedRefunds = computed(() =>
    this.refunds().filter(r => r.status === 'completed')
  );

  // Estadísticas
  totalRefunds = computed(() => this.refunds().length);
  totalOriginalAmount = computed(() =>
    this.refunds().reduce((sum, r) => sum + r.originalAmount, 0)
  );
  totalRefundedAmount = computed(() =>
    this.refunds().reduce((sum, r) => sum + (r.calculations?.refundAmount || 0), 0)
  );

  constructor(private http: HttpClient) { }

  // Cargar lista de reembolsos
  async loadRefunds(): Promise<void> {
    this.state.update(s => ({ ...s, isLoading: true, error: null }));

    try {
      const response = await this.http.get<Refund[]>(
        `${this.url}refunds/list`
      ).toPromise();

      this.state.update(s => ({
        ...s,
        refunds: response || [],
        isLoading: false
      }));

    } catch (error: any) {
      this.state.update(s => ({
        ...s,
        isLoading: false,
        error: error.message || 'Error al cargar reembolsos'
      }));
    }
  }

  // ✅ NUEVO: Verificar elegibilidad de reembolso
  async checkEligibility(saleId: string): Promise<RefundEligibility | null> {
    try {
      const response = await this.http.get<RefundEligibility>(
        `${this.url}refunds/check-eligibility?sale_id=${saleId}`
      ).toPromise();

      return response || null;
    } catch (error: any) {
      throw error;
    }
  }

  // Calcular preview del reembolso
  async calculatePreview(saleId: string): Promise<any> {
    try {
      const response = await this.http.get(
        `${this.url}refunds/calculate-preview?sale_id=${saleId}`
      ).toPromise();

      return response;
    } catch (error: any) {
      throw error;
    }
  }

  // Crear solicitud de reembolso
  async createRefund(data: {
    sale_id: string;
    reason_type: string;
    reason_description: string;
    bank_account: string;
    bank_name: string;
    account_holder: string;
  }): Promise<any> {
    try {
      const response = await this.http.post(
        `${this.url}refunds/create`,
        data
      ).toPromise();


      // Recargar lista
      await this.loadRefunds();

      return response;
    } catch (error: any) {
      throw error;
    }
  }

  // Revisar reembolso (aprobar/rechazar)
  async reviewRefund(
    refundId: string,
    status: 'approved' | 'rejected',
    adminNotes?: string
  ): Promise<any> {
    try {
      const response = await this.http.put(
        `${this.url}refunds/review/${refundId}`,
        { status, admin_notes: adminNotes }
      ).toPromise();


      // Recargar lista
      await this.loadRefunds();

      return response;
    } catch (error: any) {
      throw error;
    }
  }

  // Marcar como completado
  async markCompleted(
    refundId: string,
    receiptNumber: string,
    receiptImage?: string
  ): Promise<any> {
    try {
      const response = await this.http.put(
        `${this.url}refunds/complete/${refundId}`,
        { receipt_number: receiptNumber, receipt_image: receiptImage }
      ).toPromise();


      // Recargar lista
      await this.loadRefunds();

      return response;
    } catch (error: any) {
      throw error;
    }
  }

  // Obtener estadísticas
  async loadStatistics(): Promise<any> {
    try {
      const response = await this.http.get(
        `${this.url}refunds/statistics`
      ).toPromise();

      return response;
    } catch (error: any) {
      throw error;
    }
  }

  // 🔥 CORREGIDO: Verificar si un curso tiene reembolso completado
  // NOTA: Este método ya NO se usa para verificar compras en el HOME
  // porque no distingue entre múltiples compras del mismo producto
  hasCourseRefund(courseId: string): boolean {
    const refundsCount = this.refunds().filter(r =>
      r.status === 'completed' &&
      r.course?._id === courseId
    ).length;

    return refundsCount > 0;
  }

  // 🔥 CORREGIDO: Verificar si un proyecto tiene reembolso completado
  // NOTA: Este método ya NO se usa para verificar compras en el HOME
  // porque no distingue entre múltiples compras del mismo producto
  hasProjectRefund(projectId: string): boolean {
    const refundsCount = this.refunds().filter(r =>
      r.status === 'completed' &&
      r.project?._id === projectId
    ).length;

    return refundsCount > 0;
  }

  // ✅ NUEVO: Verificar si una venta específica tiene reembolso completado
  hasSaleRefund(saleId: string): boolean {
    const hasRefund = this.refunds().some(r =>
      r.status === 'completed' &&
      r.sale?._id === saleId
    );

    return hasRefund;
  }
}
