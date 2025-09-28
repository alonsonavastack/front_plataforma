import { Component, inject, effect, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { ProfileService } from '../../core/services/profile';
import { HeaderComponent } from '../../layout/header/header';
import { environment } from '../../../environments/environment';
import { RouterLink } from '@angular/router';

type ProfileSection = 'courses' | 'purchases' | 'edit';

// Validador personalizado para confirmar que las contraseñas coinciden
export const passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  return control.get('newPassword')?.value === control.get('confirmPassword')?.value ? null : { passwordsMismatch: true };
};

@Component({
  standalone: true,
  selector: 'app-profile-student',
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent, RouterLink],
  templateUrl: './profile-student.html',
})
export class ProfileStudentComponent implements OnInit {
  profileService = inject(ProfileService);
  authService = inject(AuthService);

  // Señal para manejar la pestaña activa
  activeSection = signal<ProfileSection>('courses');

  // Señal para el estado de envío del formulario
  isSubmitting = signal(false);

  // Señal para el estado de envío del formulario de contraseña
  isPasswordSubmitting = signal(false);

  // Formulario para editar el perfil
  profileForm = new FormGroup({
    name: new FormControl(''),
    surname: new FormControl(''),
    email: new FormControl({ value: '', disabled: true }), // El email no se puede cambiar
    profession: new FormControl(''),
    description: new FormControl(''),
  });

  // Formulario para cambiar la contraseña
  passwordForm = new FormGroup({
    currentPassword: new FormControl('', [Validators.required]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required]),
  }, {
    validators: passwordsMatchValidator
  });

  constructor() {
    // Usamos un effect para reaccionar cuando los datos del perfil se cargan.
    // Esto llenará el formulario automáticamente.
    effect(() => {
      const profileData = this.profileService.profile();
      console.log('Datos del perfil del estudiante:', profileData);
      if (profileData?.profile?.email) { // Usamos una propiedad real para confirmar que los datos han llegado
        // Sincronizamos el usuario global con los datos completos del perfil
        this.authService.currentUser.set(profileData.profile);
        this.profileForm.patchValue(profileData.profile);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // Cargar los datos del perfil al iniciar el componente
    this.profileService.reload();
  }

  // Cambia la sección activa
  setActiveSection(section: ProfileSection) {
    this.activeSection.set(section);
  }

  // Envía los datos del formulario para actualizar el perfil
  onSubmitProfile() {
    if (this.profileForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    const formData = this.profileForm.getRawValue();

    this.profileService.update(formData).subscribe({
      next: () => {
        // Actualizar los datos del usuario en el AuthService para que se reflejen en toda la app
        this.authService.currentUser.update(user => ({
          ...user,
          name: formData.name,
          surname: formData.surname,
          profession: formData.profession,
          description: formData.description,
        }));
        alert('¡Perfil actualizado con éxito!');
        this.profileService.reload(); // Recargamos los datos del perfil
        this.isSubmitting.set(false);
      },
      error: (err) => {
        console.error('Error al actualizar el perfil:', err);
        alert('Ocurrió un error al actualizar tu perfil.');
        this.isSubmitting.set(false);
      },
    });
  }

  // Envía los datos del formulario para cambiar la contraseña
  onSubmitPassword() {
    if (this.passwordForm.invalid) {
      return;
    }

    this.isPasswordSubmitting.set(true);
    const { newPassword, currentPassword } = this.passwordForm.getRawValue();

    // El backend espera 'password' para la nueva contraseña y 'old_password' para la actual.
    const payload = { password: newPassword, old_password: currentPassword };

    this.profileService.update(payload).subscribe({
      next: () => {
        alert('¡Contraseña actualizada con éxito! Se cerrará la sesión por seguridad.');
        this.passwordForm.reset();
        this.isPasswordSubmitting.set(false);
        this.authService.logoutClient(); // Cierra la sesión y redirige a /login
      },
      error: (err) => {
        console.error('Error al actualizar la contraseña:', err);
        alert(err.error.message_text || 'Ocurrió un error al cambiar tu contraseña.');
        this.isPasswordSubmitting.set(false);
      },
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const formData = new FormData();
      formData.append('avatar', file);
      this.profileService.update(formData).subscribe({
        next: (response) => {
          // Actualizamos el usuario en el AuthService para que el cambio se refleje en toda la app
          this.authService.currentUser.set(response.user);
          this.profileService.reload(); // Forzamos la recarga de los datos del perfil
          alert('¡Avatar actualizado con éxito!');
        },
        error: (err) => {
          console.error('Error al subir el avatar:', err);
          alert('Ocurrió un error al subir tu avatar.');
        }
      });
    }
  }

  buildImageUrl(imageName?: string): string {
    if (!imageName) return 'https://i.pravatar.cc/300?u=placeholder';
    return `${environment.images.course}${imageName}`;
  }
}
