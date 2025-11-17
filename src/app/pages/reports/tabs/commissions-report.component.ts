import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService, CommissionsSummary } from '../../../core/services/reports.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-commissions-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- 📊 KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-6">
          <div>
            <p class="text-sm text-blue-400 font-medium">Ventas Brutas</p>
            <p class="text-3xl font-bold text-white mt-2">{{ formatCurrency(summary()?.summary?.total_ventas_bruto || 0) }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ summary()?.summary?.total_ventas_count || 0 }} ventas</p>
          </div>
        </div>

        <div class="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-6">
          <div>
            <p class="text-sm text-green-400 font-medium">Comisiones Plataforma</p>
            <p class="text-3xl font-bold text-white mt-2">{{ formatCurrency(summary()?.summary?.total_comisiones_plataforma || 0) }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ summary()?.summary?.porcentaje_comision || '0%' }}</p>
          </div>
        </div>

        <div class="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-6">
          <div>
            <p class="text-sm text-purple-400 font-medium">Pago Instructores</p>
            <p class="text-3xl font-bold text-white mt-2">{{ formatCurrency(summary()?.summary?.total_pago_instructores || 0) }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ summary()?.summary?.porcentaje_instructores || '0%' }}</p>
          </div>
        </div>

        <div class="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6">
          <div>
            <p class="text-sm text-orange-400 font-medium">Neto Plataforma</p>
            <p class="text-3xl font-bold text-white mt-2">{{ formatCurrency(summary()?.summary?.neto_plataforma || 0) }}</p>
            <p class="text-xs text-slate-400 mt-1">Después de impuestos</p>
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
              (change)="loadData()"
              class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-lime-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Fecha Fin</label>
            <input 
              type="date" 
              [(ngModel)]="endDate"
              (change)="loadData()"
              class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-lime-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Período</label>
            <select 
              [(ngModel)]="period"
              (change)="loadData()"
              class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-lime-500"
            >
              <option value="day">Diario</option>
              <option value="week">Semanal</option>
              <option value="month">Mensual</option>
              <option value="year">Anual</option>
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

      <!-- 📋 Resumen Fiscal -->
      @if (summary()) {
        <div class="bg-slate-800/50 border border-white/10 rounded-xl p-6">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>💼</span> Resumen Fiscal
          </h3>
          
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-slate-700/30 rounded-lg p-4">
              <p class="text-xs text-slate-400">IVA</p>
              <p class="text-lg font-semibold text-white mt-1">{{ formatCurrency(summary()!.fiscal.iva) }}</p>
            </div>
            <div class="bg-slate-700/30 rounded-lg p-4">
              <p class="text-xs text-slate-400">Retención IVA</p>
              <p class="text-lg font-semibold text-white mt-1">{{ formatCurrency(summary()!.fiscal.retencion_iva) }}</p>
            </div>
            <div class="bg-slate-700/30 rounded-lg p-4">
              <p class="text-xs text-slate-400">ISR</p>
              <p class="text-lg font-semibold text-white mt-1">{{ formatCurrency(summary()!.fiscal.isr) }}</p>
            </div>
            <div class="bg-slate-700/30 rounded-lg p-4">
              <p class="text-xs text-slate-400">Total Impuestos</p>
              <p class="text-lg font-semibold text-green-400 mt-1">{{ formatCurrency(summary()!.fiscal.total) }}</p>
            </div>
          </div>
        </div>
      }

      <!-- Loading/Empty State -->
      @if (isLoading()) {
        <div class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
        </div>
      } @else if (!summary()) {
        <div class="bg-slate-800/50 border border-white/10 rounded-xl p-12 text-center">
          <span class="text-4xl">🔒</span>
          <p class="text-lg text-slate-400 mt-4">No tienes permisos para ver comisiones</p>
          <p class="text-sm text-slate-500 mt-2">Solo los administradores pueden acceder a este reporte</p>
        </div>
      }
    </div>
  `
})
export class CommissionsReportComponent implements OnInit {
  private reportsService = inject(ReportsService);

  summary = signal<CommissionsSummary | null>(null);
  isLoading = signal(false);

  // Filtros
  startDate = '';
  endDate = '';
  period: 'day' | 'week' | 'month' | 'year' = 'month';

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const response = await this.reportsService.getCommissionsSummary(
        this.period,
        this.startDate || undefined,
        this.endDate || undefined
      ).toPromise();
      
      if (response) {
        this.summary.set(response);
      }
    } catch (error: any) {
      console.error('❌ Error cargando comisiones:', error);
      
      // 🔒 Si es un error 403 (sin permisos), mostrar mensaje amigable
      if (error.status === 403) {
        console.warn('⚠️ Acceso denegado: Solo administradores pueden ver comisiones');
        // No hacer nada más - el interceptor NO cerrará sesión porque manejamos el error aquí
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  clearFilters() {
    this.startDate = '';
    this.endDate = '';
    this.period = 'month';
    this.loadData();
  }

  exportToExcel() {
    const s = this.summary();
    if (!s) return;

    const data = [{
      'Ventas Brutas': s.summary.total_ventas_bruto,
      'Comisiones Plataforma': s.summary.total_comisiones_plataforma,
      'Pago Instructores': s.summary.total_pago_instructores,
      'Impuestos': s.summary.total_impuestos,
      'Neto Plataforma': s.summary.neto_plataforma,
      'IVA': s.fiscal.iva,
      'Retención IVA': s.fiscal.retencion_iva,
      'ISR': s.fiscal.isr,
      'Total Impuestos': s.fiscal.total
    }];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comisiones');
    XLSX.writeFile(wb, `comisiones_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  formatCurrency(amount: number): string {
    return `USD ${amount.toFixed(2)}`;
  }
}
