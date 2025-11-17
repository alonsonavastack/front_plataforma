import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ReviewNotification {
  _id: string;
  rating: number;
  description: string;
  createdAt: Date;
  student: {
    _id: string;
    name: string;
    surname: string;
    full_name: string;
    avatar?: string;
  };
  course: {
    _id: string;
    title: string;
    slug: string;
    imagen: string;
  };
  isRecent?: boolean; // Indica si fue creado en las últimas 24 horas
}

@Injectable({
  providedIn: 'root'
})
export class ReviewNotificationsService {
  private http = inject(HttpClient);

  // 🔔 Estado de notificaciones
  private notifications = signal<ReviewNotification[]>([]);
  private isLoading = signal(false);
  private lastCheck = signal<Date>(new Date());

  // 📊 Computed signals
  pendingReviews = computed(() => this.notifications());
  count = computed(() => this.notifications().length);
  hasNotifications = computed(() => this.count() > 0);
  recentCount = computed(() =>
    this.notifications().filter(n => n.isRecent).length
  );

  // 🔄 Auto-polling cada 3 minutos
  private pollingInterval?: any;

  constructor() {

  }

  /**
   * Iniciar polling automático
   */
  startPolling(): void {


    // Cargar inmediatamente
    this.loadNotifications();

    // Polling cada 3 minutos
    this.pollingInterval = setInterval(() => {

      this.loadNotifications();
    }, 3 * 60 * 1000); // 3 minutos
  }

  /**
   * Detener polling automático
   */
  stopPolling(): void {
    if (this.pollingInterval) {

      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  /**
   * Cargar notificaciones de reviews sin respuesta
   */
  loadNotifications(): void {
    if (this.isLoading()) {

      return;
    }


    this.isLoading.set(true);

    this.http.get<any>(`${environment.url}reviews/instructor/pending-replies`).subscribe({
      next: (response) => {

        this.notifications.set(response.notifications || []);
        this.lastCheck.set(new Date());
        this.isLoading.set(false);
      },
      error: (error) => {

        this.isLoading.set(false);

        // No limpiar notificaciones en caso de error, mantener las últimas
        if (error.status === 401 || error.status === 403) {

          this.stopPolling();
        }
      }
    });
  }

  /**
   * Marcar como respondida (remover de notificaciones)
   */
  markAsReplied(reviewId: string): void {


    const updated = this.notifications().filter(
      notif => notif._id !== reviewId
    );

    this.notifications.set(updated);
  }

  /**
   * 🔥 NUEVO: Marcar todas como leídas (persistir en backend)
   */
  markAllAsRead(): void {


    this.http.post<any>(`${environment.url}reviews/instructor/mark-all-read`, {}).subscribe({
      next: (response) => {

        // Limpiar notificaciones locales
        this.notifications.set([]);
      },
      error: (error) => {

        alert('Error al marcar las notificaciones como leídas. Inténtalo de nuevo.');
      }
    });
  }

  /**
   * Recargar manualmente
   */
  reload(): void {

    this.loadNotifications();
  }

  /**
   * Limpiar notificaciones
   */
  clear(): void {

    this.notifications.set([]);
  }

  /**
   * Limpiar y detener al destruir el servicio
   */
  ngOnDestroy(): void {
    this.stopPolling();
  }
}
