// Archivo: cursos/src/app/pages/instructor-payment-config/instructor-payment-config.ts
// VERSIÓN CON MERCADO PAGO INTEGRADO

import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { PaymentSettingsService } from '../../core/services/payment-settings.service'; // 🆕

@Component({
  selector: 'app-instructor-payment-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './instructor-payment-config.html',
})
export class InstructorPaymentConfigComponent implements OnInit {
  private instructorPaymentService = inject(InstructorPaymentService);
  private paymentSettingsService = inject(PaymentSettingsService); // 🆕

  // Signals
  config = this.instructorPaymentService.paymentConfig;
  isLoading = this.instructorPaymentService.isLoadingPaymentConfig;
  isSaving = signal('');
  error = signal<{ section: string; message: string } | null>(null);
  success = signal<{ section: string; message: string } | null>(null);
  // editingPaypal = signal(false); // 🗑️ ELIMINADO
  editingBank = signal(false);
  editingMercadoPago = signal(false);
  showDeleteModal = signal(false);
  deleteTarget = signal<'bank' | 'mercadopago' | 'paypal' | null>(null);
  editingPaypal = signal(false); // 🆕 Restaurado

  // 🆕 Selector de País
  instructorCountry = signal<string>('MX'); // Por defecto México

  // 🆕 Switch de Mercado Pago y PayPal
  isMercadoPagoEnabled = signal(false);
  isPayPalEnabled = signal(false); // 🆕

  // Formulario de Banco
  bankForm = new FormGroup({
    account_holder_name: new FormControl('', [Validators.required]),
    bank_name: new FormControl('', [Validators.required]),
    account_number: new FormControl('', [Validators.required]),
    clabe: new FormControl('', [Validators.pattern(/^\d{18}$/)]),
    swift_code: new FormControl(''),
    account_type: new FormControl('', [Validators.required]),
    card_brand: new FormControl(''),
  });

  // Formulario de Mercado Pago
  mercadoPagoForm = new FormGroup({
    account_type: new FormControl('email', [Validators.required]),
    account_value: new FormControl('', [Validators.required]),
    country: new FormControl('MX', [Validators.required])
  });

  // 🆕 Formulario de PayPal
  paypalForm = new FormGroup({
    paypal_email: new FormControl('', [Validators.required, Validators.email])
  });

  constructor() {
    // 🔄 Efecto para repoblar formularios cuando la config cambia desde el servicio
    effect(() => {
      const config = this.config();
      if (config) {
        this.populateForms(config);
      }
    });
  }

  ngOnInit() {
    this.loadConfig();
    this.loadPaymentSettings(); // 🆕
    this.setupMercadoPagoValidation();
  }

  // 🆕 Cargar configuración global de pagos
  loadPaymentSettings() {
    this.paymentSettingsService.getPublicSettings().subscribe({
      next: (response) => {
        // Mercado Pago
        if (response.settings?.mercadopago?.instructorPayoutsActive) {
          this.isMercadoPagoEnabled.set(true);
        } else {
          this.isMercadoPagoEnabled.set(false);
        }

        // PayPal
        if (response.settings?.paypal?.instructorPayoutsActive) {
          this.isPayPalEnabled.set(true);
        } else {
          this.isPayPalEnabled.set(false);
        }
      },
      error: (err) => console.error('Error loading payment settings', err)
    });
  }

  // Validación dinámica de Mercado Pago
  setupMercadoPagoValidation() {
    this.mercadoPagoForm.get('account_type')?.valueChanges.subscribe(type => {
      const valueControl = this.mercadoPagoForm.get('account_value');

      if (type === 'email') {
        valueControl?.setValidators([Validators.required, Validators.email]);
      } else if (type === 'phone') {
        valueControl?.setValidators([
          Validators.required,
          Validators.pattern(/^\+?[0-9]{10,15}$/)
        ]);
      } else if (type === 'cvu') {
        valueControl?.setValidators([
          Validators.required,
          Validators.pattern(/^\d{22}$/)
        ]);
      }

      valueControl?.updateValueAndValidity();
    });
  }

  loadConfig() {
    this.instructorPaymentService.reloadPaymentConfig();
  }

