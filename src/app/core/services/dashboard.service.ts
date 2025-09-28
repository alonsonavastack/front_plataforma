import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment.development';

export interface Kpi {
  label: string;
  value: number;
  delta: number;
  isPct?: boolean;
}

type DashboardState = { kpis: Kpi[], isLoading: boolean, error: any };

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.url;

  private state = signal<DashboardState>({
    kpis: [],
    isLoading: false,
    error: null,
  });

  kpis = computed(() => this.state().kpis);
  isLoadingKpis = computed(() => this.state().isLoading);

  reloadKpis() {
    this.state.update((s: DashboardState) => ({ ...s, isLoading: true }));
    this.http.get<Kpi[]>(`${this.API_URL}dashboard/kpis`).subscribe({
      next: (data) => {
        this.state.update((s: DashboardState) => ({ ...s, kpis: data, isLoading: false }));
      },
      error: (err) => {
        this.state.update((s: DashboardState) => ({ ...s, isLoading: false, error: err }));
      }
    });
  }
}
