import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReportsService,
  IncomeData,
  TopProduct,
  SalesByCategory,
  PeriodComparison,
  StudentGrowth,
  ActiveStudents,
  StudentsByCourse,
  TopStudent,
  ProductsAnalysis
} from '../../core/services/reports.service';
import { AuthService } from '../../core/services/auth';
import type { Cell } from 'exceljs';


@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  // Señales para los datos
  incomeData = signal<IncomeData[]>([]);
  topProducts = signal<TopProduct[]>([]);
  salesByCategory = signal<SalesByCategory[]>([]);
  studentGrowth = signal<StudentGrowth | null>(null);
  activeStudents = signal<ActiveStudents | null>(null);
  productsAnalysis = signal<ProductsAnalysis[]>([]);
  periodComparison = signal<PeriodComparison | null>(null);
  studentsByCourse = signal<StudentsByCourse[]>([]);
  topStudents = signal<TopStudent[]>([]);

  // Estados de carga
  loading = signal<boolean>(false);
  loadingSection = signal<string>('');

  // Configuración
  // Tipado más estricto para el período
  selectedPeriod = signal<'day' | 'week' | 'month' | 'year'>('month');

  currentUser = signal<any>(null);
  isAdmin = signal<boolean>(false);

  // Tabs
  activeTab = signal<string>('sales');

  constructor(
    private reportsService: ReportsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser.set(this.authService.user());
    this.isAdmin.set(this.authService.user()?.rol === 'admin');
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loadSalesReports();
  }

  // ==================== CARGAR REPORTES ====================

  loadSalesReports(): void {
    this.activeTab.set('sales');
    this.loading.set(true);

    // Ingresos por período
    this.loadingSection.set('income');
    this.reportsService.getIncomeByPeriod(this.selectedPeriod() as any).subscribe({
      next: (data: { incomeData: IncomeData[] }) => {
        this.incomeData.set(data.incomeData || []);
        this.loadingSection.set('');
      },
      error: (error) => {
        console.error('Error al cargar ingresos:', error);
        this.loadingSection.set('');
      }
    });

    // Top productos
    this.loadingSection.set('products');
    this.reportsService.getTopProducts(5).subscribe({
      next: (data: { topProducts: TopProduct[] }) => {
        this.topProducts.set(data.topProducts || []);
        this.loadingSection.set('');
      },
      error: (error) => {
        console.error('Error al cargar top productos:', error);
        this.loadingSection.set('');
      }
    });

    // Ventas por categoría
    this.loadingSection.set('categories');
    this.reportsService.getSalesByCategory().subscribe({
      next: (data: { salesByCategory: SalesByCategory[] }) => {
        this.salesByCategory.set(data.salesByCategory || []);
        this.loadingSection.set('');
      },
      error: (error) => {
        console.error('Error al cargar ventas por categoría:', error);
        this.loadingSection.set('');
      }
    });

    // Comparativa de períodos
    // Solo se llama si el período es válido para esta API
    const selected = this.selectedPeriod();
    if (selected === 'day') {
      this.periodComparison.set(null); // Limpiamos datos anteriores
      this.loading.set(false); // Detenemos el spinner principal
      return; // 'day' no es válido para getPeriodComparison, así que salimos.
    }

    this.reportsService.getPeriodComparison(selected).subscribe({
      next: (data: PeriodComparison) => {
        this.periodComparison.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar comparativa:', error);
        this.loading.set(false);
      }
    });
  }

  loadStudentsReports(): void {
    this.activeTab.set('students');
    this.loading.set(true);

    // Crecimiento de estudiantes
    const growthPeriod = this.selectedPeriod();
    if (growthPeriod === 'year') return; // 'year' no es válido para getStudentGrowth

    this.reportsService.getStudentGrowth(growthPeriod).subscribe({
      next: (data: StudentGrowth) => {
        this.studentGrowth.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar crecimiento:', error);
        this.loading.set(false);
      }
    });

    // Estudiantes activos
    this.reportsService.getActiveStudents().subscribe({
      next: (data: ActiveStudents) => {
        this.activeStudents.set(data);
      },
      error: (error) => {
        console.error('Error al cargar estudiantes activos:', error);
      }
    });

    // Estudiantes por curso (si es admin)
    if (this.isAdmin()) {
      this.reportsService.getStudentsByCourse().subscribe({
        next: (data: { courseStats: StudentsByCourse[] }) => {
          this.studentsByCourse.set(data.courseStats || []);
        },
        error: (error) => {
          console.error('Error al cargar estudiantes por curso:', error);
        }
      });
    }

    // Top estudiantes (si es admin)
    if (this.isAdmin()) {
      this.reportsService.getTopStudents(10).subscribe({
        next: (data: { topStudents: TopStudent[] }) => {
          this.topStudents.set(data.topStudents || []);
        },
        error: (error) => {
          console.error('Error al cargar top estudiantes:', error);
        }
      });
    };
  }

  loadProductsReports(): void {
    this.activeTab.set('products');
    this.loading.set(true);

    this.reportsService.getProductsAnalysis().subscribe({
      next: (data: { products: ProductsAnalysis[] }) => {
        this.productsAnalysis.set(data.products || []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar análisis de productos:', error);
        this.loading.set(false);
      }
    });
  }

  // ==================== EXPORTACIÓN ====================

  async exportToPDF(type: 'income' | 'products' | 'categories') {
    const jsPDF = (await import('jspdf')).default;
    // jspdf-autotable es un plugin que extiende jsPDF, solo necesita ser importado para que funcione.
    await import('jspdf-autotable');

    const doc = new jsPDF() as any; // Usamos 'any' para que TypeScript reconozca el método autoTable
    let title = '';
    let head: string[][] = [];
    let body: any[][] = [];

    switch (type) {
      case 'income':
        title = `Reporte de Ingresos (${this.selectedPeriod()})`;
        head = [['Período', 'Ingresos', 'Ventas']];
        body = this.incomeData().map(item => [item._id, this.formatCurrency(item.total), item.count]);
        break;
      case 'products':
        title = 'Top 5 Productos Más Vendidos';
        head = [['Producto', 'Ventas', 'Ingresos']];
        body = this.topProducts().map(item => [item.title, item.total_sales, this.formatCurrency(item.total_revenue)]);
        break;
      case 'categories':
        title = 'Ventas por Categoría';
        head = [['Categoría', 'Ventas', 'Ingresos']]; // Corregido: item.category_title
        body = this.salesByCategory().map(item => [item.category_title, item.total_sales, this.formatCurrency(item.total_revenue)]);
        break;
    }

    doc.text(title, 14, 15);
    doc.autoTable({
      startY: 20,
      head: head,
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [22, 163, 74] }, // Verde oscuro
    });

    doc.save(`reporte_${type}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  async exportToExcel(type: 'income' | 'products' | 'categories') {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    let title = '';
    let headers: any[] = [];
    let data: any[] = [];

    switch (type) {
      case 'income':
        title = `Reporte de Ingresos (${this.selectedPeriod()})`;
        headers = [
          { header: 'Período', key: 'period', width: 20 },
          { header: 'Ingresos (USD)', key: 'total', width: 20, style: { numFmt: '"$"#,##0.00' } },
          { header: 'Ventas', key: 'count', width: 15 }
        ];
        data = this.incomeData().map(item => ({ period: item._id, total: item.total, count: item.count }));
        break;
      case 'products':
        title = 'Top 5 Productos Más Vendidos';
        headers = [
          { header: 'Producto', key: 'title', width: 40 },
          { header: 'Ventas', key: 'total_sales', width: 15 },
          { header: 'Ingresos (USD)', key: 'total_revenue', width: 20, style: { numFmt: '"$"#,##0.00' } }
        ];
        data = this.topProducts();
        break;
      case 'categories':
        title = 'Ventas por Categoría';
        headers = [
          { header: 'Categoría', key: 'category_title', width: 30 },
          { header: 'Ventas', key: 'total_sales', width: 15 },
          { header: 'Ingresos (USD)', key: 'total_revenue', width: 20, style: { numFmt: '"$"#,##0.00' } }
        ];
        data = this.salesByCategory();
        break;
    }

    worksheet.columns = headers;
    worksheet.addRows(data);

    // Estilo para el encabezado
    worksheet.getRow(1).eachCell((cell: Cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }; // Verde oscuro
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ==================== UTILIDADES ====================

  changePeriod(period: 'day' | 'week' | 'month' | 'year'): void {
    this.selectedPeriod.set(period as any);
    if (this.activeTab() === 'sales') {
      this.loadSalesReports();
    } else if (this.activeTab() === 'students') {
      this.loadStudentsReports();
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-MX').format(value);
  }

  getGrowthClass(delta: number): string {
    return delta >= 0 ? 'text-green-400' : 'text-red-400';
  }

  getGrowthIcon(delta: number): string {
    return delta >= 0 ? '▲' : '▼';
  }
}
