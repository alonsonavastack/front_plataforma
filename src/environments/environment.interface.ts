// src/environments/environment.interface.ts

/**
 * Interfaz para la configuración del environment
 * Sistema de pagos: PayPal + Wallet (Sistema Mixto)
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
  paypal: {
    clientId: string;
    redirectUrl: string;
  };
}
