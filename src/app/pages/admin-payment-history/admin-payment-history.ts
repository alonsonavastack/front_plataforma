import { Component, inject, signal, computed, OnInit } from '@angular/core';

import { ReactiveFormsModule, FormGroup, FormControl, FormsModule } from '@angular/forms';
import { AdminPaymentService } from '../../core/services/admin-payment.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-payment-history',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './admin-payment-history.html',
})
export class AdminPaymentHistoryComponent implements OnInit {
  private adminPaymentService = inject(AdminPaymentService);

  payments = this.adminPaymentService.paymentsHistory;
  isLoading = this.adminPaymentService.isLoadingPaymentsHistory;

  loadError = this.adminPaymentService.paymentsHistoryError;
  actionError = signal<string | null>(null);

  // 🔥 Combine errors
  error = computed(() => this.loadError() || this.actionError());

  success = signal<string | null>(null);

  // Paginación desde el servicio
  pagination = this.adminPaymentService.paymentsPagination;
  currentPage = computed(() => this.pagination()?.page || 1);
  totalPages = computed(() => this.pagination()?.pages || 1);

  // Modales
  showProcessModal = signal(false);
  showCompleteModal = signal(false);
  showDetailsModal = signal(false);
  selectedPaymentId = signal<string | null>(null);
  selectedPayment = signal<any | null>(null);
  selectedPaymentMethod = signal<any | null>(null); // 🔥 Nuevo: datos bancarios completos
  isProcessing = signal(false);
  isLoadingPaymentMethod = signal(false); // 🔥 Nuevo: loading state

  // Expose Math to the template
  Math = Math;

  filterForm = new FormGroup({
    status: new FormControl('all'),
  });

  ngOnInit() {
    this.loadPayments();
  }

  loadPayments(page: number = 1) {
    const formValue = this.filterForm.value;
    const filters: { status?: string; page: number; limit: number } = { page, limit: 20 };

    // Only add filters that have a value and are not 'all'
    if (formValue.status && formValue.status !== 'all') {
      filters.status = formValue.status;
    }

    this.adminPaymentService.setPaymentHistoryFilters(filters);
  }

  onFilterChange() {
    this.loadPayments(1);
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.loadPayments(page);
    }
  }

  // ========================================
  // GESTIÓN DE ESTADOS DE PAGO
  // ========================================

  viewPaymentDetails(payment: any) {
    this.selectedPayment.set(payment);
    this.showDetailsModal.set(true);
    // 🔥 Cargar datos bancarios completos del instructor
    this.loadInstructorPaymentMethodFull(payment.instructor._id);
  }

  /**
   * 🔥 NUEVO: Cargar datos bancarios completos (sin encriptar) del instructor
   */
  loadInstructorPaymentMethodFull(instructorId: string) {
    this.isLoadingPaymentMethod.set(true);
    this.selectedPaymentMethod.set(null);
    this.actionError.set(null);

    this.adminPaymentService.getInstructorPaymentMethodFull(instructorId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.selectedPaymentMethod.set(response.data);
        }
        this.isLoadingPaymentMethod.set(false);
      },
      error: (err) => {
        this.actionError.set(err.error?.message || 'Error al cargar método de pago');
        this.isLoadingPaymentMethod.set(false);
      }
    });
  }

  openProcessModal(paymentId: string) {
    this.selectedPaymentId.set(paymentId);
    this.showDetailsModal.set(false);
    this.showProcessModal.set(true);
  }

  openProcessModalFromDetails() {
    const payment = this.selectedPayment();
    if (payment) {
      this.selectedPaymentId.set(payment._id);
      this.showDetailsModal.set(false);
      this.showProcessModal.set(true);
    }
  }

  openCompleteModal(paymentId: string) {
    this.selectedPaymentId.set(paymentId);
    this.showCompleteModal.set(true);
  }

  closeModals() {
    this.showProcessModal.set(false);
    this.showCompleteModal.set(false);
    this.showDetailsModal.set(false);
    this.selectedPaymentId.set(null);
    this.selectedPayment.set(null);
    this.selectedPaymentMethod.set(null); // 🔥 Limpiar datos bancarios
    this.actionError.set(null);
  }

  processPayment(transactionId?: string, receiptUrl?: string) {
    const paymentId = this.selectedPaymentId();
    if (!paymentId) return;

    this.isProcessing.set(true);
    this.actionError.set(null);

    this.adminPaymentService.processPayment(paymentId, {
      transaction_id: transactionId,
      receipt_url: receiptUrl
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.success.set('Pago marcado como "En Proceso" exitosamente');
          this.loadPayments(this.currentPage());
          this.closeModals();
          setTimeout(() => this.success.set(null), 3000);
        }
        this.isProcessing.set(false);
      },
      error: (err) => {
        this.actionError.set(err.error?.message || 'Error al procesar el pago');
        this.isProcessing.set(false);
      }
    });
  }

  completePayment() {
    const paymentId = this.selectedPaymentId();
    if (!paymentId) return;

    this.isProcessing.set(true);
    this.actionError.set(null);

    this.adminPaymentService.completePayment(paymentId).subscribe({
      next: (response) => {
        if (response.success) {
          this.success.set('Pago completado exitosamente');
          this.loadPayments(this.currentPage());
          this.closeModals();
          setTimeout(() => this.success.set(null), 3000);
        }
        this.isProcessing.set(false);
      },
      error: (err) => {
        this.actionError.set(err.error?.message || 'Error al completar el pago');
        this.isProcessing.set(false);
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStatusBadgeClass(status: string): string {
    const classes = {
      pending: 'bg-yellow-500/20 text-yellow-300',
      processing: 'bg-blue-500/20 text-blue-300',
      completed: 'bg-green-500/20 text-green-300',
      failed: 'bg-red-500/20 text-red-300',
      cancelled: 'bg-slate-500/20 text-slate-300'
    };
    return classes[status as keyof typeof classes] || 'bg-slate-500/20 text-slate-300';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'Pendiente',
      processing: 'Procesando',
      completed: 'Completado',
      failed: 'Fallido',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  }

  getInstructorAvatar(instructor: any): string {
    // Si tiene avatar, usar la misma lógica que AuthService
    if (instructor?.avatar) {
      return `${environment.images.user}${instructor.avatar}`;
    }
    // Fallback similar al AuthService
    return 'https://i.pravatar.cc/128';
  }

  getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      paypal: 'PayPal',
      bank_transfer: 'Transferencia Bancaria',
      other: 'Otro'
    };
    return labels[method] || method;
  }

  copyToClipboard(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.success.set('Copiado al portapapeles');
        setTimeout(() => this.success.set(null), 2000);
      });
    }
  }
}
