import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Discount, DiscountConfig } from '../models/discount.model';

interface DiscountsResponse {
  discounts: Discount[];
}

interface DiscountResponse {
  discount: Discount;
}

interface DiscountConfigResponse extends DiscountConfig {}

type DiscountState = {
  discounts: Discount[];
  config: DiscountConfig | null;
  isLoading: boolean;
  error: any;
};

@Injectable({
  providedIn: 'root'
})
export class DiscountService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.url;

  private state = signal<DiscountState>({
    discounts: [],
    config: null,
    isLoading: false,
    error: null,
  });

  // Señales públicas
  discounts = computed(() => this.state().discounts);
  config = computed(() => this.state().config);
  isLoading = computed(() => this.state().isLoading);
  error = computed(() => this.state().error);

  // Estadísticas
  stats = computed(() => {
    const discountsData = this.discounts();
    const now = Date.now();
    
    return {
      total: discountsData.length,
      active: discountsData.filter(d => d.state && d.end_date_num >= now && d.start_date_num <= now).length,
      expired: discountsData.filter(d => d.end_date_num < now).length,
      upcoming: discountsData.filter(d => d.start_date_num > now).length,
      inactive: discountsData.filter(d => !d.state).length,
    };
  });

  constructor() {
    this.loadDiscounts().subscribe();
  }

  loadDiscounts(): Observable<DiscountsResponse> {
    this.state.update(s => ({ ...s, isLoading: true }));
    
    return this.http.get<DiscountsResponse>(`${this.API_URL}discount/list`).pipe(
      tap({
        next: (response) => {
          this.state.update(s => ({ 
            ...s, 
            discounts: response.discounts, 
            isLoading: false, 
            error: null 
          }));
        },
        error: (err) => {
          this.state.update(s => ({ 
            ...s, 
            discounts: [], 
            isLoading: false, 
            error: err 
          }));
        }
      })
    );
  }

  loadConfig(): Observable<DiscountConfigResponse> {
    return this.http.get<DiscountConfigResponse>(`${this.API_URL}discount/config_all`).pipe(
      tap({
        next: (response) => {
          this.state.update(s => ({ ...s, config: response }));
        },
        error: (err) => {
          console.error('Error loading config:', err);
        }
      })
    );
  }

  getDiscount(id: string): Observable<DiscountResponse> {
    return this.http.get<DiscountResponse>(`${this.API_URL}discount/show/${id}`);
  }

  createDiscount(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}discount/register`, data).pipe(
      tap(() => this.loadDiscounts().subscribe())
    );
  }

  updateDiscount(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}discount/update`, data).pipe(
      tap(() => this.loadDiscounts().subscribe())
    );
  }

  deleteDiscount(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}discount/remove/${id}`).pipe(
      tap(() => this.loadDiscounts().subscribe())
    );
  }
}
