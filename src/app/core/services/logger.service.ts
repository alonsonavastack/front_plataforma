import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private isDevelopment = !environment.production;

  /**
   * Log informativo - DESACTIVADO (solo toasts para usuario)
   */
  info(message: string, data?: any): void {
    // 🔇 SILENCIADO: No loguear en consola
    // Solo usar toasts para comunicación con el usuario
  }

  /**
   * Log de advertencia - DESACTIVADO (solo toasts para usuario)
   */
  warn(message: string, data?: any): void {
    // 🔇 SILENCIADO: No loguear en consola
    // Solo usar toasts para comunicación con el usuario
  }

  /**
   * Log de error genérico - DESACTIVADO (solo toasts para usuario)
   */
  error(message: string, error?: any): void {
    // 🔇 SILENCIADO: No loguear en consola
    // Solo usar toasts para comunicación con el usuario
  }

  /**
   * Log de error HTTP - DESACTIVADO (solo toasts para usuario)
   * 🔇 SILENCIADO: No loguear en consola para ocultar nombres de archivos
   */
  httpError(serviceName: string, methodName: string, error: any): void {
    // 🔇 SILENCIADO: No loguear en consola
    // Los errores HTTP se manejan con toasts en los componentes
  }

  /**
   * Log de debug - DESACTIVADO (solo toasts para usuario)
   */
  debug(message: string, data?: any): void {
    // 🔇 SILENCIADO: No loguear en consola
  }

  /**
   * Log estructurado para operaciones - DESACTIVADO (solo toasts para usuario)
   */
  operation(operationName: string, phase: 'start' | 'success' | 'error', data?: any): void {
    // 🔇 SILENCIADO: No loguear en consola
  }

  /**
   * Log de estado de Signal - DESACTIVADO (solo toasts para usuario)
   */
  signalState(componentName: string, signalName: string, value: any): void {
    // 🔇 SILENCIADO: No loguear en consola
  }
}
