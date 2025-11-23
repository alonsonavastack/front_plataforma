// src/app/pages/dashboard/students/students.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';

import { environment } from '../../../environments/environment';
import { StudentService, Student } from '../../core/services/student.service';
import { AuthService } from '../../core/services/auth';
import { FormsModule, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './students.component.html',
})
export class StudentsComponent implements OnInit {
  studentService = inject(StudentService);
  authService = inject(AuthService);

  // Signals del servicio
  students = this.studentService.filteredStudents;
  isLoading = this.studentService.isLoading;

  // Computed para verificar rol
  isAdmin = computed(() => this.authService.user()?.rol === 'admin');
  isInstructor = computed(() => this.authService.user()?.rol === 'instructor');

  // Stats
  totalStudents = this.studentService.totalStudents;
  activeStudents = this.studentService.activeStudents;
  inactiveStudents = this.studentService.inactiveStudents;
  totalEnrollments = this.studentService.totalEnrollments;

  // Modal state
  isModalOpen = signal(false);
  isEditing = signal(false);
  currentStudent = signal<Student | null>(null);

  studentForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    surname: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    profession: new FormControl(''),
    description: new FormControl(''),
    state: new FormControl(true, [Validators.required]),
  });

  ngOnInit(): void {
    this.studentService.loadStudents().subscribe({
      next: () => {},
      error: (err) => {}
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.studentService.setSearchTerm(value);
  }

  onStateFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === '') {
      this.studentService.setStateFilter('');
    } else {
      this.studentService.setStateFilter(value === 'true');
    }
  }

  openEditModal(student: Student): void {
    this.isEditing.set(true);
    this.currentStudent.set(student);

    const state = student.state === true || student.state === 1;

    this.studentForm.patchValue({
      name: student.name,
      surname: student.surname,
      email: student.email,
      profession: student.profession || '',
      description: student.description || '',
      state: state,
    });

    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.studentForm.reset();
    this.currentStudent.set(null);
    this.isEditing.set(false);
  }

  toggleStudentState(student: Student): void {
    // Solo admins pueden cambiar el estado
    if (!this.isAdmin()) {
      alert('⚠️ Solo los administradores pueden cambiar el estado de los estudiantes');
      return;
    }

    const currentState = student.state === true || student.state === 1;
    const newState = !currentState;
    const action = newState ? 'activar' : 'desactivar';

    const confirmChange = confirm(`¿Estás seguro de ${action} a ${student.name} ${student.surname}?`);
    if (!confirmChange) return;

    // Mostrar feedback visual inmediato
    this.studentService.updateStudentState(student._id, newState).subscribe({
      next: (response) => {
        alert(`Estudiante ${action === 'activar' ? 'activado' : 'desactivado'} exitosamente`);
        // Recargar la lista completa para asegurar consistencia
        this.studentService.loadStudents().subscribe();
      },
      error: (error) => {
        const errorMessage = error.error?.message_text || error.error?.message || 'Error al cambiar el estado del estudiante';
        alert(errorMessage);
        // Recargar en caso de error para mantener consistencia
        this.studentService.loadStudents().subscribe();
      }
    });
  }

  saveStudent(): void {
    // Solo admins pueden editar estudiantes
    if (!this.isAdmin()) {
      alert('⚠️ Solo los administradores pueden editar estudiantes');
      return;
    }

    if (this.studentForm.invalid) {
      Object.keys(this.studentForm.controls).forEach(key => {
        this.studentForm.get(key)?.markAsTouched();
      });
      return;
    }

    const currentStudent = this.currentStudent();
    if (!currentStudent) return;

    const formValue = this.studentForm.value;
    const data: Partial<Student> = {
      name: formValue.name || '',
      surname: formValue.surname || '',
      email: formValue.email || '',
      profession: formValue.profession || '',
      description: formValue.description || '',
      state: formValue.state ?? true,
    };

    this.studentService.updateStudent(currentStudent._id, data).subscribe({
      next: () => {
        alert('Estudiante actualizado exitosamente');
        this.closeModal();
        this.studentService.loadStudents().subscribe();
      },
      error: (error) => {
        alert(error.error?.message_text || 'Error al actualizar el estudiante');
      }
    });
  }

  getAvatarUrl(avatar?: string): string {
    if (!avatar) {
      return 'https://ui-avatars.com/api/?name=Usuario&background=random';
    }
    return `${environment.url}users/imagen-usuario/${avatar}`;
  }

  isStudentActive(student: Student): boolean {
    // El state puede ser boolean o number (legacy), normalizamos
    return student.state === true || student.state === 1;
  }

  getStateBadgeClass(student: Student): string {
    const isActive = this.isStudentActive(student);
    return isActive
      ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
      : 'bg-red-500/20 text-red-400 border border-red-500/30';
  }

  getStateText(student: Student): string {
    const isActive = this.isStudentActive(student);
    return isActive ? 'Activo' : 'Inactivo';
  }
}
