import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WebsocketService, SaleNotification } from './websocket.service';

export interface NotificationsResponse {
  recent_sales: SaleNotification[];
  unread_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private http = inject(HttpClient);
  private websocketService = inject(WebsocketService);

  // Señales para las notificaciones
  private recentSales = signal<SaleNotification[]>([]);
  private unreadCount = signal<number>(0);
  private lastCheckedTimestamp = signal<string>(new Date().toISOString());

  // Computed para exponer los datos
  sales = computed(() => this.recentSales());
  count = computed(() => this.unreadCount());

  constructor() {
    // Suscribirse a nuevas ventas via WebSocket
    this.websocketService.newSale$.subscribe(sale => {

      this.addNewSale(sale);
    });

    // Suscribirse a actualizaciones de estado via WebSocket
    this.websocketService.saleStatusUpdate$.subscribe(sale => {

      this.updateSaleStatus(sale);
    });
  }

  /**
   * Inicia la conexión WebSocket para el usuario actual
   */
  startWebSocket(userId: string, role: string): void {

    this.websocketService.connect(userId, role);
  }

  /**
   * Detiene la conexión WebSocket
   */
  stopWebSocket(): void {

    this.websocketService.disconnect();
  }

  /**
   * Carga las notificaciones iniciales del servidor (HTTP)
   */
  loadNotifications(): Observable<NotificationsResponse> {
    const url = `${environment.url}sales/recent-notifications`;

    return this.http.get<NotificationsResponse>(url).pipe(
      tap(response => {



        this.recentSales.set(response.recent_sales || []);
        this.unreadCount.set(response.unread_count || 0);
      })
    );
  }

  /**
   * Agrega una nueva venta a la lista (desde WebSocket)
   */
  private addNewSale(sale: SaleNotification): void {
    const currentSales = this.recentSales();

    // Verificar que no exista ya
    const exists = currentSales.some(s => s._id === sale._id);
    if (exists) {

      return;
    }

    // Agregar al inicio de la lista
    const updatedSales = [sale, ...currentSales];
    this.recentSales.set(updatedSales);

    // Incrementar contador si es pendiente o en revisión
    if (sale.status === 'Pendiente' || sale.status === 'En Revisión') {
      this.unreadCount.update(count => count + 1);
    }
  }

  /**
   * Actualiza el estado de una venta existente (desde WebSocket)
   */
  private updateSaleStatus(updatedSale: SaleNotification): void {
    const currentSales = this.recentSales();
    const index = currentSales.findIndex(s => s._id === updatedSale._id);

    if (index !== -1) {
      // Actualizar la venta existente
      const updatedSales = [...currentSales];
      const oldStatus = updatedSales[index].status;
      updatedSales[index] = { ...updatedSales[index], ...updatedSale };
      this.recentSales.set(updatedSales);

      // Lógica de conteo:
      // 1. Si estaba Pendiente/En Revisión y pasa a Pagado/Anulado -> Decrementar
      // 2. Si estaba Pagado/Anulado y pasa a Pendiente/En Revisión -> Incrementar (raro pero posible)

      const wasUnread = oldStatus === 'Pendiente' || oldStatus === 'En Revisión';
      const isUnread = updatedSale.status === 'Pendiente' || updatedSale.status === 'En Revisión';

      if (wasUnread && !isUnread) {
        this.unreadCount.update(count => Math.max(0, count - 1));
      } else if (!wasUnread && isUnread) {
        this.unreadCount.update(count => count + 1);
      }


    } else {

      this.addNewSale(updatedSale);
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead(): void {
    this.unreadCount.set(0);
    this.lastCheckedTimestamp.set(new Date().toISOString());

    // Opcional: Llamar al backend para persistir que el admin ya vio las notificaciones
    const url = `${environment.url}sales/mark-notifications-read`;
    this.http.post(url, { timestamp: this.lastCheckedTimestamp() }).subscribe();
  }

  /**
   * Limpia las notificaciones
   */
  clearNotifications(): void {
    this.recentSales.set([]);
    this.unreadCount.set(0);
  }
}
