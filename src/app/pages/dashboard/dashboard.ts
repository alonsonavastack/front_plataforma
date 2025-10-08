import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, AfterViewInit } from '@angular/core';
import { AnimateService } from '../../core/animate.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { TopbarComponent } from './topbar';
import { SidebarComponent } from './sidebar';
import { initFlowbite } from 'flowbite';
import { Categories } from '../categories/categories.component'; // Mantenemos este para la sección de categorías
import { CoursesComponent } from '../courses/courses.component'; // Añadimos el nuevo componente de cursos
import { StudentsComponent } from '../students/students.component';
import { ProjectsComponent } from '../projects/projects.component';
import { SalesComponent } from '../sales/sales.component';
import { SettingsComponent } from '../settings/settings.component';
import { AppearanceComponent } from '../appearance/appearance.component';

import { NavId } from './nav.types';


@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, TopbarComponent, SidebarComponent, Categories, CoursesComponent, ProjectsComponent, StudentsComponent, SalesComponent, SettingsComponent, AppearanceComponent],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit, AfterViewInit {
  animate = inject(AnimateService);
  dashboardService = inject(DashboardService);

  isSidebarCollapsed = signal(false);
  toggleSidebar() { this.isSidebarCollapsed.update(v => !v); }

  active: NavId = 'overview';
  setActive(s: NavId) { this.active = s; }

  ngOnInit(): void {
    // Cargamos los KPIs cuando el componente se inicializa
    this.dashboardService.reloadKpis();
  }

  ngAfterViewInit(): void {
    initFlowbite();
  }
}
