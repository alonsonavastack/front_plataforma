import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';

export interface LogEntry {
  id: string | number;
  type: 'login' | 'page_visit' | 'purchase' | 'error' | 'admin_action' | 'registration' | 'refund' | 'content_creation';
  timestamp: Date;
  user?: {
    _id: string;
    name: string;
    surname: string;
    email?: string;
    rol?: string;
  };
  ip?: string;
  message: string;
  [key: string]: any;
}

export interface LogStats {
  total: number;
  byType: { [key: string]: number };
  last24h: number;
  lastHour: number;
}

@Injectable({
  providedIn: 'root'
})
export class LogsService {
  private readonly API_URL = `${environment.url}logs`;
  private socket: Socket | null = null;

  // Estado con signals
  logs = signal<LogEntry[]>([]);
  isLoading = signal(false);
  stats = signal<LogStats | null>(null);
  isConnected = signal(false);

  // Computed signals
  recentLogs = computed(() => this.logs().slice(0, 50));
  
  loginLogs = computed(() => 
    this.logs().filter(log => log.type === 'login')
  );
  
  purchaseLogs = computed(() => 
    this.logs().filter(log => log.type === 'purchase')
  );
  
  pageVisitLogs = computed(() => 
    this.logs().filter(log => log.type === 'page_visit')
  );
  
  errorLogs = computed(() => 
    this.logs().filter(log => log.type === 'error')
  );

  adminActionLogs = computed(() =>
    this.logs().filter(log => log.type === 'admin_action')
  );

  constructor(private http: HttpClient) {}

  /**
   * Conectar a Socket.io para recibir logs en tiempo real
   */
  connectToLogs() {
    if (this.socket) {
      console.log('✅ Ya conectado a logs');
      return;
    }

    this.socket = io(environment.url.replace('/api/', ''), {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('✅ Conectado a sistema de logs');
      this.isConnected.set(true);
      
      // Unirse a sala de admins
      this.socket?.emit('join_admin_room');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Desconectado de sistema de logs');
      this.isConnected.set(false);
    });

    // Escuchar nuevos logs
    this.socket.on('new_log', (log: LogEntry) => {
      console.log('📊 Nuevo log recibido:', log);
      this.addLog(log);
    });
  }

  /**
   * Desconectar de Socket.io
   */
  disconnectFromLogs() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected.set(false);
      console.log('🔌 Desconectado de logs');
    }
  }

  /**
   * Agregar log a la lista
   */
  private addLog(log: LogEntry) {
    const currentLogs = this.logs();
    this.logs.set([log, ...currentLogs]);
    
    // Mantener solo los últimos 500 logs en memoria
    if (currentLogs.length > 500) {
      this.logs.set(currentLogs.slice(0, 500));
    }
  }

  /**
   * Cargar logs desde el backend
   */
  loadLogs(filters?: {
    type?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
    limit?: number;
  }): Observable<any> {
    this.isLoading.set(true);

    let params: any = {};
    if (filters) {
      if (filters.type) params.type = filters.type;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.userId) params.userId = filters.userId;
      if (filters.limit) params.limit = filters.limit.toString();
    }

    return this.http.get<any>(`${this.API_URL}/list`, { params }).pipe(
      tap({
        next: (response) => {
          if (response.success && response.logs) {
            this.logs.set(response.logs);
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('❌ Error al cargar logs:', err);
          this.isLoading.set(false);
        }
      })
    );
  }

  /**
   * Cargar estadísticas
   */
  loadStats(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/stats`).pipe(
      tap({
        next: (response) => {
          if (response.success && response.stats) {
            this.stats.set(response.stats);
          }
        },
        error: (err) => {
          console.error('❌ Error al cargar stats:', err);
        }
      })
    );
  }

  /**
   * Limpiar logs antiguos
   */
  clearOldLogs(days: number = 7): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/clear`, { days });
  }

  /**
   * Registrar visita de página
   */
  logPageVisit(page: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/page-visit`, { page });
  }

  /**
   * Filtrar logs por tipo
   */
  filterByType(type: string) {
    if (type === 'all') {
      return this.logs();
    }
    return this.logs().filter(log => log.type === type);
  }

  /**
   * Filtrar logs por rango de fechas
   */
  filterByDateRange(startDate: Date, endDate: Date) {
    return this.logs().filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  /**
   * Buscar en logs
   */
  searchLogs(query: string) {
    const lowerQuery = query.toLowerCase();
    return this.logs().filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      log.user?.name?.toLowerCase().includes(lowerQuery) ||
      log.user?.email?.toLowerCase().includes(lowerQuery)
    );
  }
}
