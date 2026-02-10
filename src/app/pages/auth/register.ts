// src/app/pages/auth/register.ts
import { Component, inject, signal } from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { HeaderComponent } from '../../layout/header/header';
import { CountryCodeSelectorComponent } from '../../shared/country-code-selector/country-code-selector';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    HeaderComponent,
    CountryCodeSelectorComponent
  ],
  templateUrl: './register.html',
})
export class RegisterComponent {
  authService = inject(AuthService);
  router = inject(Router);

  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  // Señal para el código de país seleccionado
  selectedCountryCode = signal('+52');

  // Maneja la selección del código de país
  onCountrySelected(country: any) {
    this.selectedCountryCode.set(country.dialCode);
  }

  registerForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    surname: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required]),
    rol: new FormControl('cliente', [Validators.required]), // Default: cliente (estudiante)
    profession: new FormControl(''),
    phone: new FormControl('', [Validators.required, Validators.minLength(10)]), // REQUERIDO para OTP
  });

  onSubmit() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.registerForm.invalid) {
      this.errorMessage.set('Por favor completa todos los campos requeridos');
      return;
    }

    const { password, confirmPassword, phone } = this.registerForm.value;

    if (password !== confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden');
      return;
    }

    // Combinar código de país con número de teléfono
    const fullPhoneNumber = phone ? this.selectedCountryCode() + phone : '';

    // Validar formato de teléfono (debe ser E.164 sin '+')
    if (!phone || phone.length < 10) {
      this.errorMessage.set('El teléfono debe tener al menos 10 dígitos (formato: 52155XXXXXXX)');
      return;
    }

    this.isLoading.set(true);

    const userData = {
      name: this.registerForm.value.name!,
      surname: this.registerForm.value.surname!,
      email: this.registerForm.value.email!,
      password: this.registerForm.value.password!,
      rol: this.registerForm.value.rol!,
      profession: this.registerForm.value.profession || '',
      phone: fullPhoneNumber, // Requerido para OTP
    };

    this.authService.register(userData).subscribe({
      next: (response: any) => {
        this.isLoading.set(false);

        // Verificar si el OTP fue enviado
        if (response.otpSent) {
          this.successMessage.set('¡Registro exitoso! Redirigiendo a verificación...');

          // Redirigir a la página de verificación OTP
          setTimeout(() => {
            this.router.navigate(['/verify-otp'], {
              queryParams: {
                userId: response.user._id,
                phone: phone
              }
            });
          }, 1500);
        } else {
          // Si hubo error al enviar OTP pero el usuario se creó
          // IMPORTANTE: Redirigir a verificación de todas formas
          // El usuario podrá solicitar reenvío desde allí
          this.successMessage.set('Usuario creado. Redirigiendo a verificación...');

          setTimeout(() => {
            this.router.navigate(['/verify-otp'], {
              queryParams: {
                userId: response.user._id,
                phone: phone,
                error: 'otp_not_sent' // Flag para mostrar mensaje
              }
            });
          }, 1500);
        }
      },
      error: (err) => {
        this.isLoading.set(false);

        // Manejar errores de duplicados (409)
        if (err.status === 409) {
          // 🔥 SMART ERROR HANDLING: Usuario existe pero no verificado
          if (err.error?.requiresVerification) {
            this.errorMessage.set(null); // Limpiar error genérico
            // Mostrar mensaje CON enlace de acción
            // Usamos un signal o propiedad especial para esto, o manipulamos el HTML
            // Para mantenerlo simple, usaremos el successMessage con un formato especial o un nuevo signal

            // Opción rápida: Usar successMessage para mostrar la alerta amarilla/verde con acción
            this.successMessage.set('warning:Este correo ya está registrado pero no ha sido verificado.');

            // Redirigir automáticamente o mostrar botón?
            // Mejor mostrar botón en el HTML (requiere update HTML)
            // Por ahora, redirigimos automáticamente tras 2s con toast informativo? 
            // El usuario pidió "opción de volver a insertar número" o similar.

            // Vamos a redirigir a la nueva pantalla de recuperación o verify directamente
            setTimeout(() => {
              this.router.navigate(['/verify-otp'], {
                queryParams: {
                  userId: err.error.userId,
                  phone: this.registerForm.value.phone, // Intentamos pasar el teléfono si lo tenemos
                  error: 'unverified_exists'
                }
              });
            }, 2000);
            return;
          }

          const msg = err.error?.message_text || 'El usuario ya existe.';

          // Mensaje más amigable si es mayúsculas
          let friendlyMsg = msg;
          if (msg.includes('USUARIO INGRESADO YA EXISTE')) {
            friendlyMsg = 'Ya existe una cuenta registrada con este correo electrónico.';
          } else if (msg.includes('TELÉFONO YA ESTÁ REGISTRADO')) {
            friendlyMsg = 'Este número de teléfono ya está registrado en otra cuenta.';
          }

          this.errorMessage.set(friendlyMsg);
        } else {
          this.errorMessage.set(
            err.error?.message_text ||
            err.error?.message ||
            'Error al registrarse. Por favor intenta nuevamente.'
          );
        }
      }
    });
  }
}
