// src/environments/environment.ts
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
  paypal: {
    clientId: 'AZc1SmomD67615PERyjzwXXf6wO02x7SwjKjPde5J8TycUyhar3nNTePaoR6Mvd-t2tzjnKD9ji7hc1w',
    redirectUrl: 'https://unforestallable-splendidly-ariane.ngrok-free.dev'
  }
};
