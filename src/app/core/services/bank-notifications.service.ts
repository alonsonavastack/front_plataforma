import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface BankNotification {
  _id: string;
  instructor: {
    _id: string;
    name: string;
    surname: string;
    email: string;
    avatar?: string;
  };
  bankDetails: {
    bank_name: string;
    account_type: string;
    verified: boolean;
  };
  updatedAt: Date;
  createdAt: Date;
  isRecentEdit?: boolean; // 🔥 Indica si fue editado en la última hora
}

@Injectable({
  providedIn: 'root'
})
export class BankNotificationsService {
  private http = inject(HttpClient);

  // 🔔 Estado de notificaciones
  private notifications = signal<BankNotification[]>([]);
  private isLoading = signal(false);
  private lastCheck = signal<Date>(new Date());

  // 📊 Computed signals
  pendingVerifications = computed(() => this.notifications());
  count = computed(() => this.notifications().length);
  hasNotifications = computed(() => this.count() > 0);

  // 🔄 Auto-polling cada 2 minutos
  private pollingInterval?: any;


  /**
   * Iniciar polling automático
   */
  startPolling(): void {


    // Cargar inmediatamente
    this.loadNotifications();

    // Polling cada 2 minutos
    this.pollingInterval = setInterval(() => {

      this.loadNotifications();
    }, 2 * 60 * 1000); // 2 minutos
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
   * Cargar notificaciones de cuentas pendientes
   */
  loadNotifications(): void {
    if (this.isLoading()) {

      return;
    }

    this.isLoading.set(true);

    this.http.get<any>(`${environment.url}admin/bank-verifications/pending`).subscribe({
      next: (response) => {

        this.notifications.set(response.notifications || []);
        this.lastCheck.set(new Date());
        this.isLoading.set(false);
      },
      error: (error) => {

        this.isLoading.set(false);

        // No limpiar notificaciones en caso de error, mantener las últimas
        if (error.status === 401) {

          this.stopPolling();
        }
      }
    });
  }

  /**
   * Marcar como verificada (remover de notificaciones)
   */
  markAsVerified(instructorId: string): void {


    const updated = this.notifications().filter(
      notif => notif.instructor._id !== instructorId
    );

    this.notifications.set(updated);
  }

  /**
   * Recargar manualmente
   */
  reload(): void {

    this.loadNotifications();
  }

  /**
   * Limpiar y detener al destruir el servicio
   */
  ngOnDestroy(): void {
    this.stopPolling();
  }
}
