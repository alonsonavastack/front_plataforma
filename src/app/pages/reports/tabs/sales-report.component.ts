import { Component, OnInit, signal, computed, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ReportsService } from '../../../core/services/reports.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

Chart.register(...registerables);

interface SaleRecord {
  _id: string;
  course?: { title: string; _id: string };
  project?: { title: string; _id: string };
  user: { name: string; surname: string; email: string };
  salePrice: number;
  dateCreated: Date;
  paymentMethod: string;
  transactionId: string;
}

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-6">
      <!-- 📊 KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-green-400 font-medium">Ventas Totales</p>
              <p class="text-3xl font-bold text-white mt-2">{{ filteredSales().length }}</p>
              <p class="text-xs text-slate-400 mt-1">En el período seleccionado</p>
            </div>
            <div class="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <span class="text-2xl">🛒</span>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-blue-400 font-medium">Ingresos Brutos</p>
              <p class="text-3xl font-bold text-white mt-2">{{ formatCurrency(totalRevenue()) }}</p>
              <p class="text-xs text-slate-400 mt-1">Antes de comisiones</p>
            </div>
            <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <span class="text-2xl">💰</span>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-purple-400 font-medium">Ticket Promedio</p>
              <p class="text-3xl font-bold text-white mt-2">{{ formatCurrency(averageTicket()) }}</p>
              <p class="text-xs text-slate-400 mt-1">Por transacción</p>
            </div>
            <div class="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span class="text-2xl">📈</span>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-orange-400 font-medium">Cursos vs Proyectos</p>
              <p class="text-xl font-bold text-white mt-2">
                {{ coursesSales().length }} / {{ projectsSales().length }}
              </p>
              <p class="text-xs text-slate-400 mt-1">Distribución de ventas</p>
            </div>
            <div class="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <span class="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 🔍 Filtros Avanzados -->
      <div class="bg-slate-800/50 border border-white/10 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>🔍</span> Filtros Avanzados
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Rango de Fechas -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Fecha Inicio</label>
            <input 
              type="date" 
              [(ngModel)]="startDate"
              (change)="applyFilters()"
              class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Fecha Fin</label>
            <input 
              type="date" 
              [(ngModel)]="endDate"
              (change)="applyFilters()"
              class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            />
          </div>

          <!-- Tipo de Producto -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Tipo de Producto</label>
            <select 
              [(ngModel)]="productType"
              (change)="applyFilters()"
              class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="course">Cursos</option>
              <option value="project">Proyectos</option>
            </select>
          </div>

          <!-- Método de Pago -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Método de Pago</label>
            <select 
              [(ngModel)]="paymentMethod"
              (change)="applyFilters()"
              class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="mercadopago">MercadoPago</option>
            </select>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="flex items-center gap-3 mt-4">
          <button 
            (click)="clearFilters()"
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            🗑️ Limpiar Filtros
          </button>

          <button 
            (click)="exportToExcel()"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <span>📊</span> Exportar Excel
          </button>

          <button 
            (click)="exportToPDF()"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <span>📄</span> Exportar PDF
          </button>
        </div>
      </div>

      <!-- 📈 Gráfico de Tendencias -->
      <div class="bg-slate-800/50 border border-white/10 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">📈 Tendencia de Ventas</h3>
        <div class="relative" style="height: 400px;">
          <canvas #salesChart></canvas>
        </div>
      </div>

      <!-- 📋 Tabla de Ventas -->
      <div class="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
        <div class="p-6 border-b border-white/10">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <span>📋</span> Detalle de Ventas
            <span class="text-sm font-normal text-slate-400">({{ filteredSales().length }} registros)</span>
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
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Fecha</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Producto</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Cliente</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Método</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Monto</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                @for (sale of paginatedSales(); track sale._id) {
                  <tr class="hover:bg-white/5 transition-colors">
                    <td class="px-6 py-4 text-sm text-slate-300">
                      {{ formatDate(sale.dateCreated) }}
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        @if (sale.course) {
                          <span class="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">📚 Curso</span>
                          <span class="text-sm text-white">{{ sale.course.title }}</span>
                        } @else if (sale.project) {
                          <span class="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">🎯 Proyecto</span>
                          <span class="text-sm text-white">{{ sale.project.title }}</span>
                        }
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="text-sm text-white">{{ sale.user.name }} {{ sale.user.surname }}</div>
                      <div class="text-xs text-slate-400">{{ sale.user.email }}</div>
                    </td>
                    <td class="px-6 py-4">
                      <span class="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full">
                        {{ sale.paymentMethod || 'N/A' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <span class="text-sm font-semibold text-green-400">{{ formatCurrency(sale.salePrice) }}</span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="px-6 py-12 text-center text-slate-400">
                      <div class="flex flex-col items-center gap-3">
                        <span class="text-4xl">📭</span>
                        <p class="text-lg">No hay ventas en el período seleccionado</p>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          @if (filteredSales().length > itemsPerPage()) {
            <div class="px-6 py-4 border-t border-white/10 flex items-center justify-between">
              <div class="text-sm text-slate-400">
                Mostrando {{ ((currentPage() - 1) * itemsPerPage()) + 1 }} - 
                {{ Math.min(currentPage() * itemsPerPage(), filteredSales().length) }} 
                de {{ filteredSales().length }}
              </div>
              
              <div class="flex items-center gap-2">
                <button 
                  (click)="currentPage.set(currentPage() - 1)"
                  [disabled]="currentPage() === 1"
                  class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                >
                  Anterior
                </button>
                
                <span class="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-sm">
                  {{ currentPage() }} / {{ totalPages() }}
                </span>
                
                <button 
                  (click)="currentPage.set(currentPage() + 1)"
                  [disabled]="currentPage() === totalPages()"
                  class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: []
})
export class SalesReportComponent implements OnInit, AfterViewInit {
  @ViewChild('salesChart') salesChartRef!: ElementRef<HTMLCanvasElement>;
  
  private reportsService = inject(ReportsService);
  private chart: Chart | null = null;

  // 🎯 Estado
  sales = signal<SaleRecord[]>([]);
  isLoading = signal(false);

  // 🔍 Filtros
  startDate = '';
  endDate = '';
  productType = '';
  paymentMethod = '';

  // 📄 Paginación
  currentPage = signal(1);
  itemsPerPage = signal(20);

  // 📊 Computed Signals
  filteredSales = computed(() => {
    let filtered = this.sales();

    if (this.startDate) {
      filtered = filtered.filter(s => new Date(s.dateCreated) >= new Date(this.startDate));
    }
    if (this.endDate) {
      filtered = filtered.filter(s => new Date(s.dateCreated) <= new Date(this.endDate));
    }
    if (this.productType === 'course') {
      filtered = filtered.filter(s => s.course);
    } else if (this.productType === 'project') {
      filtered = filtered.filter(s => s.project);
    }
    if (this.paymentMethod) {
      filtered = filtered.filter(s => s.paymentMethod === this.paymentMethod);
    }

    return filtered;
  });

  paginatedSales = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredSales().slice(start, end);
  });

  totalPages = computed(() => Math.ceil(this.filteredSales().length / this.itemsPerPage()) || 1);
  totalRevenue = computed(() => this.filteredSales().reduce((sum, sale) => sum + sale.salePrice, 0));
  averageTicket = computed(() => {
    const total = this.filteredSales().length;
    return total > 0 ? this.totalRevenue() / total : 0;
  });
  coursesSales = computed(() => this.filteredSales().filter(s => s.course));
  projectsSales = computed(() => this.filteredSales().filter(s => s.project));

  Math = Math;

  ngOnInit() {
    this.loadSales();
  }

  ngAfterViewInit() {
    // Renderizar gráfico después de que la vista esté lista
    setTimeout(() => this.renderChart(), 100);
  }

  async loadSales() {
    this.isLoading.set(true);
    try {
      const response = await this.reportsService.getSalesReport().toPromise();
      
      if (response && response.sales) {
        console.log('✅ Ventas cargadas:', response.sales.length);
        this.sales.set(response.sales);
        setTimeout(() => this.renderChart(), 200);
      }
    } catch (error) {
      console.error('❌ Error cargando ventas:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  applyFilters() {
    this.currentPage.set(1);
    setTimeout(() => this.renderChart(), 100);
  }

  clearFilters() {
    this.startDate = '';
    this.endDate = '';
    this.productType = '';
    this.paymentMethod = '';
    this.applyFilters();
  }

  renderChart() {
    if (!this.salesChartRef) return;
    
    const canvas = this.salesChartRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destruir gráfico anterior
    if (this.chart) {
      this.chart.destroy();
    }

    // Agrupar ventas por día
    const salesByDay = this.filteredSales().reduce((acc, sale) => {
      const date = new Date(sale.dateCreated).toLocaleDateString('es-ES');
      acc[date] = (acc[date] || 0) + sale.salePrice;
      return acc;
    }, {} as Record<string, number>);

    const labels = Object.keys(salesByDay).sort((a, b) => 
      new Date(a.split('/').reverse().join('-')).getTime() - 
      new Date(b.split('/').reverse().join('-')).getTime()
    );
    const data = labels.map(label => salesByDay[label]);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Ingresos (USD)',
          data,
          borderColor: 'rgb(132, 204, 22)',
          backgroundColor: 'rgba(132, 204, 22, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `USD ${context.parsed.y?.toFixed(2) || '0.00'}`
            }
          }
        },
        scales: {
          y: { 
            beginAtZero: true,
            ticks: { color: 'rgb(148, 163, 184)' },
            grid: { color: 'rgba(148, 163, 184, 0.1)' }
          },
          x: { 
            ticks: { color: 'rgb(148, 163, 184)' },
            grid: { color: 'rgba(148, 163, 184, 0.1)' }
          }
        }
      }
    });
  }

  exportToExcel() {
    const data = this.filteredSales().map(sale => ({
      'Fecha': this.formatDate(sale.dateCreated),
      'Tipo': sale.course ? 'Curso' : 'Proyecto',
      'Producto': sale.course?.title || sale.project?.title,
      'Cliente': `${sale.user.name} ${sale.user.surname}`,
      'Email': sale.user.email,
      'Método': sale.paymentMethod || 'N/A',
      'Monto (USD)': sale.salePrice
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, `ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportToPDF() {
    const doc = new jsPDF();
    
    doc.text('Reporte de Ventas', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 28);
    doc.text(`Total: ${this.formatCurrency(this.totalRevenue())}`, 14, 34);

    const tableData = this.filteredSales().map(sale => [
      this.formatDate(sale.dateCreated),
      sale.course?.title || sale.project?.title || 'N/A',
      `${sale.user.name} ${sale.user.surname}`,
      this.formatCurrency(sale.salePrice)
    ]);

    autoTable(doc, {
      head: [['Fecha', 'Producto', 'Cliente', 'Monto']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 }
    });

    doc.save(`ventas_${new Date().toISOString().split('T')[0]}.pdf`);
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
