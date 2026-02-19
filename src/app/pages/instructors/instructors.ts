import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../layout/header/header';
import { FooterComponent } from '../../layout/footer/footer';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Instructor, InstructorCardComponent } from '../../shared/instructor-card/instructor-card.component';
import { SeoService } from '../../core/services/seo.service'; // 🆕

@Component({
    standalone: true,
    selector: 'app-instructors',
    imports: [CommonModule, HeaderComponent, FooterComponent, InstructorCardComponent],
    templateUrl: './instructors.html'
})
export class InstructorsComponent implements OnInit {
    private http = inject(HttpClient);
    private seoService = inject(SeoService); // 🆕

    // Signals
    instructors = signal<Instructor[]>([]);
    isLoading = signal<boolean>(true);
    searchTerm = signal<string>('');

    // Computed para filtrar instructores
    filteredInstructors = computed(() => {
        const search = this.searchTerm().toLowerCase().trim();
        const all = this.instructors();

        if (!search) return all;

        return all.filter(instructor => {
            const name = `${instructor.name} ${instructor.surname}`.toLowerCase();
            const profession = (instructor.profession || '').toLowerCase();
            return name.includes(search) || profession.includes(search);
        });
    });

    ngOnInit(): void {
        // 🔥 SEO Config
        this.seoService.setSeo({
            title: 'Instructores Expertos - Dev Hub Sharks',
            description: 'Conoce a nuestro equipo de instructores expertos en desarrollo web, Angular, Node.js y más. Aprende con profesionales en Dev Hub Sharks.',
            keywords: 'instructores, profesores, mentores, desarrollo web, angular, nodejs, dev hub sharks',
            type: 'website'
        });

        this.loadInstructors();
    }

    private loadInstructors(): void {
        this.isLoading.set(true);
        this.http.get<any>(`${environment.url}users/list-instructors`)
            .subscribe({
                next: (response) => {
                    this.instructors.set(response.users || []);
                    this.isLoading.set(false);
                },
                error: (error) => {
                    console.error('Error loading instructors', error);
                    this.isLoading.set(false);
                    this.instructors.set([]);
                }
            });
    }

    onSearch(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.searchTerm.set(input.value);
    }

    clearSearch(): void {
        this.searchTerm.set('');
    }
}
