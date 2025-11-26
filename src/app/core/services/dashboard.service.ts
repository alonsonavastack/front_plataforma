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
  isCurrency?: boolean; // 🔥 NUEVO: Para identificar si es dinero
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

export interface RecentActivity {
  type: string;
  user: string;
  amount?: number;
  course?: string;
  rating?: number;
  time: string;
  color: string;
}

// 💎 NUEVO: Interfaces para Métricas Ejecutivas
export interface ExecutiveMetrics {
  income: {
    gross: {
      total: number;
      currentMonth: number;
      label: string;
      description: string;
    };
    net: {
      total: number;
      currentMonth: number;
      lastMonth: number;
      currentYear: number;
      delta: number;
      label: string;
      description: string;
    };
    difference: {
      amount: number;
      percentage: string;
      label: string;
    };
  };
  refunds: {
    total: number;
    totalAmount: number;
    platformFeesRetained: number;
    processingFees: number;
    pending: number;
    rate: number;
    label: string;
    description: string;
    testDataExcluded?: boolean; // 🔥 NUEVO
  };
  commissions: {
    platform: {
      amount: number;
      rate: number;
      label: string;
      description: string;
    };
    instructors: {
      amount: number;
      rate: number;
      label: string;
      description: string;
    };
  };
  counters: {
    students: number;
    instructors: number;
    activeCourses: number;
    activeProjects: number;
    totalSales: number;
    activeSales: number;
  };
  alerts: Array<{
    type: 'warning' | 'danger' | 'info';
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

// Interfaz para el estado del servicio
interface DashboardState {
  kpis: Kpi[];
  monthlyIncome: MonthlyIncome[];
  distribution: Distribution | null;
  recentActivity: RecentActivity[];
  executiveMetrics: ExecutiveMetrics | null; // 💎 NUEVO
  isLoadingKpis: boolean;
  isLoadingMonthlyIncome: boolean;
  isLoadingDistribution: boolean;
  isLoadingRecentActivity: boolean;
  isLoadingExecutiveMetrics: boolean; // 💎 NUEVO
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
    recentActivity: [],
    executiveMetrics: null, // 💎 NUEVO
    isLoadingKpis: false,
    isLoadingMonthlyIncome: false,
    isLoadingDistribution: false,
    isLoadingRecentActivity: false,
    isLoadingExecutiveMetrics: false, // 💎 NUEVO
    error: null,
  });

  // Selectors (Computed Signals)
  kpis = computed(() => this.state().kpis);
  monthlyIncome = computed(() => this.state().monthlyIncome);
  distribution = computed(() => this.state().distribution);
  recentActivity = computed(() => this.state().recentActivity);
  executiveMetrics = computed(() => this.state().executiveMetrics); // 💎 NUEVO
  isLoadingKpis = computed(() => this.state().isLoadingKpis);
  isLoadingMonthlyIncome = computed(() => this.state().isLoadingMonthlyIncome);
  isLoadingDistribution = computed(() => this.state().isLoadingDistribution);
  isLoadingRecentActivity = computed(() => this.state().isLoadingRecentActivity);
  isLoadingExecutiveMetrics = computed(() => this.state().isLoadingExecutiveMetrics); // 💎 NUEVO
  error = computed(() => this.state().error);

  // AGREGAR ESTE SIGNAL:
  excludeTestData = signal(false);

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

  // 🆕 NUEVO: Cargar actividad reciente
  loadRecentActivity() {
    this.state.update(s => ({ ...s, isLoadingRecentActivity: true }));
    this.http.get<RecentActivity[]>(`${this.base}dashboard/recentActivity`).pipe(
      tap(activity => this.state.update(s => ({ ...s, recentActivity: activity, isLoadingRecentActivity: false }))),
      catchError(err => {
        this.state.update(s => ({ ...s, error: err, isLoadingRecentActivity: false }));
        return throwError(() => err);
      })
    ).subscribe();
  }

  // 💎 NUEVO: Cargar métricas ejecutivas (Solo Admin)
  loadExecutiveMetrics() {
    this.state.update(s => ({ ...s, isLoadingExecutiveMetrics: true }));

    const params = this.excludeTestData() ? '?excludeTests=true' : '';
    this.http.get<ExecutiveMetrics>(`${this.base}dashboard/executive-metrics${params}`).pipe(
      tap(metrics => {

        this.state.update(s => ({
          ...s,
          executiveMetrics: metrics,
          isLoadingExecutiveMetrics: false
        }));
      }),
      catchError(err => {
        this.state.update(s => ({
          ...s,
          error: err,
          isLoadingExecutiveMetrics: false
        }));
        return throwError(() => err);
      })
    ).subscribe();
  }

  // AGREGAR AL FINAL DE LA CLASE:
  toggleTestDataFilter() {
    this.excludeTestData.update(v => !v);
    this.loadExecutiveMetrics();
  }
}
