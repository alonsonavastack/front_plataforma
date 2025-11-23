import { Injectable, signal, computed, inject, resource } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, firstValueFrom, forkJoin } from 'rxjs';
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

  // 🔥 NUEVO: Usar resource para auto-desuscripción
  private refetchTrigger = signal(0);

  // 🆕 Resource para el perfil - se recarga automáticamente
  private profileResource = resource({
    loader: async () => {
      const trigger = this.refetchTrigger();
      console.log('📡 [ProfileStudentService] Cargando perfil... (trigger:', trigger, ')');
      return await firstValueFrom(this.http.get<ProfileData>(`${this.API_URL}/client`));
    }
  });

  // 🆕 Resource para reembolsos
  public refundsResource = resource({
    loader: async () => {
      const trigger = this.refetchTrigger();
      console.log('📡 [ProfileStudentService] Cargando reembolsos... (trigger:', trigger, ')');
      return await firstValueFrom(this.http.get<any[]>(`${environment.url}refunds/list`));
    }
  });

  // Señales públicas computadas desde los resources
  public profileData = computed(() => {
    const profile = this.profileResource.value();
    const refunds = this.refundsResource.value();

    if (!profile) return null;
    if (!refunds) return profile; // Retornar perfil sin filtrar si no hay reembolsos aún

    console.log('🔄 [ProfileStudentService] Filtrando contenido con reembolsos...');

    // 🔥 FILTRAR contenido con reembolsos completados
    const data: ProfileData = {
      ...profile,
      profile: profile.profile || {},
      enrolled_courses: profile.enrolled_courses || [],
      sales: profile.sales || [],
      projects: profile.projects || [],
      enrolled_course_count: profile.enrolled_course_count || 0,
      actived_course_count: profile.actived_course_count || 0,
      termined_course_count: profile.termined_course_count || 0,
      transactions: profile.transactions || []
    };

    // 🔥 FILTRAR CURSOS CON REEMBOLSO COMPLETADO
    if (data.enrolled_courses && data.enrolled_courses.length > 0) {
      const originalCount = data.enrolled_courses.length;
      
      console.log('🔍 [ProfileStudentService] Cursos antes de filtrar:', originalCount);

      // Obtener IDs de cursos reembolsados CON FECHA
      const refundedCourses = new Map(); // courseId -> refund date
      
      refunds.forEach((r: any) => {
        if (r.status === 'completed' && r.course) {
          const courseId = typeof r.course === 'string' ? r.course : r.course._id;
          const refundDate = new Date(r.completedAt || r.createdAt);
          
          if (courseId) {
            console.log(`  🚫 Curso reembolsado: ${courseId} (${refundDate.toISOString()})`);
            refundedCourses.set(courseId, refundDate);
          }
        }
      });

      console.log('📋 [ProfileStudentService] Total IDs de cursos reembolsados:', refundedCourses.size);

      // Filtrar cursos - VERIFICAR SI LA COMPRA ES POSTERIOR AL REEMBOLSO
      data.enrolled_courses = data.enrolled_courses.filter((enrollment: any) => {
        const courseId = enrollment.course._id;
        const enrollmentDate = new Date(enrollment.createdAt);
        
        // Si NO tiene reembolso, mantener
        if (!refundedCourses.has(courseId)) {
          console.log(`  ✅ Mantener: ${enrollment.course.title} (sin reembolso)`);
          return true;
        }
        
        // Si tiene reembolso, verificar si la inscripción es POSTERIOR al reembolso
        const refundDate = refundedCourses.get(courseId);
        const isPurchaseAfterRefund = enrollmentDate > refundDate;
        
        if (isPurchaseAfterRefund) {
          console.log(`  ✅ Mantener: ${enrollment.course.title} (comprado DESPUÉS del reembolso)`);
          console.log(`     Reembolso: ${refundDate.toISOString()}, Compra: ${enrollmentDate.toISOString()}`);
          return true;
        }
        
        console.log(`  ❌ Filtrar: ${enrollment.course.title} (reembolsado y no recomprado)`);
        console.log(`     Reembolso: ${refundDate.toISOString()}, Compra: ${enrollmentDate.toISOString()}`);
        return false;
      });

      // Actualizar contadores
      data.enrolled_course_count = data.enrolled_courses.length;
      data.actived_course_count = data.enrolled_courses.filter((e: any) => e.state === 1).length;
      data.termined_course_count = data.enrolled_courses.filter((e: any) => e.state === 2).length;

      console.log(`✅ Cursos filtrados: ${originalCount} → ${data.enrolled_courses.length}`);
    }

    // 🔥 FILTRAR PROYECTOS CON REEMBOLSO COMPLETADO
    if (data.projects && data.projects.length > 0) {
      const originalCount = data.projects.length;
      
      console.log('🔍 [ProfileStudentService] Proyectos antes de filtrar:', originalCount);
      console.log('🔍 [ProfileStudentService] Reembolsos a procesar:', refunds.length);

      // Obtener IDs de proyectos reembolsados CON FECHA
      const refundedProjects = new Map(); // projectId -> refund date
      
      refunds.forEach((r: any) => {
        if (r.status === 'completed' && r.project) {
          const projectId = typeof r.project === 'string' ? r.project : r.project._id;
          const refundDate = new Date(r.completedAt || r.createdAt);
          
          if (projectId) {
            console.log(`  🚫 Proyecto reembolsado: ${projectId} (${refundDate.toISOString()})`);
            refundedProjects.set(projectId, refundDate);
          }
        }
      });

      console.log('📋 [ProfileStudentService] Total IDs de proyectos reembolsados:', refundedProjects.size);

      // 🔥 NUEVO: Buscar fechas de compra de proyectos en Sales
      const projectPurchaseDates = new Map(); // projectId -> purchase date
      
      if (data.sales && data.sales.length > 0) {
        data.sales.forEach((sale: any) => {
          if (sale.detail && sale.detail.length > 0) {
            sale.detail.forEach((item: any) => {
              if (item.product_type === 'project') {
                const projectId = typeof item.product === 'string' ? item.product : item.product?._id;
                const purchaseDate = new Date(sale.createdAt);
                
                if (projectId) {
                  // Si ya existe, mantener la fecha más reciente
                  if (!projectPurchaseDates.has(projectId) || purchaseDate > projectPurchaseDates.get(projectId)) {
                    projectPurchaseDates.set(projectId, purchaseDate);
                    console.log(`  📅 Fecha de compra proyecto ${projectId}: ${purchaseDate.toISOString()}`);
                  }
                }
              }
            });
          }
        });
      }

      // Filtrar proyectos - VERIFICAR SI LA COMPRA ES POSTERIOR AL REEMBOLSO
      data.projects = data.projects.filter((project: any) => {
        const projectId = project._id;
        
        // Si NO tiene reembolso, mantener
        if (!refundedProjects.has(projectId)) {
          console.log(`  ✅ Mantener: ${project.title} (sin reembolso)`);
          return true;
        }
        
        // Si tiene reembolso, verificar si la compra es POSTERIOR al reembolso
        const refundDate = refundedProjects.get(projectId);
        const purchaseDate = projectPurchaseDates.get(projectId);
        
        if (!purchaseDate) {
          console.log(`  ❌ Filtrar: ${project.title} (no se encontró fecha de compra)`);
          return false;
        }
        
        const isPurchaseAfterRefund = purchaseDate > refundDate;
        
        if (isPurchaseAfterRefund) {
          console.log(`  ✅ Mantener: ${project.title} (comprado DESPUÉS del reembolso)`);
          console.log(`     Reembolso: ${refundDate.toISOString()}, Compra: ${purchaseDate.toISOString()}`);
          return true;
        }
        
        console.log(`  ❌ Filtrar: ${project.title} (reembolsado y no recomprado)`);
        console.log(`     Reembolso: ${refundDate.toISOString()}, Compra: ${purchaseDate.toISOString()}`);
        return false;
      });

      console.log(`✅ Proyectos después de filtrar: ${data.projects.length} (Excluidos: ${originalCount - data.projects.length})`);
    }

    return data;
  });

  public isLoading = computed(() =>
    this.profileResource.isLoading() || this.refundsResource.isLoading()
  );

  public refunds = computed(() => this.refundsResource.value() || []);

  // Método para forzar recarga
  reloadProfile(): void {
    console.log('🔄 [ProfileStudentService] Recargando perfil y reembolsos...');
    console.log('⏰ [ProfileStudentService] Timestamp:', new Date().toISOString());
    
    // 🔥 CRITICAL: Usar forkJoin para esperar a que AMBAS peticiones se completen
    const timestamp = Date.now();
    const urlProfile = `${this.API_URL}/client?_=${timestamp}`;
    const urlRefunds = `${environment.url}refunds/list?_=${timestamp}`;
    
    console.log('🔄 [ProfileStudentService] Iniciando recarga simultánea...');
    
    // 🔥 FIX: Usar forkJoin para esperar a que ambas peticiones terminen
    forkJoin({
      profile: this.http.get<ProfileData>(urlProfile),
      refunds: this.http.get<any[]>(urlRefunds)
    }).subscribe({
      next: ({ profile, refunds }) => {
        console.log('✅ [ProfileStudentService] AMBAS peticiones completadas');
        
        // Logs del perfil
        console.log('📊 [ProfileStudentService] Datos del perfil:');
        console.log('   🎯 Cursos inscritos:', profile.enrolled_courses?.length || 0);
        console.log('   📦 Proyectos comprados:', profile.projects?.length || 0);
        console.log('   💰 Ventas totales:', profile.sales?.length || 0);
        
        if (profile.projects && profile.projects.length > 0) {
          console.log('   📦 Lista de proyectos:');
          profile.projects.forEach((p, i) => {
            console.log(`      ${i + 1}. ${p.title} (ID: ${p._id})`);
          });
        }
        
        // Logs de reembolsos
        console.log('💰 [ProfileStudentService] Reembolsos cargados:', refunds.length);
        if (refunds.length > 0) {
          console.log('   💰 Lista de reembolsos:');
          refunds.forEach((r, i) => {
            const productId = r.sale_detail_item?.product?._id || r.sale_detail_item?.product;
            const saleId = r.sale?._id || r.sale;
            console.log(`      ${i + 1}. Sale: ${saleId}, Product: ${productId}, Status: ${r.status}`);
          });
        }
        
        // 🔥 CRITICAL: Actualizar trigger SOLO DESPUÉS de que ambas peticiones terminen
        this.refetchTrigger.update(v => {
          const newValue = v + 1;
          console.log(`🔄 [ProfileStudentService] Trigger actualizado: ${v} → ${newValue}`);
          console.log('✅ [ProfileStudentService] Recarga completa finalizada');
          return newValue;
        });
      },
      error: (err) => {
        console.error('❌ [ProfileStudentService] Error en recarga:', err);
        console.error('❌ [ProfileStudentService] Detalles:', err.message);
        // Aún con error, actualizar el trigger por si acaso
        this.refetchTrigger.update(v => v + 1);
      }
    });
  }

  // Método legacy para compatibilidad - Ahora retorna el observable real
  loadProfile(): Observable<ProfileData> {
    console.log('📊 [ProfileStudentService.loadProfile] Cargando perfil (método legacy)...');
    const timestamp = Date.now();
    const url = `${this.API_URL}/client?_=${timestamp}`;
    return this.http.get<ProfileData>(url);
  }

  // Método para cargar solo las transacciones
  loadTransactions(): Observable<{ transactions: Transaction[] }> {
    return this.http.get<{ transactions: Transaction[] }>(`${this.API_URL}/transactions`);
  }

  /**
   * 🆕 Solicitar reembolso - VERSIÓN ACTUALIZADA CON BILLETERA
   * Ya NO se envían datos bancarios
   * El saldo se acredita automáticamente a la billetera del usuario
   *
   * 🔥 NUEVO: Ahora soporta reembolsos parciales por producto individual
   */
  requestRefund(saleId: string, refundData: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    });

    // ✅ ENVIAMOS: sale_id, product_id, product_type, reason_type, reason_description
    const body = {
      sale_id: saleId,
      product_id: refundData.product_id, // 🔥 NUEVO: ID del producto específico
      product_type: refundData.product_type, // 🔥 NUEVO: Tipo (course o project)
      reason_type: refundData.reason_type,
      reason_description: refundData.reason_description
    };

    console.log('📤 [ProfileStudentService] Enviando solicitud de reembolso:', body);

    return this.http.post(`${this.API_URL}/request-refund`, body, { headers });
  }

  // Método legacy para compatibilidad
  loadRefunds(): Observable<any> {
    return this.http.get(`${environment.url}refunds/list`);
  }
}
