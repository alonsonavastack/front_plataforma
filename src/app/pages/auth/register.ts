// src/app/pages/auth/register.ts
import { Component, inject, signal, AfterViewInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

import { Router, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { HeaderComponent } from '../../layout/header/header';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    HeaderComponent
  ],
  templateUrl: './register.html',
})
export class RegisterComponent implements AfterViewInit {
  authService = inject(AuthService);
  router = inject(Router);
  private toast = inject(ToastService);

  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  registerForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    surname: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required])
  });

  platformId = inject(PLATFORM_ID);

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadGoogleScript();
    }
  }

  loadGoogleScript() {
    if (document.getElementById('google-jssdk')) {
      this.renderGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-jssdk';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.renderGoogleButton();
    };
    document.head.appendChild(script);
  }

  renderGoogleButton() {
    if (typeof window === 'undefined' || !(window as any).google) return;

    (window as any).google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: this.handleGoogleCredentialResponse.bind(this)
    });

    const googleBtnContainer = document.getElementById('google-btn-container');
    if (googleBtnContainer) {
      (window as any).google.accounts.id.renderButton(
        googleBtnContainer,
        { theme: 'outline', size: 'large', width: '100%', type: 'standard' }
      );
    }
  }

  handleGoogleCredentialResponse(response: any) {
    if (response.credential) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      this.authService.googleLogin(response.credential, 'cliente').subscribe({
        next: () => {
          // El toast de éxito lo maneja AuthService (googleLogin tap)
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err.error?.message_text || 'Error al registrarse con Google. Intenta nuevamente.';
          this.errorMessage.set(msg);
          this.toast.error('Error con Google', msg);
        }
      });
    }
  }

  onSubmit() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.registerForm.invalid) {
      const msg = 'Por favor completa todos los campos requeridos';
      this.errorMessage.set(msg);
      this.toast.validationError(msg);
      return;
    }

    const { password, confirmPassword } = this.registerForm.value;

    if (password !== confirmPassword) {
      const msg = 'Las contraseñas no coinciden';
      this.errorMessage.set(msg);
      this.toast.validationError(msg);
      return;
    }

    this.isLoading.set(true);

    const userData = {
      name: this.registerForm.value.name!,
      surname: this.registerForm.value.surname!,
      email: this.registerForm.value.email!,
      password: this.registerForm.value.password!,
      rol: 'cliente'
    };

    this.authService.register(userData).subscribe({
      next: () => {
        // El toast de éxito "¡Registro exitoso!" lo maneja AuthService (register tap)
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);

        if (err.status === 409) {
          const msg = err.error?.message_text?.includes('USUARIO INGRESADO YA EXISTE')
            ? 'Ya existe una cuenta registrada con este correo electrónico.'
            : (err.error?.message_text || 'El usuario ya existe.');
          this.errorMessage.set(msg);
          this.toast.warning('Cuenta existente', msg);

        } else if (err.status === 0) {
          const msg = 'No se pudo conectar con el servidor. Verifica tu conexión.';
          this.errorMessage.set(msg);
          this.toast.networkError();

        } else if (err.status >= 500) {
          const msg = 'Error del servidor. Por favor intenta nuevamente.';
          this.errorMessage.set(msg);
          this.toast.serverError();

        } else {
          const msg = err.error?.message_text || err.error?.message || 'Error al registrarse. Por favor intenta nuevamente.';
          this.errorMessage.set(msg);
          this.toast.error('Error al registrarse', msg);
        }
      }
    });
  }
}
