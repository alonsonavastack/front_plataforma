import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';
// Importamos y re-exportamos 'Sale' para que esté disponible para otros módulos
import type { Sale } from '../models/sale.model';
export type { Sale };

// Interfaces que coinciden con la respuesta del backend
export interface EnrolledCourse {
  _id: string;
  course: {
    _id: string;
    title: string;
    slug: string;
    imagen: string;
    user: {
      name: string;
      surname: string;
    };
  };
  percentage: number;
  state: number; // Añadido para verificar si el curso está completado
  clases_checked?: string[]; // Añadido para verificar si está en progreso
}

export interface ProjectFile {
  name: string;
  filename: string;
  size: number;
  uploadDate: string;
  _id: string;
}

export interface Project {
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  imagen: string;
  url_video?: string;
  categorie: any;
  price_mxn: number;
  price_usd: number;
  state: number;
  user: any;
  files?: ProjectFile[];
}

export interface ProfileData {
  profile: any;
  enrolled_courses: EnrolledCourse[];
  sales: Sale[];
  projects: Project[];
  enrolled_course_count: number;
  actived_course_count: number;
  termined_course_count: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileStudentService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.url}profile-student`;

  private state = signal<{ data: ProfileData | null; isLoading: boolean; error: any }>({
    data: null,
    isLoading: false,
    error: null,
  });

  // Señales públicas para los componentes
  public profileData = computed(() => this.state().data);
  public isLoading = computed(() => this.state().isLoading);

  loadProfile(): Observable<ProfileData> {
    this.state.update(s => ({ ...s, isLoading: true }));
    return this.http.get<ProfileData>(`${this.API_URL}/client`).pipe(
      tap({
        next: response => this.state.set({ data: response, isLoading: false, error: null }),
        error: err => this.state.set({ data: null, isLoading: false, error: err }),
      })
    );
  }
}
