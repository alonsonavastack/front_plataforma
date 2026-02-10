// src/environments/environment.development.ts
import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  // 🔥 DYNAMIC GETTERS FOR RUNTIME SWITCHING
  get url() {
    return localStorage.getItem('API_URL_OVERRIDE') || 'http://localhost:3000/api/';
  },
  get images() {
    const baseUrl = this.url;
    return {
      user: `${baseUrl}users/imagen-usuario/`,
      cat: `${baseUrl}categories/imagen-categorie/`,
      course: `${baseUrl}courses/imagen-course/`,
      project: `${baseUrl}projects/imagen-project/`,
    };
  },
  paypal: {
    clientId: 'AZc1SmomD67615PERyjzwXXf6wO02x7SwjKjPde5J8TycUyhar3nNTePaoR6Mvd-t2tzjnKD9ji7hc1w',
    redirectUrl: 'https://unforestallable-splendidly-ariane.ngrok-free.dev'
  },
  telegramBot: 'ProyectosDevSharksBot'
};
