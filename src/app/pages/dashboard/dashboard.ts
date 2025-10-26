import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, AfterViewInit, computed, Renderer2, effect } from '@angular/core';
import { AnimateService } from '../../core/animate.service';
import { Drawer, DrawerInterface } from 'flowbite';
import { DashboardService } from '../../core/services/dashboard.service';
import { TopbarComponent } from './topbar';
import { SidebarComponent } from './sidebar';
import { initFlowbite } from 'flowbite';
import { AuthService } from '../../core/services/auth';
import { Categories } from '../categories/categories.component';
import { CoursesComponent } from '../courses/courses.component';
import { StudentsComponent } from '../students/students.component';
import { ProjectsComponent } from '../projects/projects.component';
import { SalesComponent } from '../sales/sales.component';
import { UsersComponent } from '../users/users.component';
import { SettingsComponent } from '../settings/settings.component';
import { AppearanceComponent } from '../appearance/appearance.component';
import { DiscountsComponent } from '../discounts/discounts.component';
import { ReportsComponent } from '../reports/reports.component';
// Componentes de pagos
import { InstructorEarningsComponent } from '../instructor-earnings/instructor-earnings';
import { InstructorPaymentHistoryComponent } from '../instructor-payment-history/instructor-payment-history';
import { AdminInstructorPaymentsComponent } from '../admin-instructor-payments/admin-instructor-payments';
import { AdminPaymentHistoryComponent } from '../admin-payment-history/admin-payment-history';
import { AdminCommissionSettingsComponent } from '../admin-commission-settings/admin-commission-settings';
import { InstructorPaymentConfigComponent } from '../instructor-payment-config/instructor-payment-config';
import { CarouselDashboard } from '../carousel-dashboard/carousel-dashboard';
import { ActivatedRoute, Router } from '@angular/router';

import { NavId, NavItem } from './nav.types';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    TopbarComponent,
    SidebarComponent,
    Categories,
    CoursesComponent,
    ProjectsComponent,
    StudentsComponent,
    SalesComponent,
    UsersComponent,
    SettingsComponent,
    AppearanceComponent,
    DiscountsComponent,
    ReportsComponent,
    InstructorEarningsComponent,
    InstructorPaymentHistoryComponent,
    AdminInstructorPaymentsComponent,
    AdminPaymentHistoryComponent,
    AdminCommissionSettingsComponent,
    InstructorPaymentConfigComponent,
    CarouselDashboard
  ],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit, AfterViewInit {
  animate = inject(AnimateService);
  dashboardService = inject(DashboardService);
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private drawer: DrawerInterface | null = null;
  // 🔥 SOLUCIÓN: Exponer Math para usarlo en el template
  Math = Math;
  // Inicializar sidebar cerrado en móvil, abierto en desktop
  isSidebarOpen = signal(typeof window !== 'undefined' && window.innerWidth >= 1024);
  isSidebarCollapsed = signal(false);
  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
    this.isSidebarCollapsed.update(v => !v);
  }

  active: NavId = 'overview';
  setActive(s: NavId) {
    this.active = s;
    // 🔥 SOLUCIÓN: Actualizar la URL con query param para mantener estado
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section: s },
      queryParamsHandling: 'merge'
    });
    // 🔥 Cerrar sidebar en móvil después de navegar
    if (window.innerWidth < 1024 && this.drawer) {
      this.isSidebarOpen.set(false);
      this.drawer.hide();
    }
  }

  private allItems: NavItem[] = [
    { id: 'overview', label: 'Resumen',      icon: 'M4 6h16M4 12h12M4 18h8' },
    { id: 'users',    label: 'Usuarios',     icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'categories', label: 'Categorías', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'courses',  label: 'Cursos',       icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'discounts', label: 'Descuentos',  icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
    { id: 'sales', label: 'Ventas', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { id: 'projects', label: 'Proyectos',    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
    { id: 'students', label: 'Estudiantes',  icon: 'M15 11a3 3 0 1 0-6 0m10 10a7 7 0 0 0-14 0' },
    { id: 'carousel-dashboard', label: 'Carrusel', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    { id: 'reports',  label: 'Reportes',     icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'appearance', label: 'Apariencia', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    { id: 'settings', label: 'Destacados',   icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    // Admin - Pagos
    { id: 'admin-instructor-payments', label: 'Pagos a Instructores', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'admin-payment-history', label: 'Historial de Pagos', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'admin-commission-settings', label: 'Comisiones', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    // Instructor - Pagos
    { id: 'instructor-earnings', label: 'Mis Ganancias', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'instructor-payment-history', label: 'Mis Pagos', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'instructor-payment-config', label: 'Config. de Pago', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.608 3.292 0z M12 12a3 3 0 100-6 3 3 0 000 6z' },
  ];

  items = computed(() => {
    if (this.authService.user()?.rol === 'admin') return this.allItems;
    // Filtramos para que los instructores no vean vistas de admin
    return this.allItems.filter(item =>
      // Ocultar vistas de admin
      !item.id.startsWith('admin-') &&
      // Ocultar vistas que no son para instructores
      ![
        'users',
        'discounts',
        'categories',
        'settings',
        'appearance',
        'carousel-dashboard',
        // 'courses',
      ].includes(item.id)
    );
  });

  constructor(private renderer: Renderer2) {
  // 🔥 SOLUCIÓN: Solo aplicar overflow-hidden en móvil cuando el sidebar está abierto
  effect(() => {
    // Verificar si estamos en móvil (< 1024px que es el breakpoint lg de Tailwind)
    const isMobile = window.innerWidth < 1024;

    if (this.isSidebarOpen() && isMobile) {
      this.renderer.addClass(document.body, 'overflow-hidden');
    } else {
      this.renderer.removeClass(document.body, 'overflow-hidden');
    }
  });
}

  ngOnInit(): void {
    // 🔥 SOLUCIÓN: Leer el query param para restaurar la sección activa
    this.route.queryParams.subscribe(params => {
      if (params['section']) {
        this.active = params['section'] as NavId;
      }
    });

    // Cargamos los KPIs cuando el componente se inicializa
    this.dashboardService.reloadKpis();
    this.dashboardService.loadMonthlyIncome(); // 🔥 SOLUCIÓN: Cargar datos para la gráfica
    this.dashboardService.loadRecentActivity(); // 🆕 NUEVO: Cargar actividad reciente
  }

  ngAfterViewInit(): void {
    initFlowbite();

    // 🔥 SOLUCIÓN: Obtener la instancia del Drawer de Flowbite
    const drawerElement = document.getElementById('drawer-navigation'); // Asegúrate que este es el ID de tu sidebar/drawer
    if (drawerElement) {
      this.drawer = new Drawer(drawerElement);
    }
  }
}
