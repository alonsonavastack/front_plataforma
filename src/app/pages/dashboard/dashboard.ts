import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, AfterViewInit } from '@angular/core';
import { AnimateService } from '../../core/animate.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { TopbarComponent } from './topbar';
import { SidebarComponent } from './sidebar';
import { initFlowbite } from 'flowbite';
import { Categories } from '../categories/categories.component'; // Mantenemos este para la sección de categorías
import { CoursesComponent } from '../courses/courses.component'; // Añadimos el nuevo componente de cursos


type Section = 'overview'|'categories'|'courses'|'students'|'reports'|'settings';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, TopbarComponent, SidebarComponent, Categories, CoursesComponent],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit, AfterViewInit {
  animate = inject(AnimateService);
  dashboardService = inject(DashboardService);

  isSidebarCollapsed = signal(false);
  toggleSidebar() { this.isSidebarCollapsed.update(v => !v); }

  active: Section = 'overview';
  setActive(s: Section) { this.active = s; }

  ngOnInit(): void {
    // Cargamos los KPIs cuando el componente se inicializa
    this.dashboardService.reloadKpis();
  }

  ngAfterViewInit(): void {
    initFlowbite();
  }
}
