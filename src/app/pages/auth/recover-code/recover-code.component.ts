import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
// import { AuthService } from '../../../core/services/auth'; // No se usa directamente
import { HeaderComponent } from '../../../layout/header/header'; // Ruta corregida
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment'; // Ruta corregida
import { catchError, tap } from 'rxjs';

@Component({
    selector: 'app-recover-code',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, HeaderComponent],
    template: `
    <app-header></app-header>
    <div class="min-h-screen bg-slate-950 py-8 sm:py-12 px-4">
      <div class="w-full max-w-md mx-auto">
        <div class="bg-slate-800/50 backdrop-blur-lg border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
          
          <div class="text-center mb-8">
            <div class="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 14.5V12m0 0V8.832c0-1.12 1.688-1.54 2.513-.67l2.422 2.525c.78.813.78 2.126 0 2.938L14.513 16.17c-.825.86-2.513.45-2.513-.67v-1z" />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-white mb-2">Recuperar Código</h1>
            <p class="text-slate-400 text-sm">
              Ingresa tu correo electrónico para enviarte un nuevo código de verificación.
            </p>
          </div>

          @if (errorMessage()) {
            <div class="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg animate-fade-in">
              <p class="text-red-400 text-sm flex items-center gap-2">
                <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                <span>{{ errorMessage() }}</span>
              </p>
            </div>
          }

          <div class="space-y-4">
            <div>
              <label for="email" class="block mb-2 text-sm font-medium text-slate-300">
                Correo Electrónico
              </label>
              <input 
                type="email" 
                [formControl]="emailControl"
                class="w-full bg-slate-900/70 border border-slate-700 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-3 transition-colors"
                [class.border-red-500]="emailControl.invalid && emailControl.touched"
                placeholder="tu@correo.com" 
              />
              @if (emailControl.invalid && emailControl.touched) {
                <p class="text-red-400 text-xs mt-1">Ingresa un correo válido</p>
              }
            </div>

            <button 
              (click)="onSubmit()"
              [disabled]="emailControl.invalid || isLoading()"
              class="w-full py-3 px-4 rounded-lg font-medium transition-all
                     bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20
                     focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-800
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex justify-center items-center gap-2"
            >
              @if (isLoading()) {
                <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Enviando...</span>
              } @else {
                <span>Enviarme Código</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              }
            </button>
          </div>

          <div class="mt-6 text-center space-y-2">
            <a routerLink="/login" class="block text-sm text-slate-400 hover:text-white transition-colors">
              ¿Ya tienes cuenta verificada? <span class="text-cyan-400">Inicia sesión</span>
            </a>
            <a routerLink="/register" class="block text-sm text-slate-400 hover:text-white transition-colors">
              ¿No tienes cuenta? <span class="text-lime-400">Regístrate</span>
            </a>
          </div>

        </div>
      </div>
    </div>
  `
})
export class RecoverCodeComponent {
    private http = inject(HttpClient);
    private router = inject(Router);

    emailControl = new FormControl('', [Validators.required, Validators.email]);
    isLoading = signal(false);
    errorMessage = signal<string | null>(null);

    onSubmit() {
        if (this.emailControl.invalid) return;

        this.isLoading.set(true);
        this.errorMessage.set(null);

        const email = this.emailControl.value;

        this.http.post<any>(`${environment.url}users/resend-otp-by-email`, { email })
            .subscribe({
                next: (response) => {
                    this.isLoading.set(false);
                    // Redirigir a verify-otp con el userId devuelto
                    this.router.navigate(['/verify-otp'], {
                        queryParams: {
                            userId: response.userId,
                            // No pasamos el teléfono porque lo sacará el componente si quiere, 
                            // o simplemente mostrará enmascarado lo que tenga
                        }
                    });
                },
                error: (err) => {
                    this.isLoading.set(false);

                    if (err.status === 404) {
                        this.errorMessage.set('No encontramos ninguna cuenta con este correo.');
                    } else if (err.status === 400 && err.error?.isVerified) {
                        this.errorMessage.set('Esta cuenta ya está verificada. Por favor inicia sesión.');
                        setTimeout(() => this.router.navigate(['/login']), 2000);
                    } else if (err.status === 429) {
                        this.errorMessage.set(err.error?.message_text || 'Demasiados intentos. Espera un momento.');
                    } else {
                        this.errorMessage.set('Ocurrió un error. Intenta nuevamente más tarde.');
                    }
                }
            });
    }
}
