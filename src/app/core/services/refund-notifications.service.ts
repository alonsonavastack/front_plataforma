import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { WebsocketService } from './websocket.service'; // 🆕

export interface RefundNotification {
  _id: string;
  sale: {
    _id: string;
    n_transaccion: string;
    total: number;
  };
  user: {
    _id: string;
    name: string;
    surname: string;
    email: string;
    avatar?: string; // 🆕 Agregar avatar opcional
  };
  course?: {
    _id: string;
    title: string;
  };
  project?: {
    _id: string;
    title: string;
  };
  originalAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  reason: {
    type: string;
    description: string;
  };
  requestedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class RefundNotificationsService {
  private http = inject(HttpClient);
  private websocketService = inject(WebsocketService); // 🆕
  private apiUrl = `${environment.url}refunds`;

  // 📊 Estado
  notifications = signal<RefundNotification[]>([]);
  isLoading = signal(false);
  lastCheck = signal<Date | null>(null);

  // 🔢 Computed: Contador de pendientes
  unreadCount = computed(() => {
    return this.notifications().filter(n => n.status === 'pending').length;
  });

  // 🔢 Computed: Reembolsos por estado
  pendingRefunds = computed(() => 
    this.notifications().filter(n => n.status === 'pending')
  );

  processingRefunds = computed(() => 
    this.notifications().filter(n => n.status === 'processing')
  );

  // ⏰ Polling
  private pollingInterval: any = null;
  private readonly POLLING_INTERVAL = 30000; // 30 segundos

  constructor() {
    // 🆕 Suscribirse a nuevas solicitudes de reembolso via WebSocket
    this.websocketService.newRefundRequest$.subscribe(refund => {
      console.log('📨 [RefundNotifications] Nueva solicitud recibida vía WebSocket:', refund);
      this.addNewRefund(refund);
    });
  }

  /**
   * 🆕 Agregar nueva solicitud de reembolso (desde WebSocket)
   */
  private addNewRefund(refund: RefundNotification): void {
    const current = this.notifications();
    
    // Verificar que no exista ya
    const exists = current.some(r => r._id === refund._id);
    if (exists) {
      console.log('⚠️ [RefundNotifications] Reembolso ya existe:', refund._id);
      return;
    }

    // Solo agregar si está pendiente o en proceso
    if (refund.status === 'pending' || refund.status === 'processing') {
      const updated = [refund, ...current];
      this.notifications.set(updated);
      console.log('✅ [RefundNotifications] Reembolso agregado. Total:', updated.length);
    }
  }

  /**
   * 🔄 Cargar notificaciones de reembolsos
   */
  loadNotifications() {
    this.isLoading.set(true);
    
    this.http.get<RefundNotification[]>(`${this.apiUrl}/list`).subscribe({
      next: (refunds) => {
        console.log('🔔 [RefundNotifications] Reembolsos cargados:', refunds.length);
        
        // Filtrar solo pendientes y en proceso
        const activeRefunds = refunds.filter(r => 
          r.status === 'pending' || r.status === 'processing'
        );
        
        this.notifications.set(activeRefunds);
        this.lastCheck.set(new Date());
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ [RefundNotifications] Error al cargar:', err);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * ▶️ Iniciar polling automático
   */
  startPolling() {
    console.log('▶️ [RefundNotifications] Iniciando polling...');
    
    // Cargar inmediatamente
    this.loadNotifications();
    
    // Iniciar polling
    this.pollingInterval = setInterval(() => {
      this.loadNotifications();
    }, this.POLLING_INTERVAL);
  }

  /**
   * ⏹️ Detener polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      console.log('⏹️ [RefundNotifications] Deteniendo polling');
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * 🗑️ Limpiar notificaciones
   */
  clearNotifications() {
    this.notifications.set([]);
    this.lastCheck.set(null);
  }

  /**
   * 📍 Navegar a solicitud específica
   */
  getRefundUrl(refund: RefundNotification): string {
    return `/dashboard?section=refunds&refundId=${refund._id}`;
  }

  /**
   * 🎨 Obtener clase de color según estado
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
      'approved': 'bg-blue-500/10 text-blue-300 border-blue-500/20',
      'processing': 'bg-purple-500/10 text-purple-300 border-purple-500/20',
      'completed': 'bg-green-500/10 text-green-300 border-green-500/20',
      'rejected': 'bg-red-500/10 text-red-300 border-red-500/20',
      'failed': 'bg-gray-500/10 text-gray-300 border-gray-500/20'
    };
    return colors[status] || colors['pending'];
  }

  /**
   * 📝 Obtener texto del estado
   */
  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      'pending': '⏳ Pendiente',
      'approved': '✅ Aprobado',
      'processing': '⚙️ Procesando',
      'completed': '✔️ Completado',
      'rejected': '❌ Rechazado',
      'failed': '⚠️ Fallido'
    };
    return texts[status] || status;
  }

  /**
   * 🕐 Formatear fecha relativa
   */
  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short' 
    });
  }
}
