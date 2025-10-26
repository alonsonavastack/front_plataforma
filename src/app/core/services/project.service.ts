import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ProjectListResponse,
  ProjectSingleResponse,
  Project,
} from '../models/home.models';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly http = inject(HttpClient);
  // Corregido: La URL base debe ser 'project' en singular para coincidir con el backend.
  private readonly url = `${environment.url}project`;

  list(search: string, categorie: string): Observable<ProjectListResponse> {
    // Usar HttpParams para construir la query de forma segura
    let params = new HttpParams().set('search', search);
    if (categorie) {
      params = params.set('categorie', categorie);
    }
    // El interceptor se encarga de añadir el token, no es necesario aquí.
    return this.http.get<ProjectListResponse>(`${this.url}/list`, { params });
  }

  getById(id: string): Observable<ProjectSingleResponse> {
    // El backend no requiere token para la vista pública de un proyecto
    return this.http.get<ProjectSingleResponse>(`${this.url}/show/${id}`);
  }

  getByIdAdmin(id: string): Observable<ProjectSingleResponse> {
    // El interceptor añade el token
    return this.http.get<ProjectSingleResponse>(`${this.url}/get-admin/${id}`);
  }

  register(data: FormData): Observable<ProjectSingleResponse> {
    // El interceptor añade el token
    return this.http.post<ProjectSingleResponse>(`${this.url}/register`, data);
  }

  update(data: FormData): Observable<ProjectSingleResponse> {
    // El interceptor añade el token
    return this.http.post<ProjectSingleResponse>(`${this.url}/update`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    // El interceptor añade el token
    return this.http.delete<{ message: string }>(`${this.url}/remove/${id}`);
  }

  /**
   * Verificar si un proyecto tiene ventas (para habilitar/deshabilitar eliminación)
   * @param id ID del proyecto
   * @returns Observable con información de ventas
   */
  checkSales(id: string): Observable<{ hasSales: boolean; saleCount: number; canDelete: boolean }> {
    return this.http.get<{ hasSales: boolean; saleCount: number; canDelete: boolean }>(`${this.url}/check-sales/${id}`);
  }

  // ===== NUEVOS MÉTODOS PARA GESTIÓN DE ARCHIVOS ZIP =====

  /**
   * Subir archivos ZIP al proyecto
   * @param projectId ID del proyecto
   * @param formData FormData con los archivos ZIP
   */
  uploadFiles(projectId: string, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.url}/upload-files/${projectId}`, formData);
  }

  /**
   * Eliminar un archivo específico del proyecto
   * @param projectId ID del proyecto
   * @param fileId ID del archivo a eliminar
   */
  deleteFile(projectId: string, fileId: string): Observable<{ message: string; files: any[] }> {
    return this.http.delete<{ message: string; files: any[] }>(`${this.url}/remove-file/${projectId}/${fileId}`);
  }

  /**
   * Obtener URL para descargar un archivo
   * @param projectId ID del proyecto
   * @param filename Nombre del archivo en el servidor
   */
  getFileDownloadUrl(projectId: string, filename: string): string {
    return `${this.url}/download-file/${projectId}/${filename}`;
  }

  /**
   * Descarga un archivo usando HttpClient para incluir el token de autenticación.
   * @param projectId ID del proyecto
   * @param filename Nombre del archivo en el servidor
   */
  downloadFile(projectId: string, filename: string): Observable<Blob> {
    return this.http.get(`${this.url}/download-file/${projectId}/${filename}`, { responseType: 'blob' });
  }

  listResource = (searchSignal: () => string, categorieSignal: () => string) => {
    const state = signal<{ projects: Project[] | null, isLoading: boolean, error: any }>({
      projects: null,
      isLoading: false,
      error: null,
    });

    const reload = () => {
      const search = searchSignal();
      const categorie = categorieSignal();
      state.update(s => ({ ...s, isLoading: true }));

      let params = new HttpParams().set('search', search);
      if (categorie) {
        params = params.set('categorie', categorie);
      }

      this.http.get<ProjectListResponse>(`${this.url}/list`, { params }).subscribe({
        next: (response) => state.set({ projects: response.projects, isLoading: false, error: null }),
        error: (err) => state.set({ projects: null, isLoading: false, error: err }),
      });
    };

    effect(() => {
      reload();
    }, { allowSignalWrites: true });

    return {
      projects: computed(() => state().projects),
      isLoading: computed(() => state().isLoading),
      reload,
    };
  }
}