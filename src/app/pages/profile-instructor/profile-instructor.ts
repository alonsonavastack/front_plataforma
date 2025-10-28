import { Component, inject, effect, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from "@angular/forms";
import { AuthService } from "../../core/services/auth";
import { ProfileService } from "../../core/services/profile";
import { HeaderComponent } from "../../layout/header/header";
import { CountryCodeSelectorComponent, CountryCode } from "../../shared/country-code-selector/country-code-selector";
import { environment } from "../../../environments/environment";

@Component({
  selector: "app-profile-instructor",
  standalone: true,
  imports: [CommonModule, HeaderComponent, ReactiveFormsModule, CountryCodeSelectorComponent],
  templateUrl: "./profile-instructor.html",
})
export class ProfileInstructorComponent {
  authService = inject(AuthService);
  profileService = inject(ProfileService); // Para actualizar
  http = inject(HttpClient);

  isSubmitting = signal(false);
  isPasswordSubmitting = signal(false);

  // Señal para controlar la sección activa del perfil
  activeSection = signal<'profile' | 'courses' | 'projects' | 'stats'>('profile');

  // Método para cambiar la sección activa
  setActiveSection(section: 'profile' | 'courses' | 'projects' | 'stats'): void {
    this.activeSection.set(section);
  }

  // Señal para el código de país seleccionado
  selectedCountryCode = signal('+52'); // Por defecto México

  profileForm = new FormGroup({
    name: new FormControl(""),
    surname: new FormControl(""),
    email: new FormControl({ value: "", disabled: true }),
    phone: new FormControl(""),
    profession: new FormControl(""),
    description: new FormControl(""),
  });

  // Formulario para cambiar la contraseña
  passwordForm = new FormGroup(
    {
      currentPassword: new FormControl("", [Validators.required]),
      newPassword: new FormControl("", [
        Validators.required,
        Validators.minLength(6),
      ]),
      confirmPassword: new FormControl("", [Validators.required]),
    },
    {
      validators: passwordsMatchValidator,
    }
  );

  // Señal computada para construir la URL del avatar
  avatarUrl = computed(() => {
    const user = this.authService.user();
    if (user?.avatar) {
      // Construye la URL completa usando la URL del backend y la ruta de la imagen
      return `${environment.url}users/imagen-usuario/${user.avatar}`;
    }
    // Fallback a UI Avatars si no hay imagen
    return `https://ui-avatars.com/api/?name=${
      user?.name?.charAt(0) || "I"
    }&background=a3e635&color=0f172a&size=128`;
  });

  constructor() {
    // Rellenar formulario cuando los datos lleguen
    // Ahora usamos el `user` signal directamente desde AuthService
    effect(() => {
      const profileData = this.authService.user();

      if (profileData?.email) {
        // Separar código de país del número de teléfono
        let phoneNumber = profileData.phone || '';
        let countryCode = '+52'; // Por defecto México

        if (phoneNumber && phoneNumber.startsWith('+')) {
          // Buscar el código de país más largo que coincida
          const possibleCodes = ['+52', '+1', '+34', '+54', '+57', '+51', '+56', '+58', '+593', '+502', '+53', '+591', '+504', '+595', '+503', '+505', '+506', '+507', '+598', '+55', '+33'];
          for (const code of possibleCodes) {
            if (phoneNumber.startsWith(code)) {
              countryCode = code;
              phoneNumber = phoneNumber.substring(code.length);
              break;
            }
          }
        }

        this.selectedCountryCode.set(countryCode);

        this.profileForm.patchValue({
          name: profileData.name || "",
          surname: profileData.surname || "",
          email: profileData.email || "",
          phone: phoneNumber,
          profession: profileData.profession || "",
          description: profileData.description || "",
        });
      }
    });
  }

  // Maneja la selección de país
  onCountrySelected(country: any) {
    this.selectedCountryCode.set(country.dialCode);
  }

  onSubmitProfile() {
    if (this.profileForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    const formData = this.profileForm.getRawValue();

    // Combinar código de país con número de teléfono
    const fullPhoneNumber = formData.phone ? this.selectedCountryCode() + formData.phone : '';

    const updateData = {
      ...formData,
      phone: fullPhoneNumber
    };

    // Usamos el `update` del ProfileService que ya apunta al endpoint correcto
    this.profileService.update(updateData).subscribe({
      next: (response) => {
        alert("¡Perfil actualizado con éxito!");
        this.isSubmitting.set(false);
      },
      error: (err) => {
        console.error("Error al actualizar el perfil:", err);
        alert("Ocurrió un error al actualizar tu perfil.");
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
          alert("¡Avatar actualizado con éxito!");
        },
        error: (err) => {
          console.error("Error al subir el avatar:", err);
          alert("Ocurrió un error al subir tu avatar.");
        },
      });
    }
  }

  onSubmitPassword() {
    if (this.passwordForm.invalid) {
      return;
    }

    this.isPasswordSubmitting.set(true);
    const { newPassword, currentPassword } = this.passwordForm.getRawValue();

    const payload = { newPassword, currentPassword };

    this.http
      .post<any>(
        `${environment.url}profile-instructor/update-password`,
        payload
      )
      .subscribe({
        next: () => {
          alert(
            "¡Contraseña actualizada con éxito! Se cerrará la sesión por seguridad."
          );
          this.passwordForm.reset();
          this.isPasswordSubmitting.set(false);
          this.authService.logout(); // Logout for security
        },
        error: (err) => {
          console.error("Error al actualizar la contraseña:", err);
          alert(
            err.error.message_text ||
              "Ocurrió un error al cambiar tu contraseña."
          );
          this.isPasswordSubmitting.set(false);
        },
      });
  }
}

export const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const newPassword = control.get("newPassword");
  const confirmPassword = control.get("confirmPassword");
  return newPassword &&
    confirmPassword &&
    newPassword.value !== confirmPassword.value
    ? { passwordsMismatch: true }
    : null;
};
