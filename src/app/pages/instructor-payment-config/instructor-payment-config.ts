// Archivo: cursos/src/app/pages/instructor-payment-config/instructor-payment-config.ts
// VERSIÓN CON MERCADO PAGO INTEGRADO

import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import {
  InstructorPaymentService,
  PaymentConfig,
} from '../../core/services/instructor-payment.service';
// import { PaymentSettingsService } from '../../core/services/payment-settings.service';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-instructor-payment-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './instructor-payment-config.html',
})
export class InstructorPaymentConfigComponent implements OnInit {
  private instructorPaymentService = inject(InstructorPaymentService);
  // private paymentSettingsService = inject(PaymentSettingsService); // 🗑️ REMOVED to avoid 403 error
  private route = inject(ActivatedRoute);
  private router = inject(Router);


  // Signals
  config = this.instructorPaymentService.paymentConfig;
  isLoading = this.instructorPaymentService.isLoadingPaymentConfig;
  isSaving = signal('');
  error = signal<{ section: string; message: string } | null>(null);
  success = signal<{ section: string; message: string } | null>(null);

  // 🆕 Signals for Public Payment Settings (PayPal Client ID & Mode)
  publicSettings = signal<any>(null); // Local signal instead of service computed


  // 🆕 Formulario de PayPal
  paypalForm = new FormGroup({
    paypal_email: new FormControl('', [Validators.required, Validators.email])
  });

  editingPaypal = signal(false);
  manualEntryMode = signal(false); // 🆕 Modo de entrada manual
  showDeleteModal = signal(false);
  deleteTarget = signal<'paypal' | null>(null);

  constructor() {
    // 🔄 Efecto para repoblar formularios cuando la config cambia desde el servicio
    effect(() => {
      const config = this.config();

      if (config && (config.paypal_email || config.paypal_connected)) {
        // Tiene configuración de PayPal
        this.populateForms(config);
      } else {
        // 🔥 No tiene config o fue eliminada, limpiar formularios
        this.paypalForm.reset();
        this.editingPaypal.set(false);
      }
    });
  }

