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
      console.log('📥 Nueva venta recibida en NotificationsService:', sale);
      this.addNewSale(sale);
    });

    // Suscribirse a actualizaciones de estado via WebSocket
    this.websocketService.saleStatusUpdate$.subscribe(sale => {
      console.log('🔄 Actualización de venta recibida en NotificationsService:', sale);
      this.updateSaleStatus(sale);
    });
  }
  
  /**
   * Inicia la conexión WebSocket para el usuario actual
   */
  startWebSocket(userId: string, role: string): void {
    console.log('🚀 Iniciando WebSocket para usuario:', userId, 'rol:', role);
    this.websocketService.connect(userId, role);
  }

  /**
   * Detiene la conexión WebSocket
   */
  stopWebSocket(): void {
    console.log('🛑 Deteniendo WebSocket');
    this.websocketService.disconnect();
  }
  
  /**
   * Carga las notificaciones iniciales del servidor (HTTP)
   */
  loadNotifications(): Observable<NotificationsResponse> {
    const url = `${environment.url}sales/recent-notifications`;
    
    return this.http.get<NotificationsResponse>(url).pipe(
      tap(response => {
        console.log('📥 Respuesta del servidor (HTTP):', response);
        console.log('📊 Ventas recientes:', response.recent_sales);
        console.log('🔢 Cantidad:', response.recent_sales?.length || 0);
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
      console.log('⚠️  Venta ya existe en la lista, ignorando duplicado');
      return;
    }

    // Agregar al inicio de la lista
    const updatedSales = [sale, ...currentSales];
    this.recentSales.set(updatedSales);

    // Incrementar contador si es pendiente
    if (sale.status === 'Pendiente') {
      this.unreadCount.update(count => count + 1);
    }

    console.log('✅ Nueva venta agregada. Total:', updatedSales.length, 'No leídas:', this.unreadCount());
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

      // Actualizar contador si cambió de Pendiente a Pagado
      if (oldStatus === 'Pendiente' && updatedSale.status === 'Pagado') {
        this.unreadCount.update(count => Math.max(0, count - 1));
      }

      console.log('✅ Venta actualizada:', updatedSale._id, 'Nuevo estado:', updatedSale.status);
    } else {
      console.log('⚠️  Venta no encontrada en la lista, agregándola...');
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
