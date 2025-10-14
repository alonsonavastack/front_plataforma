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
      this.purchasedProducts.set(new Set());
      return;
    }

    this.http.get<any>(`${environment.url}profile-student/courses`, {
      headers: this.getHeaders()
    }).pipe(
      tap((response) => {
        const productIds = new Set<string>();
        
        // Agregar IDs de cursos
        if (response.courses) {
          response.courses.forEach((course: any) => {
            productIds.add(course._id);
          });
        }
        
        // Agregar IDs de proyectos comprados
        if (response.projects) {
          response.projects.forEach((project: any) => {
            productIds.add(project._id);
          });
        }
        
        this.purchasedProducts.set(productIds);
      })
    ).subscribe({
      error: (error) => {
        console.error('Error al cargar productos comprados:', error);
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