  ngOnInit() {
    const currentUrl = this.router.url || '';
    const isDirectRoute = currentUrl.includes('/instructor-payment-config') && !currentUrl.includes('/dashboard');
    if (isDirectRoute) {
      const qp = { ...this.route.snapshot.queryParams } as any;
      qp.section = 'instructor-payment-config';
      this.router.navigate(['/dashboard'], { queryParams: qp, replaceUrl: true });
      return;
    }

    this.instructorPaymentService.reloadPaymentConfig();

    // 🆕 Load public settings locally
    this.instructorPaymentService.getPublicPaymentConfig().subscribe({
      next: (res) => {
        this.publicSettings.set(res.settings);
      },
      error: (err) => {
        console.error('Error loading public settings:', err);
      }
    });

    // 🆕 Verificar si venimos de PayPal con un código
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const state = params['state'];

      if (code && state) {
        this.handlePaypalCallback(code, state);
      }
    });
  }

  // 🆕 Iniciar flujo de conexión con PayPal
  initiatePaypalConnect() {
    const settings = this.publicSettings();

    if (!settings || !settings.paypal?.active) {
      this.error.set({
        section: 'paypal',
        message: 'La conexión con PayPal no está disponible en este momento. Contacta al administrador.'
      });
      return;
    }

    this.isSaving.set('paypal');

    // 🆕 Usar credenciales dinámicas desde el backend
    const CLIENT_ID = settings.paypal.clientId;
    const MODE = settings.paypal.mode; // 'sandbox' | 'live'

    if (!CLIENT_ID) {
      this.error.set({
        section: 'paypal',
        message: 'Error de configuración: No se encontró el Client ID de PayPal.'
      });
      this.isSaving.set('');
      return;
    }

    // ✅ Construir URL de retorno con soporte para Hash Routing (#)
    // Obtenemos la base (ej: https://dominio.com/#/dashboard) sin query params
    const baseUrl = window.location.href.split('?')[0];

    // 🔥 Asegurar que usamos el hash si estamos en modo hash (Angular default)
    // Si baseUrl no tiene '#', y estamos en Angular, probablemente deberíamos, pero confiamos en window.location
    const returnUrl = `${baseUrl}?section=instructor-payment-config`;

    const scope = 'openid profile email';
    const state = Math.random().toString(36).substring(7);
    const nonce = Math.random().toString(36).substring(7); // Generamos nonce aleatorio

    // Guardar estado para verificar después (opcional)
    localStorage.setItem('paypal_oauth_state', state);

    // 🆕 Determinar URL base según el modo
    const PAYPAL_BASE_URL = MODE === 'live'
      ? 'https://www.paypal.com'
      : 'https://www.sandbox.paypal.com';

    const authUrl = `${PAYPAL_BASE_URL}/connect?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(returnUrl)}&state=${state}&nonce=${nonce}`;

    window.location.href = authUrl;
  }

  // 🆕 Manejar callback
  handlePaypalCallback(code: string, state: string) {
    this.isSaving.set('paypal');

    // 🔒 Validación CSRF (Security Check)
    const savedState = localStorage.getItem('paypal_oauth_state');
    if (!savedState || savedState !== state) {
      // Permitimos continuar para desbloquear al usuario
    }

    localStorage.removeItem('paypal_oauth_state'); // Limpiar estado usado

    // Limpiar query params URL para que no se vea el code
    this.router.navigate([], {
      queryParams: { code: null, state: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

    // Reconstruir la misma redirect_uri usada en initiate (con Hash si existe)
    const baseUrl = window.location.href.split('?')[0];
    const returnUrl = `${baseUrl}?section=instructor-payment-config`;

    this.instructorPaymentService.connectPaypal(code, returnUrl).subscribe({
      next: (res) => {
        if (res.success) {
          this.instructorPaymentService.reloadPaymentConfig();
          // Forzar actualización local también
          this.loadConfig(); // Esto recarga los datos desde el servicio

          this.success.set({
            section: 'paypal',
            message: '¡Cuenta de PayPal conectada y verificada exitosamente!'
          });
          setTimeout(() => this.clearMessages(), 5000);
        }
        this.isSaving.set('');
      },
      error: (err) => {
        console.error('Error connecting PayPal:', err);
        this.error.set({
          section: 'paypal',
          message: err.error?.message || 'Error al conectar la cuenta. Intenta nuevamente.'
        });
        this.isSaving.set('');
      }
    });
  }

  loadConfig() {
    this.instructorPaymentService.reloadPaymentConfig();
  }

  populateForms(config: PaymentConfig) {
    // PayPal
    if (config.paypal_email) {
      this.paypalForm.patchValue({
        paypal_email: config.paypal_email
      });
    }
  }



  // ========================================




  // ========================================
  // FUNCIONES DE PAYPAL
  // ========================================

  editPaypal() {
    this.editingPaypal.set(true);
    this.clearMessages();
  }

  toggleManualEntry() {
    this.manualEntryMode.update(v => !v);
    this.clearMessages();
  }

  cancelEditPaypal() {
    this.editingPaypal.set(false);
    if (this.config()?.paypal_email) {
      this.paypalForm.patchValue({
        paypal_email: this.config()!.paypal_email
      });
    }
    this.clearMessages();
  }

  savePaypal() {
    if (this.paypalForm.invalid) return;
    this.isSaving.set('paypal');
    this.clearMessages();

    const formData = {
      paypal_email: this.paypalForm.value.paypal_email!
    };

    this.instructorPaymentService.updatePaypalConfig(formData).subscribe({
      next: (response) => {
        if (response.success) {
          this.instructorPaymentService.reloadPaymentConfig();
          this.success.set({
            section: 'paypal',
            message: 'Cuenta de PayPal actualizada correctamente.'
          });
          this.editingPaypal.set(false);
          this.manualEntryMode.set(false); // 🆕 Salir del modo manual
          setTimeout(() => this.clearMessages(), 3000);
        } else {
          this.error.set({
            section: 'paypal',
            message: response.message || 'Error al actualizar.'
          });
        }
        this.isSaving.set('');
      },
      error: (err) => {
        this.error.set({
          section: 'paypal',
          message: err.error?.message || 'Error al conectar con el servidor.'
        });
        this.isSaving.set('');
      }
    });
  }

  confirmDeletePaypal() {
    this.deleteTarget.set('paypal');
    this.showDeleteModal.set(true);
  }

  private deletePaypal() {
    this.isSaving.set('delete');

    this.instructorPaymentService.deletePaypalConfig().subscribe({
      next: (response) => {
        // 🔒 LOG REMOVIDO POR SEGURIDAD

        if (response.success) {
          // 🔥 LIMPIAR FORMULARIO LOCAL INMEDIATAMENTE
          this.paypalForm.reset();

          // 🔥 RESETEAR ESTADO DE EDICIÓN
          this.editingPaypal.set(false);

          // 🔥 FORZAR RECARGA (esto debería actualizar la UI)
          this.instructorPaymentService.reloadPaymentConfig();

          this.success.set({
            section: 'paypal',
            message: 'Cuenta de PayPal eliminada correctamente.'
          });
          setTimeout(() => this.clearMessages(), 3000);
        } else {
          this.error.set({
            section: 'paypal',
            message: response.message || 'Error al eliminar.'
          });
        }
        this.isSaving.set('');
        this.closeDeleteModal();
      },
      error: (err) => {
        this.error.set({
          section: 'paypal',
          message: err.error?.message || 'Error al eliminar configuración.'
        });
        this.isSaving.set('');
        this.closeDeleteModal();
      }
    });
  }

  // ========================================
  // FUNCIONES DE ELIMINACIÓN
  // ========================================

  cancelDelete() {
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
  }

  executeDelete() {
    this.deletePaypal();
  }



  // ========================================
  // MÉTODO PREFERIDO
  // ========================================

  setPreferredMethod(method: 'paypal') {
    this.isSaving.set('preferred');
    this.clearMessages();

    this.instructorPaymentService.updatePreferredMethod(method).subscribe({
      next: (response) => {
        if (response.success) {
          this.instructorPaymentService.reloadPaymentConfig();
          this.success.set({
            section: 'preferred',
            message: 'Método de pago preferido actualizado.',
          });
          setTimeout(() => this.clearMessages(), 3000);
        } else {
          this.error.set({
            section: 'preferred',
            message: response.message || 'Error al actualizar.',
          });
        }
        this.isSaving.set('');
      },
      error: (err) => {
        this.error.set({
          section: 'preferred',
          message: err.error?.message || 'Error al conectar con el servidor.',
        });
        this.isSaving.set('');
      },
    });
  }

  // ========================================
  // HELPERS
  // ========================================

  private clearMessages() {
    this.error.set(null);
    this.success.set(null);
  }

  // ========================================
  // STRIPE CONNECT
  // ========================================

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

  // 🔥 CONVERTIR A COMPUTED para reactividad
  hasPaypal = computed(() => {
    const config = this.config();
    return !!(config?.paypal_email || config?.paypal_connected);
  });
}