  populateForms(config: PaymentConfig) {
    // Banco
    if (config.bank_account) {
      this.bankForm.patchValue({
        account_holder_name: config.bank_account.account_holder_name || '',
        bank_name: config.bank_account.bank_name || '',
        swift_code: config.bank_account.swift_code || '',
        account_type: config.bank_account.account_type || '',
        card_brand: config.bank_account.card_brand || '',
      });
    }

    // Mercado Pago
    if (config.mercadopago) {
      this.mercadoPagoForm.patchValue({
        account_type: config.mercadopago.account_type,
        account_value: config.mercadopago.account_value,
        country: config.mercadopago.country || 'MX'
      });
      // Actualizar país si ya tiene configuración
      if (config.mercadopago.country) {
        this.instructorCountry.set(config.mercadopago.country);
      }
    }

    // PayPal
    if (config.paypal_email) {
      this.paypalForm.patchValue({
        paypal_email: config.paypal_email
      });
    }
  }

  // 🆕 Cambio de País
  onCountryChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.instructorCountry.set(select.value);

    // Si cambia a un país que no es México y tenía banco preferido, cambiar a MP
    if (select.value !== 'MX' && this.config()?.preferred_payment_method === 'bank_transfer') {
      // Opcional: forzar cambio o dejar que el usuario lo haga
    }
  }

  get isMexico() {
    return this.instructorCountry() === 'MX';
  }

  // ========================================
  // FUNCIONES DE BANCO
  // ========================================

  editBank() {
    this.editingBank.set(true);
    this.clearMessages();
    this.bankForm.patchValue({
      account_number: '',
      clabe: '',
    });
  }

  cancelEditBank() {
    this.editingBank.set(false);
    this.populateForms(this.config()!);
    this.clearMessages();
  }

  saveBank() {
    if (this.bankForm.invalid) return;
    this.isSaving.set('bank');
    this.clearMessages();

    const formData = {
      account_holder_name: this.bankForm.value.account_holder_name!,
      bank_name: this.bankForm.value.bank_name!,
      account_number: this.bankForm.value.account_number!,
      clabe: this.bankForm.value.clabe || undefined,
      swift_code: this.bankForm.value.swift_code || undefined,
      account_type: this.bankForm.value.account_type! as 'ahorros' | 'corriente' | 'debito' | 'credito',
      card_brand: this.bankForm.value.card_brand || undefined,
    };

    this.instructorPaymentService.updateBankConfig(formData).subscribe({
      next: (response) => {
        if (response.success) {
          this.instructorPaymentService.reloadPaymentConfig();
          this.success.set({
            section: 'bank',
            message: 'Cuenta bancaria guardada correctamente.',
          });
          this.editingBank.set(false);
          this.bankForm.patchValue({
            account_number: '',
            clabe: '',
          });
          setTimeout(() => this.clearMessages(), 3000);
        } else {
          this.error.set({
            section: 'bank',
            message: response.message || 'Error al guardar.',
          });
        }
        this.isSaving.set('');
      },
      error: (err) => {
        this.error.set({
          section: 'bank',
          message: err.error?.message || 'Error al conectar con el servidor.',
        });
        this.isSaving.set('');
      },
    });
  }

  confirmDeleteBank() {
    this.deleteTarget.set('bank');
    this.showDeleteModal.set(true);
  }

  // ========================================
  // FUNCIONES DE MERCADO PAGO
  // ========================================

  editMercadoPago() {
    this.editingMercadoPago.set(true);
    this.clearMessages();
  }

  cancelEditMercadoPago() {
    this.editingMercadoPago.set(false);
    if (this.config()?.mercadopago?.account_value) {
      this.mercadoPagoForm.patchValue({
        account_type: this.config()!.mercadopago!.account_type,
        account_value: this.config()!.mercadopago!.account_value,
        country: this.config()!.mercadopago!.country || 'MX'
      });
    }
    this.clearMessages();
  }

  saveMercadoPago() {
    if (this.mercadoPagoForm.invalid) return;
    this.isSaving.set('mercadopago');
    this.clearMessages();

    const formData = {
      account_type: this.mercadoPagoForm.value.account_type!,
      account_value: this.mercadoPagoForm.value.account_value!,
      country: this.mercadoPagoForm.value.country!
    };

    this.instructorPaymentService.updateMercadoPagoConfig(formData).subscribe({
      next: (response) => {
        if (response.success) {
          this.instructorPaymentService.reloadPaymentConfig();
          this.success.set({
            section: 'mercadopago',
            message: 'Configuración de Mercado Pago actualizada correctamente.'
          });
          this.editingMercadoPago.set(false);
          setTimeout(() => this.clearMessages(), 3000);
        } else {
          this.error.set({
            section: 'mercadopago',
            message: response.message || 'Error al actualizar.'
          });
        }
        this.isSaving.set('');
      },
      error: (err) => {
        this.error.set({
          section: 'mercadopago',
          message: err.error?.message || 'Error al conectar con el servidor.'
        });
        this.isSaving.set('');
      }
    });
  }

  confirmDeleteMercadoPago() {
    this.deleteTarget.set('mercadopago');
    this.showDeleteModal.set(true);
  }

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

    this.instructorPaymentService.deletePaypalConfig().subscribe({
      next: (response) => {
        if (response.success) {
          this.instructorPaymentService.reloadPaymentConfig();

          this.paypalForm.reset();
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
    const target = this.deleteTarget();

    if (target === 'bank') {
      this.deleteBank();
    } else if (target === 'mercadopago') {
      this.deleteMercadoPago();
    } else if (target === 'paypal') {
      this.deletePaypal();
    }
  }

  private deleteBank() {
    this.isSaving.set('delete');

    this.instructorPaymentService.deleteBankConfig().subscribe({
      next: (response) => {
        if (response.success) {
          this.instructorPaymentService.reloadPaymentConfig();

          this.bankForm.reset({ account_type: '' });
          this.success.set({
            section: 'bank',
            message: 'Cuenta bancaria eliminada correctamente.',
          });
          setTimeout(() => this.clearMessages(), 3000);
        } else {
          this.error.set({
            section: 'bank',
            message: response.message || 'Error al eliminar.',
          });
        }
        this.isSaving.set('');
        this.closeDeleteModal();
      },
      error: (err) => {
        this.error.set({
          section: 'bank',
          message: err.error?.message || 'Error al eliminar configuración.',
        });
        this.isSaving.set('');
        this.closeDeleteModal();
      },
    });
  }

  private deleteMercadoPago() {
    this.isSaving.set('delete');

    this.instructorPaymentService.deleteMercadoPagoConfig().subscribe({
      next: (response) => {
        if (response.success) {
          this.instructorPaymentService.reloadPaymentConfig();

          this.mercadoPagoForm.reset({ account_type: 'email', country: 'MX' });
          this.success.set({
            section: 'mercadopago',
            message: 'Configuración de Mercado Pago eliminada correctamente.'
          });
          setTimeout(() => this.clearMessages(), 3000);
        } else {
          this.error.set({
            section: 'mercadopago',
            message: response.message || 'Error al eliminar.'
          });
        }
        this.isSaving.set('');
        this.closeDeleteModal();
      },
      error: (err) => {
        this.error.set({
          section: 'mercadopago',
          message: err.error?.message || 'Error al eliminar configuración.'
        });
        this.isSaving.set('');
        this.closeDeleteModal();
      }
    });
  }

  // ========================================
  // MÉTODO PREFERIDO
  // ========================================

  setPreferredMethod(method: 'bank_transfer' | 'mercadopago' | 'paypal') {
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

  get hasBankAccount() {
    const bankAccount = this.config()?.bank_account;
    return !!(bankAccount && (bankAccount.bank_name || bankAccount.account_holder_name));
  }

  get hasMercadoPago() {
    return !!(this.config()?.mercadopago?.account_value);
  }

  get hasPaypal() {
    return !!(this.config()?.paypal_email);
  }

  get isBankVerified() {
    return this.config()?.bank_account?.verified ?? false;
  }

  get isMercadoPagoVerified() {
    return this.config()?.mercadopago?.verified ?? false;
  }

  get maskedAccountNumber() {
    const bankAccount = this.config()?.bank_account;
    if (bankAccount?.account_number_masked) {
      const masked = bankAccount.account_number_masked;
      if (masked.includes('*')) return masked.slice(-4);
      return masked;
    }
    if (bankAccount?.clabe_masked) {
      return bankAccount.clabe_masked.slice(-4);
    }
    return '••••';
  }

  getAccountTypeLabel(): string {
    const type = this.config()?.bank_account?.account_type;
    const labels: { [key: string]: string } = {
      'debito': 'Tarjeta de Débito',
      'credito': 'Tarjeta de Crédito',
      'ahorros': 'Cuenta de Ahorros',
      'corriente': 'Cuenta Corriente'
    };
    return labels[type || ''] || type || 'No especificado';
  }
}
