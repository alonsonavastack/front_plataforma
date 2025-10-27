// src/app/core/services/settings.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tap, catchError, throwError, Observable } from 'rxjs';
import { HomeService } from './home';

// Interfaces existentes para cursos y proyectos
export interface SettingsCourse {
  _id: string;
  title: string;
  subtitle: string;
  imagen?: string;
  price_usd: number;
  isFree?: boolean;
  featured?: boolean;
  slug?: string;
}

export interface SettingsProject {
  _id: string;
  title: string;
  subtitle: string;
  imagen?: string;
  price_usd: number;
  isFree?: boolean;
  featured?: boolean;
}

// NUEVAS INTERFACES para Settings Globales
export interface Setting {
  _id?: string;
  key: string;
  value: any;
  name: string;
  description?: string;
  group: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SettingsGroup {
  group: string;
  title: string;
  description: string;
  settings: Setting[];
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);
  public base = environment.url;
  private homeService = inject(HomeService);

  // ========================================
  // STATE MANAGEMENT - Cursos y Proyectos Destacados
  // ========================================
  
  private coursesState = signal<{
    courses: SettingsCourse[];
    isLoading: boolean;
    error: any;
  }>({
    courses: [],
    isLoading: false,
    error: null,
  });

  private projectsState = signal<{
    projects: SettingsProject[];
    isLoading: boolean;
    error: any;
  }>({
    projects: [],
    isLoading: false,
    error: null,
  });

  // Computed signals para Cursos y Proyectos
  courses = computed(() => this.coursesState().courses);
  isLoadingCourses = computed(() => this.coursesState().isLoading);
  errorCourses = computed(() => this.coursesState().error);

  projects = computed(() => this.projectsState().projects);
  isLoadingProjects = computed(() => this.projectsState().isLoading);
  errorProjects = computed(() => this.projectsState().error);

  // ========================================
  // STATE MANAGEMENT - Settings Globales
  // ========================================
  
  private globalSettingsState = signal<{
    settings: Setting[];
    isLoading: boolean;
    error: any;
  }>({
    settings: [],
    isLoading: false,
    error: null,
  });

  // Computed signals para Settings Globales
  globalSettings = computed(() => this.globalSettingsState().settings);
  isLoadingSettings = computed(() => this.globalSettingsState().isLoading);
  errorSettings = computed(() => this.globalSettingsState().error);

  // Computed: Settings agrupados por categoría
  groupedSettings = computed(() => {
    const settings = this.globalSettings();
    const groups: { [key: string]: SettingsGroup } = {};

    settings.forEach(setting => {
      if (!groups[setting.group]) {
        groups[setting.group] = {
          group: setting.group,
          title: this.getGroupTitle(setting.group),
          description: this.getGroupDescription(setting.group),
          settings: []
        };
      }
      groups[setting.group].settings.push(setting);
    });

    return Object.values(groups);
  });

  // ========================================
  // MÉTODOS - Cursos y Proyectos Destacados
  // ========================================

  loadCourses() {
    this.coursesState.update(s => ({ ...s, isLoading: true }));

    return this.http.get<{ courses: SettingsCourse[] }>(`${this.base}courses/list-settings`).pipe(
      tap(res => {
        this.coursesState.set({
          courses: res.courses,
          isLoading: false,
          error: null,
        });
      }),
      catchError(err => {
        this.coursesState.set({
          courses: [],
          isLoading: false,
          error: err,
        });
        return throwError(() => err);
      })
    );
  }

  loadProjects() {
    this.projectsState.update(s => ({ ...s, isLoading: true }));

    return this.http.get<{ projects: SettingsProject[] }>(`${this.base}project/list-settings`).pipe(
      tap(res => {
        this.projectsState.set({
          projects: res.projects,
          isLoading: false,
          error: null,
        });
      }),
      catchError(err => {
        this.projectsState.set({
          projects: [],
          isLoading: false,
          error: err,
        });
        return throwError(() => err);
      })
    );
  }

