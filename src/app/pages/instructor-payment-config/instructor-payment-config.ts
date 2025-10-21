// Archivo: cursos/src/app/pages/instructor-payment-config/instructor-payment-config.ts
// VERSIÓN FINAL CON TIPO DE TARJETA Y MARCA

import { Component, inject, signal, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-instructor-payment-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './instructor-payment-config.html',
})
export class InstructorPaymentConfigComponent implements OnInit {
  private instructorPaymentService = inject(InstructorPaymentService);

  // Signals
  config = signal<PaymentConfig | null>(null);
  isLoading = signal(true);
  isSaving = signal('');
  error = signal<{ section: string; message: string } | null>(null);
  success = signal<{ section: string; message: string } | null>(null);
  editingPaypal = signal(false);
  editingBank = signal(false);
  showDeleteModal = signal(false);
  deleteTarget = signal<'paypal' | 'bank' | null>(null);

  // Formulario de PayPal
  paypalForm = new FormGroup({
    paypal_email: new FormControl('', [Validators.required, Validators.email]),
    paypal_merchant_id: new FormControl(''),
  });

  // Formulario de Banco (CON CARD_BRAND)
  bankForm = new FormGroup({
    account_holder_name: new FormControl('', [Validators.required]),
    bank_name: new FormControl('', [Validators.required]),
    account_number: new FormControl('', [Validators.required]),
    clabe: new FormControl('', [Validators.pattern(/^\d{18}$/)]),
    swift_code: new FormControl(''),
    account_type: new FormControl('', [Validators.required]),
    card_brand: new FormControl(''),
  });

  ngOnInit() {
    this.loadConfig();
  }

