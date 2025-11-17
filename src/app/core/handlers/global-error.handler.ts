import { ErrorHandler, Injectable, inject } from '@angular/core';
import { LoggerService } from '../services/logger.service';
import { environment } from '../../../environments/environment';

/**
 * Manejador global de errores que captura TODO y oculta URLs en producción
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private logger = inject(LoggerService);

  handleError(error: any): void {
    // 🔇 NO LOGUEAR NADA - Consola limpia
    // Los servicios manejan sus errores con toasts
  }
}
