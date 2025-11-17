import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  state: number;
  clases_checked?: string[];
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
    product: {
      _id: string;
      title: string;
      imagen?: string;
    };
    product_type: 'course' | 'project';
    price: number;
  }[];
  createdAt: string;
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
        next: (data) => {
          console.log('📊 [ProfileService] Datos iniciales cargados');
          console.log('   • Cursos inscritos:', data.enrolled_courses?.length || 0);
          console.log('   • Proyectos:', data.projects?.length || 0);
          
          // 🆕 FASE 2: Cargar reembolsos y filtrar cursos/proyectos reembolsados
          this.loadRefunds().subscribe({
            next: (refunds) => {
              console.log('📋 [ProfileService] Reembolsos cargados:', refunds.length);
              
              // 🔥 FILTRAR CURSOS CON REEMBOLSO COMPLETADO
              if (data.enrolled_courses && data.enrolled_courses.length > 0) {
                const originalCount = data.enrolled_courses.length;
                
                // Crear Set con IDs de cursos con reembolso completado
                const completedRefundCourseIds = new Set(
                  refunds
                    .filter((r: any) => r.status === 'completed' && r.course)
                    .map((r: any) => typeof r.course === 'string' ? r.course : r.course._id)
                );
                
                console.log('🗑️ [ProfileService] Cursos con reembolso completado:', completedRefundCourseIds.size);
                if (completedRefundCourseIds.size > 0) {
                  console.log('   IDs:', Array.from(completedRefundCourseIds));
                }
                
                // Filtrar cursos que NO tienen reembolso completado
                data.enrolled_courses = data.enrolled_courses.filter(
                  enrollment => !completedRefundCourseIds.has(enrollment.course._id)
                );
                
                console.log(`✅ [ProfileService] Cursos filtrados: ${originalCount} → ${data.enrolled_courses.length}`);
                
                // Actualizar contadores
                data.enrolled_course_count = data.enrolled_courses.length;
                data.actived_course_count = data.enrolled_courses.filter(e => e.state === 1).length;
                data.termined_course_count = data.enrolled_courses.filter(e => e.state === 2).length;
                
                console.log('   • Total:', data.enrolled_course_count);
                console.log('   • Activos:', data.actived_course_count);
                console.log('   • Terminados:', data.termined_course_count);
              }
              
              // 🔥 FILTRAR PROYECTOS CON REEMBOLSO COMPLETADO
              if (data.projects && data.projects.length > 0) {
                const originalCount = data.projects.length;
                
                // Crear Set con IDs de proyectos con reembolso completado
                const completedRefundProjectIds = new Set(
                  refunds
                    .filter((r: any) => r.status === 'completed' && r.project)
                    .map((r: any) => typeof r.project === 'string' ? r.project : r.project._id)
                );
                
                console.log('🗑️ [ProfileService] Proyectos con reembolso completado:', completedRefundProjectIds.size);
                if (completedRefundProjectIds.size > 0) {
                  console.log('   IDs:', Array.from(completedRefundProjectIds));
                }
                
                // Filtrar proyectos que NO tienen reembolso completado
                data.projects = data.projects.filter(
                  project => !completedRefundProjectIds.has(project._id)
                );
                
                console.log(`✅ [ProfileService] Proyectos filtrados: ${originalCount} → ${data.projects.length}`);
              }
              
              // Actualizar estado con datos filtrados
              this.state.set({ data: data, isLoading: false, error: null });
              console.log('✅ [ProfileService] Perfil cargado y filtrado exitosamente');
            },
            error: (err) => {
              console.error('❌ [ProfileService] Error al cargar reembolsos:', err);
              console.log('⚠️ [ProfileService] Mostrando datos sin filtrar por seguridad');
              // Si falla la carga de reembolsos, mostrar todo sin filtrar
              this.state.set({ data: data, isLoading: false, error: null });
            }
          });
        },
        error: err => {
          console.error('❌ [ProfileService] Error al cargar perfil:', err);
          this.state.set({ data: null, isLoading: false, error: err });
        },
      })
    );
  }

  // Método para cargar solo las transacciones
  loadTransactions(): Observable<{ transactions: Transaction[] }> {
    return this.http.get<{ transactions: Transaction[] }>(`${this.API_URL}/transactions`);
  }

  /**
   * 🆕 Solicitar reembolso - VERSIÓN ACTUALIZADA CON BILLETERA
   * Ya NO se envían datos bancarios
   * El saldo se acredita automáticamente a la billetera del usuario
   */
  requestRefund(saleId: string, refundData: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });

    // ✅ SOLO ENVIAMOS: sale_id, reason_type, reason_description
    // ❌ NO ENVIAMOS: bank_account, bank_name, account_holder
    const body = {
      sale_id: saleId,
      reason_type: refundData.reason_type,
      reason_description: refundData.reason_description
    };

    console.log('📤 [ProfileStudentService] Enviando solicitud de reembolso a billetera:', { 
      url: `${this.API_URL}/request-refund`, 
      body 
    });

    return this.http.post(`${this.API_URL}/request-refund`, body, { headers });
  }

  // Método para obtener los reembolsos del estudiante
  loadRefunds(): Observable<any> {
    return this.http.get(`${environment.url}refunds/list`);
  }
}
