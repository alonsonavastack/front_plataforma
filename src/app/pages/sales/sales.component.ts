import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaleService } from '../../core/services/sale.service';
import { Sale, SaleDetailItem } from '../../core/models/sale.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css']
})
export class SalesComponent {
  saleService = inject(SaleService);

  // Conectamos directamente a las señales del servicio
  sales = this.saleService.sales;
  isLoading = this.saleService.isLoading;

  // Usamos un Set para guardar los IDs de las ventas expandidas
  expandedSales = new Set<string>();

  // Señal para rastrear la venta que se está actualizando y mostrar un spinner
  updatingStatusId = signal<string | null>(null);

  /**
   * Muestra u oculta los detalles de una venta.
   * @param saleId El ID de la venta.
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
   * @param saleId El ID de la venta.
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
   * @param saleId El ID de la venta a actualizar.
   * @param newStatus El nuevo estado para la venta.
   */
  updateStatus(saleId: string, newStatus: 'Pagado' | 'Anulado'): void {
    const confirmationMessage = `¿Estás seguro de que quieres cambiar el estado a "${newStatus}"?`;
    if (confirm(confirmationMessage)) {
      this.updatingStatusId.set(saleId);
      this.saleService.updateSaleStatus(saleId, newStatus).subscribe({
        next: () => {
          // El servicio ya se encarga de recargar la lista,
          // solo necesitamos limpiar el estado de carga.
          console.log(`Venta ${saleId} actualizada a ${newStatus}`);
        },
        error: (err) => {
          console.error('Error al actualizar el estado de la venta:', err);
          alert('Ocurrió un error al actualizar el estado.');
        },
        complete: () => {
          this.updatingStatusId.set(null);
        }
      });
    }
  }
}
