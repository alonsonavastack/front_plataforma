import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-payment-failure',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-slate-800 rounded-lg border border-red-500/20 p-8 text-center">
        
        <!-- Error Icon -->
        <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h2 class="text-2xl font-bold text-white mb-2">Pago rechazado</h2>
        <p class="text-slate-400 mb-6">No pudimos procesar tu pago. Por favor, intenta nuevamente.</p>
        
        @if (saleId()) {
          <p class="text-sm text-slate-500 mb-6">
            Referencia: <span class="font-mono text-red-400">{{ saleId() }}</span>
          </p>
        }
        
        <div class="flex gap-3">
          <button 
            (click)="goToCheckout()"
            class="flex-1 px-4 py-3 bg-lime-500 hover:bg-lime-600 text-slate-900 font-semibold rounded-lg transition">
            Reintentar
          </button>
          <button 
            (click)="goToHome()"
            class="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition">
            Volver
          </button>
        </div>
      </div>
    </div>
  `
})
export class PaymentFailureComponent implements OnInit {
    saleId = signal<string | null>(null);

    constructor(
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            this.saleId.set(params['sale_id'] || null);
        });
    }

    goToCheckout() {
        this.router.navigate(['/checkout']);
    }

    goToHome() {
        this.router.navigate(['/']);
    }
}
