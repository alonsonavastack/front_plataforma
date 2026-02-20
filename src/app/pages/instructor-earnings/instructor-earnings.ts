import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, FormsModule } from '@angular/forms';
import {
  InstructorPaymentService,
  Earning,
  EarningsStats,
} from '../../core/services/instructor-payment.service';
import { CurrencyService } from '../../services/currency.service';
import { PaymentSplitService } from '../../core/services/payment-split.service';

@Component({
  selector: 'app-instructor-earnings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './instructor-earnings.html',
})
export class InstructorEarningsComponent implements OnInit {
  private instructorPaymentService = inject(InstructorPaymentService);

  // Signals
  earnings = this.instructorPaymentService.earnings;
  stats = this.instructorPaymentService.earningsStats;

  isLoading = this.instructorPaymentService.isLoadingEarnings;
  isLoadingStats = this.instructorPaymentService.isLoadingStats;

  error = this.instructorPaymentService.earningsError;

  // Paginación desde el servicio
  pagination = this.instructorPaymentService.earningsPagination;
  currentPage = computed(() => this.pagination()?.page || 1);
  totalPages = computed(() => this.pagination()?.pages || 1);
  totalItems = computed(() => this.pagination()?.total || 0);

  limit = 20;

  // Computed
  hasEarnings = computed(() => this.earnings().length > 0);
  pendingTotal = computed(() => this.stats()?.pending.total || 0);
  availableTotal = computed(() => this.stats()?.available.total || 0);
  paidTotal = computed(() => this.stats()?.paid.total || 0);
  refundsTotal = computed(() => this.stats()?.refunds.total || 0);
  refundsCount = computed(() => this.stats()?.refunds.count || 0);
  totalEarned = computed(() => this.stats()?.total_earned || 0);
  totalSales = computed(() => this.stats()?.total_sales || 0);
  averagePerSale = computed(() => this.stats()?.average_per_sale || 0);

  // Expose Math to the template
  Math = Math;

  // Filter form
  filterForm = new FormGroup({
    status: new FormControl('all'),
    startDate: new FormControl(''),
    endDate: new FormControl(''),
  });

  // Filter properties for ngModel
  selectedStatus = 'all';
  startDate = '';
  endDate = '';

  ngOnInit() {
    this.loadStats();
    this.loadEarnings();
  }

  loadStats() {
    this.instructorPaymentService.reloadStats();
  }

  loadEarnings(page: number = 1) {
    const filters: any = {
      page,
      limit: this.limit,
    };

    if (this.selectedStatus && this.selectedStatus !== 'all') {
      filters.status = this.selectedStatus;
    }
    if (this.startDate) {
      filters.startDate = this.startDate;
    }
    if (this.endDate) {
      filters.endDate = this.endDate;
    }

    this.instructorPaymentService.setEarningsFilters(filters);
  }

  onFilterChange() {
    this.loadEarnings(1);
  }

  clearFilters() {
    this.selectedStatus = 'all';
    this.startDate = '';
    this.endDate = '';
    this.loadEarnings(1);
  }

  onPageChange(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.loadEarnings(page);
  }

  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      pending: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
      available: 'bg-green-500/10 text-green-300 border-green-500/30',
      paid: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      disputed: 'bg-red-500/10 text-red-300 border-red-500/30',
      refunded: 'bg-red-500/20 text-red-300 border-red-500/40',
    };
    return classes[status] || 'bg-slate-500/10 text-slate-300 border-slate-500/30';
  }

  getStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      pending: 'Pendiente',
      available: 'Disponible',
      paid: 'Pagado',
      disputed: 'En Disputa',
      refunded: 'Reembolsado',
    };
    return texts[status] || status;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private currencyService = inject(CurrencyService);
  private paymentSplitService = inject(PaymentSplitService);

  formatCurrency(amount: number): string {
    return this.currencyService.format(amount);
  }

  calculateFee(earning: Earning): number {
    if (earning.payment_fee_amount) {
      console.log(`[Fee] Usando valor guardado para ${earning.course?.title}:`, earning.payment_fee_amount);
      return earning.payment_fee_amount;
    }
    const split = this.paymentSplitService.calculateSplit(earning.sale_price);
    console.log(`[Fee] Calculado dinámicamente para ${earning.sale_price}:`, split.stripeFee);
    return split.stripeFee;
  }

  calculatePlatformCommission(earning: Earning): number {
    if (earning.platform_commission_amount) {
      console.log(`[Commission] Usando valor guardado:`, earning.platform_commission_amount);
      return earning.platform_commission_amount;
    }
    const split = this.paymentSplitService.calculateSplit(earning.sale_price);
    console.log(`[Commission] Calculado dinámicamente:`, split.platformShare);
    return split.platformShare;
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
