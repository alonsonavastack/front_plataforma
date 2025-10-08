import { Routes } from "@angular/router";
import { roleGuard } from "./core/guards/role.guard";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./pages/home/home").then((m) => m.HomeComponent),
    pathMatch: "full",
  },
  {
    path: "login",
    loadComponent: () =>
      import("./pages/auth/login").then((m) => m.LoginComponent),
  },
  {
    path: "register",
    // Asumiendo que tienes o tendrás un componente de registro
    loadComponent: () =>
      import("./pages/auth/login").then((m) => m.LoginComponent), // Temporalmente apunta a login
  },
  {
    path: "course-detail/:slug",
    loadComponent: () =>
      import("./pages/course-detail/course-detail").then(
        (m) => m.CourseDetailComponent
      ),
  },
  {
    path: "checkout",
    loadComponent: () =>
      import("./pages/checkout/checkout.component").then(
        (m) => m.CheckoutComponent
      ),
    // Solo clientes pueden acceder al checkout
    canActivate: [roleGuard(["cliente"])],
  },
  {
    path: "dashboard",
    loadComponent: () =>
      import("./pages/dashboard/dashboard").then((m) => m.DashboardComponent),
    // Solo los roles 'admin' e 'instructor' pueden acceder al dashboard
    canActivate: [roleGuard(["admin", "instructor"])],
  },
  {
    path: "learning/:slug",
    loadComponent: () =>
      import("./pages/learning/learning.component").then(
        (m) => m.LearningComponent
      ),
    canActivate: [roleGuard(["cliente", "admin"])],
  },
  {
    path: "profile-instructor",
    loadComponent: () =>
      import("./pages/profile-instructor/profile-instructor").then(
        (m) => m.ProfileInstructorComponent
      ),
    // Solo el rol 'instructor' puede acceder
    canActivate: [roleGuard(["instructor"])],
  },
  {
    path: "profile-admin",
    loadComponent: () =>
      import("./pages/profile-admin/profile-admin").then(
        (m) => m.ProfileAdminComponent
      ),
    // Solo el rol 'admin' puede acceder
    canActivate: [roleGuard(["admin"])],
  },
  {
    path: "profile-student",
    loadComponent: () =>
      import("./pages/profile-student/profile-student").then(
        (m) => m.ProfileStudentComponent
      ),
    // Solo el rol 'cliente' puede acceder
    canActivate: [roleGuard(["cliente"])],
  },
  {
    path: "sales",
    loadComponent: () =>
      import("./pages/sales/sales.component").then((m) => m.SalesComponent),
    // Solo el rol 'cliente' puede acceder
    canActivate: [roleGuard(["admin"])],
  },
  {
    // Redirige cualquier otra ruta a la página de inicio
    path: "**",
    redirectTo: "",
  },
];
