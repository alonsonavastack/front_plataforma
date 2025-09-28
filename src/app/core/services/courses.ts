// src/app/core/services/courses.service.ts
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal, effect } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { toQuery } from '../utils/resource-helpers';
import { catchError, throwError } from 'rxjs';
import { CourseListResponse, CourseAdmin, CourseShowResponse, CourseConfigResponse, CourseSection } from '../models/home.models';

@Injectable({ providedIn: 'root' })
export class CoursesService {
  http = inject(HttpClient);
  base = environment.url;

  // Filtros de lista (admin)
  private filtro = signal<{ search?: string; state?: number; categorie?: string }>({});
  setFiltro(patch: { search?: string; state?: number; categorie?: string }) {
    this.filtro.set({ ...this.filtro(), ...patch });
    this.reloadList(); // refresca automáticamente
  }

  private listState = signal<{ courses: CourseAdmin[], isLoading: boolean, error: any }>({
    courses: [],
    isLoading: false,
    error: null,
  });

  courses = computed(() => this.listState().courses);
  isLoadingList = computed(() => this.listState().isLoading);

  reloadList() {
    const f = this.filtro();
    const url = `${this.base}courses/list${toQuery(f)}`;
    this.listState.update(s => ({ ...s, isLoading: true }));
    this.http.get<CourseListResponse>(url).subscribe({
      next: (response) => {
        console.log('Cursos recibidos de la API:', response); // Para depuración
        // La API devuelve un objeto { courses: [...] }, nos aseguramos de asignar el array.
        this.listState.set({ courses: response.courses || [], isLoading: false, error: null });
      },
      error: (err) => this.listState.set({ courses: [], isLoading: false, error: err }),
    });
  }

  showResource = (idSignal: () => string) => {
    const state = signal<{ course: CourseAdmin | null, isLoading: boolean, error: any }>({
      course: null,
      isLoading: false,
      error: null,
    });

    const reload = () => {
      const id = idSignal();
      if (!id) return;
      state.update(s => ({ ...s, isLoading: true }));
      this.http.get<CourseShowResponse>(`${this.base}courses/show/${id}`).subscribe({
        next: (response) => state.set({ course: response.course, isLoading: false, error: null }),
        error: (err) => state.set({ course: null, isLoading: false, error: err }),
      });
    };

    effect(() => {
      reload();
    }, { allowSignalWrites: true });

    return {
      course: computed(() => state().course),
      isLoading: computed(() => state().isLoading),
      reload,
    };
  }

  private configState = signal<{ data: CourseConfigResponse, isLoading: boolean, error: any }>({
    data: { categories: [], users: [] },
    isLoading: false,
    error: null,
  });

  config = computed(() => this.configState().data);
  isLoadingConfig = computed(() => this.configState().isLoading);

  reloadConfig() {
    this.configState.update(s => ({ ...s, isLoading: true }));
    this.http.get<CourseConfigResponse>(`${this.base}courses/config_all`).subscribe({
      next: (data) => this.configState.set({ data, isLoading: false, error: null }),
      error: (err) => this.configState.set({ data: { categories: [], users: [] }, isLoading: false, error: err }),
    });
  }

  // REGISTER / UPDATE / REMOVE
  // Estos métodos necesitan el token, que se añade a través de un interceptor (no mostrado aquí, pero es la práctica estándar)
  register(fd: FormData) {
    return this.http.post(`${this.base}courses/register`, fd)
      .pipe(catchError(err => throwError(() => err)));
  }
  update(fd: FormData) {
    // El backend espera un POST para update con FormData
    return this.http.post(`${this.base}courses/update`, fd)
      .pipe(catchError(err => throwError(() => err)));
  }
  remove(id: string) {
    return this.http.delete(`${this.base}courses/remove/${id}`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // --- Section Methods ---
  private _currentCourseIdForSections = signal<string | undefined>(undefined);

  private sectionsState = signal<{ sections: CourseSection[], isLoading: boolean, error: any }>({
    sections: [],
    isLoading: false,
    error: null,
  });

  sections = computed(() => this.sectionsState().sections);
  isLoadingSections = computed(() => this.sectionsState().isLoading);

  reloadSections(courseId: string) {
    this._currentCourseIdForSections.set(courseId);
    if (!this._currentCourseIdForSections()) return;

    this.sectionsState.update(s => ({ ...s, isLoading: true }));
    this.http.get<{ sections: CourseSection[] }>(`${this.base}course_section/list?course_id=${courseId}`).subscribe({
      next: (response) => this.sectionsState.set({ sections: response.sections, isLoading: false, error: null }),
      error: (err) => this.sectionsState.set({ sections: [], isLoading: false, error: err }),
    });
  }

  createSection(data: { title: string; course: string }) {
    return this.http.post(`${this.base}course_section/register`, data);
  }

  updateSection(sectionId: string, data: { title?: string | null; course?: string }) {
    const payload = { _id: sectionId, ...data };
    return this.http.put(`${this.base}course_section/update`, payload);
  }

  removeSection(id: string) {
    return this.http.delete(`${this.base}course_section/remove/${id}`).pipe(
      catchError((error) => throwError(() => new Error(error.error.message || 'Error al eliminar la sección')))
    );
  }
}
