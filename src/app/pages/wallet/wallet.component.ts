import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../layout/header/header';
import { WalletService, WalletTransaction } from '../../core/services/wallet.service';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
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
    return txs.filter(t => t.type === this.typeFilter);
  });

  // Computed: Estadísticas
  stats = computed(() => {
    const txs = this.transactions();
    
    // 💰 TOTAL RECIBIDO: Solo sumar los ingresos (credits)
    // Esto incluye: reembolsos, créditos manuales, etc.
    const totalCredits = txs
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // 💳 TOTAL GASTADO: Solo sumar los gastos (debits)
    // Esto incluye SOLO compras hechas CON DINERO DE LA WALLET
    const totalDebits = txs
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // 📊 BALANCE NETO: La diferencia entre lo recibido y lo gastado
    // Esto debería coincidir con el balance actual de la wallet
    const netBalance = totalCredits - totalDebits;
    
    console.log('📊 [Wallet Stats]', {
      totalTransactions: txs.length,
      totalCredits,
      totalDebits,
      netBalance,
      currentBalance: this.balance()
    });
    
    return {
      totalTransactions: txs.length,
      totalCredits,
      totalDebits,
      netBalance
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

  async ngOnInit() {
    await this.loadWallet();
  }

  async loadWallet() {
    try {
      await this.walletService.loadWallet();
    } catch (error) {
      console.error('Error loading wallet:', error);
      alert('❌ Error al cargar la billetera. Por favor, intenta de nuevo.');
    }
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
