import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { InstructorPaymentService } from '../../core/services/instructor-payment.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-stripe-onboarding-callback',
  standalone: true,
  template: `
    <div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-6"></div>
        <h2 class="text-xl font-bold text-white mb-2">Completando configuración...</h2>
        <p class="text-slate-400 text-sm">Por favor espera un momento mientras validamos tu cuenta de Stripe.</p>
      </div>
    </div>
  `
})
export class StripeOnboardingCallbackComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private paymentService = inject(InstructorPaymentService);

  private pollSubscription?: Subscription;
  private maxRetries = 10; // 20 segundos máximo (10 intentos * 2s)
  private currentRetries = 0;

  ngOnInit() {
    // Primera comprobación inmediata
    this.checkStripeStatus();

    // Empezar a hacer polling cada 2 segundos hasta que Stripe actualice el status
    this.pollSubscription = interval(2000).subscribe(() => {
      this.currentRetries++;
      if (this.currentRetries >= this.maxRetries) {
        this.finishAndRedirect();
      } else {
        this.checkStripeStatus();
      }
    });
  }

  private checkStripeStatus() {
    this.paymentService.getStripeStatus().subscribe({
      next: (res) => {
        // Si Stripe ya procesó la cuenta y están permitidos los cargos, completamos
        if (res.success && res.charges_enabled) {
          this.finishAndRedirect();
        }
      },
      error: () => {
        // Ignorar errores en polling
      }
    });
  }

  private finishAndRedirect() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = undefined;
    }

    // Redirigir de regreso al Dashboard
    this.router.navigate(['/dashboard'], {
      queryParams: { section: 'instructor-payment-config', check_stripe: 'true' },
      replaceUrl: true
    });
  }

  ngOnDestroy() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }
}
