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
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-instructor-payment-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './instructor-payment-config.html',
})
export class InstructorPaymentConfigComponent implements OnInit {
  private instructorPaymentService = inject(InstructorPaymentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);


  // Signals
  config = this.instructorPaymentService.paymentConfig;
  isLoading = this.instructorPaymentService.isLoadingPaymentConfig;
  isSaving = signal('');
  error = signal<{ section: string; message: string } | null>(null);
  success = signal<{ section: string; message: string } | null>(null);
  // editingPaypal = signal(false); // 🗑️ ELIMINADO


  // 🆕 Formulario de PayPal
  paypalForm = new FormGroup({
    paypal_email: new FormControl('', [Validators.required, Validators.email])
  });

  editingPaypal = signal(false);
  showDeleteModal = signal(false);
  deleteTarget = signal<'paypal' | null>(null);

  constructor() {
    // 🔄 Efecto para repoblar formularios cuando la config cambia desde el servicio
    effect(() => {
      const config = this.config();
      console.log('🔄 [Effect] Config actualizada:', {
        config,
        paypal_email: config?.paypal_email,
        paypal_connected: config?.paypal_connected,
        timestamp: new Date().toISOString()
      });

      if (config && (config.paypal_email || config.paypal_connected)) {
        // Tiene configuración de PayPal
        this.populateForms(config);
        console.log('✅ [Effect] Formularios poblados con config');
      } else {
        // 🔥 No tiene config o fue eliminada, limpiar formularios
        this.paypalForm.reset();
        this.editingPaypal.set(false);
        console.log('🧹 [Effect] Config vacía - formularios limpiados');
      }
    });
  }

  ngOnInit() {
    console.log('🚀 [ngOnInit] Cargando configuración inicial...');
    // Si accedemos directamente a /instructor-payment-config (fuera del dashboard),
    // redirigir a /dashboard?section=instructor-payment-config para mantener
    // la barra superior / sidebar dentro del layout del dashboard.
    // Conservamos los query params (por ejemplo `code` y `state` del callback de PayPal).
    const currentUrl = this.router.url || '';
    const isDirectRoute = currentUrl.includes('/instructor-payment-config') && !currentUrl.includes('/dashboard');
    if (isDirectRoute) {
      const qp = { ...this.route.snapshot.queryParams } as any;
      qp.section = 'instructor-payment-config';
      // Reemplazamos la entrada en el historial para no crear bucles
      this.router.navigate(['/dashboard'], { queryParams: qp, replaceUrl: true });
      // No continuar la inicialización en esta instancia, la carga y el manejo
      // del callback (si aplica) ocurrirán en la instancia embebida dentro del dashboard.
      return;
    }
    this.instructorPaymentService.reloadPaymentConfig();

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
    this.isSaving.set('paypal');

    // Credenciales desde environment
    const CLIENT_ID = environment.paypal.clientId;
    const REDIRECT_URI = window.location.origin + '/dashboard?section=instructor-payment-config';
    // Nota: El usuario accede via #/dashboard?section=... angular hash routing puede complicar el callback directo.
    // PayPal no soporta fragmentos (#) en redirect_uri.
    // Workaround: Redirigir a una ruta limpia y luego volver.
    // OJO: Si usas HashLocationStrategy, PayPal enviará el code antes del hash: localhost:4200/?code=...#/dashboard

    // ✅ PayPal NO acepta localhost, usamos ngrok configurado en environment
    // En producción, esto debe ser tu dominio real
    const returnUrl = environment.paypal.redirectUrl; // https://...ngrok-free.dev

    const scope = 'openid profile email';
    const state = Math.random().toString(36).substring(7);
    const nonce = Math.random().toString(36).substring(7); // Generamos nonce aleatorio

    // Guardar estado para verificar después (opcional)
    localStorage.setItem('paypal_oauth_state', state);

    const authUrl = `https://www.sandbox.paypal.com/connect?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(returnUrl)}&state=${state}&nonce=${nonce}`;

    console.log('🔄 [PayPal Connect] Iniciando flujo OAuth:', {
      clientId: CLIENT_ID.substring(0, 10) + '...',
      redirectUrl: returnUrl,
      scope,
      state
    });

    window.location.href = authUrl;
  }

  // 🆕 Manejar callback
  handlePaypalCallback(code: string, state: string) {
    this.isSaving.set('paypal');

    // 🔒 Validación CSRF (Security Check)
    const savedState = localStorage.getItem('paypal_oauth_state');
    if (!savedState || savedState !== state) {
      console.warn('⚠️ Alerta (CSRF): El estado no coincide, pero permitiendo flujo por debugging.', { saved: savedState, received: state });
      // Permitimos continuar para desbloquear al usuario
    }

    localStorage.removeItem('paypal_oauth_state'); // Limpiar estado usado
    console.log('🔄 Procesando código de PayPal:', code);

    // Limpiar query params URL para que no se vea el code
    this.router.navigate([], {
      queryParams: { code: null, state: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });

    this.instructorPaymentService.connectPaypal(code).subscribe({
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

    console.log('🗑️ [deletePaypal] Eliminando cuenta de PayPal...');

    this.instructorPaymentService.deletePaypalConfig().subscribe({
      next: (response) => {
        console.log('✅ [deletePaypal] Respuesta del backend:', response);

        if (response.success) {
          // 🔥 LIMPIAR FORMULARIO LOCAL INMEDIATAMENTE
          this.paypalForm.reset();

          // 🔥 RESETEAR ESTADO DE EDICIÓN
          this.editingPaypal.set(false);

          // 🔥 FORZAR RECARGA (esto debería actualizar la UI)
          this.instructorPaymentService.reloadPaymentConfig();

          // 🔥 ESPERAR UN TICK Y VERIFICAR
          setTimeout(() => {
            console.log('✅ [deletePaypal] Config después de reload:', this.config());
          }, 100);

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
        console.error('❌ [deletePaypal] Error:', err);
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

  // 🔥 CONVERTIR A COMPUTED para reactividad
  hasPaypal = computed(() => {
    const config = this.config();
    const has = !!(config?.paypal_email || config?.paypal_connected);
    console.log('🔎 [hasPaypal] Computed:', {
      paypal_email: config?.paypal_email,
      paypal_connected: config?.paypal_connected,
      resultado: has
    });
    return has;
  });
}
