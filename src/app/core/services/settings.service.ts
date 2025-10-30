import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';

export interface SystemSettings {
  platform_name?: string;
  contact_email?: string;
  contact_phone?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_youtube?: string;
  social_tiktok?: string;
  social_twitter?: string;
  social_linkedin?: string;
  logo?: string;
}

export interface SettingDetail {
  key: string;
  value: any;
  name: string;
  description: string;
  group: string;
  type: string;
}

export interface Setting {
  key: string;
  value: any;
  name: string;
  description: string;
  group: string;
  type: string;
}

export interface GroupedSetting {
  group: string;
  title: string;
  description: string;
  settings: Setting[];
}

// Interfaces para Courses y Projects destacados
export interface SettingsCourse {
  _id: string;
  title: string;
  subtitle?: string;
  portada?: string;
  imagen?: string;  // ✅ Agregado
  featured: boolean;
  isFree?: boolean;  // ✅ Agregado
  categorie?: any;
  user?: any;
  precio_usd?: number;
  precio_mxn?: number;
  price_usd?: number;  // ✅ Agregado (alias)
  price_mxn?: number;  // ✅ Agregado (alias)
}

export interface SettingsProject {
  _id: string;
  title: string;
  subtitle?: string;
  portada?: string;
  imagen?: string;  // ✅ Agregado
  featured: boolean;
  isFree?: boolean;  // ✅ Agregado
  user?: any;
  precio_usd?: number;
  precio_mxn?: number;
  price_usd?: number;  // ✅ Agregado (alias)
  price_mxn?: number;  // ✅ Agregado (alias)
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private http = inject(HttpClient);
  public base = environment.url;

  // 📊 Estado con signals
  private settingsState = signal<{
    settings: Record<string, SettingDetail>;
    isLoading: boolean;
    lastUpdate: Date | null;
  }>({
    settings: {},
    isLoading: false,
    lastUpdate: null
  });

  // 📊 Estado para settings globales
  private globalSettingsState = signal<{
    allSettings: Setting[];
    groupedSettings: GroupedSetting[];
    isLoading: boolean;
  }>({
    allSettings: [],
    groupedSettings: [],
    isLoading: false
  });

  // 📊 Estado para courses destacados
  private coursesState = signal<{
    courses: SettingsCourse[];
    isLoading: boolean;
  }>({
    courses: [],
    isLoading: false
  });

  // 📊 Estado para projects destacados
  private projectsState = signal<{
    projects: SettingsProject[];
    isLoading: boolean;
  }>({
    projects: [],
    isLoading: false
  });

  // 📊 Computed signals para acceso fácil
  settings = computed(() => this.settingsState().settings);
  isLoading = computed(() => this.settingsState().isLoading);
  lastUpdate = computed(() => this.settingsState().lastUpdate);

  // 📊 Computed para global settings
  isLoadingSettings = computed(() => this.globalSettingsState().isLoading);
  groupedSettings = computed(() => this.globalSettingsState().groupedSettings);

  // 📊 Computed para courses y projects
  courses = computed(() => this.coursesState().courses);
  projects = computed(() => this.projectsState().projects);
  isLoadingCourses = computed(() => this.coursesState().isLoading);
  isLoadingProjects = computed(() => this.projectsState().isLoading);

  // 📊 Computed signals para grupos de configuraciones
  generalSettings = computed(() => {
    const settings = this.settings();
    return Object.entries(settings)
      .filter(([key, value]) => value.group === 'general')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  });

  contactSettings = computed(() => {
    const settings = this.settings();
    return Object.entries(settings)
      .filter(([key, value]) => value.group === 'contact')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  });

  socialSettings = computed(() => {
    const settings = this.settings();
    return Object.entries(settings)
      .filter(([key, value]) => value.group === 'social')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  });

  // 📊 Valores rápidos
  platformName = computed(() => this.settings()['platform_name']?.value || 'Dev-Sharks');
  logoUrl = computed(() => {
    const logo = this.settings()['logo']?.value;
    return logo ? `${environment.url}settings/logo/${logo}` : null;
  });

  constructor() {
    console.log('⚙️ [SettingsService] Inicializado');
  }

  /**
   * 📥 Cargar toda la configuración del sistema
   */
  loadSettings(): Observable<any> {
    console.log('📥 [SettingsService] Cargando configuración del sistema...');

    this.settingsState.update(state => ({ ...state, isLoading: true }));

    const obs = this.http.get<any>(`${environment.url}settings/all`);

    obs.subscribe({
      next: (response) => {
        console.log('✅ [SettingsService] Configuración cargada:', response);

        this.settingsState.set({
          settings: response.settings || {},
          isLoading: false,
          lastUpdate: new Date()
        });
      },
      error: (error) => {
        console.error('❌ [SettingsService] Error al cargar configuración:', error);
        this.settingsState.update(state => ({ ...state, isLoading: false }));
      }
    });

    return obs;
  }

  /**
   * 📥 Cargar configuración global (para GlobalSettingsComponent)
   */
  loadGlobalSettings(): Observable<any> {
    console.log('📥 [SettingsService] Cargando configuración global...');

    this.globalSettingsState.update(state => ({ ...state, isLoading: true }));

    const obs = this.http.get<any>(`${environment.url}settings/grouped`);

    obs.subscribe({
      next: (response) => {
        console.log('✅ [SettingsService] Configuración global cargada:', response);

        this.globalSettingsState.set({
          allSettings: response.settings || [],
          groupedSettings: this.groupSettingsByCategory(response.settings || []),
          isLoading: false
        });
      },
      error: (error) => {
        console.error('❌ [SettingsService] Error al cargar configuración global:', error);
        this.globalSettingsState.update(state => ({ ...state, isLoading: false }));
      }
    });

    return obs;
  }

