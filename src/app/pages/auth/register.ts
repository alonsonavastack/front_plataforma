// src/app/pages/auth/register.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../core/services/auth';
import { HeaderComponent } from '../../layout/header/header';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    HeaderComponent,
  ],
  templateUrl: './register.html',
})
export class RegisterComponent {
  authService = inject(AuthService);
  router = inject(Router);

  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  registerForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    surname: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required]),
    rol: new FormControl('cliente', [Validators.required]), // Default: cliente (estudiante)
    profession: new FormControl(''),
    phone: new FormControl(''),
  });

  onSubmit() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.registerForm.invalid) {
      this.errorMessage.set('Por favor completa todos los campos requeridos');
      return;
    }

    const { password, confirmPassword } = this.registerForm.value;
    
    if (password !== confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden');
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
      phone: this.registerForm.value.phone || '',
    };

    this.authService.register(userData).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set('¡Registro exitoso! Redirigiendo al inicio de sesión...');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.message_text || 
          err.error?.message || 
          'Error al registrarse. Por favor intenta nuevamente.'
        );
      }
    });
  }
}
