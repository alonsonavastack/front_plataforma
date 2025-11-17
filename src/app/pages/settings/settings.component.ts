import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService, SettingsCourse, SettingsProject } from '../../core/services/settings.service';
import { HomeService } from '../../core/services/home';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  settingsService = inject(SettingsService);
  homeService = inject(HomeService);

  // Señales para los datos
  courses = this.settingsService.courses;
  projects = this.settingsService.projects;
  isLoadingCourses = this.settingsService.isLoadingCourses;
  isLoadingProjects = this.settingsService.isLoadingProjects;

  // Pestaña activa y filtros
  activeTab = signal<'courses' | 'projects'>('courses');
  courseSearch = signal('');
  projectSearch = signal('');

  // Señales computadas para filtrar
  filteredCourses = computed(() => {
    const term = this.courseSearch().toLowerCase();
    return this.courses().filter((c: SettingsCourse) =>
      c.title.toLowerCase().includes(term)
    );
  });

  filteredProjects = computed(() => {
    const term = this.projectSearch().toLowerCase();
    return this.projects().filter((p: SettingsProject) =>
      p.title.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.settingsService.loadCourses().subscribe();
    this.settingsService.loadProjects().subscribe();
  }

  toggleCourseFeatured(course: SettingsCourse, event: MouseEvent): void {
    event.stopPropagation();
    const originalState = course.featured;
    const newState = !originalState;

    // 1. Actualización optimista: cambiamos el estado en el frontend al instante.
    this.settingsService.updateLocalCourse({ ...course, featured: newState });

    // 2. Llamamos a la API.
    this.settingsService.toggleCourseFeatured(course._id, newState).subscribe({
      next: (response: any) => {
        // La API confirmó el cambio, actualizamos con los datos del servidor (por si acaso).
        this.settingsService.updateLocalCourse(response.course);
        this.homeService.reloadHome();
      },
      error: (err: any) => {
        // 3. Si la API falla, revertimos el cambio en el frontend.
        this.settingsService.updateLocalCourse({ ...course, featured: originalState });
        alert('Error al actualizar el curso. El cambio ha sido revertido.');
      }
    });
  }

  toggleProjectFeatured(project: SettingsProject, event: MouseEvent): void {
    event.stopPropagation();
    const originalState = project.featured;
    const newState = !originalState;

    // 1. Actualización optimista
    this.settingsService.updateLocalProject({ ...project, featured: newState });

    // 2. Llamada a la API
    this.settingsService.toggleProjectFeatured(project._id, newState).subscribe({
      next: (response: any) => {
        this.settingsService.updateLocalProject(response.project);
        this.homeService.reloadHome();
      },
      error: (err: any) => {
        alert('Error al actualizar el proyecto.');
        // 3. Reversión en caso de error
        this.settingsService.updateLocalProject({ ...project, featured: originalState });
      },
    });
  }

  getCourseImageUrl(imageName?: string): string {
    if (!imageName) return 'https://via.placeholder.com/150';
    return `${this.settingsService.base}courses/imagen-course/${imageName}`;
  }

  getProjectImageUrl(imageName?: string): string {
    if (!imageName) return 'https://via.placeholder.com/150';
    return `${this.settingsService.base}projects/imagen-project/${imageName}`;
  }

  setTab(tab: 'courses' | 'projects'): void {
    this.activeTab.set(tab);
  }

  // Stats
  featuredCoursesCount = computed(() =>
    this.courses().filter((c: SettingsCourse) => c.featured).length
  );

  featuredProjectsCount = computed(() =>
    this.projects().filter((p: SettingsProject) => p.featured).length
  );
}
