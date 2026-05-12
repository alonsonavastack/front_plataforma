import { Component, inject, signal, AfterViewInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { HeaderComponent } from '../../layout/header/header';
import { LoggerService } from '../../core/services/logger.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    HeaderComponent
  ],
  templateUrl: './login.html',
})
export class LoginComponent implements AfterViewInit {
  authService = inject(AuthService);
  router = inject(Router);
  private logger = inject(LoggerService);
  private toast = inject(ToastService);

  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
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

    const google = (window as any).google;
    const buttonOptions = {
      theme: 'outline',
      size: 'large',
      width: 250,
      type: 'standard',
      ux_mode: 'popup'
    };

    if (!google.accounts.id._initializedByApp) {
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: this.handleGoogleCredentialResponse.bind(this)
      });
      google.accounts.id._initializedByApp = true;
    }

    const googleBtnContainer = document.getElementById('google-btn-container');
    if (googleBtnContainer) {
      google.accounts.id.renderButton(googleBtnContainer, buttonOptions);
    }
  }

  handleGoogleCredentialResponse(response: any) {
    if (response.credential) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      this.authService.googleLogin(response.credential).subscribe({
        next: () => {
          // El toast "¡Bienvenido!" lo maneja AuthService (googleLogin tap)
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);

          if (err.status === 404) {
            const msg = err.error?.message_text || 'No existe una cuenta asociada a este perfil de Google.';
            this.errorMessage.set(msg);
            this.toast.error('Cuenta no encontrada', msg);
          } else if (err.status === 403) {
            const msg = err.error?.message_text || 'Google no permite este origen. Verifica tu configuración de OAuth.';
            this.errorMessage.set(msg);
            this.toast.error('Error con Google', msg);
          } else if (err.status === 0) {
            this.errorMessage.set('No se pudo conectar con el servidor');
            this.toast.networkError();
          } else {
            const msg = 'Error al autenticar con Google. Comunícate a soporte.';
            this.errorMessage.set(msg);
            this.toast.error('Error con Google', msg);
          }
        }
      });
    }
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.toast.validationError('Por favor completa todos los campos correctamente');
      return;
    }

    const { email, password } = this.loginForm.value;
    this.isLoading.set(true);

    this.authService.login(email!, password!).subscribe({
      next: () => {
        // El toast "¡Bienvenido!" lo maneja AuthService (login tap)
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);

        // Verificar si el usuario necesita verificación OTP
        if (err.status === 403 && err.error.requiresVerification) {
          const msg = err.error.message_text || 'Debes verificar tu cuenta antes de iniciar sesión';
          this.toast.info('Verificación requerida', msg);
          this.errorMessage.set(msg);

          setTimeout(() => {
            this.router.navigate(['/verify-otp'], {
              queryParams: { userId: err.error.userId }
            });
          }, 2000);

        } else if (err.status === 404) {
          const msg = err.error?.message_text || 'No existe una cuenta con este correo';
          this.errorMessage.set(msg);
          this.toast.error('Cuenta no encontrada', msg);

        } else if (err.status === 401) {
          const msg = err.error?.message_text || 'La contraseña es incorrecta';
          this.errorMessage.set(msg);
          this.toast.warning('Contraseña incorrecta', msg);

        } else if (err.status === 0) {
          this.toast.networkError();
          this.errorMessage.set('No se pudo conectar con el servidor');

        } else if (err.status >= 500) {
          this.toast.serverError();
          this.errorMessage.set('Error del servidor. Intenta nuevamente más tarde');

        } else {
          const errorMsg = err.error?.message_text || err.error?.message || 'Ocurrió un error al iniciar sesión';
          this.toast.error('Error al iniciar sesión', errorMsg);
          this.errorMessage.set(errorMsg);
        }
      }
    });
  }
}
