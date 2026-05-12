import { Component, OnInit, signal, computed, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { HeaderComponent } from '../../layout/header/header';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, HeaderComponent],
  templateUrl: './forgot-password.html'
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  private toast = inject(ToastService);

  email = signal('');
  otpCode = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  currentStep = signal<'email' | 'otp' | 'password'>('email');
  isLoading = signal(false);
  countdown = signal(600);
  resendCountdown = signal(0);
  canResend = signal(false);
  attemptsRemaining = signal(3);

  private countdownInterval: any;
  private resendInterval: any;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  timeRemaining = computed(() => {
    const seconds = this.countdown();
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  resendTimeRemaining = computed(() => `${this.resendCountdown()}s`);

  isCodeValid = computed(() => {
    const code = this.otpCode();
    return code.length === 6 && /^\d+$/.test(code);
  });

  isPasswordValid = computed(() => {
    const password = this.newPassword();
    const confirm = this.confirmPassword();
    return password.length >= 6 && password === confirm;
  });

  ngOnInit(): void {
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

  requestRecovery() {
    const email = this.email().trim();

    if (!email) {
      this.toast.warning('Campo requerido', 'Por favor ingresa tu email');
      return;
    }

    this.isLoading.set(true);

    this.http.post(`${environment.url}users/request-password-recovery`, { email })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.toast.success('Código enviado', 'Revisa tu correo electrónico');
          setTimeout(() => {
            this.router.navigate(['/forgot-password'], {
              queryParams: { step: 'otp', email }
            });
          }, 1500);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err.error?.message_text || err.error?.message || 'Error al solicitar recuperación. Verifica tu email.';
          if (err.status === 0) {
            this.toast.networkError();
          } else if (err.status >= 500) {
            this.toast.serverError();
          } else {
            this.toast.error('Error', msg);
          }
        }
      });
  }

  verifyRecoveryCode() {
    if (!this.isCodeValid()) {
      this.toast.warning('Código inválido', 'Por favor ingresa un código válido de 6 dígitos');
      return;
    }

    this.isLoading.set(true);

    this.http.post(`${environment.url}users/verify-recovery-otp`, { email: this.email(), code: this.otpCode() })
      .subscribe({
        next: (response: any) => {
          this.isLoading.set(false);
          this.toast.success('Código verificado', 'Ahora puedes cambiar tu contraseña');
          localStorage.setItem('recoveryToken', response.recoveryToken);
          setTimeout(() => {
            this.router.navigate(['/forgot-password'], {
              queryParams: { step: 'password', email: this.email() }
            });
          }, 1500);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.error?.attemptsRemaining !== undefined) {
            this.attemptsRemaining.set(err.error.attemptsRemaining);
          }
          const msg = err.error?.message_text || err.error?.message || 'Inténtalo de nuevo.';
          if (err.status === 0) {
            this.toast.networkError();
          } else if (err.status >= 500) {
            this.toast.serverError();
          } else {
            this.toast.error('Código incorrecto', msg);
          }
        }
      });
  }

  resetPassword() {
    if (!this.isPasswordValid()) {
      this.toast.warning('Contraseñas inválidas', 'Deben coincidir y tener al menos 6 caracteres');
      return;
    }

    const recoveryToken = localStorage.getItem('recoveryToken');
    if (!recoveryToken) {
      this.toast.error('Token no encontrado', 'Solicita un nuevo código de recuperación.');
      return;
    }

    this.isLoading.set(true);

    this.http.post(`${environment.url}users/reset-password`, { recoveryToken, newPassword: this.newPassword() })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          localStorage.removeItem('recoveryToken');
          this.toast.success('Contraseña restablecida', 'Redirigiendo al login...');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg = err.error?.message_text || err.error?.message || 'Error al restablecer la contraseña.';
          if (err.status === 0) {
            this.toast.networkError();
          } else if (err.status >= 500) {
            this.toast.serverError();
          } else {
            this.toast.error('Error', msg);
          }
        }
      });
  }

  resendRecoveryCode() {
    if (!this.email()) {
      this.toast.error('Error', 'Email no encontrado');
      return;
    }

    this.isLoading.set(true);

    this.http.post(`${environment.url}users/resend-recovery-otp`, { email: this.email() })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.toast.success('Código reenviado', 'Revisa tu correo electrónico');
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
          const msg = err.error?.message_text || err.error?.message || 'Error al reenviar código. Inténtalo de nuevo.';
          if (err.status === 0) {
            this.toast.networkError();
          } else if (err.status === 429) {
            this.toast.warning('Límite alcanzado', msg);
          } else if (err.status >= 500) {
            this.toast.serverError();
          } else {
            this.toast.error('Error', msg);
          }
        }
      });
  }

  onOtpInput(event: any) {
    const value = event.target.value.replace(/\D/g, '').slice(0, 6);
    this.otpCode.set(value);
    event.target.value = value;
  }

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

  private startExpirationCountdown() {
    this.clearTimers();
    this.countdownInterval = setInterval(() => {
      const current = this.countdown();
      if (current > 0) {
        this.countdown.set(current - 1);
      } else {
        this.clearTimers();
        this.toast.warning('Código expirado', 'Solicita un nuevo código de recuperación');
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
