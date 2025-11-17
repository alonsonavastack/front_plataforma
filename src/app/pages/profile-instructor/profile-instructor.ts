import { Component, inject, effect, signal, computed, OnInit, ChangeDetectorRef } from "@angular/core";
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
export class ProfileInstructorComponent implements OnInit {
  authService = inject(AuthService);
  profileService = inject(ProfileService); // Para actualizar
  http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef); // 🔥 Para forzar detección de cambios

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
    // ✅ REDES SOCIALES (OPCIONALES)
    facebook: new FormControl(""),
    instagram: new FormControl(""),
    youtube: new FormControl(""),
    tiktok: new FormControl(""),
    twitch: new FormControl(""),
    website: new FormControl(""),
    discord: new FormControl(""),
    linkedin: new FormControl(""),
    twitter: new FormControl(""),
    github: new FormControl(""),
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
    // 🔥 Rellenar formulario cuando los datos lleguen o cambien
    effect(() => {
      const profileData = this.authService.user();


      if (profileData?.email) {
        // Separar código de país del número de teléfono
        let phoneNumber = profileData.phone || '';
        let countryCode = '+52'; // Por defecto México

        if (phoneNumber && phoneNumber.startsWith('+')) {
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
          // ✅ REDES SOCIALES (desde campos directos en la respuesta, NO desde socialMedia)
          facebook: profileData.facebook || "",
          instagram: profileData.instagram || "",
          youtube: profileData.youtube || "",
          tiktok: profileData.tiktok || "",
          twitch: profileData.twitch || "",
          website: profileData.website || "",
          discord: profileData.discord || "",
          linkedin: profileData.linkedin || "",
          twitter: profileData.twitter || "",
          github: profileData.github || "",
        });

      }
    });
  }

  ngOnInit(): void {
    // 🔥 CARGAR DATOS DEL USUARIO AL FORMULARIO
    this.loadUserDataToForm();
  }

  // 🔥 Método para cargar datos al formulario
  private loadUserDataToForm(): void {
    const profileData = this.authService.user();


    if (profileData?.email) {
      // Separar código de país del número de teléfono
      let phoneNumber = profileData.phone || '';
      let countryCode = '+52'; // Por defecto México

      if (phoneNumber && phoneNumber.startsWith('+')) {
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
        facebook: profileData.facebook || "",
        instagram: profileData.instagram || "",
        youtube: profileData.youtube || "",
        tiktok: profileData.tiktok || "",
        twitch: profileData.twitch || "",
        website: profileData.website || "",
        discord: profileData.discord || "",
        linkedin: profileData.linkedin || "",
        twitter: profileData.twitter || "",
        github: profileData.github || "",
      });

      // Forzar detección de cambios
      this.cdr.detectChanges();

    }
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
      phone: fullPhoneNumber,
      // 🔥 Enviar campos planos (el backend los mapeará correctamente)
      facebook: formData.facebook || "",
      instagram: formData.instagram || "",
      youtube: formData.youtube || "",
      tiktok: formData.tiktok || "",
      twitch: formData.twitch || "",
      website: formData.website || "",
      discord: formData.discord || "",
      linkedin: formData.linkedin || "",
      twitter: formData.twitter || "",
      github: formData.github || "",
    };

    // 🔥 Eliminar socialMedia anidado
    delete (updateData as any).socialMedia;


    // Usamos el `update` del ProfileService que ya apunta al endpoint correcto
    this.profileService.update(updateData).subscribe({
      next: (response) => {

        // 🔥 FORZAR actualización del formulario con los datos de la respuesta
        const updatedUser = response.user;
        if (updatedUser) {
          // Extraer número de teléfono
          let phoneNumber = updatedUser.phone || '';
          let countryCode = '+52';

          if (phoneNumber && phoneNumber.startsWith('+')) {
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

          // Actualizar formulario directamente
          this.profileForm.patchValue({
            name: updatedUser.name || "",
            surname: updatedUser.surname || "",
            email: updatedUser.email || "",
            phone: phoneNumber,
            profession: updatedUser.profession || "",
            description: updatedUser.description || "",
            facebook: updatedUser.facebook || "",
            instagram: updatedUser.instagram || "",
            youtube: updatedUser.youtube || "",
            tiktok: updatedUser.tiktok || "",
            twitch: updatedUser.twitch || "",
            website: updatedUser.website || "",
            discord: updatedUser.discord || "",
            linkedin: updatedUser.linkedin || "",
            twitter: updatedUser.twitter || "",
            github: updatedUser.github || "",
          });

          // 🔥 Marcar como pristine para que el botón se deshabilite
          this.profileForm.markAsPristine();

          // 🔥 Recargar datos al formulario
          setTimeout(() => {
            this.loadUserDataToForm();
          }, 100);

        }

        alert("¡Perfil actualizado con éxito!");
        this.isSubmitting.set(false);
      },
      error: (err) => {
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
