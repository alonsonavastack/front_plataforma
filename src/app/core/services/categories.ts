import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Category } from '../models/home.models';
import { AuthService } from './auth';

interface CategoriesListResponse {
  categories: Category[];
}

type CategoriesState = { categories: Category[], isLoading: boolean, error: any };

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly API_URL = environment.url;

  private state = signal<CategoriesState>({
    categories: [],
    isLoading: false,
    error: null,
  });

  // --- Signals para el estado ---
  categories = computed(() => this.state().categories);
  isLoading = computed(() => this.state().isLoading);

  // --- Métodos para interactuar con el servicio ---
  reload() {
    this.state.update((s: CategoriesState) => ({ ...s, isLoading: true }));

    // 📌 Usar endpoint correcto según autenticación
    const endpoint = this.authService.user()
      ? `${this.API_URL}categories/list`  // Usuario autenticado = lista completa
      : `${this.API_URL}categories/list-public`;  // Público = solo activas

    this.http.get<CategoriesListResponse>(endpoint).subscribe({
      next: (response) => {
        this.state.update((s: CategoriesState) => ({ ...s, categories: response.categories, isLoading: false }));
      },
      error: (err) => {
        this.state.update((s: CategoriesState) => ({ ...s, isLoading: false, error: err }));
      }
    });
  }

  register(data: FormData) {
    return this.http.post(`${this.API_URL}categories/register`, data);
  }

  update(data: FormData) {
    return this.http.put(`${this.API_URL}categories/update`, data);
  }

  remove(id: string) {
    return this.http.delete(`${this.API_URL}categories/remove/${id}`);
  }
}
