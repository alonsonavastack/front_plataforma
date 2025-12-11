// src/environments/environment.interface.ts

/**
 * Interfaz para la configuración del environment
 */
export interface Environment {
  production: boolean;
  url: string;
  images: {
    user: string;
    cat: string;
    course: string;
    project: string;
  };
  mercadopago: {
    publicKey: string;
  };
  paypal: {
    clientId: string;
    redirectUrl: string; // 🔥 URL para OAuth redirect (ngrok en dev)
  };
}
