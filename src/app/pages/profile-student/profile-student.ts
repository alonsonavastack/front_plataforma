import { Component, inject, effect, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth';
import { ProfileService } from '../../core/services/profile';
import { HeaderComponent } from '../../layout/header/header';
import { environment } from '../../../environments/environment.development';
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
  // Usamos ProfileService para las acciones de 'update', pero no para leer el estado.
  profileService = inject(ProfileService);
  authService = inject(AuthService);
  private http = inject(HttpClient);

  // Creamos una señal local para almacenar los datos completos del perfil del estudiante.
  studentProfile = signal<any>(null);

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
      // Primero intentamos usar los datos del AuthService (más rápido)
      const currentUser = this.authService.user();
      // Luego intentamos con los datos del perfil del estudiante (más completo)
      const profileData = this.studentProfile()?.profile;

      // Priorizamos los datos más completos del endpoint de estudiante
      const dataToUse = profileData || currentUser;

      if (dataToUse?.email) {
        console.log('Rellenando formulario con:', dataToUse);
        this.profileForm.patchValue({
          name: dataToUse.name || '',
          surname: dataToUse.surname || '',
          email: dataToUse.email || '',
          profession: dataToUse.profession || '',
          description: dataToUse.description || '',
        });
      }
    });
  }

  ngOnInit(): void {
    this.loadStudentProfile();
  }

  // Método para cargar los datos específicos del estudiante
  loadStudentProfile() {
    this.http.get<any>(`${environment.url}profile-student/client`).subscribe({
      next: (data) => {
        console.log('Datos del perfil del estudiante:', data);
        console.log('Cursos inscritos:', data.enrolled_courses);
        console.log('Compras realizadas:', data.sales);
        this.studentProfile.set(data);
      },
      error: (err) => {
        console.error('Error al cargar el perfil del estudiante:', err);
        console.error('Detalles del error:', err.error);
      }
    });
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
      next: (response) => {
        // Después de actualizar, recargamos los datos para reflejar los cambios.
        // Y reseteamos el formulario con los nuevos datos para que vuelva al estado 'pristine'.
        const updatedUser = response.user || response.profile || response;
        this.profileForm.reset(updatedUser);

        this.loadStudentProfile();
        alert('¡Perfil actualizado con éxito!');
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

    this.http.post<any>(`${environment.url}profile-student/update-password`, payload).subscribe({
      next: () => {
        alert('¡Contraseña actualizada con éxito! Se cerrará la sesión por seguridad.');
        this.passwordForm.reset();
        this.isPasswordSubmitting.set(false);
        this.authService.logout(); // Cierra la sesión y redirige a /login
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
      // Usamos el método específico para avatares
      this.profileService.updateAvatar(file).subscribe({
        next: (response) => {
          // Actualizamos el usuario en el AuthService para que el cambio se refleje en toda la app
          // El tap en el servicio ya se encarga de esto, pero una doble confirmación no hace daño
          if (response.user) {
            this.authService.user.set(response.user);
          }
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

