// src/environments/environment.development.ts
export const environment = {
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
  }
};
