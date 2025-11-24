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
  private isLoadingPurchases = signal<boolean>(false); // 🔥 NUEVO: Estado de carga
  private purchasesLoaded = signal<boolean>(false); // 🔥 NUEVO: Indica si ya se cargaron

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

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
      this.purchasesLoaded.set(true);
      this.isLoadingPurchases.set(false);
      return;
    }

    // 🔥 FIX: Marcar como cargando
    this.isLoadingPurchases.set(true);
    this.purchasesLoaded.set(false);

    console.log('🔄 [PurchasesService] Cargando productos comprados...');
    console.log('⏰ [PurchasesService] Timestamp:', new Date().toISOString());

    // 🔥 FIX: Usar cache-busting para asegurar datos frescos
    const timestamp = Date.now();
    const url = `${environment.url}profile-student/client?_=${timestamp}`;

    this.http.get<any>(url, {
      headers: this.getHeaders()
    }).pipe(
      tap((response) => {
        const productIds = new Set<string>();

        console.log('📦 [PurchasesService] Respuesta recibida');
        console.log('   🎯 Cursos:', response.enrolled_courses?.length || 0);
        console.log('   📦 Proyectos:', response.projects?.length || 0);
        console.log('🔎 [DEBUG] Response completo:', JSON.stringify(response, null, 2));

        // Agregar IDs de cursos inscritos
        if (response.enrolled_courses) {
          response.enrolled_courses.forEach((enrollment: any) => {
            const courseId = enrollment.course?._id || enrollment.course;
            if (courseId) {
              console.log('   ✅ Curso:', courseId);
              productIds.add(courseId);
            }
          });
        }

        // Agregar IDs de proyectos comprados
        if (response.projects) {
          response.projects.forEach((project: any) => {
            const projectId = project._id || project.project?._id;
            if (projectId) {
              console.log('   ✅ Proyecto:', projectId);
              productIds.add(projectId);
            } else {
              console.warn('   ⚠️ Proyecto sin ID:', project);
            }
          });
        }

        console.log(`📊 [PurchasesService] Total productos cargados: ${productIds.size}`);
        console.log('👁️ [PurchasesService] IDs:', Array.from(productIds));
        console.log('✅ [PurchasesService] Carga completada exitosamente');

        this.purchasedProducts.set(productIds);
      })
    ).subscribe({
      next: () => {
        // 🔥 FIX: Marcar como completado
        this.isLoadingPurchases.set(false);
        this.purchasesLoaded.set(true);
        console.log('🏁 [PurchasesService] Estado: LOADED');
      },
      error: (error) => {
        console.error('❌ [PurchasesService] Error loading products:', error);
        this.purchasedProducts.set(new Set());
        this.isLoadingPurchases.set(false);
        this.purchasesLoaded.set(true);
      }
    });
  }

  // Verificar si un producto ya fue comprado
  isPurchased(productId: string): boolean {
    const products = this.purchasedProducts();
    const result = products.has(productId);

    // 🔎 DEBUG: Log detallado
    console.log(`🔍 [PurchasesService.isPurchased] Verificando:`, {
      productId,
      totalProducts: products.size,
      allProductIds: Array.from(products),
      result
    });

    return result;
  }

  // Obtener señal de productos comprados
  getPurchasedProducts() {
    return this.purchasedProducts;
  }

  // Obtener estado de carga
  isLoading() {
    return this.isLoadingPurchases();
  }

  // Verificar si los datos ya fueron cargados
  isLoaded() {
    return this.purchasesLoaded();
  }

  // Limpiar al hacer logout
  clearPurchases() {
    console.log('🧹 [PurchasesService] Limpiando compras');
    this.purchasedProducts.set(new Set());
    this.purchasesLoaded.set(false);
    this.isLoadingPurchases.set(false);
  }
}
