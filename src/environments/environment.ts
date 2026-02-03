// src/environments/environment.ts
import { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  url: 'https://devhubsharks.com/api',
  images: {
    user: 'https://devhubsharks.com/api/users/imagen-usuario/',
    cat: 'https://devhubsharks.com/api/categories/imagen-categorie/',
    course: 'https://devhubsharks.com/api/courses/imagen-course/',
    project: 'https://devhubsharks.com/api/projects/imagen-project/',
  },
  paypal: {
    clientId: 'AZc1SmomD67615PERyjzwXXf6wO02x7SwjKjPde5J8TycUyhar3nNTePaoR6Mvd-t2tzjnKD9ji7hc1w',
    redirectUrl: 'https://unforestallable-splendidly-ariane.ngrok-free.dev'
  }
};
