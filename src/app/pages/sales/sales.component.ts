import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SaleService } from '../../core/services/sale.service';
import { Sale, SaleDetailItem } from '../../core/models/sale.model';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css']
})
export class SalesComponent {
  saleService = inject(SaleService);
  authService = inject(AuthService);

  // Conectamos directamente a las señales del servicio
  sales = this.saleService.sales;
  isLoading = this.saleService.isLoading;
  stats = this.saleService.stats;
  statsByInstructor = this.saleService.statsByInstructor;

  // Usuario actual
  currentUser = this.authService.user;
  isAdmin = computed(() => this.currentUser()?.rol === 'admin');
  isInstructor = computed(() => this.currentUser()?.rol === 'instructor');

  // Filtros
  searchTerm = signal('');
  statusFilter = signal('');
  selectedMonth = signal('');
  selectedYear = signal(new Date().getFullYear().toString());

  // Opciones de meses
  months = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  // Opciones de años (últimos 5 años)
  years = computed(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  });

  // Usamos un Set para guardar los IDs de las ventas expandidas
  expandedSales = new Set<string>();

  // Señal para rastrear la venta que se está actualizando y mostrar un spinner
  updatingStatusId = signal<string | null>(null);
  currentStatusAction = signal<string | null>(null);

  // Vista de estadísticas expandida
  showInstructorStats = signal(false);

  constructor() {
    // Aplicar filtro inicial
    this.applyFilters();
  }

  /**
   * Aplica los filtros seleccionados
   */
  applyFilters(): void {
    this.saleService.listSales(
      this.searchTerm() || undefined,
      this.statusFilter() || undefined,
      this.selectedMonth() || undefined,
      this.selectedYear() || undefined
    ).subscribe();
  }

  /**
   * Limpia todos los filtros
   */
  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('');
    this.selectedMonth.set('');
    this.selectedYear.set(new Date().getFullYear().toString());
    this.applyFilters();
  }

  /**
   * Muestra u oculta los detalles de una venta.
   */
  toggleDetails(saleId: string): void {
    if (this.expandedSales.has(saleId)) {
      this.expandedSales.delete(saleId);
    } else {
      this.expandedSales.add(saleId);
    }
  }

  /**
   * Verifica si los detalles de una venta están visibles.
   */
  isDetailsVisible(saleId: string): boolean {
    return this.expandedSales.has(saleId);
  }

  /**
   * Construye la URL completa de la imagen del producto.
   */
  getProductImageUrl(item: SaleDetailItem): string {
    if (!item.product?.imagen) {
      return 'https://via.placeholder.com/80x60?text=Sin+Imagen';
    }
    const imageType = item.product_type === 'course' ? 'courses/imagen-course' : 'project/imagen-project';
    return `${environment.url}${imageType}/${item.product.imagen}`;
  }

  /**
   * Actualiza el estado de una venta, mostrando un indicador de carga.
   */
  updateStatus(saleId: string, newStatus: 'Pagado' | 'Anulado'): void {
    const confirmationMessage = `¿Estás seguro de que quieres cambiar el estado a "${newStatus}"?`;
    if (confirm(confirmationMessage)) {
      this.updatingStatusId.set(saleId);
      this.currentStatusAction.set(newStatus);
      this.saleService.updateSaleStatus(saleId, newStatus).subscribe({
        next: () => {
          console.log(`Venta ${saleId} actualizada a ${newStatus}`);
        },
        error: (err) => {
          console.error('Error al actualizar el estado de la venta:', err);
          alert('Ocurrió un error al actualizar el estado.');
        },
        complete: () => {
          this.updatingStatusId.set(null);
          this.currentStatusAction.set(null);
        }
      });
    }
  }

  /**
   * Toggle para mostrar/ocultar estadísticas por instructor
   */
  toggleInstructorStats(): void {
    this.showInstructorStats.update(v => !v);
  }

  /**
   * Exportar ventas (placeholder para futura implementación)
   */
  exportSales(): void {
    alert('Funcionalidad de exportación próximamente disponible');
  }
}
