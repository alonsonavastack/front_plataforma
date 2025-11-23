import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PurchasesService {
  private purchasedProducts = signal<Set<string>>(new Set());

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Obtener productos comprados del usuario
  loadPurchasedProducts() {
    if (!this.authService.isLoggedIn()) {
      console.log('⚠️ [PurchasesService] Usuario no logueado - limpiando productos');
      this.purchasedProducts.set(new Set());
      return;
    }

    console.log('🔄 [PurchasesService] Cargando productos comprados...');

    this.http.get<any>(`${environment.url}profile-student/client`, {
      headers: this.getHeaders()
    }).pipe(
      tap((response) => {
        const productIds = new Set<string>();

        console.log('📚 [PurchasesService] Respuesta del backend:', {
          enrolled_courses: response.enrolled_courses?.length || 0,
          projects: response.projects?.length || 0
        });

        // Agregar IDs de cursos inscritos
        if (response.enrolled_courses) {
          response.enrolled_courses.forEach((enrollment: any) => {
            const courseId = enrollment.course?._id || enrollment.course;
            if (courseId) {
              console.log('✅ [PurchasesService] Curso agregado:', courseId);
              productIds.add(courseId);
            }
          });
        }

        // Agregar IDs de proyectos comprados
        if (response.projects) {
          response.projects.forEach((project: any) => {
            const projectId = project._id || project.project?._id;
            if (projectId) {
              console.log('✅ [PurchasesService] Proyecto agregado:', projectId);
              productIds.add(projectId);
            }
          });
        }

        console.log('✅ [PurchasesService] Total de productos comprados:', productIds.size);
        this.purchasedProducts.set(productIds);
      })
    ).subscribe({
      error: (error) => {
        console.error('❌ [PurchasesService] Error al cargar productos:', error);
        this.purchasedProducts.set(new Set());
      }
    });
  }

  // Verificar si un producto ya fue comprado
  isPurchased(productId: string): boolean {
    return this.purchasedProducts().has(productId);
  }

  // Obtener señal de productos comprados
  getPurchasedProducts() {
    return this.purchasedProducts;
  }

  // Limpiar al hacer logout
  clearPurchases() {
    this.purchasedProducts.set(new Set());
  }
}
