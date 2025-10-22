import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminPaymentService, InstructorWithEarnings } from '../../core/services/admin-payment.service';

@Component({
  selector: 'app-admin-instructor-payments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-instructor-payments.html',
})
export class AdminInstructorPaymentsComponent implements OnInit {
  private adminPaymentService = inject(AdminPaymentService);
  private router = inject(Router);

  instructors = signal<InstructorWithEarnings[]>([]);
  summary = signal<any>({});
  isLoading = signal(true);
  error = signal<string | null>(null);

  filterForm = new FormGroup({
    status: new FormControl('available'),
    minAmount: new FormControl<number | null>(0),
  });

  hasInstructors = computed(() => this.instructors().length > 0);
  totalEarnings = computed(() => Number(this.summary()?.totalEarnings) || 0);

  ngOnInit() {
    console.log('🔵 AdminInstructorPaymentsComponent initialized');
    this.loadInstructors();
  }

  loadInstructors() {
    console.log('🔵 Loading instructors...');
    this.isLoading.set(true);
    this.error.set(null);

    const formValue = this.filterForm.value;
    const filters: { status?: string; minAmount?: number } = {};

    if (formValue.status && formValue.status !== 'all') {
      filters.status = formValue.status;
    }
    if (formValue.minAmount && formValue.minAmount > 0) {
      filters.minAmount = formValue.minAmount;
    }

    const status = filters.status || 'available';
    const minAmount = filters.minAmount || 0;
    
    console.log('🔵 Fetching with filters:', { status, minAmount });

    this.adminPaymentService.getInstructorsWithEarnings(status, minAmount).subscribe({
      next: (response) => {
        console.log('✅ Response received:', response);
        console.log('✅ Instructors count:', response.instructors?.length || 0);
        console.log('✅ Summary:', response.summary);
        
        this.instructors.set(response.instructors || []);
        this.summary.set(response.summary || {});
        this.isLoading.set(false);
        
        console.log('✅ State updated - Instructors:', this.instructors().length);
        console.log('✅ State updated - Total earnings:', this.totalEarnings());
      },
      error: (err) => {
        console.error('❌ Error loading instructors:', err);
        console.error('❌ Error details:', err.error);
        this.error.set(err.error?.message || 'An error occurred while loading data.');
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange() {
    console.log('🔵 Filter changed');
    this.loadInstructors();
  }

  clearFilters() {
    console.log('🔵 Clearing filters');
    this.filterForm.reset({
      status: 'available',
      minAmount: 0
    });
    this.loadInstructors();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getPaymentMethodTooltip(config: InstructorWithEarnings['paymentConfig']): string {
    if (!config.hasConfig) return 'Sin método de pago configurado';
    if (config.preferredMethod === 'paypal') {
      return `PayPal: ${config.paypalConnected ? 'Conectado' : 'No Conectado'}`;
    }
    if (config.preferredMethod === 'bank_transfer') {
      return `Cuenta Bancaria: ${config.bankVerified ? 'Verificada' : 'No Verificada'}`;
    }
    return 'Método de pago no especificado';
  }

  getMethodBadgeClass(method: string): string {
    const colors = {
      paypal: 'text-blue-600 bg-blue-100',
      bank_transfer: 'text-green-600 bg-green-100',
      none: 'text-gray-600 bg-gray-100'
    };
    return colors[method as keyof typeof colors] || colors.none;
  }

  getMethodText(method: string): string {
    const texts = {
      paypal: 'PayPal',
      bank_transfer: 'Transferencia',
      none: 'No configurado'
    };
    return texts[method as keyof typeof texts] || 'Otro';
  }

  viewInstructorDetails(instructorId: string) {
    console.log('🔵 Navigating to instructor details:', instructorId);
    if (instructorId) {
      this.router.navigate(['/admin-instructor-payments', instructorId]);
    }
  }

  /**
   * Obtener URL del avatar del instructor
   */
  getInstructorAvatarUrl(instructor: any): string {
    if (!instructor || !instructor.avatar) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor?.name || 'User')}&background=667eea&color=fff`;
    }
    return `http://localhost:3000/api/users/imagen-usuario/${instructor.avatar}`;
  }
}
