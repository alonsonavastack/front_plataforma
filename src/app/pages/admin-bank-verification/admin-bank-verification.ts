import { Component, inject, signal, OnInit } from '@angular/core';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LoggerService } from '../../core/services/logger.service';
import { ToastService } from '../../core/services/toast.service';

interface Instructor {
  _id: string;
  name: string;
  surname: string;
  email: string;
}

interface BankAccount {
  account_holder_name: string;
  bank_name: string;
  account_number: string; // Número completo para admin
  clabe: string; // CLABE completa para admin
  account_number_masked?: string;
  clabe_masked?: string;
  account_type: string;
  card_brand: string;
  verified: boolean;
}

interface PaymentConfig {
  instructor: Instructor;
  paymentMethod: string;
  paymentDetails: BankAccount;
  bankDetails?: BankAccount; // 🔥 Nuevo campo del backend
}

@Component({
  selector: 'app-admin-bank-verification',
  standalone: true,
  imports: [],
  templateUrl: './admin-bank-verification.html',
})
export class AdminBankVerificationComponent implements OnInit {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private toast = inject(ToastService);

  instructors = signal<PaymentConfig[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  verifyingInstructorId = signal<string | null>(null);

  ngOnInit() {
    this.loadInstructorsWithBankAccounts();
  }

  loadInstructorsWithBankAccounts() {
    this.logger.operation('LoadBankAccounts', 'start');
    this.isLoading.set(true);
    this.error.set(null);

    // 🔥 USAR NUEVO ENDPOINT: Obtener todos los instructores con cuenta bancaria
    this.http.get<{ success: boolean; instructors: any[] }>(`${environment.url}admin/bank-accounts/all`)
      .subscribe({
        next: (response) => {
          if (response.success && response.instructors) {
            this.logger.info('Instructores cargados', { count: response.instructors.length });
            // Obtener detalles de cada instructor
            this.loadInstructorPaymentDetails(response.instructors.map(i => i._id || i.instructor?._id));
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          this.logger.httpError('AdminBankVerification', 'loadInstructorsWithBankAccounts', err);
          this.error.set('Error al cargar instructores');
          this.toast.apiError('cargar la lista de instructores');
          this.isLoading.set(false);
        }
      });
  }

  loadInstructorPaymentDetails(instructorIds: string[]) {
    this.logger.info('Cargando detalles de pago', { instructorIds });
    const instructorsData: PaymentConfig[] = [];

    instructorIds.forEach(id => {
      this.http.get<{ success: boolean; data: PaymentConfig }>(`${environment.url}admin/instructors/${id}/payment-method-full`)
        .subscribe({
          next: (response) => {
            // 🔥 ACEPTAR si tiene bankDetails (nuevo) O paymentDetails (legacy/fallback)
            if (response.success && response.data) {
              instructorsData.push(response.data);
              this.logger.debug('Detalles de pago cargados', { instructorId: id });
            }
          },
          error: (err) => {
            this.logger.httpError('AdminBankVerification', `loadInstructorPaymentDetails[${id}]`, err);

            // ✅ NO mostrar toast individual (evitar saturación de notificaciones)
            // El error se registra en consola para debugging
          },
          complete: () => {
            // 🔥 FILTRO RELAJADO: Incluir si tiene bankDetails (aunque su método preferido sea otro)
            const bankAccounts = instructorsData.filter(config =>
              config.bankDetails || (config.paymentMethod === 'bank_transfer' && config.paymentDetails)
            );
            this.instructors.set(bankAccounts);
            this.logger.operation('LoadBankAccounts', 'success', { count: bankAccounts.length });
          }
        });
    });
  }

  verifyBankAccount(instructorId: string) {
    this.logger.operation('VerifyBankAccount', 'start', { instructorId });
    this.verifyingInstructorId.set(instructorId);
    this.error.set(null);

    this.http.put(`${environment.url}admin/instructors/${instructorId}/verify-bank`, {})
      .subscribe({
        next: () => {
          this.logger.operation('VerifyBankAccount', 'success', { instructorId });

          // ✅ USAR toast.success en lugar de signal
          this.toast.success(
            '¡Cuenta verificada!',
            'La cuenta bancaria ha sido verificada exitosamente'
          );

          // Actualizar el estado local
          this.instructors.update(items =>
            items.map(item => {
              if (item.instructor._id === instructorId) {
                const updated = { ...item };
                if (updated.paymentDetails) {
                  updated.paymentDetails = { ...updated.paymentDetails, verified: true };
                }
                if (updated.bankDetails) {
                  updated.bankDetails = { ...updated.bankDetails, verified: true };
                }
                return updated;
              }
              return item;
            })
          );
          this.verifyingInstructorId.set(null);
        },
        error: (err) => {
          this.logger.httpError('AdminBankVerification', 'verifyBankAccount', err);
          this.logger.operation('VerifyBankAccount', 'error', { instructorId, error: err.message });

          // ✅ USAR toast.error con mensaje apropiado
          const errorMessage = err.error?.message || 'No se pudo verificar la cuenta bancaria';
          this.toast.error('Error al verificar', errorMessage);

          this.error.set(errorMessage);
          this.verifyingInstructorId.set(null);
        }
      });
  }

  getAccountTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'debito': 'Tarjeta de Débito',
      'credito': 'Tarjeta de Crédito',
      'ahorros': 'Cuenta de Ahorros',
      'corriente': 'Cuenta Corriente'
    };
    return labels[type] || type || 'No especificado';
  }
}
