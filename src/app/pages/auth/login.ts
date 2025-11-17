import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { catchError, throwError } from 'rxjs';
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
    HeaderComponent,
  ],
  templateUrl: './login.html',
})
export class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);
  private logger = inject(LoggerService);
  private toast = inject(ToastService);

  // Señal para manejar mensajes de error
  errorMessage = signal<string | null>(null);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  onSubmit() {
    if (this.loginForm.invalid) {
      // 🔇 Logs silenciados - solo toasts para usuario
      this.toast.validationError('Por favor completa todos los campos correctamente');
      return;
    }

    const { email, password } = this.loginForm.value;
    
    // 🔇 Logs silenciados - solo toasts para usuario

    this.authService.login(email!, password!).subscribe({
      // El 'next' ahora está vacío porque el servicio se encarga de la redirección.
      // El servicio AuthService ya muestra el toast de éxito "¡Bienvenido!"
      error: (err) => {
        // 🔇 Logs silenciados - solo toasts para usuario
        
        // Verificar si el usuario necesita verificación OTP
        if (err.status === 403 && err.error.requiresVerification) {
          // 🔇 Logs silenciados - solo toasts para usuario
          
          // ✅ Toast informativo para verificación
          this.toast.info(
            'Verificación requerida',
            err.error.message_text || 'Debes verificar tu cuenta antes de iniciar sesión'
          );
          
          this.errorMessage.set(err.error.message_text || 'Debes verificar tu cuenta');
          
          // Redirigir a la página de verificación OTP
          setTimeout(() => {
            this.router.navigate(['/verify-otp'], {
              queryParams: {
                userId: err.error.userId
              }
            });
          }, 2000);
        } 
        // Error de credenciales (401)
        else if (err.status === 401) {
          // 🔇 Logs silenciados - solo toasts para usuario
          
          // ✅ Toast de error para credenciales incorrectas
          this.toast.error(
            'Credenciales incorrectas',
            'El correo o la contraseña no son correctos'
          );
          
          this.errorMessage.set('Correo o contraseña incorrectos');
        }
        // Error de conexión (status 0)
        else if (err.status === 0) {
          // 🔇 Logs silenciados - solo toasts para usuario
          
          // ✅ Toast de error de red
          this.toast.networkError();
          
          this.errorMessage.set('No se pudo conectar con el servidor');
        }
        // Error del servidor (5xx)
        else if (err.status >= 500) {
          // 🔇 Logs silenciados - solo toasts para usuario
          
          // ✅ Toast de error del servidor
          this.toast.serverError();
          
          this.errorMessage.set('Error del servidor. Intenta nuevamente más tarde');
        }
        // Otros errores
        else {
          // 🔇 Logs silenciados - solo toasts para usuario
          
          // ✅ Toast genérico
          const errorMsg = err.error?.message_text || err.error?.message || 'Ocurrió un error al iniciar sesión';
          this.toast.error('Error al iniciar sesión', errorMsg);
          
          this.errorMessage.set(errorMsg);
        }
      }
    });
  }
}
