// src/app/pages/users/components/user-modal.component.ts
import { Component, EventEmitter, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AllUser } from '../../../core/services/users.service';
import { environment } from '../../../../environments/environment';

export type ModalMode = 'create' | 'edit' | 'view' | 'closed';

@Component({
  selector: 'app-user-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-modal.component.html',
})
export class UserModalComponent implements OnChanges {
  @Input() mode: ModalMode = 'closed';
  @Input() user: AllUser | null = null;
  @Input() isLoading = false;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ data: any; file: File | null }>();

  // Signals
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  isSubmitting = signal(false);

  // ✅ IMPORTANTE: El nombre debe ser "userForm" para coincidir con el HTML
  userForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    surname: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.minLength(6)]),
    profession: new FormControl(''),
    phone: new FormControl(''),
    description: new FormControl(''),
    rol: new FormControl('customer', [Validators.required]), // ✅ 'customer' no 'cliente'
    state: new FormControl('1', [Validators.required]), // ✅ String '1' no boolean
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode'] && this.mode !== 'closed') {
      this.setupForm();
    }

    if (changes['user'] && this.user && this.mode === 'edit') {
      this.loadUserData();
    }
  }

  private setupForm(): void {
    if (this.mode === 'create') {
      this.userForm.reset({
        rol: 'customer',
        state: '1',
      });
      // En crear, password es requerido
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.userForm.get('password')?.updateValueAndValidity();
      this.selectedFile.set(null);
      this.previewUrl.set(null);
    } else if (this.mode === 'edit') {
      // En editar, password es opcional
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  private loadUserData(): void {
    if (!this.user) return;

    // Convertir state a string '1' o '2'
    const state = typeof this.user.state === 'boolean'
      ? (this.user.state ? '1' : '2')
      : this.user.state.toString();

    this.userForm.patchValue({
      name: this.user.name,
      surname: this.user.surname,
      email: this.user.email,
      profession: this.user.profession || '',
      phone: this.user.phone || '',
      description: this.user.description || '',
      rol: this.user.rol,
      state: state,
    });

    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert('❌ Por favor selecciona solo archivos de imagen');
        return;
      }

      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('❌ La imagen no debe superar los 5MB');
        return;
      }

      this.selectedFile.set(file);

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  getAvatarUrl(avatar?: string): string {
    if (!avatar) {
      return 'https://ui-avatars.com/api/?name=Usuario&background=random&color=fff';
    }
    return `${environment.url}users/imagen-usuario/${avatar}`;
  }

  getRoleBadgeClass(rol: string): string {
    switch (rol) {
      case 'admin': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'instructor': return 'bg-lime-500/20 text-lime-400 border border-lime-500/30';
      case 'customer':
      case 'cliente': return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  }

  getRoleLabel(rol: string): string {
    switch (rol) {
      case 'admin': return 'Administrador';
      case 'instructor': return 'Instructor';
      case 'customer':
      case 'cliente': return 'Estudiante';
      default: return rol;
    }
  }

  getStateBadgeClass(state: boolean | number | string): string {
    const isActive = typeof state === 'boolean'
      ? state
      : (typeof state === 'string' ? state === '1' : state === 1);

    return isActive
      ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
      : 'bg-red-500/20 text-red-400 border border-red-500/30';
  }

  getStateText(state: boolean | number | string): string {
    const isActive = typeof state === 'boolean'
      ? state
      : (typeof state === 'string' ? state === '1' : state === 1);

    return isActive ? 'Activo' : 'Inactivo';
  }

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    if (this.mode === 'view') return;

    if (this.userForm.invalid) {
      Object.keys(this.userForm.controls).forEach(key => {
        this.userForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.userForm.value;

    // 🔥 FIX: Eliminar password si está vacío en modo edición
    const dataToSend: any = { ...formValue, _id: this.user?._id };

    if (this.mode === 'edit' && (!dataToSend.password || dataToSend.password.trim() === '')) {
      delete dataToSend.password;
    }

    this.save.emit({
      data: dataToSend,
      file: this.selectedFile(),
    });
  }

  // Validación de campos individuales
  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (!field?.errors) return '';

    if (field.errors['required']) return 'Este campo es requerido';
    if (field.errors['email']) return 'Email inválido';
    if (field.errors['minlength']) {
      const minLength = field.errors['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }

    return 'Campo inválido';
  }
}
