import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, AfterViewInit, computed } from '@angular/core';
import { AnimateService } from '../../core/animate.service';
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

import { NavId, NavItem } from './nav.types';


@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, TopbarComponent, SidebarComponent, Categories, CoursesComponent, ProjectsComponent, StudentsComponent, SalesComponent, UsersComponent, SettingsComponent, AppearanceComponent, DiscountsComponent],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit, AfterViewInit {
  animate = inject(AnimateService);
  dashboardService = inject(DashboardService);
  authService = inject(AuthService);

  isSidebarCollapsed = signal(false);
  toggleSidebar() { this.isSidebarCollapsed.update(v => !v); }

  active: NavId = 'overview';
  setActive(s: NavId) { this.active = s; }

  private allItems: NavItem[] = [
    { id: 'overview', label: 'Resumen',      icon: 'M4 6h16M4 12h12M4 18h8' },
    { id: 'users',    label: 'Usuarios',     icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'categories', label: 'Categorías', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'courses',  label: 'Cursos',       icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'discounts', label: 'Descuentos',  icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
    { id: 'sales', label: 'Ventas', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { id: 'projects', label: 'Proyectos',    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
    { id: 'students', label: 'Estudiantes',  icon: 'M15 11a3 3 0 1 0-6 0m10 10a7 7 0 0 0-14 0' },
    { id: 'reports',  label: 'Reportes',     icon: 'M3 12l6 6L21 6' },
    { id: 'appearance', label: 'Apariencia', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    { id: 'settings', label: 'Ajustes',      icon: 'M12 6v12m6-6H6' },
  ];

  items = computed(() => {
    if (this.authService.user()?.rol === 'admin') return this.allItems;
    // Filtramos para que los instructores no vean 'users', 'settings' ni 'appearance'
    return this.allItems.filter(item =>
      item.id !== 'users' &&
      item.id !== 'settings' &&
      item.id !== 'appearance'
    );
  });

  ngOnInit(): void {
    // Cargamos los KPIs cuando el componente se inicializa
    this.dashboardService.reloadKpis();
  }

  ngAfterViewInit(): void {
    initFlowbite();
  }
}
