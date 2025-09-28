import { Component, inject, effect, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { ProfileService } from '../../core/services/profile';
import { HeaderComponent } from '../../layout/header/header';


@Component({
  selector: 'app-profile-instructor',
  standalone: true,
  imports: [CommonModule, HeaderComponent, ReactiveFormsModule],
  templateUrl: './profile-instructor.html',
})
export class ProfileInstructorComponent implements OnInit {
  authService = inject(AuthService);
  profileService = inject(ProfileService); // Para actualizar

  isSubmitting = signal(false);
  isPasswordSubmitting = signal(false);

  profileForm = new FormGroup({
    name: new FormControl(''),
    surname: new FormControl(''),
    email: new FormControl({ value: '', disabled: true }),
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
    // Rellenar formulario cuando los datos lleguen
    effect(() => {
      const profileData = this.profileService.profile();
      console.log('Respuesta del perfil del instructor:', profileData);
      // Usamos una propiedad real para confirmar que los datos han llegado
      if (profileData?.profile?.email) {
        // Sincronizamos el usuario global con los datos completos del perfil
        this.authService.currentUser.set(profileData.profile);
        this.profileForm.patchValue(profileData.profile);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.profileService.reload();
  }

  onSubmitProfile() {
    if (this.profileForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    const formData = this.profileForm.getRawValue();

    // Usamos el `update` del ProfileService que ya apunta al endpoint correcto
    this.profileService.update(formData).subscribe({
      next: () => {
        // Actualizamos los datos en el AuthService para que se reflejen en toda la app
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

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.profileService.updateAvatar(file).subscribe({
        next: (response) => {
          // Actualizamos el usuario en el AuthService para que el cambio se refleje en toda la app
          // La respuesta contiene el objeto de usuario actualizado
          this.authService.currentUser.set(response.user);
          this.profileService.reload(); // Recargamos los datos del perfil para que la vista se actualice
          alert('¡Avatar actualizado con éxito!');
        },
        error: (err) => {
          console.error('Error al subir el avatar:', err);
          alert('Ocurrió un error al subir tu avatar.');
        }
      });
    }
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
}

// Validador personalizado para confirmar que las contraseñas coinciden
export const passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');

  return newPassword && confirmPassword && newPassword.value !== confirmPassword.value ? { passwordsMismatch: true } : null;
};
