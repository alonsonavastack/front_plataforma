import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CoursePublic, Project } from '../models/home.models';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

// --- Interfaces para la Búsqueda General ---

/**
 * Define un elemento de resultado de búsqueda, que puede ser un curso o un proyecto.
 * Se añade la propiedad `item_type` para poder diferenciarlos en el frontend.
 */
export type SearchResultCourse = CoursePublic & { item_type: 'course' };
export type SearchResultProject = Project & { item_type: 'project' };
export type SearchResultItem = SearchResultCourse | SearchResultProject;

/**
 * Define la estructura de la respuesta de la API para la búsqueda general.
 */
export interface GeneralSearchResponse {
  results: SearchResultItem[];
}

type SearchState = {
  results: SearchResultItem[];
  isLoading: boolean;
  error: any;
};

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private http = inject(HttpClient);
  private readonly base = environment.url;

  // --- State Management con Signals ---
  private state = signal<SearchState>({
    results: [],
    isLoading: false,
    error: null,
  });

  // --- Señales Públicas para los Componentes ---
  public results = computed(() => this.state().results);
  public isLoading = computed(() => this.state().isLoading);
  public error = computed(() => this.state().error);

  /**
   * Ejecuta una búsqueda general en el backend contra cursos y proyectos.
   * @param query - Objeto con el término de búsqueda `q` y/o el ID de la categoría `categorie`.
   */
  runSearch(query: { q?: string; categoryId?: string }): Observable<GeneralSearchResponse> {
    // Si la búsqueda está vacía, limpiamos los resultados y no hacemos la petición.
    const searchTerm = query.q?.trim();
    if (!searchTerm && !query.categoryId) {
      this.state.set({ results: [], isLoading: false, error: null });
      return of({ results: [] });
    }

    // Limpiamos el error anterior y ponemos el estado de carga
    this.state.update(s => ({ ...s, isLoading: true, error: null }));

    let params = new HttpParams();
    if (searchTerm) params = params.set('q', searchTerm);
    if (query.categoryId) params = params.set('categoryId', query.categoryId);

    return this.http.get<GeneralSearchResponse>(`${this.base}home/general_search`, { params }).pipe(
      tap(response => this.state.set({ results: response.results, isLoading: false, error: null })),
      catchError(err => {
        this.state.set({ results: [], isLoading: false, error: err });
        // Relanzamos el error para que los suscriptores puedan manejarlo en el bloque 'error'.
        return throwError(() => err);
      })
    );
  }
}
