// src/environments/environment.ts
import { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  // 🔥 DYNAMIC GETTERS FOR RUNTIME SWITCHING
  get url() {
    return localStorage.getItem('API_URL_OVERRIDE') || 'https://api.devhubsharks.com/api/';
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
