import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, AfterViewInit, computed, Renderer2, effect, OnDestroy, HostListener } from '@angular/core';
import { AnimateService } from '../../core/animate.service';
import { Drawer, DrawerInterface, DrawerOptions } from 'flowbite';
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
// Componentes de pagos
import { InstructorEarningsComponent } from '../instructor-earnings/instructor-earnings';
import { InstructorPaymentHistoryComponent } from '../instructor-payment-history/instructor-payment-history';
import { AdminInstructorPaymentsComponent } from '../admin-instructor-payments/admin-instructor-payments';
import { AdminPaymentHistoryComponent } from '../admin-payment-history/admin-payment-history';
import { AdminCommissionSettingsComponent } from '../admin-commission-settings/admin-commission-settings';

import { InstructorPaymentConfigComponent } from '../instructor-payment-config/instructor-payment-config';
import { CarouselDashboard } from '../carousel-dashboard/carousel-dashboard';
import { RefundsComponent } from '../refunds/refunds.component';
import { AdminWalletsComponent } from '../admin-wallets/admin-wallets.component';
import { ReviewNotificationsComponent } from '../review-notifications/review-notifications.component'; // 🔥 NUEVO
import { ActivatedRoute, Router } from '@angular/router';

import { NavId, NavItem } from './nav.types';
import { SystemSettingsComponent } from "../system-settings/system-settings.component";
import { SystemConfigService } from '../../core/services/system-config.service'; // 🔥 NUEVO
import { ReportsComponent } from '../reports/reports.component';

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
    ReportsComponent,
    SalesComponent,
    UsersComponent,
    SettingsComponent,
    AppearanceComponent,
    DiscountsComponent,
    InstructorEarningsComponent,
    InstructorPaymentHistoryComponent,
    AdminInstructorPaymentsComponent,
    AdminPaymentHistoryComponent,
    AdminCommissionSettingsComponent,

    InstructorPaymentConfigComponent,
    CarouselDashboard,
    SystemSettingsComponent,
    RefundsComponent,
    AdminWalletsComponent,
    ReviewNotificationsComponent // 🔥 NUEVO
  ],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  animate = inject(AnimateService);
  dashboardService = inject(DashboardService);
  authService = inject(AuthService);
  systemConfigService = inject(SystemConfigService); // 🔥 NUEVO
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private drawer: DrawerInterface | null = null;
  private resizeListener: (() => void) | null = null;

  // Exponer Math para usarlo en el template
  Math = Math;

  // 🔥 ESTADO MEJORADO DEL SIDEBAR
  isSidebarOpen = signal(false);
  isSidebarCollapsed = signal(false);

  // 🔥 COMPUTED: Determinar si estamos en móvil
  private screenWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1024);
  isMobile = computed(() => this.screenWidth() < 1024);
  // 🔥 LISTENER DE RESIZE PARA RESPONSIVE
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const width = (event.target as Window).innerWidth;
    this.screenWidth.set(width);

    // En desktop, asegurar que el drawer esté visible
    if (width >= 1024) {
      this.isSidebarOpen.set(true);
      if (this.drawer) {
        this.drawer.hide(); // Desactivar el drawer de Flowbite en desktop
      }
    } else {
      // En móvil, cerrar el drawer si está abierto
      if (!this.isSidebarOpen()) {
        this.drawer?.hide();
      }
    }
  }

  // 🔥 TOGGLE MEJORADO CON LOGS
  toggleSidebar() {

    if (this.isMobile()) {
      // En móvil: Toggle del drawer de Flowbite
      if (!this.drawer) {
        // Intentar inicializar el drawer si no existe
        this.initializeDrawer();
        return;
      }

      if (this.isSidebarOpen()) {
        this.drawer.hide();
        this.isSidebarOpen.set(false);
      } else {
        this.drawer.show();
        this.isSidebarOpen.set(true);
      }
    } else {
      // En desktop: Solo colapsar/expandir
      this.isSidebarCollapsed.update(v => !v);
    }
  }

  // 🔥 MÉTODO PARA TOGGLE DE COLAPSAR (solo desktop)
  toggleCollapse() {
    this.isSidebarCollapsed.update(v => !v);
  }

  // 🔥 MÉTODO PARA OBTENER INICIAL DEL USUARIO
  getUserInitial(): string {
    const name = this.authService.user()?.name;
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }

  // 🔥 NUEVO: Estado inicial dinámico según rol
  active: NavId = 'executive-dashboard';

  // 🔥 SET ACTIVE MEJORADO
  setActive(s: NavId) {
    this.active = s;

    // Actualizar la URL con query param
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section: s },
      queryParamsHandling: 'merge'
    });

    // 💎 NUEVO: Recargar métricas ejecutivas al entrar a la sección
    if (s === 'executive-dashboard' && this.authService.user()?.rol === 'admin') {
      setTimeout(() => {
        this.dashboardService.loadExecutiveMetrics();
      }, 100);
    }

    // Cerrar sidebar en móvil después de navegar
    if (this.isMobile()) {
      this.closeMobileSidebar();
    }
  }

  // 🔥 MÉTODO DEDICADO PARA CERRAR SIDEBAR EN MÓVIL
  private closeMobileSidebar(): void {
    if (!this.drawer || !this.isMobile()) return;

    // Remover foco del drawer
    const drawerElement = document.getElementById('dashboard-drawer');
    if (drawerElement) {
      const focusedElement = drawerElement.querySelector(':focus') as HTMLElement;
      if (focusedElement) {
        focusedElement.blur();
      }
    }

    // Cerrar el drawer
    this.isSidebarOpen.set(false);
    this.drawer.hide();

    // Mover foco al contenido principal
    setTimeout(() => {
      const mainContent = document.querySelector('main');
      if (mainContent) {
        (mainContent as HTMLElement).focus();
      }
    }, 100);
  }

  private allItems: NavItem[] = [
    // 💎 DASHBOARD EJECUTIVO (Solo Admin)
    { id: 'executive-dashboard', label: 'Dashboard Ejecutivo', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', adminOnly: true },
    { id: 'review-notifications', label: 'Notificaciones', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', adminOnly: true }, // 🔥 NUEVO
    { id: 'users', label: 'Usuarios', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', adminOnly: true },
    { id: 'categories', label: 'Categorías', icon: 'M4 6h16M4 12h16M4 18h16', adminOnly: true },
    { id: 'courses', label: 'Cursos', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'discounts', label: 'Descuentos', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z', adminOnly: true },
    { id: 'sales', label: 'Ventas', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { id: 'projects', label: 'Proyectos', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
    { id: 'students', label: 'Estudiantes', icon: 'M15 11a3 3 0 1 0-6 0m10 10a7 7 0 0 0-14 0' },
    { id: 'carousel-dashboard', label: 'Carrusel', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z', adminOnly: true },
    { id: 'reports', label: 'Reportes', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', adminOnly: true },
    { id: 'appearance', label: 'Apariencia', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z', adminOnly: true },
    { id: 'settings', label: 'Destacados', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', adminOnly: true },
    { id: 'system-settings', label: 'Configuración', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.608 3.292 0z M12 12a3 3 0 100-6 3 3 0 000 6z', adminOnly: true },
    // Admin - Pagos
    { id: 'admin-instructor-payments', label: 'Pagos a Instructores', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', adminOnly: true },
    { id: 'admin-payment-history', label: 'Historial de Pagos', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', adminOnly: true },
    { id: 'admin-commission-settings', label: 'Comisiones', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', adminOnly: true },

    // Instructor - Pagos
    { id: 'instructor-earnings', label: 'Mis Ganancias', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'instructor-payment-history', label: 'Mis Pagos', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'instructor-payment-config', label: 'Config. de Pago', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.608 3.292 0z M12 12a3 3 0 100-6 3 3 0 000 6z' },
    // 💰 Admin - Reembolsos
    { id: 'refunds', label: 'Solicitudes de Reembolso', icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6', adminOnly: true },
    // 💰 Admin - Billeteras
    { id: 'wallets', label: 'Billeteras de Usuarios', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', adminOnly: true },
  ];

  items = computed(() => {
    const user = this.authService.user();
    const userRole = user?.rol;

    // Si no hay usuario, retornar vacío
    if (!user || !userRole) {
      return [];
    }

    // Admin ve TODOS los items sin excepción
    if (userRole === 'admin') {
      // Ordenar para que 'executive-dashboard' aparezca primero
      return this.allItems.sort((a, b) => {
        if (a.id === 'executive-dashboard') return -1;
        if (b.id === 'executive-dashboard') return 1;
        return 0;
      });
      return this.allItems;
    }

    // Instructores ven items filtrados
    if (userRole === 'instructor') {
      // 🔥 FILTRAR: Solo items que NO tengan adminOnly: true
      return this.allItems.filter(item => {
        // Si el item tiene adminOnly: true, ocultarlo
        if ('adminOnly' in item && item.adminOnly) {
          return false;
        }

        // Si el item empieza con 'admin-', no lo mostramos
        if (item.id.startsWith('admin-')) {
          return false;
        }

        // Si pasó todas las validaciones, mostrarlo
        return true;
      });
    }

    // Cualquier otro rol no ve items
    return [];
  });

  constructor(private renderer: Renderer2) {
    // 🔥 EFFECT: Controlar overflow del body
    effect(() => {
      const shouldHideOverflow = this.isMobile() && this.isSidebarOpen();

      if (shouldHideOverflow) {
        this.renderer.addClass(document.body, 'overflow-hidden');
      } else {
        this.renderer.removeClass(document.body, 'overflow-hidden');
      }
    });
  }

  ngOnInit(): void {
    // Establecer estado inicial basado en tamaño de pantalla
    this.screenWidth.set(window.innerWidth);
    if (window.innerWidth >= 1024) {
      this.isSidebarOpen.set(true);
    }

    // Cargar configuración del sistema


    // 🔥 NUEVO: Establecer sección inicial según rol
    const user = this.authService.user();
    if (user) {
      if (user.rol === 'admin') {
        this.active = 'executive-dashboard';
      } else if (user.rol === 'instructor') {
        this.active = 'instructor-earnings';
      }
    }

    // Leer query param para restaurar sección activa (override)
    this.route.queryParams.subscribe(params => {
      if (params['section']) {
        this.active = params['section'] as NavId;
      } else {
        // Si no hay query param, aplicar sección inicial
        const initialSection = user?.rol === 'admin' ? 'executive-dashboard' : 'instructor-earnings';
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { section: initialSection },
          queryParamsHandling: 'merge'
        });
      }
    });

    // Cargar datos del dashboard
    this.dashboardService.reloadKpis();
    this.dashboardService.loadMonthlyIncome();
    this.dashboardService.loadRecentActivity();

    // 💎 NUEVO: Cargar métricas ejecutivas si es admin
    if (this.authService.user()?.rol === 'admin') {
      this.dashboardService.loadExecutiveMetrics();

      // 🔍 Verificar después de 2 segundos
      setTimeout(() => {
        const metrics = this.dashboardService.executiveMetrics();

        if (metrics) {
        } else {
        }
      }, 2000);
    } else {
    }
  }

  // 💎 NUEVO: Métodos auxiliares para el Dashboard Ejecutivo
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }

  getAlertClass(type: 'warning' | 'danger' | 'info'): string {
    const classes = {
      warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
      danger: 'bg-red-500/10 border-red-500/30 text-red-300',
      info: 'bg-blue-500/10 border-blue-500/30 text-blue-300'
    };
    return classes[type];
  }

  getAlertIcon(type: 'warning' | 'danger' | 'info'): string {
    const icons = {
      warning: '⚠️',
      danger: '🛑',
      info: 'ℹ️'
    };
    return icons[type];
  }

  getPriorityBadgeClass(priority: 'high' | 'medium' | 'low'): string {
    const classes = {
      high: 'bg-red-500/20 text-red-300',
      medium: 'bg-yellow-500/20 text-yellow-300',
      low: 'bg-blue-500/20 text-blue-300'
    };
    return classes[priority];
  }

  navigateToSection(section: string): void {
    this.active = section as NavId;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section },
      queryParamsHandling: 'merge'
    });
  }

  ngAfterViewInit(): void {
    // 🔥 INICIALIZAR DRAWER CON DELAY PARA ASEGURAR QUE EL DOM ESTÉ LISTO
    setTimeout(() => {
      this.initializeDrawer();
    }, 100);
  }

  // 🔥 MÉTODO DEDICADO PARA INICIALIZAR DRAWER
  private initializeDrawer(): void {
    const drawerElement = document.getElementById('dashboard-drawer');

    if (!drawerElement) {
      return;
    }

    const options: DrawerOptions = {
      placement: 'left',
      backdrop: true,
      bodyScrolling: false,
      edge: false,
      edgeOffset: '',
      backdropClasses: 'bg-slate-900/80 backdrop-blur-sm fixed inset-0 z-30 lg:hidden',
      onHide: () => {
        this.isSidebarOpen.set(false);
      },
      onShow: () => {
        this.isSidebarOpen.set(true);
      },
    };

    try {
      this.drawer = new Drawer(drawerElement, options);

      // Agregar listener al backdrop después de inicializar
      setTimeout(() => {
        const backdropElement = document.querySelector('[data-drawer-backdrop="dashboard-drawer"]');
        if (backdropElement) {
          backdropElement.addEventListener('click', () => {
            if (this.isMobile()) {
              this.closeMobileSidebar();
            }
          });
        }
      }, 200);

      // 🔥 IMPORTANTE: Inicializar Flowbite DESPUÉS del drawer
      initFlowbite();
    } catch (error) {
    }
  }

  // 🔥 CLEANUP
  ngOnDestroy(): void {
    // Limpiar overflow del body
    this.renderer.removeClass(document.body, 'overflow-hidden');

    // Destruir drawer de Flowbite
    if (this.drawer) {
      this.drawer.hide();
      this.drawer = null;
    }
  }
}
