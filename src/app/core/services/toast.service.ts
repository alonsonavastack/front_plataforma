import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  private nextId = 0;

  private show(toast: Omit<Toast, 'id'>): void {
    const id = `toast-${this.nextId++}`;
    const newToast: Toast = { ...toast, id };
    
    this.toasts.update(toasts => [...toasts, newToast]);

    // Auto-remover después de la duración especificada
    const duration = toast.duration || 5000;
    setTimeout(() => this.remove(id), duration);
  }

  /**
   * Notificación de éxito
   */
  success(title: string, message?: string, duration?: number): void {
    this.show({ type: 'success', title, message, duration });
  }

  /**
   * Notificación de error genérico
   */
  error(title: string, message?: string, duration?: number): void {
    this.show({ type: 'error', title, message, duration: duration || 7000 });
  }

  /**
   * Notificación de advertencia
   */
  warning(title: string, message?: string, duration?: number): void {
    this.show({ type: 'warning', title, message, duration });
  }

  /**
   * Notificación informativa
   */
  info(title: string, message?: string, duration?: number): void {
    this.show({ type: 'info', title, message, duration });
  }

  /**
   * Errores HTTP específicos
   */
  networkError(): void {
    this.error(
      'Error de conexión',
      'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
      7000
    );
  }

  serverError(): void {
    this.error(
      'Error del servidor',
      'Ocurrió un error en el servidor. Por favor, intenta nuevamente.',
      7000
    );
  }

  unauthorizedError(): void {
    this.error(
      'No autorizado',
      'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      7000
    );
  }

  notFoundError(resource: string = 'Recurso'): void {
    this.error(
      'No encontrado',
      `${resource} no fue encontrado.`,
      5000
    );
  }

  validationError(message: string = 'Revisa los datos ingresados'): void {
    this.warning(
      'Error de validación',
      message,
      5000
    );
  }

  apiError(action: string): void {
    this.error(
      'Error en la operación',
      `No se pudo ${action}. Por favor, intenta nuevamente.`,
      7000
    );
  }

  /**
   * Remover un toast específico
   */
  remove(id: string): void {
    this.toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  /**
   * Limpiar todos los toasts
   */
  clear(): void {
    this.toasts.set([]);
  }
}
