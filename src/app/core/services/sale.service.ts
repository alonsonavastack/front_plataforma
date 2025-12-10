import { Injectable, signal, computed, inject, resource } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { tap } from 'rxjs';
// rxResource removed
import { environment } from '../../../environments/environment.development';
import { Sale, SaleDetailItem } from '../models/sale.model';

interface SaleListResponse {
  sales: Sale[];
}

interface SalesStats {
  totalIngresos: number;
  totalVentas: number;
  porEstado: {
    pagado: number;
    pendiente: number;
    anulado: number;
    reembolsado: number;
  };
  totalReembolsado: number;
  ingresosNetos: number;
  porInstructor?: {
    instructorId: string;
    instructorName: string;
    totalVentas: number;
    totalIngresos: number;
  }[];
}

interface SaleFilters {
  search?: string;
  status?: string;
  month?: string;
  year?: string;
  excludeRefunded?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SaleService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.url;

  // 🔥 Signals para filtros (inputs modernos)
  private searchInput = signal('');
  private statusInput = signal('');
  private monthInput = signal('');
  private yearInput = signal('');
  private excludeRefundedInput = signal(false);

  // 🔥 rxResource reemplazado por resource standard
  // 🔥 rxResource reemplazado por resource standard
  private salesResource = resource({
    loader: () => {
      const params = new HttpParams()
        .set('search', this.searchInput())
        .set('status', this.statusInput())
        .set('month', this.monthInput())
        .set('year', this.yearInput())
        .set('exclude_refunded', this.excludeRefundedInput() ? 'true' : '');

      // Clean empty params if needed, but HttpParams handles it mostly. 
      // Actually strictly following logic:
      let p = new HttpParams();
      const search = this.searchInput();
      if (search) p = p.set('search', search);
      const status = this.statusInput();
      if (status) p = p.set('status', status);
      const month = this.monthInput();
      if (month) p = p.set('month', month);
      const year = this.yearInput();
      if (year) p = p.set('year', year);
      if (this.excludeRefundedInput()) p = p.set('exclude_refunded', 'true');

      return firstValueFrom(this.http.get<SaleListResponse>(`${this.API_URL}checkout/list`, { params: p }));
    }
  });

  // 🔥 Señales públicas derivadas del resource
  public sales = computed(() => this.salesResource.value()?.sales ?? []);
  public isLoading = computed(() => this.salesResource.isLoading());
  public error = computed(() => this.salesResource.error());
  public hasError = computed(() => this.salesResource.hasValue() === false && !this.salesResource.isLoading());

  // 🔥 Computed para estadísticas
  public stats = computed<SalesStats>(() => {
    const salesData = this.sales();

    const activeSales = salesData.filter((s: Sale) => !s.refund || s.refund.status !== 'completed');
    const refundedSales = salesData.filter((s: Sale) => s.refund?.status === 'completed');

    const totalIngresos = activeSales
      .filter((s: Sale) => s.status === 'Pagado')
      .reduce((sum: number, sale: Sale) => sum + sale.total, 0);

    const totalReembolsado = refundedSales.reduce((sum: number, sale: Sale) => {
      return sum + (sale.refund?.calculations?.refundAmount || sale.total || 0);
    }, 0);

    const ingresosNetos = totalIngresos;
    const totalVentas = activeSales.length;

    const porEstado = {
      pagado: activeSales.filter((s: Sale) => s.status === 'Pagado').length,
      pendiente: activeSales.filter((s: Sale) => s.status === 'Pendiente').length,
      anulado: activeSales.filter((s: Sale) => s.status === 'Anulado').length,
      reembolsado: refundedSales.length,
    };

    return {
      totalIngresos,
      totalVentas,
      porEstado,
      totalReembolsado,
      ingresosNetos,
    };
  });

  // 🔥 Computed para desglose por instructor
  public statsByInstructor = computed(() => {
    const salesData = this.sales();
    const instructorMap = new Map<string, {
      instructorId: string;
      instructorName: string;
      totalVentas: number;
      totalIngresos: number;
    }>();

    salesData.forEach(sale => {
      if (sale.status !== 'Pagado') return;

      sale.detail?.forEach((item: SaleDetailItem) => {
        if (item.product_type === 'course' && item.product?.user) {
          const productUser = item.product.user;

          let instructorId: string;
          let instructorName: string;

          if (typeof productUser === 'string') {
            instructorId = productUser;
            instructorName = 'Instructor';
          } else {
            instructorId = productUser._id || '';
            instructorName = productUser.name
              ? `${productUser.name} ${productUser.surname || ''}`.trim()
              : 'Instructor';
          }

          if (!instructorId) return;

          if (!instructorMap.has(instructorId)) {
            instructorMap.set(instructorId, {
              instructorId,
              instructorName,
              totalVentas: 0,
              totalIngresos: 0,
            });
          }

          const instructorStats = instructorMap.get(instructorId)!;
          instructorStats.totalVentas += 1;
          instructorStats.totalIngresos += item.price_unit;
        }
      });
    });

    return Array.from(instructorMap.values()).sort((a, b) => b.totalIngresos - a.totalIngresos);
  });

  // 🔥 Métodos para actualizar filtros (disparan recarga automática)
  setFilters(filters: SaleFilters): void {
    if (filters.search !== undefined) this.searchInput.set(filters.search);
    if (filters.status !== undefined) this.statusInput.set(filters.status);
    if (filters.month !== undefined) this.monthInput.set(filters.month);
    if (filters.year !== undefined) this.yearInput.set(filters.year);
    if (filters.excludeRefunded !== undefined) this.excludeRefundedInput.set(filters.excludeRefunded);
  }

  clearFilters(): void {
    this.searchInput.set('');
    this.statusInput.set('');
    this.monthInput.set('');
    this.yearInput.set('');
    this.excludeRefundedInput.set(false);
  }

  // 🔥 Método para recargar manualmente
  reload(): void {
    this.salesResource.reload();
  }

  // 🔥 Actualizar estado de venta (con recarga automática)
  updateSaleStatus(saleId: string, status: string) {
    return this.http.put(`${this.API_URL}checkout/update-status/${saleId}`, { status }).pipe(
      tap(() => this.reload())
    );
  }

  // 🔥 Obtener transacciones del usuario
  getMyTransactions() {
    return this.http.get<{ transactions: Sale[] }>(`${this.API_URL}checkout/my-transactions`);
  }

  // 🔥 Buscar transacción por número
  getTransactionByNumber(nTransaccion: string) {
    return this.http.get<{ transaction: Sale }>(`${this.API_URL}checkout/transaction/${nTransaccion}`);
  }
}
