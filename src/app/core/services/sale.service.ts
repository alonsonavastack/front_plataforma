import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { Observable, tap } from 'rxjs';
import { Sale } from '../models/sale.model';

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
  };
  porInstructor?: {
    instructorId: string;
    instructorName: string;
    totalVentas: number;
    totalIngresos: number;
  }[];
}

type SaleState = {
  sales: Sale[];
  isLoading: boolean;
  error: any;
};

@Injectable({
  providedIn: 'root',
})
export class SaleService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.url;

  private state = signal<SaleState>({
    sales: [],
    isLoading: false,
    error: null,
  });

  // Señales públicas para los componentes
  public sales = computed(() => this.state().sales);
  public isLoading = computed(() => this.state().isLoading);
  public error = computed(() => this.state().error);

  // Computed para estadísticas
  public stats = computed<SalesStats>(() => {
    const salesData = this.sales();
    
    const totalIngresos = salesData
      .filter(s => s.status === 'Pagado')
      .reduce((sum, sale) => sum + sale.total, 0);
    
    const totalVentas = salesData.length;
    
    const porEstado = {
      pagado: salesData.filter(s => s.status === 'Pagado').length,
      pendiente: salesData.filter(s => s.status === 'Pendiente').length,
      anulado: salesData.filter(s => s.status === 'Anulado').length,
    };

    return {
      totalIngresos,
      totalVentas,
      porEstado,
    };
  });

  // Computed para desglose por instructor
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

      sale.detail?.forEach(item => {
        if (item.product_type === 'course' && item.product?.user) {
          // Verificar si user es un objeto o un string
          const productUser = item.product.user;
          
          let instructorId: string;
          let instructorName: string;

          if (typeof productUser === 'string') {
            // Es solo el ID
            instructorId = productUser;
            instructorName = 'Instructor';
          } else {
            // Es un objeto poblado
            instructorId = productUser._id || '';
            instructorName = productUser.name 
              ? `${productUser.name} ${productUser.surname || ''}`
              : 'Instructor';
          }

          if (!instructorId) return; // Si no hay ID válido, saltar

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

  constructor() {
    // Carga inicial de ventas
    this.listSales().subscribe();
  }

  listSales(search?: string, status?: string, month?: string, year?: string): Observable<SaleListResponse> {
    this.state.update(s => ({ ...s, isLoading: true }));

    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    if (month) params = params.set('month', month);
    if (year) params = params.set('year', year);

    return this.http.get<SaleListResponse>(`${this.API_URL}checkout/list`, { params }).pipe(
      tap({
        next: response => this.state.set({ sales: response.sales, isLoading: false, error: null }),
        error: err => this.state.set({ sales: [], isLoading: false, error: err }),
      })
    );
  }

  updateSaleStatus(saleId: string, status: string): Observable<any> {
    return this.http.put(`${this.API_URL}checkout/update-status/${saleId}`, { status }).pipe(
      tap(() => {
        // Recargamos la lista para reflejar el cambio de estado
        this.listSales().subscribe();
      })
    );
  }
}
