import { Component, OnInit, signal, computed, effect, OnDestroy, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { WebsocketService } from '../../core/services/websocket.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './verify-otp.html'
})
export class VerifyOtpComponent implements OnInit, OnDestroy {
  private toast = inject(ToastService);

  // Signals
  otpCode = signal('');
  userId = signal<string | null>(null);
  phone = signal<string | null>(null);
  isVerifying = signal(false);
  isResending = signal(false);
  canResend = signal(false);
  countdown = signal(600); // 10 minutos en segundos
  resendCountdown = signal(0);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  attemptsRemaining = signal(3);

  // Timers
  private countdownInterval: any;
  private resendInterval: any;

  // Subscriptions
  private socketSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private websocketService: WebsocketService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

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

  maskedPhone = computed(() => {
    const phone = this.phone();
    if (!phone || phone.length < 10) return phone;
    const countryCode = phone.substring(0, 2);
    const areaCode = phone.substring(2, 5);
    const lastDigits = phone.substring(phone.length - 4);
    return `+${countryCode} ${areaCode} XXXX ${lastDigits}`;
  });

  isCodeValid = computed(() => {
    const code = this.otpCode();
    return code.length === 6 && /^\d+$/.test(code);
  });

  telegramLink = computed(() => {
    const botUser = environment.telegramBot;
    const uid = this.userId();
    if (!botUser || !uid) return null;
    return `https://t.me/${botUser}?start=${uid}`;
  });

