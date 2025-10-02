// src/app/core/services/student.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';
import { tap, catchError, throwError } from 'rxjs';

export interface Student {
  _id: string;
  name: string;
  surname: string;
  email: string;
  avatar?: string;
  course_count: number;
  state: boolean | number; // Puede ser boolean o number
  phone?: string;
  profession?: string;
  description?: string;
  created_at?: string;
}

export interface StudentListResponse {
  students: Student[];
}

@Injectable({ providedIn: 'root' })
export class StudentService {
  private http = inject(HttpClient);
  private base = environment.url;

  // State management
  private studentsState = signal<{
    students: Student[];
    isLoading: boolean;
    error: any;
  }>({
    students: [],
    isLoading: false,
    error: null,
  });

  // Computed signals
  students = computed(() => this.studentsState().students);
  isLoading = computed(() => this.studentsState().isLoading);
  error = computed(() => this.studentsState().error);

  // Filter signals
  searchTerm = signal('');
  stateFilter = signal<boolean | number | ''>('');

  // Filtered students
  filteredStudents = computed(() => {
    let filtered = this.students();

    // Filter by search term
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.surname.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
      );
    }

    // Filter by state
    if (this.stateFilter() !== '') {
      const filterValue = this.stateFilter();
      filtered = filtered.filter(s => {
        // Normalizar el state a boolean para comparar
        const studentState = typeof s.state === 'boolean' ? s.state : s.state === 1;
        const filterState = typeof filterValue === 'boolean' ? filterValue : filterValue === 1;
        return studentState === filterState;
      });
    }

    return filtered;
  });

  loadStudents() {
    this.studentsState.update(s => ({ ...s, isLoading: true }));

    return this.http.get<StudentListResponse>(`${this.base}dashboard/students`).pipe(
      tap(res => {
        console.log('Estudiantes recibidos:', res.students);
        this.studentsState.set({
          students: res.students,
          isLoading: false,
          error: null,
        });
      }),
      catchError(err => {
        this.studentsState.set({
          students: [],
          isLoading: false,
          error: err,
        });
        return throwError(() => err);
      })
    );
  }

  updateStudentState(studentId: string, newState: boolean) {
    return this.http.put(`${this.base}users/update-state/${studentId}`, { state: newState }).pipe(
      tap(() => {
        // Actualizar el estado local
        const updatedStudents = this.students().map(s =>
          s._id === studentId ? { ...s, state: newState } : s
        );
        this.studentsState.update(s => ({ ...s, students: updatedStudents }));
      })
    );
  }

  updateStudent(studentId: string, data: Partial<Student>) {
    const formData = new FormData();
    formData.append('_id', studentId);
    if (data.name) formData.append('name', data.name);
    if (data.surname) formData.append('surname', data.surname);
    if (data.email) formData.append('email', data.email);
    if (data.profession !== undefined) formData.append('profession', data.profession);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.state !== undefined) formData.append('state', data.state.toString());

    return this.http.post(`${this.base}users/update`, formData).pipe(
      tap(() => {
        // Actualizar el estudiante en el estado local
        const updatedStudents = this.students().map(s =>
          s._id === studentId ? { ...s, ...data } : s
        );
        this.studentsState.update(s => ({ ...s, students: updatedStudents }));
      })
    );
  }

  setSearchTerm(term: string) {
    this.searchTerm.set(term);
  }

  setStateFilter(state: boolean | number | '') {
    this.stateFilter.set(state);
  }

  // Stats computed - normalizar state a boolean
  private isActive(student: Student): boolean {
    return typeof student.state === 'boolean' ? student.state : student.state === 1;
  }

  totalStudents = computed(() => this.students().length);
  activeStudents = computed(() => this.students().filter(s => this.isActive(s)).length);
  inactiveStudents = computed(() => this.students().filter(s => !this.isActive(s)).length);
  totalEnrollments = computed(() => this.students().reduce((sum, s) => sum + (s.course_count || 0), 0));
}
