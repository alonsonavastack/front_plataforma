import { Injectable, signal, computed, inject, resource } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, lastValueFrom } from 'rxjs';
import type { Sale } from '../models/sale.model';
import { AuthService } from './auth';
export type { Sale };

// Interfaces
export interface EnrolledCourse {
  _id: string;
  course: {
    _id: string;
    title: string;
    slug: string;
    imagen: string;
    user: { name: string; surname: string; };
  };
  percentage: number;
  state: number;
  clases_checked?: string[];
  createdAt?: string;
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
  video_link?: string;
  url_video?: string;
  categorie: any;
  price_mxn: number;

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
  transactions?: Transaction[];
}

export interface Transaction {
  _id: string;
  n_transaccion: string;
  method_payment: string;
  total: number;
  currency_total: string;
  status: string;
  items: {
    product: { _id: string; title: string; imagen?: string; };
    product_type: 'course' | 'project';
    price: number;
  }[];
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileStudentService {
  private http = inject(HttpClient);
  private authService = inject(AuthService); // ✅ Inyectar AuthService
  private readonly API_URL = `${environment.url}profile-student`;

  // ✅ Resource para el perfil - solo carga si hay token
  private profileResource = resource({
    loader: async () => {
      const token = this.authService.token();
      if (!token) {
        console.warn('⚠️ [ProfileStudentService] No hay token, no se carga perfil');
        return null;
      }
      const timestamp = Date.now();
      return await lastValueFrom(this.http.get<ProfileData>(`${this.API_URL}/client?_=${timestamp}`));
    }
  });

  // ✅ Resource para los reembolsos - solo carga si hay token
  private refundsResource = resource({
    loader: async () => {
      const token = this.authService.token();
      if (!token) {
        console.warn('⚠️ [ProfileStudentService] No hay token, no se cargan reembolsos');
        return [];
      }
      const timestamp = Date.now();
      return await lastValueFrom(this.http.get<any[]>(`${environment.url}refunds/list?_=${timestamp}`));
    }
  });

  // 📊 Computed con filtrado inteligente
  public profileData = computed(() => {
    const profile = this.profileResource.value();
    const refunds = this.refundsResource.value();

    if (!profile) return null;
    if (!refunds || refunds.length === 0) return profile;

    // 🔥 FILTRAR cursos y proyectos con reembolsos completados
    const data: ProfileData = { ...profile };

    // Filtrar cursos
    if (data.enrolled_courses?.length > 0) {
      const refundedCourses = new Map();
      refunds.forEach((r: any) => {
        if (r.status === 'completed' && r.course) {
          const courseId = typeof r.course === 'string' ? r.course : r.course._id;
          const refundDate = new Date(r.completedAt || r.createdAt);
          if (courseId) refundedCourses.set(courseId, refundDate);
        }
      });

      data.enrolled_courses = data.enrolled_courses.filter((enrollment: any) => {
        const courseId = enrollment.course._id;
        const enrollmentDate = new Date(enrollment.createdAt);

        if (!refundedCourses.has(courseId)) return true;

        const refundDate = refundedCourses.get(courseId);
        return enrollmentDate > refundDate;
      });

      data.enrolled_course_count = data.enrolled_courses.length;
      data.actived_course_count = data.enrolled_courses.filter((e: any) => e.state === 1).length;
      data.termined_course_count = data.enrolled_courses.filter((e: any) => e.state === 2).length;
    }

    // Filtrar proyectos
    if (data.projects?.length > 0) {
      const refundedProjects = new Map();
      refunds.forEach((r: any) => {
        if (r.status === 'completed' && r.project) {
          const projectId = typeof r.project === 'string' ? r.project : r.project._id;
          const refundDate = new Date(r.completedAt || r.createdAt);
          if (projectId) refundedProjects.set(projectId, refundDate);
        }
      });

      const projectPurchaseDates = new Map();
      data.sales?.forEach((sale: any) => {
        sale.detail?.forEach((item: any) => {
          if (item.product_type === 'project') {
            const projectId = typeof item.product === 'string' ? item.product : item.product?._id;
            const purchaseDate = new Date(sale.createdAt);
            if (projectId) {
              if (!projectPurchaseDates.has(projectId) || purchaseDate > projectPurchaseDates.get(projectId)) {
                projectPurchaseDates.set(projectId, purchaseDate);
              }
            }
          }
        });
      });

      data.projects = data.projects.filter((project: any) => {
        const projectId = project._id;
        if (!refundedProjects.has(projectId)) return true;

        const refundDate = refundedProjects.get(projectId);
        const purchaseDate = projectPurchaseDates.get(projectId);
        return purchaseDate && purchaseDate > refundDate;
      });
    }

    return data;
  });

  public isLoading = computed(() => this.profileResource.isLoading() || this.refundsResource.isLoading());
  public refunds = computed(() => this.refundsResource.value() || []);

  // 🔄 Recargar datos
  reloadProfile(): void {
    this.profileResource.reload();
    this.refundsResource.reload();
  }

  // Métodos legacy mantenidos por compatibilidad
  loadProfile(): Observable<ProfileData> {
    return this.http.get<ProfileData>(`${this.API_URL}/client?_=${Date.now()}`);
  }

  loadTransactions(): Observable<{ transactions: Transaction[] }> {
    return this.http.get<{ transactions: Transaction[] }>(`${this.API_URL}/transactions`);
  }

  requestRefund(saleId: string, refundData: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });

    const body = {
      sale_id: saleId,
      product_id: refundData.product_id,
      product_type: refundData.product_type,
      reason_type: refundData.reason_type,
      reason_description: refundData.reason_description
    };

    return this.http.post(`${this.API_URL}/request-refund`, body, { headers });
  }

  // ✅ NUEVO: Subir comprobante de pago
  uploadVoucher(saleId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('sale_id', saleId);
    formData.append('imagen', file);

    return this.http.post(`${this.API_URL}/upload-voucher`, formData);
  }

  loadRefunds(): Observable<any> {
    return this.http.get(`${environment.url}refunds/list`);
  }
}
