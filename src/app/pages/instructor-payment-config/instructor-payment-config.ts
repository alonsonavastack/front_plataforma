import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InstructorPaymentService } from '../../core/services/instructor-payment.service';

@Component({
  selector: 'app-instructor-payment-config',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instructor-payment-config.html',
})
export class InstructorPaymentConfigComponent implements OnInit {
  private instructorPaymentService = inject(InstructorPaymentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  config = this.instructorPaymentService.paymentConfig;
  isLoading = this.instructorPaymentService.isLoadingPaymentConfig;
  isSaving = signal('');
  error = signal<{ section: string; message: string } | null>(null);
  success = signal<{ section: string; message: string } | null>(null);
  showDeleteModal = signal(false);

  ngOnInit() {
    // Redirigir a dashboard si acceden directamente
    const currentUrl = this.router.url || '';
    const isDirectRoute = currentUrl.includes('/instructor-payment-config') && !currentUrl.includes('/dashboard');
    if (isDirectRoute) {
      const qp = { ...this.route.snapshot.queryParams } as any;
      qp.section = 'instructor-payment-config';
      this.router.navigate(['/dashboard'], { queryParams: qp, replaceUrl: true });
      return;
    }

    this.instructorPaymentService.reloadPaymentConfig();
  }

  // ─── Stripe ───────────────────────────────────────────────────────────────

  connectStripe() {
    this.isSaving.set('stripe');
    this.clearMessages();

    this.instructorPaymentService.startStripeOnboarding().subscribe({
      next: (res) => {
        if (res.success && res.onboarding_url) {
          window.location.href = res.onboarding_url;
        } else {
          this.error.set({ section: 'stripe', message: 'No se pudo iniciar la conexión con Stripe.' });
          this.isSaving.set('');
        }
      },
      error: (err) => {
        this.error.set({ section: 'stripe', message: err.error?.message || 'Error al conectar con Stripe.' });
        this.isSaving.set('');
      }
    });
  }

  openStripeDashboard() {
    this.instructorPaymentService.getStripeDashboardLink().subscribe({
      next: (res) => {
        if (res.success && res.dashboard_url) {
          window.open(res.dashboard_url, '_blank');
        }
      },
      error: () => {
        this.error.set({ section: 'stripe', message: 'No se pudo abrir el dashboard de Stripe.' });
      }
    });
  }

  // ─── Modal ────────────────────────────────────────────────────────────────

  cancelDelete() { this.showDeleteModal.set(false); }
  executeDelete() { this.showDeleteModal.set(false); }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private clearMessages() {
    this.error.set(null);
    this.success.set(null);
  }
}
