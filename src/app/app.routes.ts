import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { customerGuard } from './core/guards/customer.guard';
import { instructorGuard } from './core/guards/instructor.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    // Asumiendo que tienes o tendrás un componente de registro
    loadComponent: () => import('./pages/auth/login').then(m => m.LoginComponent) // Temporalmente apunta a login
  },
  {
    path: 'landing-curso/:slug',
    loadComponent: () => import('./pages/course-detail/course-detail').then(m => m.CourseDetailComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
    // Aquí aplicamos el guardián
    canActivate: [adminGuard]
  },
  {
    path: 'profile-instructor',
    loadComponent: () => import('./pages/profile-instructor/profile-instructor').then(m => m.ProfileInstructorComponent),
    // Aplicamos el nuevo guardián de instructor
    canActivate: [instructorGuard]
  },
  {
    path: 'profile-admin',
    loadComponent: () => import('./pages/profile-admin/profile-admin').then(m => m.ProfileAdminComponent),
    canActivate: [adminGuard]
  },
  // Ruta para el perfil del estudiante (si la tienes)
  {
    path: 'profile-student',
    loadComponent: () => import('./pages/profile-student/profile-student').then(m => m.ProfileStudentComponent),
    canActivate: [customerGuard] // Usamos el guardián que permite a cualquier usuario logueado.
  },
  {
    // Redirige cualquier otra ruta a la página de inicio
    path: '**',
    redirectTo: '',
  }
];
