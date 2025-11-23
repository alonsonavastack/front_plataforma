import { Component, OnInit, signal, computed, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ReportsService } from '../../../core/services/reports.service';
import * as XLSX from 'xlsx';

interface StudentRecord {
  _id: string;
  name: string;
  surname: string;
  email: string;
  registrationDate: Date;
  totalPurchases: number;
  totalSpent: number;
  coursesEnrolled: number;
  projectsEnrolled: number;
  lastActivity?: Date;
}

@Component({
  selector: 'app-students-report',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-6">
      <!-- 📊 KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-blue-400 font-medium">Total Estudiantes</p>
              <p class="text-3xl font-bold text-white mt-2">{{ filteredStudents().length }}</p>
              <p class="text-xs text-slate-400 mt-1">Registrados</p>
            </div>
            <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <span class="text-2xl">🎓</span>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-green-400 font-medium">Gasto Total</p>
              <p class="text-3xl font-bold text-white mt-2">{{ formatCurrency(totalSpent()) }}</p>
              <p class="text-xs text-slate-400 mt-1">Por estudiantes</p>
            </div>
            <div class="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <span class="text-2xl">💰</span>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-purple-400 font-medium">Compras Totales</p>
              <p class="text-3xl font-bold text-white mt-2">{{ totalPurchases() }}</p>
              <p class="text-xs text-slate-400 mt-1">Transacciones</p>
            </div>
            <div class="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span class="text-2xl">🛒</span>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-orange-400 font-medium">Promedio por Estudiante</p>
              <p class="text-3xl font-bold text-white mt-2">{{ formatCurrency(averageSpent()) }}</p>
              <p class="text-xs text-slate-400 mt-1">Gasto medio</p>
            </div>
            <div class="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <span class="text-2xl">📊</span>
            </div>
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
            <label class="block text-sm font-medium text-slate-300 mb-2">Buscar</label>
            <input 
              type="text" 
              [(ngModel)]="searchTerm"
              (ngModelChange)="applyFilters()"
              placeholder="Nombre o email..."
              class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-lime-500"
            />
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

      <!-- 📋 Tabla de Estudiantes -->
      <div class="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
        <div class="p-6 border-b border-white/10">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <span>📋</span> Listado de Estudiantes
            <span class="text-sm font-normal text-slate-400">({{ filteredStudents().length }} registros)</span>
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
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Estudiante</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase">Fecha Registro</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase">Compras</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase">Cursos</th>
                  <th class="px-6 py-4 text-center text-xs font-semibold text-slate-300 uppercase">Proyectos</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase">Total Gastado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                @for (student of paginatedStudents(); track student._id) {
                  <tr class="hover:bg-white/5 transition-colors">
                    <td class="px-6 py-4">
                      <div class="text-sm text-white">{{ student.name }} {{ student.surname }}</div>
                      <div class="text-xs text-slate-400">{{ student.email }}</div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-300">
                      {{ formatDate(student.registrationDate) }}
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                        {{ student.totalPurchases }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                        {{ student.coursesEnrolled || 0 }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full">
                        {{ student.projectsEnrolled || 0 }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <span class="text-sm font-semibold text-green-400">
                        {{ formatCurrency(student.totalSpent) }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                      <div class="flex flex-col items-center gap-3">
                        <span class="text-4xl">📭</span>
                        <p class="text-lg">No se encontraron estudiantes</p>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          @if (filteredStudents().length > itemsPerPage()) {
            <div class="px-6 py-4 border-t border-white/10 flex items-center justify-between">
              <div class="text-sm text-slate-400">
                Mostrando {{ ((currentPage() - 1) * itemsPerPage()) + 1 }} - 
                {{ Math.min(currentPage() * itemsPerPage(), filteredStudents().length) }} 
                de {{ filteredStudents().length }}
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
export class StudentsReportComponent implements OnInit {
  private reportsService = inject(ReportsService);

  students = signal<StudentRecord[]>([]);
  isLoading = signal(false);

  // Filtros
  startDate = '';
  endDate = '';
  searchTerm = '';

  // Paginación
  currentPage = signal(1);
  itemsPerPage = signal(20);

  // Computed
  filteredStudents = computed(() => {
    let filtered = this.students();

    if (this.startDate) {
      filtered = filtered.filter(s => new Date(s.registrationDate) >= new Date(this.startDate));
    }
    if (this.endDate) {
      filtered = filtered.filter(s => new Date(s.registrationDate) <= new Date(this.endDate));
    }
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(term) ||
        s.surname.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
      );
    }

    return filtered;
  });

  paginatedStudents = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredStudents().slice(start, start + this.itemsPerPage());
  });

  totalPages = computed(() => Math.ceil(this.filteredStudents().length / this.itemsPerPage()) || 1);
  totalSpent = computed(() => this.filteredStudents().reduce((sum, s) => sum + s.totalSpent, 0));
  totalPurchases = computed(() => this.filteredStudents().reduce((sum, s) => sum + s.totalPurchases, 0));
  averageSpent = computed(() => {
    const total = this.filteredStudents().length;
    return total > 0 ? this.totalSpent() / total : 0;
  });

  Math = Math;

  ngOnInit() {
    this.loadStudents();
  }

  async loadStudents() {
    this.isLoading.set(true);
    try {
      const response = await this.reportsService.getStudentsReport().toPromise();
      if (response && response.students) {
        this.students.set(response.students);
      }
    } catch (error) {
      console.error('❌ Error cargando estudiantes:', error);
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
    this.searchTerm = '';
    this.applyFilters();
  }

  exportToExcel() {
    const data = this.filteredStudents().map(s => ({
      'Nombre': `${s.name} ${s.surname}`,
      'Email': s.email,
      'Fecha Registro': this.formatDate(s.registrationDate),
      'Compras': s.totalPurchases,
      'Cursos': s.coursesEnrolled || 0,
      'Proyectos': s.projectsEnrolled || 0,
      'Total Gastado (USD)': s.totalSpent
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
    XLSX.writeFile(wb, `estudiantes_${new Date().toISOString().split('T')[0]}.xlsx`);
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
