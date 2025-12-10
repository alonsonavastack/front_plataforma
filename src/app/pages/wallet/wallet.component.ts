import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../layout/header/header';
import { WalletService, WalletTransaction } from '../../core/services/wallet.service';
import { AuthService } from '../../core/services/auth';
import { MxnCurrencyPipe } from '../../shared/pipes/mxn-currency.pipe';
@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, MxnCurrencyPipe],
  templateUrl: './wallet.component.html'
})
export class WalletComponent implements OnInit {
  private walletService = inject(WalletService);
  private authService = inject(AuthService);

  // Signals principales
  balance = computed(() => this.walletService.balance());
  transactions = computed(() => this.walletService.transactions());
  isLoading = computed(() => this.walletService.loading());

  // Filtros
  typeFilter = 'all';
  currentPage = signal(1);
  itemsPerPage = signal(10);

  // Modal de detalles
  showDetailModal = signal(false);
  selectedTransaction = signal<WalletTransaction | null>(null);

  // Exponer Math para template
  Math = Math;

  // Computed: Transacciones filtradas
  filteredTransactions = computed(() => {
    const txs = this.transactions();
    if (this.typeFilter === 'all') return txs;
    return txs.filter((t: WalletTransaction) => t.type === this.typeFilter);
  });

  // Filtros de fecha para estadísticas detalladas
  startDate = signal<string>('');
  endDate = signal<string>('');

  // Computed: Estadísticas Principales (Refinadas/Netas)
  stats = computed(() => {
    const txs = this.transactions();

    // 💰 TOTAL RECIBIDO (Ingreso Real):
    // Solo sumar créditos que NO sean reembolsos (ej. depósitos manuales, regalos)
    const totalCredits = txs
      .filter((t: WalletTransaction) => t.type === 'credit' && t.metadata?.reason !== 'refund')
      .reduce((sum: number, t: WalletTransaction) => sum + t.amount, 0);

    // 🔄 TOTAL REEMBOLSADO:
    // Sumar créditos que SÍ sean reembolsos
    const totalRefunded = txs
      .filter((t: WalletTransaction) => t.type === 'credit' && t.metadata?.reason === 'refund')
      .reduce((sum: number, t: WalletTransaction) => sum + t.amount, 0);

    // 💳 TOTAL DEBITADO (Gasto Bruto):
    // Suma de todas las compras
    const grossDebits = txs
      .filter((t: WalletTransaction) => t.type === 'debit')
      .reduce((sum: number, t: WalletTransaction) => sum + t.amount, 0);

    // 📉 TOTAL GASTADO (Gasto Neto):
    // Gasto Bruto - Total Reembolsado
    // Esto refleja lo que realmente "salió" de la billetera y no volvió
    const netDebits = Math.max(0, grossDebits - totalRefunded);

    // 📊 BALANCE NETO:
    // Ingreso Real - Gasto Neto
    const netBalance = totalCredits - netDebits;

    return {
      totalTransactions: txs.length,
      totalCredits, // Ahora es Ingreso Real
      totalDebits: netDebits, // Ahora es Gasto Neto
      netBalance
    };
  });

  // Computed: Estadísticas Detalladas (Brutas con Filtros)
  detailedStats = computed(() => {
    let txs = this.transactions();
    const start = this.startDate();
    const end = this.endDate();

    // Filtrar por fecha si existen
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      // Ajustar fin del día para incluir transacciones de ese día
      endDate.setHours(23, 59, 59, 999);

      txs = txs.filter((t: WalletTransaction) => {
        const date = new Date(t.createdAt);
        return date >= startDate && date <= endDate;
      });
    }

    // Cálculos Brutos (Total Absoluto)
    const grossIncome = txs
      .filter((t: WalletTransaction) => t.type === 'credit')
      .reduce((sum: number, t: WalletTransaction) => sum + t.amount, 0);

    const grossExpenses = txs
      .filter((t: WalletTransaction) => t.type === 'debit')
      .reduce((sum: number, t: WalletTransaction) => sum + t.amount, 0);

    const refunds = txs
      .filter((t: WalletTransaction) => t.type === 'credit' && t.metadata?.reason === 'refund')
      .reduce((sum: number, t: WalletTransaction) => sum + t.amount, 0);

    const netPeriodBalance = grossIncome - grossExpenses;

    return {
      grossIncome,
      grossExpenses,
      refunds,
      netPeriodBalance,
      transactionCount: txs.length
    };
  });

  // Computed: Paginación
  totalPages = computed(() =>
    Math.ceil(this.filteredTransactions().length / this.itemsPerPage())
  );

  paginatedTransactions = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredTransactions().slice(start, end);
  });

  // Computed: Números de página con puntos suspensivos
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      // Si hay 7 o menos páginas, mostrar todas
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Lógica con puntos suspensivos
      pages.push(1); // Primera página siempre visible

      if (current > 3) {
        pages.push(-1); // Puntos suspensivos
      }

      // Páginas alrededor de la actual
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1); // Puntos suspensivos
      }

      pages.push(total); // Última página siempre visible
    }

    return pages;
  });

  ngOnInit() {
    this.loadWallet();
  }

  loadWallet() {
    this.walletService.loadWallet();
  }

  applyFilters() {
    this.currentPage.set(1);
  }

  goToPage(page: number) {
    if (page > 0 && page <= this.totalPages()) {
      this.currentPage.set(page);
      // Scroll suave al inicio de la tabla
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Modal de detalles
  openTransactionDetail(transaction: WalletTransaction) {
    this.selectedTransaction.set(transaction);
    this.showDetailModal.set(true);
  }

  closeDetailModal() {
    this.showDetailModal.set(false);
    setTimeout(() => {
      this.selectedTransaction.set(null);
    }, 300);
  }

  // Helpers
  getTransactionTitle(transaction: WalletTransaction): string {
    if (transaction.type === 'credit') {
      if (transaction.metadata?.refundId) {
        return '🔄 Reembolso Acreditado';
      }
      if (transaction.metadata?.reason === 'manual_credit') {
        return '💰 Crédito Manual';
      }
      return '💵 Crédito a Billetera';
    } else {
      if (transaction.metadata?.orderId) {
        return '🛒 Compra Realizada';
      }
      return '💳 Débito de Billetera';
    }
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