  loadConfig() {
    this.isLoading.set(true);
    this.instructorPaymentService.getPaymentConfig().subscribe({
      next: (response) => {
        if (response.success) {
          this.config.set(response.data);
          this.populateForms(response.data);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set({
          section: 'load',
          message: err.error?.message || 'Error al cargar la configuración.',
        });
        this.isLoading.set(false);
      },
    });
  }

  populateForms(config: PaymentConfig) {
    // PayPal
    if (config.paypal_email) {
      this.paypalForm.patchValue({
        paypal_email: config.paypal_email,
        paypal_merchant_id: config.paypal_merchant_id || '',
      });
    }

    // Banco - NO prellenar datos sensibles
    if (config.bank_account) {
      this.bankForm.patchValue({
        account_holder_name: config.bank_account.account_holder_name || '',
        bank_name: config.bank_account.bank_name || '',
        swift_code: config.bank_account.swift_code || '',
        account_type: config.bank_account.account_type || '',
        card_brand: config.bank_account.card_brand || '',
      });
    }
  }

  // ========================================
  // FUNCIONES DE PAYPAL
  // ========================================

  editPaypal() {
    this.editingPaypal.set(true);
    this.clearMessages();
  }

  startEditingPaypal() {
    this.editingPaypal.set(true);
    this.clearMessages();
  }

  cancelEditPaypal() {
    this.editingPaypal.set(false);
    if (this.config()?.paypal_email) {
      this.paypalForm.patchValue({
        paypal_email: this.config()!.paypal_email,
        paypal_merchant_id: this.config()!.paypal_merchant_id || '',
      });
    }
    this.clearMessages();
  }

  cancelEditingPaypal() {
    this.editingPaypal.set(false);
    if (this.config()?.paypal_email) {
      this.paypalForm.patchValue({
        paypal_email: this.config()!.paypal_email,
        paypal_merchant_id: this.config()!.paypal_merchant_id || '',
      });
    }
    this.clearMessages();
  }

  savePaypal() {
    if (this.paypalForm.invalid) return;
    this.isSaving.set('paypal');
    this.clearMessages();

    const formData = {
      paypal_email: this.paypalForm.value.paypal_email!,
      paypal_merchant_id: this.paypalForm.value.paypal_merchant_id || undefined,
    };

    this.instructorPaymentService.updatePaypalConfig(formData).subscribe({
      next: (response) => {
        if (response.success) {
          this.config.set(response.data);
          this.success.set({
            section: 'paypal',
            message: 'Configuración de PayPal actualizada correctamente.',
          });
          this.editingPaypal.set(false);
          setTimeout(() => this.clearMessages(), 3000);
        } else {
          this.error.set({
            section: 'paypal',
            message: response.message || 'Error al actualizar.',
          });
        }
        this.isSaving.set('');
      },
      error: (err) => {
        this.error.set({
          section: 'paypal',
          message: err.error?.message || 'Error al conectar con el servidor.',
        });
        this.isSaving.set('');
      },
    });
  }

  confirmDeletePaypal() {
    this.deleteTarget.set('paypal');
    this.showDeleteModal.set(true);
  }

  // ========================================
  // FUNCIONES DE BANCO
  // ========================================

  editBank() {
    this.editingBank.set(true);
    this.clearMessages();
    // Limpiar campos sensibles
    this.bankForm.patchValue({
      account_number: '',
      clabe: '',
    });
  }

  startEditingBank() {
    this.editingBank.set(true);
    this.clearMessages();
    // Limpiar campos sensibles
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

  cancelEditingBank() {
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
          this.config.set(response.data);
          this.success.set({
            section: 'bank',
            message: 'Cuenta bancaria guardada correctamente.',
          });
          this.editingBank.set(false);

          // Limpiar campos sensibles
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

    if (target === 'paypal') {
      this.deletePaypal();
    } else if (target === 'bank') {
      this.deleteBank();
    }
  }

  private deletePaypal() {
    this.isSaving.set('delete');

    this.instructorPaymentService.deletePaypalConfig().subscribe({
      next: (response) => {
        if (response.success) {
          this.config.update(c => c ? {
            ...c,
            paypal_email: undefined,
            paypal_merchant_id: undefined,
            paypal_connected: false,
            paypal_verified: false,
            preferred_payment_method: c.bank_account ? 'bank_transfer' : undefined
          } : c);

          this.paypalForm.reset();
          this.success.set({
            section: 'paypal',
            message: 'Configuración de PayPal eliminada correctamente.',
          });

          setTimeout(() => this.clearMessages(), 3000);
        } else {
          this.error.set({
            section: 'paypal',
            message: response.message || 'Error al eliminar.',
          });
        }
        this.isSaving.set('');
        this.closeDeleteModal();
      },
      error: (err) => {
        this.error.set({
          section: 'paypal',
          message: err.error?.message || 'Error al eliminar configuración.',
        });
        this.isSaving.set('');
        this.closeDeleteModal();
      },
    });
  }

  private deleteBank() {
    this.isSaving.set('delete');

    this.instructorPaymentService.deleteBankConfig().subscribe({
      next: (response) => {
        if (response.success) {
          this.config.update(c => c ? {
            ...c,
            bank_account: undefined,
            preferred_payment_method: c.paypal_connected ? 'paypal' : undefined
          } : c);

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

  // ========================================
  // MÉTODO PREFERIDO
  // ========================================

  setPreferredMethod(method: 'paypal' | 'bank_transfer') {
    this.isSaving.set('preferred');
    this.clearMessages();

    this.instructorPaymentService.updatePreferredMethod(method).subscribe({
      next: (response) => {
        if (response.success) {
          this.config.update((c) =>
            c ? { ...c, preferred_payment_method: method } : c
          );
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

  get hasPaypalConnected() {
    const connected = this.config()?.paypal_connected ?? false;
    console.log('hasPaypalConnected:', connected, this.config()?.paypal_email);
    return connected;
  }

  get hasBankAccount() {
    const bankAccount = this.config()?.bank_account;
    // Verificar si existe bank_account Y tiene al menos el nombre del banco o titular
    const hasAccount = !!(bankAccount && (bankAccount.bank_name || bankAccount.account_holder_name));
    console.log('hasBankAccount:', hasAccount, this.config()?.bank_account);
    return hasAccount;
  }

  get maskedAccountNumber() {
    const bankAccount = this.config()?.bank_account;
    
    // Si hay account_number_masked, usarlo
    if (bankAccount?.account_number_masked) {
      const masked = bankAccount.account_number_masked;
      if (masked.includes('*')) return masked.slice(-4);
      return masked;
    }
    
    // Si hay clabe_masked, usarlo
    if (bankAccount?.clabe_masked) {
      return bankAccount.clabe_masked.slice(-4);
    }
    
    // Si no hay ninguno enmascarado, mostrar placeholder
    return '••••';
  }

  get isBankVerified() {
    return this.config()?.bank_account?.verified ?? false;
  }

  // Helper para mostrar el label del tipo de cuenta
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
