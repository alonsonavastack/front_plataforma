// src/environments/environment.development.ts
import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  url: 'http://localhost:3000/api/',
  images: {
    user: 'http://localhost:3000/api/users/imagen-usuario/',
    cat: 'http://localhost:3000/api/categories/imagen-categorie/',
    course: 'http://localhost:3000/api/courses/imagen-course/',
    project: 'http://localhost:3000/api/projects/imagen-project/',
  },
  mercadopago: {
    publicKey: 'APP_USR-e687c9bf-06e3-4b80-9d47-16aa5603d44f' // ✅ Public Key de la captura
  },
  paypal: {
    clientId: 'AZc1SmomD67615PERyjzwXXf6wO02x7SwjKjPde5J8TycUyhar3nNTePaoR6Mvd-t2tzjnKD9ji7hc1w',
    redirectUrl: 'https://unforestallable-splendidly-ariane.ngrok-free.dev' // 🔥 URL ngrok para PayPal
  }
};
