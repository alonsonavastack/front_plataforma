// src/app/core/services/courses.service.ts
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal, effect } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { toQuery } from '../utils/resource-helpers'; // Asegúrate de que este helper exista y funcione
import { catchError, throwError } from 'rxjs';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { CourseListResponse, CourseAdmin, CourseShowResponse, CourseConfigResponse, CourseSection, CourseClase } from '../models/home.models';

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
        // La API devuelve un objeto { courses: [...] }, nos aseguramos de asignar el array.
        this.listState.set({ courses: response.courses || [], isLoading: false, error: null });
      },
      error: (err) => this.listState.set({ courses: [], isLoading: false, error: err }),
    });
  }

  // 🔥 NUEVO: Método directo para el dashboard de revisión
  getCoursesAdmin(state: string | number) {
    // Si state es 'Borrador', convertimos a lo que espere el backend (ej. 1) o enviamos string si el backend lo soporta.
    // Asumiremos que el backend puede filtrar por número o string si se ajusta. 
    // Por ahora pasamos el parámetro tal cual, el backend parece esperar state number en 'list', 
    // pero quizás exista un 'courses/list-admin' o similar. Usaremos 'courses/list' con params.

    // Mapeo rápido si es necesario (ajustar según backend real)
    // 1: Prueba/Borrador, 2: Público? 
    // Si el usuario dice 'Borrador', quizás el backend espera 1.
    // Vamos a enviar el parámetro 'state' en la query.

    let val = state;
    if (state === 'Borrador') val = 1; // Asunción común
    if (state === 'Publico') val = 2;

    return this.http.get<CourseListResponse>(`${this.base}courses/list?state=${val}`);
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
    });

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
      next: (data) => {



        if (data.categories.length > 0) {

        }
        if (data.users.length > 0) {

        }
        this.configState.set({ data, isLoading: false, error: null });
      },
      error: (err) => {

        this.configState.set({ data: { categories: [], users: [] }, isLoading: false, error: err });
      },
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

  // 🔥 NUEVO: Verificar ventas y estudiantes de un curso
  checkSales(courseId: string) {
    return this.http.get<{
      hasSales: boolean;
      hasStudents: boolean;
      saleCount: number;
      studentCount: number;
      uniqueStudents: number;
      canDelete: boolean;
    }>(`${this.base}courses/check-sales/${courseId}`)
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
    this.http.get<{ sections: CourseSection[] }>(`${this.base}course-sections/list?course_id=${courseId}`).subscribe({
      next: (response) => this.sectionsState.set({ sections: response.sections, isLoading: false, error: null }),
      error: (err) => this.sectionsState.set({ sections: [], isLoading: false, error: err }),
    });
  }

  createSection(data: { title: string; course: string }) {
    return this.http.post(`${this.base}course-sections/register`, data);
  }

  updateSection(sectionId: string, data: { title?: string | null; course?: string }) {
    const payload = { _id: sectionId, ...data };
    return this.http.put(`${this.base}course-sections/update`, payload);
  }

  removeSection(id: string) {
    return this.http.delete(`${this.base}course-sections/remove/${id}`).pipe(
      catchError((error) => throwError(() => new Error(error.error.message || 'Error al eliminar la sección')))
    );
  }

  // 🔄 NUEVO: Reordenar secciones
  reorderSections(orderedIds: string[]) {
    return this.http.put(`${this.base}course-sections/reorder`, { ids: orderedIds });
  }

  // 🔄 NUEVO: Actualizar orden local de secciones
  updateLocalSectionOrder(previousIndex: number, currentIndex: number) {
    const updatedSections = [...this.sectionsState().sections];
    moveItemInArray(updatedSections, previousIndex, currentIndex);
    this.sectionsState.update(s => ({ ...s, sections: updatedSections }));
  }

  // --- Class Methods ---
  createClass(data: { title: string; section: string; description?: string | null; vimeo_id?: string; }) {
    return this.http.post(`${this.base}course_clase/register`, data);
  }

  updateClass(id: string, data: { title?: string; description?: string | null; vimeo_id?: string; }) {
    return this.http.put(`${this.base}course_clase/update`, { _id: id, ...data });
  }

  removeClass(id: string) {
    return this.http.delete(`${this.base}course_clase/remove/${id}`);
  }

  reorderClasses(orderedIds: string[]) {
    return this.http.put(`${this.base}course_clase/reorder`, { ids: orderedIds });
  }

  getVimeoData(url: string) {
    return this.http.get<{ duration: number; video_id: string }>(`${this.base}course_clase/vimeo-data?url=${encodeURIComponent(url)}`);
  }

  // 🎬 NUEVO: Obtener datos de YouTube
  getYoutubeData(url: string) {
    return this.http.get<{ duration: number; video_id: string; title: string }>(`${this.base}course_clase/youtube-data?url=${encodeURIComponent(url)}`);
  }

  updateLocalClassOrder(previousIndex: number, currentIndex: number) {
    const updatedClasses = [...this.classesState().classes];
    moveItemInArray(updatedClasses, previousIndex, currentIndex);
    this.classesState.update(s => ({ ...s, classes: updatedClasses }));
  }

  private classesState = signal<{ classes: CourseClase[], isLoading: boolean, error: any }>({
    classes: [],
    isLoading: false,
    error: null,
  });

  classes = computed(() => this.classesState().classes);
  isLoadingClasses = computed(() => this.classesState().isLoading);

  reloadClasses(sectionId: string) {
    if (!sectionId) return;

    this.classesState.update(s => ({ ...s, isLoading: true }));
    // La API devuelve un array de clases directamente
    this.http.get<CourseClase[]>(`${this.base}course_clase/list?section_id=${sectionId}`).subscribe({
      next: (response) => {
        this.classesState.set({ classes: response, isLoading: false, error: null });
      },
      error: (err) => this.classesState.set({ classes: [], isLoading: false, error: err }),
    });
  }
}
