// src/app/pages/dashboard/students/students.component.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { StudentService, Student } from '../../core/services/student.service';
import { FormsModule, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './students.component.html',
})
export class StudentsComponent implements OnInit {
  studentService = inject(StudentService);
  
  // Signals del servicio
  students = this.studentService.filteredStudents;
  isLoading = this.studentService.isLoading;
  
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
      next: () => console.log('Estudiantes cargados'),
      error: (err) => console.error('Error al cargar estudiantes:', err)
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
    
    const state = typeof student.state === 'boolean' ? student.state : student.state === 1;
    
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
    const currentState = typeof student.state === 'boolean' ? student.state : student.state === 1;
    const newState = !currentState;
    const action = newState ? 'activar' : 'desactivar';
    
    const confirmChange = confirm(`¿Estás seguro de ${action} a ${student.name} ${student.surname}?`);
    if (!confirmChange) return;

    this.studentService.updateStudentState(student._id, newState).subscribe({
      next: () => {
        alert(`Estudiante ${action === 'activar' ? 'activado' : 'desactivado'} exitosamente`);
      },
      error: (error) => {
        console.error('Error al cambiar estado:', error);
        alert('Error al cambiar el estado del estudiante');
      }
    });
  }

  saveStudent(): void {
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
        console.error('Error al actualizar estudiante:', error);
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
    return typeof student.state === 'boolean' ? student.state : student.state === 1;
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
