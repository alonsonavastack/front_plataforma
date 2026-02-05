// src/environments/environment.ts
import { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  url: 'https://api.devhubsharks.com',  // ← Cambiar aquí
  images: {
    user: 'https://api.devhubsharks.com/users/imagen-usuario/',
    cat: 'https://api.devhubsharks.com/categories/imagen-categorie/',
    course: 'https://api.devhubsharks.com/courses/imagen-course/',
    project: 'https://api.devhubsharks.com/projects/imagen-project/',
  },
  paypal: {
    clientId: 'AZc1SmomD67615PERyjzwXXf6wO02x7SwjKjPde5J8TycUyhar3nNTePaoR6Mvd-t2tzjnKD9ji7hc1w',
    redirectUrl: 'https://devhubsharks.com'
  }
};
