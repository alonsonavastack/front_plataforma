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
    console.log('🔔 [ReviewNotificationsService] Inicializado');
  }
  
  /**
   * Iniciar polling automático
   */
  startPolling(): void {
    console.log('🔄 [ReviewNotificationsService] Iniciando polling automático cada 3 minutos');
    
    // Cargar inmediatamente
    this.loadNotifications();
    
    // Polling cada 3 minutos
    this.pollingInterval = setInterval(() => {
      console.log('⏰ [ReviewNotificationsService] Ejecutando polling automático');
      this.loadNotifications();
    }, 3 * 60 * 1000); // 3 minutos
  }
  
  /**
   * Detener polling automático
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      console.log('🛑 [ReviewNotificationsService] Deteniendo polling automático');
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }
  
  /**
   * Cargar notificaciones de reviews sin respuesta
   */
  loadNotifications(): void {
    if (this.isLoading()) {
      console.log('⏳ [ReviewNotificationsService] Ya hay una carga en proceso, omitiendo...');
      return;
    }
    
    console.log('📥 [ReviewNotificationsService] Cargando notificaciones...');
    this.isLoading.set(true);
    
    this.http.get<any>(`${environment.url}reviews/instructor/pending-replies`).subscribe({
      next: (response) => {
        console.log('✅ [ReviewNotificationsService] Notificaciones cargadas:', {
          count: response.count,
          notifications: response.notifications
        });
        
        this.notifications.set(response.notifications || []);
        this.lastCheck.set(new Date());
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ [ReviewNotificationsService] Error al cargar notificaciones:', error);
        this.isLoading.set(false);
        
        // No limpiar notificaciones en caso de error, mantener las últimas
        if (error.status === 401 || error.status === 403) {
          console.warn('⚠️ No autorizado - detener polling');
          this.stopPolling();
        }
      }
    });
  }
  
  /**
   * Marcar como respondida (remover de notificaciones)
   */
  markAsReplied(reviewId: string): void {
    console.log('✅ [ReviewNotificationsService] Marcando como respondida:', reviewId);
    
    const updated = this.notifications().filter(
      notif => notif._id !== reviewId
    );
    
    this.notifications.set(updated);
  }
  
  /**
   * 🔥 NUEVO: Marcar todas como leídas (persistir en backend)
   */
  markAllAsRead(): void {
    console.log('🧹 [ReviewNotificationsService] Marcando todas como leídas en backend...');
    
    this.http.post<any>(`${environment.url}reviews/instructor/mark-all-read`, {}).subscribe({
      next: (response) => {
        console.log('✅ [ReviewNotificationsService] Todas las notificaciones marcadas como leídas:', {
          marked: response.marked,
          message: response.message
        });
        
        // Limpiar notificaciones locales
        this.notifications.set([]);
      },
      error: (error) => {
        console.error('❌ [ReviewNotificationsService] Error al marcar como leídas:', error);
        alert('Error al marcar las notificaciones como leídas. Inténtalo de nuevo.');
      }
    });
  }
  
  /**
   * Recargar manualmente
   */
  reload(): void {
    console.log('🔄 [ReviewNotificationsService] Recarga manual solicitada');
    this.loadNotifications();
  }
  
  /**
   * Limpiar notificaciones
   */
  clear(): void {
    console.log('🧹 [ReviewNotificationsService] Limpiando notificaciones');
    this.notifications.set([]);
  }
  
  /**
   * Limpiar y detener al destruir el servicio
   */
  ngOnDestroy(): void {
    this.stopPolling();
  }
}
