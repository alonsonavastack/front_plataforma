import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService } from '../../../core/services/reports.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProductRecord {
  _id: string;
  title: string;
  type: 'course' | 'project';
  category: string;
  instructor: string;
  totalSales: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  createdAt: Date;
}

@Component({
  selector: 'app-products-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products-report.component.html'
})
export class ProductsReportComponent implements OnInit {
  private reportsService = inject(ReportsService);

  products = signal<ProductRecord[]>([]);
  isLoading = signal(false);

  // Filtros
  productType = '';
  sortBy = 'revenue';
  searchTerm = '';

  // Paginación
  currentPage = signal(1);
  itemsPerPage = signal(20);

  // Computed
  filteredProducts = computed(() => {
    let filtered = this.products();

    // Filtro por tipo
    if (this.productType) {
      filtered = filtered.filter(p => p.type === this.productType);
    }

    // Filtro por búsqueda
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.instructor.toLowerCase().includes(term)
      );
    }

    // Ordenamiento
    if (this.sortBy === 'revenue') {
      filtered = filtered.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } else if (this.sortBy === 'sales') {
      filtered = filtered.sort((a, b) => b.totalSales - a.totalSales);
    } else if (this.sortBy === 'rating') {
      filtered = filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    } else if (this.sortBy === 'recent') {
      filtered = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return filtered;
  });

  paginatedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return this.filteredProducts().slice(start, start + this.itemsPerPage());
  });

  totalPages = computed(() => Math.ceil(this.filteredProducts().length / this.itemsPerPage()) || 1);
  totalRevenue = computed(() => this.filteredProducts().reduce((sum, p) => sum + p.totalRevenue, 0));
  totalSales = computed(() => this.filteredProducts().reduce((sum, p) => sum + p.totalSales, 0));
  averageRating = computed(() => {
    const products = this.filteredProducts().filter(p => p.averageRating > 0);
    if (products.length === 0) return 0;
    return products.reduce((sum, p) => sum + p.averageRating, 0) / products.length;
  });

  // Computed para separar cursos y proyectos
  courses = computed(() => this.filteredProducts().filter(p => p.type === 'course'));
  projects = computed(() => this.filteredProducts().filter(p => p.type === 'project'));

  Math = Math;

  ngOnInit() {
    this.loadProducts();
  }

  async loadProducts() {
    this.isLoading.set(true);
    try {
      const response = await this.reportsService.getProductsReport().toPromise();
      if (response && response.products) {
        this.products.set(response.products);
      }
    } catch (error) {

    } finally {
      this.isLoading.set(false);
    }
  }

  applyFilters() {
    this.currentPage.set(1);
  }

  clearFilters() {
    this.productType = '';
    this.sortBy = 'revenue';
    this.searchTerm = '';
    this.applyFilters();
  }

  exportToExcel() {
    const data = this.filteredProducts().map(p => ({
      'Tipo': p.type === 'course' ? 'Curso' : 'Proyecto',
      'Título': p.title,
      'Categoría': p.category,
      'Instructor': p.instructor,
      'Ventas': p.totalSales,
      'Ingresos (MXN)': p.totalRevenue,
      'Rating': p.averageRating || 'N/A',
      'Reseñas': p.totalReviews || 0
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    XLSX.writeFile(wb, `productos_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportToPDF() {
    const doc = new jsPDF();

    doc.text('Reporte de Productos', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 28);

    const stats = [
      `Total Productos: ${this.filteredProducts().length}`,
      `Ingresos Totales: ${this.formatCurrency(this.totalRevenue())}`,
      `Ventas Totales: ${this.totalSales()}`
    ];
    doc.text(stats, 14, 34);

    const tableData = this.filteredProducts().map(p => [
      p.type === 'course' ? 'Curso' : 'Proyecto',
      p.title,
      p.category,
      p.totalSales,
      this.formatCurrency(p.totalRevenue),
      p.averageRating ? p.averageRating.toFixed(1) : 'N/A'
    ]);

    autoTable(doc, {
      head: [['Tipo', 'Título', 'Categoría', 'Ventas', 'Ingresos', 'Rating']],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [132, 204, 22] } // Lime-500
    });

    doc.save(`productos_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  formatCurrency(amount: number): string {
    return `MXN ${amount.toFixed(2)}`;
  }
}
