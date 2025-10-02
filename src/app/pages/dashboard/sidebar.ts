import { Component, input, output } from '@angular/core';

type NavId = 'overview'|'categories'|'courses'|'projects'|'students'|'reports'|'settings';
type NavItem = { id: NavId; label: string; icon: string; };

@Component({
  standalone: true,
  selector: 'app-sidebar',
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  selected = input<NavId>('overview');
  isCollapsed = input<boolean>(false);
  navigate = output<NavId>();

  items: NavItem[] = [
    { id: 'overview', label: 'Resumen',      icon: 'M4 6h16M4 12h12M4 18h8' },
    { id: 'categories', label: 'Categorías', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'courses',  label: 'Cursos',       icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'projects', label: 'Proyectos',    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
    { id: 'students', label: 'Estudiantes',  icon: 'M15 11a3 3 0 1 0-6 0m10 10a7 7 0 0 0-14 0' },
    { id: 'reports',  label: 'Reportes',     icon: 'M3 12l6 6L21 6' },
    { id: 'settings', label: 'Ajustes',      icon: 'M12 6v12m6-6H6' },
  ];
}