  toggleCourseFeatured(courseId: string, isFeatured: boolean) {
    return this.http.put<{ message: string, course: SettingsCourse }>(
      `${this.base}courses/toggle-featured/${courseId}`, 
      { is_featured: isFeatured }
    );
  }

  toggleProjectFeatured(projectId: string, isFeatured: boolean) {
    return this.http.put<{ message: string, project: SettingsProject }>(
      `${this.base}project/toggle-featured/${projectId}`, 
      { is_featured: isFeatured }
    );
  }

  updateLocalCourse(updatedCourse: SettingsCourse) {
    this.coursesState.update(state => ({
      ...state,
      courses: state.courses.map(c => c._id === updatedCourse._id ? updatedCourse : c)
    }));
  }

  updateLocalProject(updatedProject: SettingsProject) {
    this.projectsState.update(state => ({
      ...state,
      projects: state.projects.map(p => p._id === updatedProject._id ? updatedProject : p)
    }));
  }

  // ========================================
  // MÉTODOS - Settings Globales
  // ========================================

  // Cargar todos los settings
  loadGlobalSettings(): Observable<{ settings: Setting[] }> {
    this.globalSettingsState.update(s => ({ ...s, isLoading: true }));

    return this.http.get<{ settings: Setting[] }>(`${this.base}settings/list`).pipe(
      tap(res => {
        this.globalSettingsState.set({
          settings: res.settings,
          isLoading: false,
          error: null,
        });
      }),
      catchError(err => {
        this.globalSettingsState.set({
          settings: [],
          isLoading: false,
          error: err,
        });
        return throwError(() => err);
      })
    );
  }

  // Cargar settings por grupo
  loadSettingsByGroup(group: string): Observable<{ settings: Setting[] }> {
    return this.http.get<{ settings: Setting[] }>(`${this.base}settings/group/${group}`);
  }

  // Obtener un setting específico
  getSettingByKey(key: string): Observable<{ setting: Setting }> {
    return this.http.get<{ setting: Setting }>(`${this.base}settings/key/${key}`);
  }

  // Actualizar múltiples settings
  updateSettings(settings: Setting[]): Observable<{ message: string, settings: Setting[] }> {
    return this.http.put<{ message: string, settings: Setting[] }>(
      `${this.base}settings/update`,
      { settings }
    ).pipe(
      tap(res => {
        // Actualizar el estado local con los settings actualizados
        this.globalSettingsState.update(state => ({
          ...state,
          settings: state.settings.map(s => {
            const updated = res.settings.find(u => u.key === s.key);
            return updated || s;
          })
        }));
      })
    );
  }

  // Actualizar un solo setting
  updateSingleSetting(key: string, value: any): Observable<{ message: string, setting: Setting }> {
    return this.http.put<{ message: string, setting: Setting }>(
      `${this.base}settings/update/${key}`,
      { value }
    ).pipe(
      tap(res => {
        // Actualizar el estado local
        this.globalSettingsState.update(state => ({
          ...state,
          settings: state.settings.map(s => 
            s.key === key ? res.setting : s
          )
        }));
      })
    );
  }

  // Inicializar settings por defecto
  initializeDefaults(): Observable<{ message: string, count: number }> {
    return this.http.post<{ message: string, count: number }>(
      `${this.base}settings/initialize-defaults`,
      {}
    );
  }

  // ========================================
  // HELPERS
  // ========================================

  private getGroupTitle(group: string): string {
    const titles: { [key: string]: string } = {
      general: 'General',
      commissions: 'Comisiones',
      payments: 'Pagos',
      email: 'Email',
      legal: 'Legal',
      features: 'Características'
    };
    return titles[group] || group;
  }

  private getGroupDescription(group: string): string {
    const descriptions: { [key: string]: string } = {
      general: 'Configuración general del sitio',
      commissions: 'Configuración de comisiones y pagos a instructores',
      payments: 'Métodos de pago y monedas',
      email: 'Configuración de emails',
      legal: 'Términos legales y políticas',
      features: 'Habilitar o deshabilitar características'
    };
    return descriptions[group] || '';
  }
}
