import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { Observable, tap } from 'rxjs';
import { Sale } from '../models/sale.model';

interface SaleListResponse {
  sales: Sale[];
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

  constructor() {
    // Carga inicial de ventas
    this.listSales().subscribe();
  }

  listSales(search?: string, status?: string): Observable<SaleListResponse> {
    this.state.update(s => ({ ...s, isLoading: true }));

    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);

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
