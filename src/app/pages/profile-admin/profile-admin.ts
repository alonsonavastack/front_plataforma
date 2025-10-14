import { Component, inject, effect, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { HeaderComponent } from '../../layout/header/header';
import { AuthService } from '../../core/services/auth';
import { HttpClient } from '@angular/common/http';
import { ProfileService } from '../../core/services/profile';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-profile-admin',
  standalone: true,
  imports: [CommonModule, HeaderComponent, ReactiveFormsModule],
  templateUrl: './profile-admin.html',
})
export class ProfileAdminComponent implements OnInit {
  authService = inject(AuthService);
  profileService = inject(ProfileService);
  adminService = inject(AdminService); // Inyectamos el servicio correcto
  http = inject(HttpClient); // Inyectamos HttpClient para llamadas específicas

  isSubmitting = signal(false);
  isPasswordSubmitting = signal(false);

  profileForm = new FormGroup({
    name: new FormControl(''),
    surname: new FormControl(''),
    email: new FormControl({ value: '', disabled: true }),
    profession: new FormControl(''),
    description: new FormControl(''),
  });

  passwordForm = new FormGroup({
    currentPassword: new FormControl('', [Validators.required]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required]),
  }, {
    validators: passwordsMatchValidator
  });

  constructor() {
    effect(() => {
      // Leemos los datos del perfil desde AdminService
      const profileResponse = this.adminService.profile();
      if (profileResponse?.profile?.email) {
        // La respuesta contiene un objeto 'profile', lo usamos para rellenar el formulario.
        this.profileForm.patchValue(profileResponse.profile as any);
      }
    });
  }

  ngOnInit(): void {
    // Asegurarnos de que los datos se carguen cuando el componente se inicialice
    const profileData = this.adminService.profile();
    if (!profileData && this.authService.user()?.rol === 'admin') {
      this.adminService.reload();
    }
  }

  onSubmitProfile() {
    if (this.profileForm.invalid) return;

    this.isSubmitting.set(true);
    const formData = this.profileForm.getRawValue();

    this.profileService.update(formData).subscribe({
      next: () => {
        alert('¡Perfil actualizado con éxito!');
        // En lugar de actualizar la señal manualmente, le pedimos al servicio que recargue los datos.
        this.adminService.reload();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        console.error('Error al actualizar el perfil:', err);
        alert('Ocurrió un error al actualizar tu perfil.');
        this.isSubmitting.set(false);
      },
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.profileService.updateAvatar(file).subscribe({
        next: (response) => {
          this.authService.updateUser(response.user);
          alert('¡Avatar actualizado con éxito!');
        },
        error: (err) => {
          console.error('Error al subir el avatar:', err);
          alert('Ocurrió un error al subir tu avatar.');
        }
      });
    }
  }

  onSubmitPassword() {
    if (this.passwordForm.invalid) return;

    this.isPasswordSubmitting.set(true);
    const { newPassword, currentPassword } = this.passwordForm.getRawValue();
    // El backend espera 'newPassword' y 'currentPassword'
    const payload = { newPassword, currentPassword };

    // Llamamos directamente al endpoint específico para cambiar la contraseña
    this.http.put<any>(`${this.profileService.base}profile-admin/update-password`, payload).subscribe({
      next: () => {
        alert('¡Contraseña actualizada con éxito! Se cerrará la sesión por seguridad.');
        this.passwordForm.reset();
        this.isPasswordSubmitting.set(false);
        this.authService.logout();
      },
      error: (err) => {
        console.error('Error al actualizar la contraseña:', err);
        alert(err.error.message_text || 'Ocurrió un error al cambiar tu contraseña.');
        this.isPasswordSubmitting.set(false);
      },
    });
  }
}

export const passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');
  return newPassword && confirmPassword && newPassword.value !== confirmPassword.value ? { passwordsMismatch: true } : null;
};
