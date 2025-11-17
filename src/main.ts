import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/**
 * 🛡️ MENSAJE DE SEGURIDAD EN CONSOLA
 * Advertencia para usuarios no técnicos sobre el uso de la consola
 */
if (typeof window !== 'undefined') {
  // Esperar a que la consola esté lista
  setTimeout(() => {
    // Mensaje de advertencia en grande y rojo
    console.log(
      '%c¡DETENTE!',
      'color: #ff0000; font-size: 60px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);'
    );
    
    console.log(
      '%cEsta es una función del navegador destinada para desarrolladores.',
      'font-size: 18px; font-weight: bold; margin-top: 10px;'
    );
    
    console.log(
      '%cSi alguien te ha indicado que copies y pegues algo aquí para habilitar una función o "hackear" la cuenta de alguien, se trata de un fraude. Si lo haces, esta persona podrá acceder a tu cuenta.',
      'font-size: 16px; margin-top: 10px; line-height: 1.5;'
    );
    
    console.log(
      '%cPara obtener más información, visita: https://es.wikipedia.org/wiki/Self-XSS',
      'font-size: 14px; margin-top: 15px; color: #1877f2; font-weight: bold;'
    );
    
    console.log(
      '%c─────────────────────────────────────────────────────────',
      'color: #666; margin: 20px 0;'
    );
  }, 100);
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
