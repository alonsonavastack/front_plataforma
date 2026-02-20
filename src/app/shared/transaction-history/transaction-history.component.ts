import { Component, Input, signal, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';

export interface Transaction {
  _id: string;
  n_transaccion: string;
  method_payment: string;
  total: number;
  currency_total: string;
  status: string;
  items: {
    product: {
      _id: string;
      title: string;
      imagen?: string;
    };
    product_type: 'course' | 'project';
    price: number;
  }[];
  createdAt: string;
}

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold text-white">Historial de Transacciones</h3>
        @if (transactions().length > 0) {
          <span class="text-sm text-slate-400">{{ transactions().length }} transacción{{ transactions().length !== 1 ? 'es' : '' }}</span>
        }
      </div>

      <!-- Search -->
      <div class="relative">
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearchChange()"
          placeholder="Buscar por número de transacción..."
          class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-400"
        />
        <svg class="absolute right-3 top-3.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>

      <!-- Transactions List -->
      @if (filteredTransactions().length > 0) {
        <div class="space-y-3">
          @for (transaction of filteredTransactions(); track transaction._id) {
            <div class="bg-slate-800/50 border border-slate-700 rounded-lg p-5 hover:bg-slate-800 transition-colors">
              <!-- Transaction Header -->
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-mono text-slate-400">N° Transacción:</span>
                    <span class="font-bold text-lime-300">{{ transaction.n_transaccion }}</span>
                    <button
                      (click)="copyToClipboard(transaction.n_transaccion)"
                      class="p-1 hover:bg-slate-700 rounded transition-colors"
                      title="Copiar número de transacción"
                    >
                      <svg class="w-4 h-4 text-slate-400 hover:text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                      </svg>
                    </button>
                  </div>
                  <p class="text-xs text-slate-500 mt-1">{{ formatDate(transaction.createdAt) }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-2xl font-bold text-white">\${{ transaction.total.toFixed(2) }}</span>
                  <span [class]="getStatusClass(transaction.status)" class="px-3 py-1 rounded-full text-xs font-semibold">
                    {{ getStatusLabel(transaction.status) }}
                  </span>
                </div>
              </div>

              <!-- Payment Method -->
              <div class="flex items-center gap-2 mb-4 text-sm text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                </svg>
                <span>{{ getPaymentMethodLabel(transaction.method_payment) }}</span>
                <span class="text-slate-600">•</span>
                <span>{{ transaction.currency_total }}</span>
              </div>

              <!-- Items Purchased -->
              <div class="space-y-2">
                <p class="text-xs font-semibold text-slate-400 uppercase">Productos comprados:</p>
                @for (item of transaction.items; track item.product._id) {
                  <div class="flex items-center gap-3 p-2 bg-slate-900/50 rounded-lg">
                    <div class="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                      @if (item.product_type === 'course') {
                        <svg class="w-5 h-5 text-lime-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
                        </svg>
                      } @else {
                        <svg class="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
                        </svg>
                      }
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-white truncate">{{ item.product.title }}</p>
                      <p class="text-xs text-slate-400">{{ item.product_type === 'course' ? 'Curso' : 'Proyecto' }}</p>
                    </div>
                    <span class="text-sm font-semibold text-slate-300">\${{ item.price.toFixed(2) }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } @else if (searchQuery().trim()) {
        <!-- No results for search -->
        <div class="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700 border-dashed">
          <svg class="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <p class="text-slate-400 font-medium">No se encontraron transacciones</p>
          <p class="text-slate-500 text-sm mt-1">con el número "{{ searchQuery() }}"</p>
        </div>
      } @else {
        <!-- Empty state -->
        <div class="text-center py-16 bg-slate-800/30 rounded-lg border border-slate-700 border-dashed">
          <svg class="w-20 h-20 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p class="text-slate-400 text-lg font-medium">No tienes transacciones aún</p>
          <p class="text-slate-500 text-sm mt-2">Tus compras aparecerán aquí</p>
        </div>
      }
    </div>
  `
})
export class TransactionHistoryComponent {
  @Input() set transactionData(data: Transaction[]) {
    this.transactions.set(data || []);
  }

  transactions = signal<Transaction[]>([]);
  searchQuery = signal('');

  filteredTransactions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.transactions();

    return this.transactions().filter(t =>
      t.n_transaccion.toLowerCase().includes(query)
    );
  });

  onSearchChange() {
    // Trigger computed update
    this.searchQuery.update(v => v);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'completed': 'Completado',
      'pending': 'Pendiente',
      'cancelled': 'Cancelado',
      'refunded': 'Reembolsado'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'completed': 'bg-green-900/50 text-green-300 border border-green-500/30',
      'pending': 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30',
      'cancelled': 'bg-red-900/50 text-red-300 border border-red-500/30',
      'refunded': 'bg-blue-900/50 text-blue-300 border border-blue-500/30'
    };
    return classes[status] || 'bg-slate-700 text-slate-300';
  }

  getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'transfer': 'Transferencia Bancaria',
      'transferencia': 'Transferencia Bancaria',
      'card': 'Tarjeta de Crédito/Débito',
      'stripe': 'Stripe (Tarjeta)',
      'mixed_stripe': 'Stripe + Billetera',
      'wallet': 'Billetera Digital',
      'other': 'Otro'
    };
    return labels[method] || method;
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Aquí podrías mostrar un toast notification

    });
  }
}
