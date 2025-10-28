import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
}

@Component({
  selector: 'app-admin-bank-verification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-bank-verification.html',
})
export class AdminBankVerificationComponent implements OnInit {
  private http = inject(HttpClient);

  instructors = signal<PaymentConfig[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  verifyingInstructorId = signal<string | null>(null);

  ngOnInit() {
    this.loadInstructorsWithBankAccounts();
  }

  loadInstructorsWithBankAccounts() {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.get<{ success: boolean; instructors: any[] }>(`${environment.url}admin/instructors/payments?status=all`)
      .subscribe({
        next: (response) => {
          if (response.success && response.instructors) {
            // Obtener detalles de cada instructor
            this.loadInstructorPaymentDetails(response.instructors.map(i => i._id || i.instructor?._id));
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set('Error al cargar instructores');
          this.isLoading.set(false);
        }
      });
  }

  loadInstructorPaymentDetails(instructorIds: string[]) {
    const instructorsData: PaymentConfig[] = [];

    instructorIds.forEach(id => {
      this.http.get<{ success: boolean; data: PaymentConfig }>(`${environment.url}admin/instructors/${id}/payment-method-full`)
        .subscribe({
          next: (response) => {
            if (response.success && response.data && response.data.paymentDetails) {
              instructorsData.push(response.data);
            }
          },
          error: (err) => console.error(`Error al cargar detalles de instructor ${id}:`, err),
          complete: () => {
            // Solo incluir instructores con cuentas bancarias
            const bankAccounts = instructorsData.filter(config =>
              config.paymentMethod === 'bank_transfer' && config.paymentDetails
            );
            this.instructors.set(bankAccounts);
          }
        });
    });
  }

  verifyBankAccount(instructorId: string) {
    this.verifyingInstructorId.set(instructorId);
    this.error.set(null);

    this.http.put(`${environment.url}admin/instructors/${instructorId}/verify-bank`, {})
      .subscribe({
        next: () => {
          this.success.set('Cuenta bancaria verificada exitosamente');
          // Actualizar el estado local
          this.instructors.update(items =>
            items.map(item =>
              item.instructor._id === instructorId
                ? { ...item, paymentDetails: { ...item.paymentDetails, verified: true } }
                : item
            )
          );
          this.verifyingInstructorId.set(null);
          setTimeout(() => this.success.set(null), 3000);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Error al verificar cuenta bancaria');
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

