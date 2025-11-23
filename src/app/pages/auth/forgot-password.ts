// pages/auth/forgot-password.ts
import { Component, OnInit, signal, computed, effect, OnDestroy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { HeaderComponent } from '../../layout/header/header';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, HeaderComponent],
  templateUrl: './forgot-password.html'
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  // Signals
  email = signal('');
  otpCode = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  currentStep = signal<'email' | 'otp' | 'password'>('email');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  countdown = signal(600); // 10 minutos en segundos
  resendCountdown = signal(0);
  canResend = signal(false);
  attemptsRemaining = signal(3);

  // Timers
  private countdownInterval: any;
  private resendInterval: any;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  // Computed
  timeRemaining = computed(() => {
    const seconds = this.countdown();
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  resendTimeRemaining = computed(() => {
    const seconds = this.resendCountdown();
    return `${seconds}s`;
  });

  // Validación del código
  isCodeValid = computed(() => {
    const code = this.otpCode();
    return code.length === 6 && /^\d+$/.test(code);
  });

  // Validación de contraseñas
  isPasswordValid = computed(() => {
    const password = this.newPassword();
    const confirm = this.confirmPassword();
    return password.length >= 6 && password === confirm;
  });

  ngOnInit(): void {
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      const step = params['step'];
      const email = params['email'];

      if (step === 'otp' && email) {
        this.currentStep.set('otp');
        this.email.set(email);
        this.startExpirationCountdown();
      } else if (step === 'password' && email) {
        this.currentStep.set('password');
        this.email.set(email);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  // Step 1: Solicitar recuperación
  requestRecovery() {
    const email = this.email().trim();

    if (!email) {
      this.errorMessage.set('Por favor ingresa tu email');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http.post(`${environment.url}users/request-password-recovery`, { email })
      .subscribe({
        next: (response: any) => {
          this.isLoading.set(false);
          this.successMessage.set('Código enviado. Revisa tu Telegram.');

          // Redirigir al paso de verificación OTP
          setTimeout(() => {
            this.router.navigate(['/forgot-password'], {
              queryParams: { step: 'otp', email: email }
            });
          }, 1500);
        },
        error: (err) => {
          this.isLoading.set(false);

          this.errorMessage.set(
            err.error?.message_text ||
            err.error?.message ||
            'Error al solicitar recuperación. Verifica tu email.'
          );
        }
      });
  }

  // Step 2: Verificar código OTP
  verifyRecoveryCode() {
    const email = this.email();
    const code = this.otpCode();

    if (!this.isCodeValid()) {
      this.errorMessage.set('Por favor ingresa un código válido de 6 dígitos');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http.post(`${environment.url}users/verify-recovery-otp`, { email, code })
      .subscribe({
        next: (response: any) => {
          this.isLoading.set(false);
          this.successMessage.set('Código verificado correctamente.');

          // Guardar token de recuperación temporalmente
          localStorage.setItem('recoveryToken', response.recoveryToken);

          // Redirigir al paso de cambio de contraseña
          setTimeout(() => {
            this.router.navigate(['/forgot-password'], {
              queryParams: { step: 'password', email: email }
            });
          }, 1500);
        },
        error: (err) => {
          this.isLoading.set(false);

          if (err.error?.attemptsRemaining !== undefined) {
            this.attemptsRemaining.set(err.error.attemptsRemaining);
          }

          this.errorMessage.set(
            err.error?.message_text ||
            err.error?.message ||
            'Código incorrecto. Inténtalo de nuevo.'
          );
        }
      });
  }

  // Step 3: Cambiar contraseña
  resetPassword() {
    const newPassword = this.newPassword();
    const confirmPassword = this.confirmPassword();
    const recoveryToken = localStorage.getItem('recoveryToken');

    if (!this.isPasswordValid()) {
      this.errorMessage.set('Las contraseñas deben coincidir y tener al menos 6 caracteres');
      return;
    }

    if (!recoveryToken) {
      this.errorMessage.set('Token de recuperación no encontrado. Solicita un nuevo código.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http.post(`${environment.url}users/reset-password`, {
      recoveryToken,
      newPassword
    })
      .subscribe({
        next: (response: any) => {
          this.isLoading.set(false);
          this.successMessage.set('Contraseña restablecida exitosamente. Redirigiendo al login...');

          // Limpiar token de recuperación
          localStorage.removeItem('recoveryToken');

          // Redirigir al login
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            err.error?.message_text ||
            err.error?.message ||
            'Error al restablecer la contraseña. Inténtalo de nuevo.'
          );
        }
      });
  }

  // Reenviar código OTP
  resendRecoveryCode() {
    const email = this.email();

    if (!email) {
      this.errorMessage.set('Email no encontrado');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.http.post(`${environment.url}users/resend-recovery-otp`, { email })
      .subscribe({
        next: (response: any) => {
          this.isLoading.set(false);
          this.successMessage.set('Código reenviado. Revisa tu Telegram.');

          // Reiniciar contadores
          this.countdown.set(600);
          this.resendCountdown.set(60);
          this.canResend.set(false);
          this.startExpirationCountdown();
          this.startResendCountdown();
        },
        error: (err) => {
          this.isLoading.set(false);

          if (err.error?.waitSeconds) {
            this.resendCountdown.set(err.error.waitSeconds);
            this.startResendCountdown();
          }

          this.errorMessage.set(
            err.error?.message_text ||
            err.error?.message ||
            'Error al reenviar código. Inténtalo de nuevo.'
          );
        }
      });
  }

  // Input handlers
  onOtpInput(event: any) {
    const value = event.target.value.replace(/\D/g, '').slice(0, 6);
    this.otpCode.set(value);
    event.target.value = value;
  }

  // Navegación
  goToLogin() {
    this.router.navigate(['/login']);
  }

  goBackToEmail() {
    this.currentStep.set('email');
    this.router.navigate(['/forgot-password']);
  }

  goBackToOtp() {
    this.currentStep.set('otp');
    this.router.navigate(['/forgot-password'], {
      queryParams: { step: 'otp', email: this.email() }
    });
  }

  // Timers
  private startExpirationCountdown() {
    this.clearTimers();
    this.countdownInterval = setInterval(() => {
      const current = this.countdown();
      if (current > 0) {
        this.countdown.set(current - 1);
      } else {
        this.clearTimers();
        this.errorMessage.set('El código ha expirado. Solicita uno nuevo.');
        this.canResend.set(true);
      }
    }, 1000);
  }

  private startResendCountdown() {
    this.resendInterval = setInterval(() => {
      const current = this.resendCountdown();
      if (current > 0) {
        this.resendCountdown.set(current - 1);
      } else {
        this.canResend.set(true);
        clearInterval(this.resendInterval);
      }
    }, 1000);
  }

  private clearTimers() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
      this.resendInterval = null;
    }
  }
}
