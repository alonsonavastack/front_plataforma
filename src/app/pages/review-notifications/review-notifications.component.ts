import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoursesService } from '../../core/services/courses';
import { ProjectService } from '../../core/services/project.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-review-notifications',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './review-notifications.component.html',
})
export class ReviewNotificationsComponent implements OnInit {
    private coursesService = inject(CoursesService);
    private projectService = inject(ProjectService);
    private router = inject(Router);

    activeTab = signal<'courses' | 'projects'>('courses');

    pendingCourses = signal<any[]>([]);
    pendingProjects = signal<any[]>([]);
    isLoading = signal(false);

    ngOnInit() {
        this.loadPendingItems();
    }

    loadPendingItems() {
        this.isLoading.set(true);

        // Cargar cursos en borrador
        this.coursesService.getCoursesAdmin('Borrador').subscribe({
            next: (resp: any) => {
                this.pendingCourses.set(resp.courses || []);
                this.checkLoading();
            },
            error: () => this.checkLoading()
        });

        // Cargar proyectos en borrador
        this.projectService.getProjectsAdmin('Borrador').subscribe({
            next: (resp: any) => {
                this.pendingProjects.set(resp.projects || []);
                this.checkLoading();
            },
            error: () => this.checkLoading()
        });
    }

    private checkLoading() {
        // Simple check logic, can be improved
        this.isLoading.set(false);
    }

    setActiveTab(tab: 'courses' | 'projects') {
        this.activeTab.set(tab);
    }

    goToReview(type: 'course' | 'project', item: any) {
        if (type === 'course') {
            // Filtrar para encontrarlo fácil
            this.coursesService.setFiltro({ search: item.title });
            // Navegar usando query param 'section' como pide el usuario
            this.router.navigate(['/dashboard'], { queryParams: { section: 'courses' } });
        } else {
            // Navegar a la sección projects
            this.router.navigate(['/dashboard'], { queryParams: { section: 'projects' } });
        }
    }

    // Helper para construir URL de imagen
    buildImageUrl(imagen: string, type: 'course' | 'project'): string {
        if (!imagen) return '';
        if (imagen.startsWith('http')) return imagen;

        // Usar las rutas definidas en environment
        if (type === 'course') {
            return `${environment.images.course}${imagen}`;
        } else {
            return `${environment.images.project}${imagen}`;
        }
    }
}
