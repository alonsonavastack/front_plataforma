// src/app/core/services/settings.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { HomeService } from './home'; // Importamos HomeService
import { environment } from '../../../environments/environment';
import { tap, catchError, throwError } from 'rxjs';

export interface SettingsCourse {
  _id: string;
  title: string;
  subtitle: string;
  imagen?: string;
  price_usd: number;
  featured?: boolean; // Corregido: de is_featured a featured
  slug?: string;
}

export interface SettingsProject {
  _id: string;
  title: string;
  subtitle: string;
  imagen?: string;
  price_usd: number;
  featured?: boolean; // Corregido: de is_featured a featured
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private http = inject(HttpClient);
  public base = environment.url;
  private homeService = inject(HomeService); // Inyectamos HomeService

  // State management for Courses
  private coursesState = signal<{
    courses: SettingsCourse[];
    isLoading: boolean;
    error: any;
  }>({
    courses: [],
    isLoading: false,
    error: null,
  });

  // State management for Projects
  private projectsState = signal<{
    projects: SettingsProject[];
    isLoading: boolean;
    error: any;
  }>({
    projects: [],
    isLoading: false,
    error: null,
  });

  // Computed signals for Courses
  courses = computed(() => this.coursesState().courses);
  isLoadingCourses = computed(() => this.coursesState().isLoading);
  errorCourses = computed(() => this.coursesState().error);

  // Computed signals for Projects
  projects = computed(() => this.projectsState().projects);
  isLoadingProjects = computed(() => this.projectsState().isLoading);
  errorProjects = computed(() => this.projectsState().error);

  loadCourses() {
    this.coursesState.update(s => ({ ...s, isLoading: true }));

    return this.http.get<{ courses: SettingsCourse[] }>(`${this.base}courses/list-settings`).pipe(
      tap(res => {
        console.log('Cursos cargados:', res.courses);
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
        console.log('Proyectos cargados:', res.projects);
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
    // Devolvemos la respuesta completa para que el componente pueda usarla
    return this.http.put<{ message: string, course: SettingsCourse }>(`${this.base}courses/toggle-featured/${courseId}`, { is_featured: isFeatured });
  }

  toggleProjectFeatured(projectId: string, isFeatured: boolean) {
    // Devolvemos la respuesta completa
    return this.http.put<{ message: string, project: SettingsProject }>(`${this.base}project/toggle-featured/${projectId}`, { is_featured: isFeatured });
  }

  // --- Métodos para actualizar el estado local ---

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
}
