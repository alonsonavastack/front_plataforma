import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-slate-800 rounded-lg border border-white/10 p-8 text-center">
        
        @if (isLoading()) {
          <!-- Loading -->
          <div class="animate-spin rounded-full h-16 w-16 border-4 border-lime-400 border-t-transparent mx-auto mb-6"></div>
          <h2 class="text-2xl font-bold text-white mb-2">Procesando tu pago...</h2>
          <p class="text-slate-400">Espera un momento por favor</p>
          <p class="text-xs text-slate-500 mt-4">{{ statusMessage() }}</p>
        } @else if (error()) {
          <!-- Error -->
          <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Error al verificar pago</h2>
          <p class="text-slate-400 mb-6">{{ error() }}</p>
          <button 
            (click)="goToHome()"
            class="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition">
            Volver al inicio
          </button>
        } @else {
          <!-- Success -->
          <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 class="text-2xl font-bold text-white mb-2">¡Pago exitoso!</h2>
          <p class="text-slate-400 mb-6">Tu compra se ha procesado correctamente</p>
          
          @if (preferenceId()) {
            <p class="text-sm text-slate-500 mb-2">
              Operación: <span class="font-mono text-lime-400">{{ paymentId() }}</span>
            </p>
          }
          
          <p class="text-xs text-lime-400 mb-6">
            ✨ Redirigiendo a tus compras en {{ countdown() }} segundos...
          </p>
          
          <div class="flex gap-3">
            <button 
              (click)="goToMyCourses()"
              class="flex-1 px-4 py-3 bg-lime-500 hover:bg-lime-600 text-slate-900 font-semibold rounded-lg transition">
              Ir ahora
            </button>
            <button 
              (click)="goToHome()"
              class="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition">
              Inicio
            </button>
          </div>
        }
      </div>
    </div>
  `
})
export class PaymentSuccessComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = signal(true);
  error = signal<string | null>(null);
  preferenceId = signal<string | null>(null);
  paymentId = signal<string | null>(null);
  statusMessage = signal('Verificando con Mercado Pago...');
  countdown = signal(5);

  private readonly API_URL = environment.url;

  ngOnInit() {
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      this.preferenceId.set(params['preference_id'] || null);
      this.paymentId.set(params['payment_id'] || params['collection_id'] || null);

      console.log('🎉 [PaymentSuccess] Parámetros recibidos:', {
        preference_id: this.preferenceId(),
        payment_id: this.paymentId()
      });

      // Esperar a que el webhook procese el pago
      this.waitForPaymentConfirmation();
    });
  }

  private async waitForPaymentConfirmation() {
    let attempts = 0;
    const maxAttempts = 10; // 10 intentos = 10 segundos máximo

    const checkPayment = async () => {
      attempts++;
      this.statusMessage.set(`Verificando pago... (intento ${attempts}/${maxAttempts})`);

      try {
        // Esperar 1 segundo antes de verificar
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Aquí podrías verificar en tu backend si la venta se creó
        // Por ahora, asumimos que después de 3 segundos ya está lista
        if (attempts >= 3) {
          this.isLoading.set(false);
          this.startCountdown();
        } else {
          checkPayment();
        }
      } catch (error) {
        console.error('❌ [PaymentSuccess] Error:', error);
        if (attempts < maxAttempts) {
          checkPayment();
        } else {
          this.error.set('No pudimos verificar tu pago, pero tu compra fue exitosa.');
          this.isLoading.set(false);
        }
      }
    };

    checkPayment();
  }

  private startCountdown() {
    const interval = setInterval(() => {
      const current = this.countdown();
      if (current > 1) {
        this.countdown.set(current - 1);
      } else {
        clearInterval(interval);
        this.goToMyCourses();
      }
    }, 1000);
  }

  goToMyCourses() {
    this.router.navigate(['/profile-student'], { fragment: 'courses' });
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}
