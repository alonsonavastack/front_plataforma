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
  // 🔥 DYNAMIC GETTERS FOR RUNTIME SWITCHING
  get url() {
    // Check for localStorage override, otherwise use production default
    return localStorage.getItem('API_URL_OVERRIDE') || 'https://api.devhubsharks.com/api/';
  },
  get images() {
    const baseUrl = this.url;
    // Construct image URLs based on current API URL (dynamic)
    return {
      user: `${baseUrl}users/imagen-usuario/`,
      cat: `${baseUrl}categories/imagen-categorie/`,
      course: `${baseUrl}courses/imagen-course/`,
      project: `${baseUrl}projects/imagen-project/`,
    };
  },
  paypal: {
    clientId: 'AZc1SmomD67615PERyjzwXXf6wO02x7SwjKjPde5J8TycUyhar3nNTePaoR6Mvd-t2tzjnKD9ji7hc1w',
    redirectUrl: 'https://devhubsharks.com/'
  },
  telegramBot: 'ProyectosDevSharksBot'
};
