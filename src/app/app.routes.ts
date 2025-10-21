import { Routes } from "@angular/router";
import { roleGuard } from "./core/guards/role.guard";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./pages/home/home").then((m) => m.HomeComponent),
    pathMatch: "full",
  },
  // SISTEMA DE PAGOS - ADMIN
  {
    path: "admin-instructor-payments",
    loadComponent: () =>
      import("./pages/admin-instructor-payments/admin-instructor-payments").then(
        (m) => m.AdminInstructorPaymentsComponent
      ),
    canActivate: [roleGuard(["admin"])],
  },
  {
    path: "admin-instructor-payments/:id",
    loadComponent: () =>
      import("./pages/admin-instructor-earnings-detail/admin-instructor-earnings-detail").then(
        (m) => m.AdminInstructorEarningsDetailComponent
      ),
    canActivate: [roleGuard(["admin"])],
  },
  {
    path: "admin-commission-settings",
    loadComponent: () =>
      import("./pages/admin-commission-settings/admin-commission-settings").then(
        (m) => m.AdminCommissionSettingsComponent
      ),
    canActivate: [roleGuard(["admin"])],
  },
  {
    path: "admin-payment-history",
    loadComponent: () =>
      import("./pages/admin-payment-history/admin-payment-history").then(
        (m) => m.AdminPaymentHistoryComponent
      ),
    canActivate: [roleGuard(["admin"])],
  },
  {
    path: "login",
    loadComponent: () =>
      import("./pages/auth/login").then((m) => m.LoginComponent),
  },
  {
    path: "register",
    loadComponent: () =>
      import("./pages/auth/register").then((m) => m.RegisterComponent),
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
    // Admin e Instructor pueden acceder
    canActivate: [roleGuard(["admin", "instructor"])],
  },
  {
    path: "users",
    loadComponent: () =>
      import("./pages/users/users.component").then(
        (m) => m.UsersComponent
      ),
    // Solo el rol 'admin' puede acceder
    canActivate: [roleGuard(["admin"])],
  },
  {
    path: "discounts",
    loadComponent: () =>
      import("./pages/discounts/discounts.component").then(
        (m) => m.DiscountsComponent
      ),
    // Admin e Instructor pueden acceder
    canActivate: [roleGuard(["admin", "instructor"])],
  },
  // SISTEMA DE PAGOS A INSTRUCTORES
  {
    path: "instructor-payment-config",
    loadComponent: () =>
      import("./pages/instructor-payment-config/instructor-payment-config").then(
        (m) => m.InstructorPaymentConfigComponent
      ),
    canActivate: [roleGuard(["instructor"])],
  },
  {
    path: "instructor-earnings",
    loadComponent: () =>
      import("./pages/instructor-earnings/instructor-earnings").then(
        (m) => m.InstructorEarningsComponent
      ),
    canActivate: [roleGuard(["instructor"])],
  },
  {
    path: "instructor-payment-history",
    loadComponent: () =>
      import("./pages/instructor-payment-history/instructor-payment-history").then(
        (m) => m.InstructorPaymentHistoryComponent
      ),
    canActivate: [roleGuard(["instructor"])],
  },
  {
    // Redirige cualquier otra ruta a la página de inicio
    path: "**",
    redirectTo: "",
  },
];
