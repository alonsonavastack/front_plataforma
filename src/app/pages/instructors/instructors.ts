import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../layout/header/header';
import { FooterComponent } from '../../layout/footer/footer';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Instructor, InstructorCardComponent } from '../../shared/instructor-card/instructor-card.component';

@Component({
    standalone: true,
    selector: 'app-instructors',
    imports: [CommonModule, HeaderComponent, FooterComponent, InstructorCardComponent],
    templateUrl: './instructors.html'
})
export class InstructorsComponent implements OnInit {
    private http = inject(HttpClient);

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
