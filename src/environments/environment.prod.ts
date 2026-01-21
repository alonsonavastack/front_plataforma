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
  url: 'https://api.tudominio.com/api/',
  
  images: {
    user: 'https://api.tudominio.com/api/users/imagen-usuario/',
    cat: 'https://api.tudominio.com/api/categories/imagen-categorie/',
    course: 'https://api.tudominio.com/api/courses/imagen-course/',
    project: 'https://api.tudominio.com/api/projects/imagen-project/',
  },
  
  paypal: {
    // 🔥 REEMPLAZAR con tu Client ID de PayPal LIVE (no sandbox)
    // Obtener desde: https://developer.paypal.com/dashboard/applications/live
    clientId: process.env['NG_APP_PAYPAL_CLIENT_ID'] || 'TU_CLIENT_ID_DE_PRODUCCION_AQUI',
    
    // 🔥 REEMPLAZAR con tu dominio de producción
    redirectUrl: 'https://tudominio.com'
  }
};
