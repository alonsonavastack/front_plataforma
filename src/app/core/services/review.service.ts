import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Review {
  _id: string;
  rating: number;
  description: string;
  createdAt: string;
  updatedAt?: string;
  user_info: {
    _id: string;
    full_name: string;
    avatar: string | null;
  };
  // ✅ NUEVO: Respuesta del instructor
  reply?: {
    description: string;
    createdAt: string;
    instructor_info: {
      _id: string;
      full_name: string;
      avatar: string | null;
    } | null;
  } | null;
}

export interface ReviewStatistics {
  total_reviews: number;
  average_rating: number;
  rating_distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface ReviewResponse {
  reviews: Review[];
  statistics: ReviewStatistics;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateReviewRequest {
  product_id: string;
  product_type: 'course' | 'project';
  rating: number;
  description: string;
}

export interface CanRateResponse {
  can_rate: boolean;
  reason: string;
  existing_review?: {
    _id: string;
    rating: number;
    description: string;
    createdAt: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.url}reviews`;

  /**
   * Crear una nueva calificación/review
   */
  createReview(data: CreateReviewRequest): Observable<{ message: string; review: Review }> {
    return this.http.post<{ message: string; review: Review }>(`${this.baseUrl}/create`, data);
  }

  /**
   * Obtener todas las calificaciones de un producto específico
   */
  getReviewsByProduct(productId: string, productType: 'course' | 'project', page: number = 1, limit: number = 5): Observable<ReviewResponse> {
    return this.http.get<ReviewResponse>(`${this.baseUrl}/product/${productId}/${productType}?page=${page}&limit=${limit}`);
  }

  /**
   * Actualizar una calificación existente
   */
  updateReview(reviewId: string, rating: number, description: string): Observable<{ message: string; review: Review }> {
    return this.http.put<{ message: string; review: Review }>(`${this.baseUrl}/update/${reviewId}`, {
      rating,
      description
    });
  }

  /**
   * Eliminar una calificación
   */
  deleteReview(reviewId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/delete/${reviewId}`);
  }

  /**
   * Verificar si el usuario puede calificar un producto
   */
  canRateProduct(productId: string, productType: 'course' | 'project'): Observable<CanRateResponse> {
    return this.http.get<CanRateResponse>(`${this.baseUrl}/can-rate/${productId}/${productType}`);
  }

  /**
   * Generar estrellas para mostrar en la UI
   */
  generateStars(rating: number): string[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    // Estrellas llenas
    for (let i = 0; i < fullStars; i++) {
      stars.push('full');
    }

    // Media estrella
    if (hasHalfStar) {
      stars.push('half');
    }

    // Estrellas vacías
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push('empty');
    }

    return stars;
  }

  /**
   * Calcular el porcentaje de distribución de calificaciones
   */
  calculateRatingPercentage(distribution: ReviewStatistics['rating_distribution'], total: number): ReviewStatistics['rating_distribution'] {
    if (total === 0) {
      return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    }

    return {
      5: Math.round((distribution[5] / total) * 100),
      4: Math.round((distribution[4] / total) * 100),
      3: Math.round((distribution[3] / total) * 100),
      2: Math.round((distribution[2] / total) * 100),
      1: Math.round((distribution[1] / total) * 100)
    };
  }

  // ✅ NUEVO: Agregar respuesta del instructor
  addReply(reviewId: string, description: string): Observable<{ message: string; review: any }> {
    return this.http.post<{ message: string; review: any }>(`${this.baseUrl}/reply/${reviewId}`, {
      description
    });
  }

  // ✅ NUEVO: Actualizar respuesta del instructor
  updateReply(reviewId: string, description: string): Observable<{ message: string; review: any }> {
    return this.http.put<{ message: string; review: any }>(`${this.baseUrl}/reply/${reviewId}`, {
      description
    });
  }

  // ✅ NUEVO: Eliminar respuesta del instructor
  deleteReply(reviewId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/reply/${reviewId}`);
  }
}
