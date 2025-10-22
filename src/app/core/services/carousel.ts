import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';

// Interfaz para tipar los datos de una imagen del carrusel, debe coincidir con el modelo del backend.
export interface CarouselImage {
  _id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Interfaz para el estado del servicio, manejado por un signal.
interface CarouselState {
  publicImages: CarouselImage[]; // Imágenes activas para la página de inicio
  allImages: CarouselImage[];    // Todas las imágenes para el panel de administración
  isLoading: boolean;
  error: any;
}

@Injectable({
  providedIn: 'root'
})
export class CarouselService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.url}carousel`; // Corregido: La URL base ya incluye la barra final

  // Signal privado para gestionar el estado interno del servicio.
  private state = signal<CarouselState>({
    publicImages: [],
    allImages: [],
    isLoading: false,
    error: null,
  });

  // --- Señales Públicas (Computadas) ---
  // Exponen los datos del estado de forma segura y reactiva para los componentes.
  public publicImages = computed(() => this.state().publicImages);
  public allImages = computed(() => this.state().allImages);
  public isLoading = computed(() => this.state().isLoading);
  public error = computed(() => this.state().error);

  constructor() {
    // Carga inicial de las imágenes públicas para la página de inicio.
    this.loadPublicImages().subscribe();
  }

  // --- Métodos para el Frontend Público (Home) ---

  /** Carga las imágenes activas para el carrusel de la página de inicio. */
  loadPublicImages(): Observable<CarouselImage[]> {
    this.state.update(s => ({ ...s, isLoading: true }));
    // El backend devuelve un array directamente, no un objeto { images: [...] }
    return this.http.get<CarouselImage[]>(`${this.API_URL}/public_list`).pipe(
      tap({
        next: (images) => {
          this.state.update(s => ({ ...s, publicImages: images, isLoading: false, error: null }));
        },
        error: (err) => {
          this.state.update(s => ({ ...s, publicImages: [], isLoading: false, error: err }));
        }
      })
    );
  }

  // --- Métodos para el Panel de Administración ---

  /** Carga TODAS las imágenes (activas e inactivas) para el dashboard. */
  loadAllImages(): Observable<CarouselImage[]> {
    this.state.update(s => ({ ...s, isLoading: true }));
    return this.http.get<CarouselImage[]>(`${this.API_URL}/list`).pipe(
      tap({
        next: (images) => this.state.update(s => ({ ...s, allImages: images, isLoading: false, error: null })),
        error: (err) => this.state.update(s => ({ ...s, allImages: [], isLoading: false, error: err })),
      })
    );
  }

  /** Registra una nueva imagen del carrusel. `data` debe ser un objeto FormData. */
  register(data: FormData): Observable<CarouselImage> {
    return this.http.post<CarouselImage>(`${this.API_URL}/register`, data);
  }

  /** Actualiza una imagen existente. `data` debe ser un objeto FormData. */
  update(id: string, data: FormData): Observable<CarouselImage> {
    return this.http.put<CarouselImage>(`${this.API_URL}/update/${id}`, data);
  }

  /** Elimina una imagen del carrusel. */
  remove(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/remove/${id}`);
  }

  /** Actualiza el orden de múltiples imágenes en el backend. */
  updateOrder(updates: { _id: string, order: number }[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.API_URL}/update-order`, { updates });
  }

  /** Actualiza el estado local de las imágenes (para drag-and-drop optimista). */
  updateLocalOrder(reorderedImages: CarouselImage[]): void {
    this.state.update(s => ({ ...s, allImages: reorderedImages }));
  }
}
