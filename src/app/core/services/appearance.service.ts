import { HttpClient } from '@angular/common/http';
import { Injectable, signal, computed, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tap, catchError, throwError } from 'rxjs';

export interface Setting {
  _id: string;
  key: string;
  value: any;
  name: string;
  description?: string;
  group?: string;
}

@Injectable({ providedIn: 'root' })
export class AppearanceService {
  private http = inject(HttpClient);
  private base = environment.url;

  private state = signal<{
    settings: Setting[];
    isLoading: boolean;
    error: any;
  }>({
    settings: [],
    isLoading: false,
    error: null,
  });

  settings = computed(() => this.state().settings);
  isLoading = computed(() => this.state().isLoading);

  loadSettings() {
    this.state.update(s => ({ ...s, isLoading: true }));
    return this.http.get<{ settings: Setting[] }>(`${this.base}settings/list`).pipe(
      tap(res => this.state.set({ settings: res.settings, isLoading: false, error: null })),
      catchError(err => {
        this.state.set({ settings: [], isLoading: false, error: err });
        return throwError(() => err);
      })
    );
  }

  updateSettings(settings: { key: string; value: any }[]) {
    return this.http.put(`${this.base}settings/update`, { settings });
  }
}
