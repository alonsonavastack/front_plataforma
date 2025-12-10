import { Injectable, signal, computed, inject, resource } from '@angular/core';
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

  // 🔥 Signal para disparar recarga
  private reloadTrigger = signal(0);

  // 🔥 rxResource para cargar productos comprados
  // 🔥 rxResource reemplazado por resource standard
  private purchasesResource = resource({
    loader: async () => {
      this.reloadTrigger(); // Track dependency
      const isLoggedIn = this.authService.isLoggedIn();

      if (!isLoggedIn) {
        return { enrolled_courses: [], projects: [] };
      }

      const token = this.authService.token();
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      const timestamp = Date.now();
      const url = `${environment.url}profile-student/client?_=${timestamp}`;

      return firstValueFrom(this.http.get<any>(url, { headers }));
    }
  });

  // 🔥 Computed signal para productos comprados (Set de IDs)
  private purchasedProductsSet = computed(() => {
    const response = this.purchasesResource.value() as any;
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
  public isLoading = computed(() => this.purchasesResource.isLoading());
  public isLoaded = computed(() => this.purchasesResource.hasValue());
  public error = computed(() => this.purchasesResource.error());

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
  }
}
