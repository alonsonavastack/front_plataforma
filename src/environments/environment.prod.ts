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
  url: 'https://api.devhubsharks.com/api/',  // ← Cambiar aquí (sin "api." al inicio)
  images: {
    user: 'https://api.devhubsharks.com/api/users/imagen-usuario/',
    cat: 'https://api.devhubsharks.com/api/categories/imagen-categorie/',
    course: 'https://api.devhubsharks.com/api/courses/imagen-course/',
    project: 'https://api.devhubsharks.com/api/projects/imagen-project/',
  },
  paypal: {
    clientId: 'AZc1SmomD67615PERyjzwXXf6wO02x7SwjKjPde5J8TycUyhar3nNTePaoR6Mvd-t2tzjnKD9ji7hc1w',
    redirectUrl: 'https://devhubsharks.com/'
  }
};
