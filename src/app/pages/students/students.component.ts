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
  students = this.studentService.students; // ✅ Signal de todos los estudiantes
  filteredStudents = this.studentService.filteredStudents; // ✅ Signal filtrado
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
    // ✅ httpResource carga automáticamente, no necesitas subscribe

    // 🔍 Log de verificación cuando los datos estén listos
    setTimeout(() => {
      const students = this.students();
      if (students.length > 0) {
      }
    }, 1000);
  }



  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.studentService.setSearchTerm(value);
  }

  onStateFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.studentService.setStateFilter(value === '' ? '' : value === 'true');
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
    if (!this.isAdmin()) {
      alert('⚠️ Solo los administradores pueden cambiar el estado');
      return;
    }

    const currentState = student.state === true || student.state === 1;
    const newState = !currentState;
    const action = newState ? 'activar' : 'desactivar';

    if (!confirm(`¿Estás seguro de ${action} a ${student.name} ${student.surname}?`)) return;

    // ✅ Service maneja reload automático
    this.studentService.updateStudentState(student._id, newState).subscribe({
      error: (error) => {
      }
    });
  }

  saveStudent(): void {
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

    // ✅ Service maneja reload y toast automático
    this.studentService.updateStudent(currentStudent._id, data).subscribe({
      next: () => {
        this.closeModal();
      },
      error: (error) => {
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
