// pages/auth/verify-otp.ts
import { Component, OnInit, signal, computed, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './verify-otp.html'
})
export class VerifyOtpComponent implements OnInit, OnDestroy {
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

  constructor(
    private authService: AuthService,
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

  // Formatear teléfono para mostrar (ocultar dígitos del medio)
  maskedPhone = computed(() => {
    const phone = this.phone();
    if (!phone || phone.length < 10) return phone;
    
    // Formato: +52 155 XXXX 1234
    const countryCode = phone.substring(0, 2);
    const areaCode = phone.substring(2, 5);
    const lastDigits = phone.substring(phone.length - 4);
    return `+${countryCode} ${areaCode} XXXX ${lastDigits}`;
  });

  // Validación del código
  isCodeValid = computed(() => {
    const code = this.otpCode();
    return code.length === 6 && /^\d+$/.test(code);
  });

  ngOnInit(): void {
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      const userId = params['userId'];
      const phone = params['phone'];
      const error = params['error'];
      
      if (!userId) {
        console.error('❌ No se recibió userId');
        this.router.navigate(['/register']);
        return;
      }

      this.userId.set(userId);
      this.phone.set(phone || null);
      console.log('✅ Usuario ID:', userId);
      console.log('📱 Teléfono:', phone);
      
      // Detectar si hubo error al enviar OTP inicial
      if (error === 'otp_not_sent') {
        this.errorMessage.set('⚠️ No se pudo enviar el código inicial. Por favor, haz clic en "Reenviar Código".');
        this.canResend.set(true); // Permitir reenvío inmediato
        console.warn('⚠️ OTP inicial no enviado, permitiendo reenvío inmediato');
      }
    });

    // Iniciar countdown de expiración
    this.startExpirationCountdown();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private startExpirationCountdown(): void {
    this.clearTimers();
    
    this.countdownInterval = setInterval(() => {
      const current = this.countdown();
      if (current > 0) {
        this.countdown.set(current - 1);
      } else {
        this.clearTimers();
        this.errorMessage.set('El código ha expirado. Solicita uno nuevo.');
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
    let value = input.value.replace(/\D/g, ''); // Solo números
    
    // Limitar a 6 dígitos
    if (value.length > 6) {
      value = value.substring(0, 6);
    }
    
    this.otpCode.set(value);
    this.errorMessage.set(null);
  }

  verifyCode(): void {
    if (!this.isCodeValid()) {
      this.errorMessage.set('Por favor, ingresa un código de 6 dígitos');
      return;
    }

    const userId = this.userId();
    if (!userId) {
      this.errorMessage.set('Error: No se encontró el ID del usuario');
      return;
    }

    this.isVerifying.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.verifyOtp(userId, this.otpCode())
      .subscribe({
        next: (response: any) => {
          console.log('✅ Verificación exitosa:', response);
          this.successMessage.set(response.message || '¡Cuenta verificada exitosamente!');
          this.clearTimers();
          
          // Navegar automáticamente después de 2 segundos
          setTimeout(() => {
            // El AuthService ya maneja la navegación según el rol
          }, 2000);
        },
        error: (error) => {
          console.error('❌ Error en verificación:', error);
          this.isVerifying.set(false);
          
          if (error.status === 400) {
            this.errorMessage.set(error.error.message_text || 'Código incorrecto');
            
            // Actualizar intentos restantes
            if (error.error.attemptsRemaining !== undefined) {
              this.attemptsRemaining.set(error.error.attemptsRemaining);
              
              if (error.error.attemptsRemaining === 0) {
                this.errorMessage.set('Has excedido el número de intentos. Solicita un nuevo código.');
              }
            }
          } else if (error.status === 403) {
            this.errorMessage.set('Has excedido el número de intentos. Solicita un nuevo código.');
            this.attemptsRemaining.set(0);
          } else if (error.status === 410) {
            this.errorMessage.set('El código ha expirado. Solicita uno nuevo.');
            this.clearTimers();
          } else {
            this.errorMessage.set(error.error?.message_text || 'Ocurrió un error. Inténtalo de nuevo.');
          }
          
          // Limpiar el código si es incorrecto
          this.otpCode.set('');
        },
        complete: () => {
          this.isVerifying.set(false);
        }
      });
  }

  resendCode(): void {
    if (!this.canResend() && this.resendCountdown() > 0) {
      this.errorMessage.set(`Debes esperar ${this.resendCountdown()} segundos antes de reenviar`);
      return;
    }

    const userId = this.userId();
    if (!userId) {
      this.errorMessage.set('Error: No se encontró el ID del usuario');
      return;
    }

    this.isResending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.resendOtp(userId)
      .subscribe({
        next: (response: any) => {
          console.log('✅ Código reenviado:', response);
          this.successMessage.set(response.message || 'Código reenviado exitosamente');
          
          // Reiniciar los contadores
          this.countdown.set(600); // 10 minutos
          this.startExpirationCountdown();
          this.startResendCountdown();
          
          // Resetear intentos
          this.attemptsRemaining.set(3);
          this.otpCode.set('');
        },
        error: (error) => {
          console.error('❌ Error reenviando código:', error);
          
          if (error.status === 429) {
            if (error.error.waitSeconds) {
              this.errorMessage.set(error.error.message_text);
              this.resendCountdown.set(error.error.waitSeconds);
              this.startResendCountdown();
            } else {
              this.errorMessage.set(error.error.message_text || 'Has alcanzado el límite de reenvíos');
            }
          } else {
            this.errorMessage.set(error.error?.message_text || 'Error al reenviar el código');
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
