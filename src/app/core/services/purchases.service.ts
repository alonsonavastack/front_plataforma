import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
// rxResource removed
import { environment } from '../../../environments/environment';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class PurchasesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // 🔥 Signals manuales para reemplazar resource
  private reloadTrigger = signal(0);
  private purchasesData = signal<{ enrolled_courses: any[], projects: any[] }>({ enrolled_courses: [], projects: [] });
  private loading = signal<boolean>(false);
  private errorSignal = signal<any>(null);

  constructor() {
    // ✅ Effect para cargar compras automáticamente cuando cambia el token o el trigger
    effect(() => {
      const token = this.authService.token();
      const trigger = this.reloadTrigger(); // Track dependency

      if (!token) {
        this.purchasesData.set({ enrolled_courses: [], projects: [] });
        return;
      }

      // No setear loading a true si es solo un refresh silencioso?
      // Mejor sí, para indicar actividad.
      this.loading.set(true);

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const timestamp = Date.now();
      const url = `${environment.url}profile-student/client?_=${timestamp}`;

      this.http.get<any>(url, { headers }).subscribe({
        next: (data) => {
          this.purchasesData.set(data);
          this.loading.set(false);
          this.errorSignal.set(null);
        },
        error: (err) => {
          console.error('Error loading purchases', err);
          this.errorSignal.set(err);
          this.loading.set(false);
          // No limpiar datos anteriores en error para evitar parpadeos feos,
          // o sí limpiar si es crítico. En este caso mantenemos lo que había o vacío.
        }
      });
    });
  }

  // 🔥 Computed signal para productos comprados (Set de IDs)
  private purchasedProductsSet = computed(() => {
    const response = this.purchasesData();
    if (!response) return new Set<string>();

    const productIds = new Set<string>();

    // Agregar IDs de cursos inscritos
    if (response.enrolled_courses) {
      response.enrolled_courses.forEach((enrollment: any) => {
        const courseId = enrollment.course?._id || enrollment.course;
        if (courseId) productIds.add(courseId);
      });
    }

    // Agregar IDs de proyectos comprados
    if (response.projects) {
      response.projects.forEach((project: any) => {
        const projectId = project._id || project.project?._id;
        if (projectId) productIds.add(projectId);
      });
    }

    return productIds;
  });

  // 🔥 Señales públicas
  public isLoading = this.loading.asReadonly();
  public isLoaded = computed(() => !this.loading()); // Simplificado
  public error = this.errorSignal.asReadonly();

  // 🔥 Verificar si un producto ya fue comprado
  isPurchased(productId: string): boolean {
    return this.purchasedProductsSet().has(productId);
  }

  // 🔥 Obtener señal de productos comprados
  getPurchasedProducts() {
    return this.purchasedProductsSet;
  }

  // 🔥 Recargar productos comprados manualmente
  loadPurchasedProducts(): void {
    this.reloadTrigger.update(v => v + 1);
  }

  // 🔥 Limpiar al hacer logout
  clearPurchases(): void {
    this.reloadTrigger.set(0);
    this.purchasesData.set({ enrolled_courses: [], projects: [] });
  }
}
