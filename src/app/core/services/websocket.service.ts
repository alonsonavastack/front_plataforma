import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SaleNotification {
  _id: string;
  n_transaccion: string;
  total: number;
  currency_total: string;
  status: string;
  createdAt: string;
  user: {
    _id: string;
    name: string;
    surname: string;
    email: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket | null = null;
  private connected = false;

  // Subjects para emitir eventos
  private newSaleSubject = new Subject<SaleNotification>();
  private saleStatusUpdateSubject = new Subject<SaleNotification>();
  private connectionSubject = new Subject<boolean>();

  // Observables públicos
  public newSale$ = this.newSaleSubject.asObservable();
  public saleStatusUpdate$ = this.saleStatusUpdateSubject.asObservable();
  public connection$ = this.connectionSubject.asObservable();

  constructor() {}

  /**
   * Conecta al servidor WebSocket
   * @param userId - ID del usuario
   * @param role - Rol del usuario (admin, instructor, student)
   */
  connect(userId: string, role: string): void {
    if (this.socket && this.connected) {

      return;
    }

    const url = environment.url.replace('/api/', ''); // http://localhost:3000



    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.setupListeners(userId, role);
  }

  /**
   * Configura los listeners de eventos del socket
   */
  private setupListeners(userId: string, role: string): void {
    if (!this.socket) return;

    // Evento: Conexión exitosa
    this.socket.on('connect', () => {

      this.connected = true;
      this.connectionSubject.next(true);

      // Autenticar con el servidor
      this.socket?.emit('authenticate', { userId, role });

    });

    // Evento: Autenticación confirmada
    this.socket.on('authenticated', (data: any) => {

    });

    // Evento: Nueva venta
    this.socket.on('new_sale', (sale: SaleNotification) => {

      this.newSaleSubject.next(sale);
    });

    // Evento: Actualización de estado de venta
    this.socket.on('sale_status_updated', (sale: SaleNotification) => {

      this.saleStatusUpdateSubject.next(sale);
    });

    // Evento: Desconexión
    this.socket.on('disconnect', (reason: string) => {

      this.connected = false;
      this.connectionSubject.next(false);
    });

    // Evento: Error de conexión
    this.socket.on('connect_error', (error: Error) => {

      this.connected = false;
      this.connectionSubject.next(false);
    });

    // Evento: Error
    this.socket.on('error', (error: any) => {

    });

    // Evento: Reconexión
    this.socket.on('reconnect', (attemptNumber: number) => {

      this.connected = true;
      this.connectionSubject.next(true);
    });

    // Evento: Intento de reconexión
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {

    });
  }

  /**
   * Desconecta del servidor WebSocket
   */
  disconnect(): void {
    if (this.socket) {

      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.connectionSubject.next(false);
    }
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Emite un evento personalizado
   */
  emit(event: string, data: any): void {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    } else {

    }
  }
}
