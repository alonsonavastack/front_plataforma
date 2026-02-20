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
  stripe: {
    publishableKey: 'pk_test_51T2cMW2WxgBBW0AaqS2YAdLwVDonQuDiZZqUbpUCzKvWX9WsmYGyqby5Ftd2pPC9YJp46Dl0rvBPYSI9Xw1kfaI9006aRDDcRN'
  },
  telegramBot: 'ProyectosDevSharksBot'
};
