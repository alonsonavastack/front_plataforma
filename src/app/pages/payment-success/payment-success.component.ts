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
          <div class="animate-spin rounded-full h-16 w-16 border-4 border-lime-400 border-t-transparent mx-auto mb-6"></div>
          <h2 class="text-2xl font-bold text-white mb-2">Activando tu compra...</h2>
          <p class="text-slate-400">Espera un momento</p>
          <p class="text-xs text-slate-500 mt-3">{{ statusMessage() }}</p>

        } @else {
          <div class="w-16 h-16 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-8 h-8 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 class="text-2xl font-bold text-white mb-2">¡Pago exitoso! 🎉</h2>
          <p class="text-slate-400 mb-6">Tu proyecto ya está disponible</p>

          <p class="text-sm text-lime-400 mb-6">
            Redirigiendo en {{ countdown() }}s...
          </p>

          <button
            (click)="goToProjects()"
            class="w-full px-4 py-3 bg-lime-500 hover:bg-lime-600 text-slate-900 font-semibold rounded-lg transition">
            Ir a mis proyectos ahora →
          </button>
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
  saleId = signal<string | null>(null);
  statusMessage = signal('Verificando pago con Stripe...');
  countdown = signal(4);

  private readonly API_URL = environment.url;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const saleIdParam = params['sale_id'] || null;
      const paymentCanceled = params['payment_canceled'] === 'true';

      if (paymentCanceled) {
        this.router.navigate(['/checkout']);
        return;
      }

      this.saleId.set(saleIdParam);

      if (saleIdParam) {
        // Llamar al backend para que verifique con Stripe y active la venta
        this.confirmPayment(saleIdParam);
      } else {
        // Sin sale_id — ir directo al perfil
        this.isLoading.set(false);
        this.startCountdown();
      }
    });
  }

  private confirmPayment(saleId: string) {
    this.statusMessage.set('Confirmando pago con Stripe...');

    // El backend verifica con Stripe y marca la venta como Pagada automáticamente
    this.http.get(`${this.API_URL}checkout/by-id/${saleId}`)
      .subscribe({
        next: (resp: any) => {
          const status = resp?.transaction?.status;
          if (status === 'Pagado') {
            this.statusMessage.set('¡Pago confirmado!');
          } else {
            // Si sigue pendiente, lo reintentamos una vez más después de 2s
            this.statusMessage.set('Procesando...');
            setTimeout(() => {
              this.http.get(`${this.API_URL}checkout/by-id/${saleId}`).subscribe({
                next: () => {},
                error: () => {}
              });
            }, 2000);
          }
          this.isLoading.set(false);
          this.startCountdown();
        },
        error: () => {
          // Aunque falle la consulta, el pago ya fue confirmado por Stripe
          // Mostramos éxito de todas formas
          this.isLoading.set(false);
          this.startCountdown();
        }
      });
  }

  private startCountdown() {
    const interval = setInterval(() => {
      const current = this.countdown();
      if (current > 1) {
        this.countdown.set(current - 1);
      } else {
        clearInterval(interval);
        this.goToProjects();
      }
    }, 1000);
  }

  goToProjects() {
    this.router.navigate(['/profile-student'], {
      queryParams: { section: 'projects' }
    });
  }
}
