import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService } from '../../../core/services/reports.service';
import * as XLSX from 'xlsx';

interface RefundRecord {
  _id: string;
  user: { name: string; surname: string; email: string };
  course?: { title: string };
  project?: { title: string };
  originalAmount: number;
  refundAmount: number;
  status: string;
  reason: { type: string; description: string };
  requestedAt: Date;
  completedAt?: Date;
}

@Component({
  selector: 'app-refunds-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- 📊 KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-xl p-6">
          <div>
            <p class="text-sm text-red-400 font-medium">Total Reembolsos</p>
            <p class="text-3xl font-bold text-white mt-2">{{ filteredRefunds().length }}</p>
            <p class="text-xs text-slate-400 mt-1">Solicitudes totales</p>
          </div>
        </div>

        <div class="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6">
          <div>
            <p class="text-sm text-orange-400 font-medium">Monto Total</p>
            <p class="text-3xl font-bold text-white mt-2">{{ formatCurrency(totalAmount()) }}</p>
            <p class="text-xs text-slate-400 mt-1">Dinero reembolsado</p>
          </div>
        </div>

        <div class="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-xl p-6">
          <div>
            <p class="text-sm text-yellow-400 font-medium">Pendientes</p>
            <p class="text-3xl font-bold text-white mt-2">{{ pendingRefunds().length }}</p>
            <p class="text-xs text-slate-400 mt-1">Por revisar</p>
          </div>
        </div>

        <div class="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-6">
          <div>
            <p class="text-sm text-green-400 font-medium">Completados</p>
            <p class="text-3xl font-bold text-white mt-2">{{ completedRefunds().length }}</p>
            <p class="text-xs text-slate-400 mt-1">Finalizados</p>
          </div>
        </div>
      </div>

      <!-- 🔍 Filtros -->
      <div class="bg-slate-800/50 border border-white/10 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>🔍</span> Filtros
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Fecha Inicio</label>
            <input 
              type="date" 
              [(ngModel)]="startDate"
              (change)="applyFilters()"
              class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-lime-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Fecha Fin</label>
            <input 
              type="date" 
              [(ngModel)]="endDate"
              (change)="applyFilters()"
              class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-lime-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Estado</label>
            <select 
              [(ngModel)]="statusFilter"
              (change)="applyFilters()"
              class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-lime-500"
            >
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobado</option>
              <option value="completed">Completado</option>
              <option value="rejected">Rechazado</option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-3 mt-4">
          <button 
            (click)="clearFilters()"
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            🗑️ Limpiar Filtros
          </button>

          <button 
            (click)="exportToExcel()"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            📊 Exportar Excel
          </button>
        </div>
      </div>

      <!-- 📋 Tabla de Reembolsos -->
      <div class="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
        <div class="p-6 border-b border-white/10">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <span>📋</span> Solicitudes de Reembolso
            <span class="text-sm font-normal text-slate-400">({{ filteredRefunds().length }} registros)</span>
          </h3>
        </div>

        @if (isLoading()) {
          <div class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-slate-900/50">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Usuario</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Producto</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Fecha</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">Monto</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase">Estado</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Motivo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                @for (refund of paginatedRefunds(); track refund._id) {
                  <tr class="hover:bg-white/5 transition-colors">
                    <td class="px-6 py-4">
                      <div class="text-sm text-white">{{ refund.user.name }} {{ refund.user.surname }}</div>
                      <div class="text-xs text-slate-400">{{ refund.user.email }}</div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="text-sm text-white">
                        {{ refund.course?.title || refund.project?.title || 'N/A' }}
                      </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-300">
                      {{ formatDate(refund.requestedAt) }}
                    </td>
                    <td class="px-6 py-4 text-right">
                      <span class="text-sm font-semibold text-red-400">{{ formatCurrency(refund.refundAmount) }}</span>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span [ngClass]="getStatusClass(refund.status)" class="px-2 py-1 text-xs rounded-full">
                        {{ getStatusText(refund.status) }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <div class="text-sm text-slate-300">{{ refund.reason.type }}</div>
                      <div class="text-xs text-slate-500 truncate max-w-xs">{{ refund.reason.description }}</div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                      <div class="flex flex-col items-center gap-3">
                        <span class="text-4xl">📭</span>
                        <p class="text-lg">No hay reembolsos para mostrar</p>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          @if (filteredRefunds().length > itemsPerPage()) {
            <div class="px-6 py-4 border-t border-white/10 flex items-center justify-between">
              <div class="text-sm text-slate-400">
                Mostrando {{ ((currentPage() - 1) * itemsPerPage()) + 1 }} - 
                {{ Math.min(currentPage() * itemsPerPage(), filteredRefunds().length) }} 
                de {{ filteredRefunds().length }}
              </div>
              
              <div class="flex items-center gap-2">
                <button 
                  (click)="currentPage.set(currentPage() - 1)"
                  [disabled]="currentPage() === 1"
                  class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg text-sm"
                >
                  Anterior
                </button>
                
                <span class="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-sm">
                  {{ currentPage() }} / {{ totalPages() }}
                </span>
                
                <button 
                  (click)="currentPage.set(currentPage() + 1)"
                  [disabled]="currentPage() === totalPages()"
                  class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg text-sm"
                >
                  Siguiente
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class RefundsReportComponent implements OnInit {
  private reportsService = inject(ReportsService);

  refunds = signal<RefundRecord[]>([]);
  isLoading = signal(false);

  // Filtros
  startDate = '';
  endDate = '';
  statusFilter = '';

  // Paginación
  currentPage = signal(1);
  itemsPerPage = signal(20);

  // Computed
  filteredRefunds = computed(() => {
    let filtered = this.refunds();

    if (this.startDate) {
      filtered = filtered.filter(r => new Date(r.requestedAt) >= new Date(this.startDate));
    }
    if (this.endDate) {
      filtered = filtered.filter(r => new Date(r.requestedAt) <= new Date(this.endDate));
    }
    if (this.statusFilter) {
      filtered = filtered.filter(r => r.status === this.statusFilter);
    }

    return filtered;
  });

  paginatedRefunds = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredRefunds().slice(start, start + this.itemsPerPage());
  });

  totalPages = computed(() => Math.ceil(this.filteredRefunds().length / this.itemsPerPage()) || 1);
  totalAmount = computed(() => this.filteredRefunds().reduce((sum, r) => sum + r.refundAmount, 0));
  pendingRefunds = computed(() => this.filteredRefunds().filter(r => r.status === 'pending'));
  completedRefunds = computed(() => this.filteredRefunds().filter(r => r.status === 'completed'));

  Math = Math;

  ngOnInit() {
    this.loadRefunds();
  }

  async loadRefunds() {
    this.isLoading.set(true);
    try {
      const response = await this.reportsService.getRefundsReport().toPromise();
      if (response && response.refunds) {
        this.refunds.set(response.refunds);
      }
    } catch (error) {
      console.error('❌ Error cargando reembolsos:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  applyFilters() {
    this.currentPage.set(1);
  }

  clearFilters() {
    this.startDate = '';
    this.endDate = '';
    this.statusFilter = '';
    this.applyFilters();
  }

  exportToExcel() {
    const data = this.filteredRefunds().map(r => ({
      'Usuario': `${r.user.name} ${r.user.surname}`,
      'Email': r.user.email,
      'Producto': r.course?.title || r.project?.title || 'N/A',
      'Fecha Solicitud': this.formatDate(r.requestedAt),
      'Monto Original (USD)': r.originalAmount,
      'Monto Reembolsado (USD)': r.refundAmount,
      'Estado': this.getStatusText(r.status),
      'Motivo': r.reason.type,
      'Descripción': r.reason.description
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reembolsos');
    XLSX.writeFile(wb, `reembolsos_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-300',
      approved: 'bg-blue-500/20 text-blue-300',
      completed: 'bg-green-500/20 text-green-300',
      rejected: 'bg-red-500/20 text-red-300'
    };
    return classes[status] || 'bg-slate-500/20 text-slate-300';
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      completed: 'Completado',
      rejected: 'Rechazado'
    };
    return texts[status] || status;
  }

  formatCurrency(amount: number): string {
    return `USD ${amount.toFixed(2)}`;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