  /**
   * 📚 Cargar cursos (para SettingsComponent - featured)
   */
  loadCourses(): Observable<any> {
    console.log('📚 [SettingsService] Cargando cursos...');

    this.coursesState.update(state => ({ ...state, isLoading: true }));

    return this.http.get<{ courses: SettingsCourse[] }>(`${environment.url}courses/list`).pipe(
      tap(response => {
        console.log('✅ [SettingsService] Cursos cargados:', response.courses.length);
        this.coursesState.set({
          courses: response.courses || [],
          isLoading: false
        });
      })
    );
  }

  /**
   * 📦 Cargar proyectos (para SettingsComponent - featured)
   */
  loadProjects(): Observable<any> {
    console.log('📦 [SettingsService] Cargando proyectos...');

    this.projectsState.update(state => ({ ...state, isLoading: true }));

    return this.http.get<{ projects: SettingsProject[] }>(`${environment.url}projects/list`).pipe(
      tap(response => {
        console.log('✅ [SettingsService] Proyectos cargados:', response.projects.length);
        this.projectsState.set({
          projects: response.projects || [],
          isLoading: false
        });
      })
    );
  }

  /**
   * ⭐ Toggle featured state de un curso
   */
  toggleCourseFeatured(courseId: string, featured: boolean): Observable<any> {
    console.log(`⭐ [SettingsService] Toggle course featured: ${courseId} -> ${featured}`);
    return this.http.put<{ course: SettingsCourse }>(`${environment.url}courses/toggle-featured/${courseId}`, { featured });
  }

  /**
   * ⭐ Toggle featured state de un proyecto
   */
  toggleProjectFeatured(projectId: string, featured: boolean): Observable<any> {
    console.log(`⭐ [SettingsService] Toggle project featured: ${projectId} -> ${featured}`);
    return this.http.put<{ project: SettingsProject }>(`${environment.url}projects/toggle-featured/${projectId}`, { featured });
  }

  /**
   * 🔄 Actualizar curso localmente (optimistic update)
   */
  updateLocalCourse(updatedCourse: SettingsCourse): void {
    this.coursesState.update(state => ({
      ...state,
      courses: state.courses.map(c =>
        c._id === updatedCourse._id ? updatedCourse : c
      )
    }));
  }

  /**
   * 🔄 Actualizar proyecto localmente (optimistic update)
   */
  updateLocalProject(updatedProject: SettingsProject): void {
    this.projectsState.update(state => ({
      ...state,
      projects: state.projects.map(p =>
        p._id === updatedProject._id ? updatedProject : p
      )
    }));
  }

  /**
   * Agrupar settings por categoría
   */
  private groupSettingsByCategory(settings: Setting[]): GroupedSetting[] {
    const groups: { [key: string]: GroupedSetting } = {};

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
  }

  /**
   * Obtener título del grupo
   */
  private getGroupTitle(group: string): string {
    const titles: { [key: string]: string } = {
      general: 'General',
      commissions: 'Comisiones',
      payments: 'Pagos',
      email: 'Email',
      legal: 'Legal',
      features: 'Funcionalidades'
    };
    return titles[group] || group;
  }

  /**
   * Obtener descripción del grupo
   */
  private getGroupDescription(group: string): string {
    const descriptions: { [key: string]: string } = {
      general: 'Configuración general del sistema',
      commissions: 'Configuración de comisiones',
      payments: 'Configuración de métodos de pago',
      email: 'Configuración de emails',
      legal: 'Configuración legal',
      features: 'Configuración de funcionalidades'
    };
    return descriptions[group] || '';
  }

  /**
   * 💾 Actualizar configuración del sistema (sin logo)
   */
  updateSettings(settings: Setting[]): Observable<any> {
    console.log('💾 [SettingsService] Actualizando configuración:', settings);
    return this.http.put<any>(`${environment.url}settings/update`, { settings });
  }

  /**
   * 🖼️ Actualizar logo del sistema
   */
  updateLogo(file: File): Observable<any> {
    console.log('🖼️ [SettingsService] Actualizando logo...');

    const formData = new FormData();
    formData.append('logo', file);

    return this.http.post<any>(`${environment.url}settings/update-logo`, formData);
  }

  /**
   * 🗑️ Eliminar logo del sistema
   */
  deleteLogo(): Observable<any> {
    console.log('🗑️ [SettingsService] Eliminando logo...');
    return this.http.delete<any>(`${environment.url}settings/delete-logo`);
  }

  /**
   * 🔄 Restablecer configuración por defecto
   */
  resetSettings(): Observable<any> {
    console.log('🔄 [SettingsService] Restableciendo configuración por defecto...');
    return this.http.post<any>(`${environment.url}settings/reset`, {});
  }

  /**
   * 🔄 Inicializar configuración por defecto
   */
  initializeDefaults(): Observable<any> {
    console.log('🔄 [SettingsService] Inicializando configuración por defecto...');
    return this.http.post<any>(`${environment.url}settings/initialize-defaults`, {});
  }

  /**
   * 🔧 Obtener valor de una configuración específica
   */
  getSetting(key: string): any {
    return this.settings()[key]?.value || null;
  }

  /**
   * 🔧 Construir URL del logo
   */
  buildLogoUrl(filename: string): string {
    if (!filename) return '';
    return `${environment.url}settings/logo/${filename}`;
  }
}
