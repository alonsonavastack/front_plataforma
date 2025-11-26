import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SaleService } from '../../core/services/sale.service';
import { Sale, SaleDetailItem } from '../../core/models/sale.model';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth';
import { ModalService } from '../../core/services/modal.service';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css']
})
export class SalesComponent implements OnInit {
  saleService = inject(SaleService);
  authService = inject(AuthService);
  modalService = inject(ModalService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  // Exponer Math para usarlo en el template
  Math = Math;

  // Conectamos directamente a las señales del servicio
  sales = this.saleService.sales;
  isLoading = this.saleService.isLoading;
  stats = this.saleService.stats;
  statsByInstructor = this.saleService.statsByInstructor;

  // Usuario actual
  currentUser = this.authService.user;
  isAdmin = computed(() => {
    const user = this.currentUser();
    return user?.rol === 'admin';
  });
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

  // --- INICIO: Lógica de paginación ---

  currentPage = signal(1);
  itemsPerPage = signal(10); // Valor inicial

  // Computed para obtener las ventas de la página actual
  paginatedSales = computed(() => {
    const allSales = this.sales() || [];
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return allSales.slice(start, end);
  });

  totalPages = computed(() => {
    const total = this.sales()?.length || 0;
    return Math.ceil(total / this.itemsPerPage());
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const current = this.currentPage();
    const pages: (number | string)[] = [1];

    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');

    pages.push(total);
    return pages;
  });

  // Métodos para cambiar de página
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  previousPage(): void {
    this.changePage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.changePage(this.currentPage() + 1);
  }

  changePerPage(perPage: number): void {
    this.itemsPerPage.set(perPage);
    this.currentPage.set(1); // Resetear a la primera página
  }

  constructor() {
    // Effect para aplicar filtros cuando cambien los query params
    effect(() => {
      // Este effect se ejecutará cuando cambien los query params
      const params = this.route.snapshot.queryParams;
      if (params['status']) {
        this.applyFilterFromNotification(params['status'], params['saleId']);
      }
    });
  }

  ngOnInit(): void {
    // Verificar query params en la inicialización
    this.route.queryParams.subscribe(params => {
      if (params['status']) {
        this.applyFilterFromNotification(params['status'], params['saleId']);
      } else {
        // Aplicar filtro inicial normal
        this.applyFilters();
      }
    });
  }

  /**
   * Aplica filtro desde una notificación
   */
  private applyFilterFromNotification(status: string, saleId?: string): void {

    // Aplicar el filtro de estado
    this.statusFilter.set(status);

    // Cargar las ventas con el filtro
    this.saleService.listSales(
      undefined,
      status,
      undefined,
      undefined
    ).subscribe(() => {
      this.currentPage.set(1);

      // Si hay un saleId específico, expandir sus detalles automáticamente
      if (saleId) {
        setTimeout(() => {
          this.expandedSales.add(saleId);
          // Scroll hacia la venta específica
          const element = document.getElementById(`sale-${saleId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight temporal
            element.classList.add('ring-2', 'ring-lime-400', 'ring-offset-2', 'ring-offset-slate-900');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-lime-400', 'ring-offset-2', 'ring-offset-slate-900');
            }, 2000);
          }
        }, 300);
      }

      // Limpiar los query params de notificación pero mantener la sección
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { status: null, saleId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    });
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
    ).subscribe(() => this.currentPage.set(1)); // Resetear a la página 1 al filtrar
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
      // SVG placeholder (data URI - no requiere HTTP)
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMWUyOTNiIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlbjwvdGV4dD48L3N2Zz4=';
    }
    const imageType = item.product_type === 'course' ? 'courses/imagen-course' : 'projects/imagen-project';
    return `${environment.url}${imageType}/${item.product.imagen}`;
  }

  /**
   * Actualiza el estado de una venta, mostrando un indicador de carga.
   */
  async updateStatus(saleId: string, newStatus: 'Pagado' | 'Anulado'): Promise<void> {
    const confirmationMessage = `¿Estás seguro de que quieres cambiar el estado a "${newStatus}"?`;

    const confirmed = await this.modalService.confirm({
      title: 'Confirmar Acción',
      message: confirmationMessage,
      icon: 'warning',
      confirmText: 'Sí, cambiar',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      this.updatingStatusId.set(saleId);
      this.currentStatusAction.set(newStatus);
      this.saleService.updateSaleStatus(saleId, newStatus).subscribe({
        next: () => {
        },
        error: (err) => {
          this.modalService.alert({
            title: 'Error',
            message: 'Ocurrió un error al actualizar el estado.',
            icon: 'error'
          });
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
   * Construye la URL del comprobante de pago
   */
  buildVoucherUrl(imageName?: string): string {
    if (!imageName) return '';
    return `${environment.url}sales/voucher-image/${imageName}`;
  }

  /**
   * Exportar ventas (placeholder para futura implementación)
   */
  exportSales(): void {
    alert('Funcionalidad de exportación próximamente disponible');
  }
}
