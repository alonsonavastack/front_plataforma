import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  InstructorPaymentService,
  Payment,
} from '../../core/services/instructor-payment.service';

@Component({
  selector: 'app-instructor-payment-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instructor-payment-history.html',
})
export class InstructorPaymentHistoryComponent implements OnInit {
  private instructorPaymentService = inject(InstructorPaymentService);

  // Signals
  payments = this.instructorPaymentService.paymentHistory;
  isLoading = this.instructorPaymentService.isLoadingPaymentHistory;
  error = this.instructorPaymentService.paymentHistoryError;

  pagination = this.instructorPaymentService.paymentHistoryPagination;
  currentPage = computed(() => this.pagination()?.page || 1);
  totalPages = computed(() => this.pagination()?.pages || 1);
  totalItems = computed(() => this.pagination()?.total || 0);

  limit = 10;
  expandedPayment = signal<string | null>(null);

  // Computed
  hasPayments = computed(() => this.payments().length > 0);

  ngOnInit() {
    this.loadPayments();
  }

  loadPayments(page: number = 1) {
    this.instructorPaymentService.setPaymentHistoryPage(page);
    this.instructorPaymentService.setPaymentHistoryLimit(this.limit);
    // Explicit reload if necessary, but changing signals usually triggers it.
    // However, setPaymentHistoryPage updates a signal, which triggers the resource.
  }

  toggleExpand(paymentId: string) {
    if (this.expandedPayment() === paymentId) {
      this.expandedPayment.set(null);
    } else {
      this.expandedPayment.set(paymentId);
    }
  }

  isExpanded(paymentId: string): boolean {
    return this.expandedPayment() === paymentId;
  }

  onPageChange(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.loadPayments(page);
  }

  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      pending: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
      processing: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      completed: 'bg-green-500/10 text-green-300 border-green-500/30',
      failed: 'bg-red-500/10 text-red-300 border-red-500/30',
      cancelled: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    };
    return classes[status] || 'bg-slate-500/10 text-slate-300 border-slate-500/30';
  }

  getStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      pending: 'Pendiente',
      processing: 'Procesando',
      completed: 'Completado',
      failed: 'Fallido',
      cancelled: 'Cancelado',
    };
    return texts[status] || status;
  }

  getPaymentMethodIcon(method: string): string {
    const icons: { [key: string]: string } = {
      paypal: '💳',
      bank_transfer: '🏦',
      other: '💰',
    };
    return icons[method] || '💰';
  }

  getPaymentMethodText(method: string): string {
    const texts: { [key: string]: string } = {
      paypal: 'PayPal',
      bank_transfer: 'Transferencia Bancaria',
      other: 'Otro',
    };
    return texts[method] || method;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatCurrency(amount: number, currency: string = 'MXN'): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push(-1);
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      }
    }

    return pages;
  }
}
