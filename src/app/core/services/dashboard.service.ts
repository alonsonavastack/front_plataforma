// Reemplaza el contenido de src/app/core/services/dashboard.service.ts

import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tap, catchError, throwError } from 'rxjs';

// Interfaces para los datos del dashboard
export interface Kpi {
  label: string;
  value: number;
  delta: number;
  isPct?: boolean;
}

export interface MonthlyIncome {
  month: string;
  amount: number;
  percentage: number;
}

export interface Distribution {
  courses: number;
  projects: number;
}

// Interfaz para el estado del servicio
interface DashboardState {
  kpis: Kpi[];
  monthlyIncome: MonthlyIncome[];
  distribution: Distribution | null;
  isLoadingKpis: boolean;
  isLoadingMonthlyIncome: boolean;
  isLoadingDistribution: boolean;
  error: any;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private base = environment.url;

  // State Signal
  private state = signal<DashboardState>({
    kpis: [],
    monthlyIncome: [],
    distribution: null,
    isLoadingKpis: false,
    isLoadingMonthlyIncome: false,
    isLoadingDistribution: false,
    error: null,
  });

  // Selectors (Computed Signals)
  kpis = computed(() => this.state().kpis);
  monthlyIncome = computed(() => this.state().monthlyIncome);
  distribution = computed(() => this.state().distribution);
  isLoadingKpis = computed(() => this.state().isLoadingKpis);
  isLoadingMonthlyIncome = computed(() => this.state().isLoadingMonthlyIncome);
  isLoadingDistribution = computed(() => this.state().isLoadingDistribution);
  error = computed(() => this.state().error);

  // --- MÉTODOS PARA CARGAR DATOS ---

  reloadKpis() {
    this.state.update(s => ({ ...s, isLoadingKpis: true }));
    this.http.get<Kpi[]>(`${this.base}dashboard/kpis`).pipe(
      tap(kpis => this.state.update(s => ({ ...s, kpis, isLoadingKpis: false }))),
      catchError(err => {
        this.state.update(s => ({ ...s, error: err, isLoadingKpis: false }));
        return throwError(() => err);
      })
    ).subscribe();
  }

  // 🔥 MÉTODO AÑADIDO
  loadMonthlyIncome() {
    this.state.update(s => ({ ...s, isLoadingMonthlyIncome: true }));
    this.http.get<MonthlyIncome[]>(`${this.base}dashboard/monthlyIncome`).pipe(
      tap(income => this.state.update(s => ({ ...s, monthlyIncome: income, isLoadingMonthlyIncome: false }))),
      catchError(err => {
        this.state.update(s => ({ ...s, error: err, isLoadingMonthlyIncome: false }));
        return throwError(() => err);
      })
    ).subscribe();
  }

  loadDistribution() {
    this.state.update(s => ({ ...s, isLoadingDistribution: true }));
    this.http.get<Distribution>(`${this.base}dashboard/distribution`).pipe(
      tap(dist => this.state.update(s => ({ ...s, distribution: dist, isLoadingDistribution: false }))),
      catchError(err => {
        this.state.update(s => ({ ...s, error: err, isLoadingDistribution: false }));
        return throwError(() => err);
      })
    ).subscribe();
  }
}
