// src/environments/environment.prod.ts
import { Environment } from './environment.interface';

/**
 * 🚀 CONFIGURACIÓN DE PRODUCCIÓN
 * 
 * IMPORTANTE: Antes de desplegar, debes:
 * 1. Cambiar todas las URLs a tu dominio real
 * 2. Usar las credenciales de PayPal LIVE (no sandbox)
 * 3. Verificar que el redirectUrl apunte a tu dominio de producción
 * 4. En el servidor de hosting, configurar variables de entorno:
 *    - NG_APP_PAYPAL_CLIENT_ID
 *    - NG_APP_API_URL
 */

export const environment: Environment = {
  production: true,

  // 🔥 REEMPLAZAR con tu dominio de producción
  url: 'https://devhubsharks.com/api',
  images: {
    user: 'https://devhubsharks.com/api/users/imagen-usuario/',
    cat: 'https://devhubsharks.com/api/categories/imagen-categorie/',
    course: 'https://devhubsharks.com/api/courses/imagen-course/',
    project: 'https://devhubsharks.com/api/projects/imagen-project/',
  },

  paypal: {
    // 🔥 REEMPLAZAR con tu Client ID de PayPal LIVE (no sandbox)
    // Obtener desde: https://developer.paypal.com/dashboard/applications/live
    clientId: 'AZc1SmomD67615PERyjzwXXf6wO02x7SwjKjPde5J8TycUyhar3nNTePaoR6Mvd-t2tzjnKD9ji7hc1w',

    // 🔥 REEMPLAZAR con tu dominio de producción
    redirectUrl: 'https://devhubsharks.com'

  }
};