  openTelegram() {
    const link = this.telegramLink();
    if (link) {
      window.open(link, '_blank');
      this.showInput.set(true);
    }
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const userId = params['userId'];
      const phone = params['phone'];
      const error = params['error'];

      if (!userId) {
        this.router.navigate(['/register']);
        return;
      }

      this.userId.set(userId);
      this.phone.set(phone || null);

      if (error === 'otp_not_sent') {
        const msg = '⚠️ Paso 1: Vincula tu cuenta con Telegram para recibir el código.';
        this.errorMessage.set(msg);
        this.canResend.set(true);
      }

      // 🔌 CONECTAR SOCKET PARA RECIBIR OTP AUTOMÁTICAMENTE
      this.websocketService.connect(userId, 'registering');

      this.socketSubscription = this.websocketService.newOtpCode$.subscribe(
        (data) => {
          if (data && data.code) {
            this.otpCode.set(data.code);
            this.successMessage.set('✨ Código recibido automáticamente');
            this.showInput.set(true);

            setTimeout(() => {
              if (this.isCodeValid()) {
                this.verifyCode();
              }
            }, 1000);
          }
        }
      );
    });

    this.startExpirationCountdown();
  }

  showInput = signal(false);

  openTelegramInput() {
    this.showInput.set(true);
    if (this.countdown() === 0) {
      this.resendCode();
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
  }

  private startExpirationCountdown(): void {
    this.clearTimers();

    this.countdownInterval = setInterval(() => {
      const current = this.countdown();
      if (current > 0) {
        this.countdown.set(current - 1);
      } else {
        this.clearTimers();
        const msg = 'El código ha expirado. Solicita uno nuevo.';
        this.errorMessage.set(msg);
        this.toast.warning('Código expirado', msg);
      }
    }, 1000);
  }

  private startResendCountdown(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }

    this.canResend.set(false);
    this.resendCountdown.set(60);

    this.resendInterval = setInterval(() => {
      const current = this.resendCountdown();
      if (current > 1) {
        this.resendCountdown.set(current - 1);
      } else {
        clearInterval(this.resendInterval);
        this.resendCountdown.set(0);
        this.canResend.set(true);
      }
    }, 1000);
  }

  private clearTimers(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
  }

  onOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 6) value = value.substring(0, 6);
    this.otpCode.set(value);
    this.errorMessage.set(null);
  }

  verifyCode(): void {
    if (!this.isCodeValid()) {
      const msg = 'Por favor, ingresa un código de 6 dígitos';
      this.errorMessage.set(msg);
      this.toast.validationError(msg);
      return;
    }

    const userId = this.userId();
    if (!userId) {
      const msg = 'Error: No se encontró el ID del usuario';
      this.errorMessage.set(msg);
      this.toast.error('Error', msg);
      return;
    }

    this.isVerifying.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.verifyOtp(userId, this.otpCode())
      .subscribe({
        next: (response: any) => {
          // El toast "¡Cuenta verificada!" lo maneja AuthService (verifyOtp tap)
          this.successMessage.set(response.message || '¡Cuenta verificada exitosamente!');
          this.clearTimers();
        },
        error: (error) => {
          this.isVerifying.set(false);

          if (error.status === 400) {
            const msg = error.error.message_text || 'Código incorrecto';
            this.errorMessage.set(msg);

            if (error.error.attemptsRemaining !== undefined) {
              this.attemptsRemaining.set(error.error.attemptsRemaining);
              if (error.error.attemptsRemaining === 0) {
                const expMsg = 'Has excedido el número de intentos. Solicita un nuevo código.';
                this.errorMessage.set(expMsg);
                this.toast.error('Sin intentos restantes', expMsg);
              } else {
                this.toast.warning('Código incorrecto', `${msg}. Te quedan ${error.error.attemptsRemaining} intento(s).`);
              }
            } else {
              this.toast.warning('Código incorrecto', msg);
            }

          } else if (error.status === 403) {
            const msg = 'Has excedido el número de intentos. Solicita un nuevo código.';
            this.errorMessage.set(msg);
            this.attemptsRemaining.set(0);
            this.toast.error('Sin intentos restantes', msg);

          } else if (error.status === 410) {
            const msg = 'El código ha expirado. Solicita uno nuevo.';
            this.errorMessage.set(msg);
            this.clearTimers();
            this.toast.warning('Código expirado', msg);

          } else {
            const msg = error.error?.message_text || 'Ocurrió un error. Inténtalo de nuevo.';
            this.errorMessage.set(msg);
            this.toast.error('Error al verificar', msg);
          }

          this.otpCode.set('');
        },
        complete: () => {
          this.isVerifying.set(false);
        }
      });
  }

  resendCode(): void {
    if (!this.canResend() && this.resendCountdown() > 0) {
      const msg = `Debes esperar ${this.resendCountdown()} segundos antes de reenviar`;
      this.errorMessage.set(msg);
      this.toast.info('Espera un momento', msg);
      return;
    }

    const userId = this.userId();
    if (!userId) {
      const msg = 'Error: No se encontró el ID del usuario';
      this.errorMessage.set(msg);
      this.toast.error('Error', msg);
      return;
    }

    this.isResending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.resendOtp(userId)
      .subscribe({
        next: (response: any) => {
          // El toast "Código enviado" lo maneja AuthService (resendOtp tap)
          this.successMessage.set(response.message || 'Código reenviado exitosamente');
          this.countdown.set(600);
          this.startExpirationCountdown();
          this.startResendCountdown();
          this.attemptsRemaining.set(3);
          this.otpCode.set('');
          this.showInput.set(true);
        },
        error: (error) => {
          if (error.status === 429) {
            const msg = error.error.message_text || 'Has alcanzado el límite de reenvíos';
            this.errorMessage.set(msg);
            this.toast.warning('Límite alcanzado', msg);
            if (error.error.waitSeconds) {
              this.resendCountdown.set(error.error.waitSeconds);
              this.startResendCountdown();
            }
          } else {
            const msg = error.error?.message_text || 'Error al reenviar el código';
            this.errorMessage.set(msg);
            this.toast.error('Error al reenviar', msg);
          }
        },
        complete: () => {
          this.isResending.set(false);
        }
      });
  }

  goToRegister(): void {
    this.clearTimers();
    this.router.navigate(['/register']);
  }
}
