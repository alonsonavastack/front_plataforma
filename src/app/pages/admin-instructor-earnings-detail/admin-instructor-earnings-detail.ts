import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { AdminPaymentService } from '../../core/services/admin-payment.service';
import { Earning } from '../../core/models/instructor-earning.model';

@Component({
  selector: 'app-admin-instructor-earnings-detail',
  standalone: true,
  imports: [ReactiveFormsModule],
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
    status: new FormControl('all'),
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

  // Exponer Math para el template
  Math = Math;

  // Paginación
  currentPage = signal(1);
  itemsPerPage = signal(10);

  paginatedEarnings = computed(() => {
    const earnings = this.earnings();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return earnings.slice(start, end);
  });

  totalPages = computed(() => {
    const total = this.earnings().length;
    return Math.ceil(total / this.itemsPerPage());
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const current = this.currentPage();
    const pages: (number | string)[] = [1];

    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');

    pages.push(total);
    return pages;
  });

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
    this.currentPage.set(1); // Reset a primera página al filtrar
    this.loadEarnings();
  }

  clearFilters() {
    this.filterForm.reset({
      status: 'all',
      startDate: '',
      endDate: ''
    });
    this.currentPage.set(1);
    this.loadEarnings();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  previousPage(): void {
    this.changePage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.changePage(this.currentPage() + 1);
  }

  changePerPage(perPage: number): void {
    this.itemsPerPage.set(perPage);
    this.currentPage.set(1);
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
    // Solo seleccionar ganancias con estado 'available'
    const availableEarningIds = this.earnings()
      .filter(e => e.status === 'available')
      .map(e => e._id);
    this.selectedEarnings.set(availableEarningIds);
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

  /**
   * Obtener URL completa de la imagen del producto (curso o proyecto)
   */
  getProductImageUrl(product: any, productType?: string): string {
    if (!product) {
      return 'https://i.pravatar.cc/40?u=no-product';
    }

    // Los proyectos usan 'imagen', los cursos pueden usar 'imagen' o 'image'
    const imageName = product.imagen || product.image;

    if (!imageName) {
      return 'https://i.pravatar.cc/40?u=' + (product.title || 'placeholder');
    }

    // Construir URL basada en el tipo de producto
    if (productType === 'project') {
      // URL para proyectos
      return `http://localhost:3000/api/projects/imagen-project/${imageName}`;
    } else {
      // URL para cursos (por defecto)
      return `http://localhost:3000/api/courses/imagen-course/${imageName}`;
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

  /**
   * Manejar error de carga de imagen del producto
   */
  handleImageError(event: Event, product: any): void {
    const imgElement = event.target as HTMLImageElement;
    // Usar un placeholder con el nombre del producto
    imgElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product?.title || 'Producto')}&background=10b981&color=fff&size=48`;
  }
}
