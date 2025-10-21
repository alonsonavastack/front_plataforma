import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { AdminPaymentService } from '../../core/services/admin-payment.service';
import { Earning } from '../../core/models/instructor-earning.model';

@Component({
  selector: 'app-admin-instructor-earnings-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-instructor-earnings-detail.html',
})
export class AdminInstructorEarningsDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private adminPaymentService = inject(AdminPaymentService);

  instructorId!: string;
  instructor = signal<any>(null);
  paymentConfig = signal<any>(null);
  earnings = signal<Earning[]>([]);
  totals = signal<any>({});
  isLoading = signal(true);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isCreatingPayment = signal(false);

  selectedEarnings = signal<string[]>([]);

  filterForm = new FormGroup({
    status: new FormControl('available'),
    startDate: new FormControl(''),
    endDate: new FormControl(''),
  });

  // Payment Modal
  showPaymentModal = signal(false);
  paymentForm = new FormGroup({
    deductions: new FormControl(0, [Validators.min(0)]),
    notes: new FormControl(''),
  });

  // Computed Signals
  selectedCount = computed(() => this.selectedEarnings().length);
  private selectedIdsSet = computed(() => new Set(this.selectedEarnings()));

  selectedTotal = computed(() => {
    const selectedIds = this.selectedIdsSet();
    return this.earnings()
      .filter(e => selectedIds.has(e._id))
      .reduce((sum, e) => sum + e.instructor_earning, 0);
  });

  finalAmount = computed(() => {
    const total = this.selectedTotal();
    const deductions = this.paymentForm.get('deductions')?.value || 0;
    return total - deductions;
  });

  isSelected = computed(() => (earningId: string) => this.selectedIdsSet().has(earningId));

  ngOnInit() {
    this.instructorId = this.route.snapshot.paramMap.get('id')!;
    if (this.instructorId) {
      this.loadEarnings();
    }
  }

  loadEarnings() {
    this.isLoading.set(true);
    this.error.set(null);

    const formValue = this.filterForm.value;
    const filters: { status?: string; startDate?: string; endDate?: string } = {};

    if (formValue.status && formValue.status !== 'all') {
      filters.status = formValue.status;
    }
    if (formValue.startDate) {
      filters.startDate = formValue.startDate;
    }
    if (formValue.endDate) {
      filters.endDate = formValue.endDate;
    }

    this.adminPaymentService.getInstructorEarnings(this.instructorId, filters).subscribe({
      next: (response) => {
        this.instructor.set(response.instructor);
        this.earnings.set(response.earnings);
        this.paymentConfig.set(response.paymentConfig);
        this.totals.set(response.totals);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'An error occurred while loading earnings.');
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange() {
    this.loadEarnings();
  }

  clearFilters() {
    this.filterForm.reset({
      status: 'available',
      startDate: '',
      endDate: ''
    });
    this.loadEarnings();
  }

  onEarningSelect(event: Event, earningId: string) {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.selectedEarnings.update(current => [...current, earningId]);
    } else {
      this.selectedEarnings.update(current => current.filter(id => id !== earningId));
    }
  }

  toggleSelection(earningId: string) {
    const currentSelection = this.selectedEarnings();
    const index = currentSelection.indexOf(earningId);

    if (index > -1) {
      this.selectedEarnings.update(current => current.filter(id => id !== earningId));
    } else {
      this.selectedEarnings.update(current => [...current, earningId]);
    }
  }

  selectAll() {
    const allEarningIds = this.earnings().map(e => e._id);
    this.selectedEarnings.set(allEarningIds);
  }

  deselectAll() {
    this.selectedEarnings.set([]);
  }

  openPaymentModal() {
    if (this.selectedEarnings().length === 0) {
      // Consider using a more elegant notification system
      alert('Por favor, seleccione al menos una ganancia para crear un pago.');
      return;
    }
    this.showPaymentModal.set(true);
  }

  closePaymentModal() {
    this.showPaymentModal.set(false);
    this.paymentForm.reset({ deductions: 0, notes: '' });
  }

  createPayment() {
    if (this.paymentForm.invalid) {
      return;
    }
    this.isCreatingPayment.set(true);
    this.error.set(null);

    const paymentData = {
      earnings_ids: this.selectedEarnings(),
      deductions: this.paymentForm.value.deductions || 0,
      notes: this.paymentForm.value.notes || '',
    };

    this.adminPaymentService.createPayment(this.instructorId, paymentData).subscribe({
      next: (response) => {
        this.successMessage.set(response.message || 'Pago creado exitosamente. Recargando ganancias...');
        this.closePaymentModal();
        this.deselectAll();
        setTimeout(() => {
          this.successMessage.set(null);
          this.loadEarnings();
        }, 2000);
        this.isCreatingPayment.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Ocurrió un error inesperado.');
        this.isCreatingPayment.set(false);
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800',
      available: 'bg-green-100 text-green-800',
      paid: 'bg-blue-100 text-blue-800',
      disputed: 'bg-red-100 text-red-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: string): string {
    const texts = {
      pending: 'Pendiente',
      available: 'Disponible',
      paid: 'Pagado',
      disputed: 'En Disputa'
    };
    return texts[status as keyof typeof texts] || status;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  goBack(): void {
    this.location.back();
  }

  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);
  }
}
