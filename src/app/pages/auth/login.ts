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

  // Señal para manejar mensajes de error
  errorMessage = signal<string | null>(null);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    const { email, password } = this.loginForm.value;

    this.authService.login(email!, password!).subscribe({
      // El 'next' ahora está vacío porque el servicio se encarga de la redirección.
      error: (err) => {
        // Si la petición unificada falla, muestra el mensaje de error.
        this.errorMessage.set(err.error.message_text || 'Correo o contraseña incorrectos.');
      }
    });
  }
}
