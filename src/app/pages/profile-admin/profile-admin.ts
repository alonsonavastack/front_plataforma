import { Component, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { HeaderComponent } from '../../layout/header/header';
import { AuthService } from '../../core/services/auth';
import { ProfileService } from '../../core/services/profile';

@Component({
  selector: 'app-profile-admin',
  standalone: true,
  imports: [CommonModule, HeaderComponent, ReactiveFormsModule],
  templateUrl: './profile-admin.html',
})
export class ProfileAdminComponent {
  authService = inject(AuthService);
  profileService = inject(ProfileService);

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
    this.profileService.reload();

    effect(() => {
      const profileData = this.profileService.profile();
      if (profileData?.profile?.email) {
        // Sincronizamos el usuario global con los datos completos del perfil
        this.authService.currentUser.set(profileData.profile);
        this.profileForm.patchValue({
          name: profileData.profile.name,
          surname: profileData.profile.surname,
          email: profileData.profile.email,
          profession: profileData.profile.profession,
          description: profileData.profile.description,
        });
      }
    }, { allowSignalWrites: true });
  }

  onSubmitProfile() {
    if (this.profileForm.invalid) return;

    this.isSubmitting.set(true);
    const formData = this.profileForm.getRawValue();

    this.profileService.update(formData).subscribe({
      next: () => {
        this.authService.currentUser.update(user => ({
          ...user,
          ...formData,
        }));
        alert('¡Perfil actualizado con éxito!');
        this.profileService.reload();
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
          this.authService.currentUser.set(response.user);
          this.profileService.reload();
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
    const payload = { password: newPassword, old_password: currentPassword };

    this.profileService.update(payload).subscribe({
      next: () => {
        alert('¡Contraseña actualizada con éxito! Se cerrará la sesión por seguridad.');
        this.passwordForm.reset();
        this.isPasswordSubmitting.set(false);
        this.authService.logoutClient();
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
