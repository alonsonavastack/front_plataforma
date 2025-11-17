import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AdminPaymentService, InstructorWithEarnings, CommissionSettings } from '../../core/services/admin-payment.service';

@Component({
  selector: 'app-admin-instructor-payments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-instructor-payments.html',
})
export class AdminInstructorPaymentsComponent implements OnInit {
  private adminPaymentService = inject(AdminPaymentService);
  private router = inject(Router);
  private http = inject(HttpClient);

  instructors = signal<InstructorWithEarnings[]>([]);
  summary = signal<any>({});
  isLoading = signal(true);
  error = signal<string | null>(null);
  
  // 🔥 NUEVO: Configuración de comisiones (incluye umbral y días)
  settings = signal<CommissionSettings | null>(null);
  isLoadingSettings = signal(true);

  filterForm = new FormGroup({
    status: new FormControl('all'), // 🔥 Por defecto mostrar TODAS las ganancias
    minAmount: new FormControl<number | null>(0),
  });

  hasInstructors = computed(() => this.instructors().length > 0);
  totalEarnings = computed(() => Number(this.summary()?.totalEarnings) || 0);

  // Paginación
  currentPage = signal(1);
  itemsPerPage = signal(10);
  Math = Math;

  paginatedInstructors = computed(() => {
    const instructors = this.instructors();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return instructors.slice(start, end);
  });

  totalPages = computed(() => {
    const total = this.instructors().length;
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
    this.loadInstructors();
    this.loadSettings(); // 🔥 NUEVO: Cargar configuración
  }

  // 🔥 NUEVO: Cargar configuración de comisiones
  loadSettings() {
    this.isLoadingSettings.set(true);
    this.adminPaymentService.getCommissionSettings().subscribe({
      next: (response) => {
        this.settings.set(response.settings);
        this.isLoadingSettings.set(false);
      },
      error: (err) => {
        console.error('Error al cargar configuración:', err);
        this.isLoadingSettings.set(false);
      }
    });
  }

  loadInstructors() {
    this.isLoading.set(true);
    this.error.set(null);

    const formValue = this.filterForm.value;
    const filters: { status?: string; minAmount?: number } = {};

    // 🔥 IMPORTANTE: Usar 'all' como valor por defecto, no 'available'
    if (formValue.status && formValue.status !== 'all') {
      filters.status = formValue.status;
    }
    if (formValue.minAmount && formValue.minAmount > 0) {
      filters.minAmount = formValue.minAmount;
    }

    // 🔥 Si no hay filtro de status, usar 'all' para ver TODAS las ganancias
    const status = filters.status || 'all';
    const minAmount = filters.minAmount || 0;

    console.log(`🔍 [Frontend] Cargando instructores con status='${status}', minAmount=${minAmount}`);

    this.adminPaymentService.getInstructorsWithEarnings(status, minAmount).subscribe({
      next: (response) => {

        this.instructors.set(response.instructors || []);
        this.summary.set(response.summary || {});
        this.isLoading.set(false);

      },
      error: (err) => {
        this.error.set(err.error?.message || 'An error occurred while loading data.');
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange() {
    this.currentPage.set(1); // Reset a primera página
    this.loadInstructors();
  }

  clearFilters() {
    this.filterForm.reset({
      status: 'all', // 🔥 Resetear a 'all' para mostrar todos
      minAmount: 0
    });
    this.currentPage.set(1);
    this.loadInstructors();
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

  // 🔥 NUEVO: Verificar si el instructor ha alcanzado el umbral mínimo
  hasReachedThreshold(earningsTotal: number): boolean {
    const threshold = this.settings()?.minimum_payment_threshold || 0; // ⚠️ Usar 0 como fallback
    return earningsTotal >= threshold;
  }

  // 🔥 NUEVO: Calcular cuánto falta para alcanzar el umbral
  amountToReachThreshold(earningsTotal: number): number {
    const threshold = this.settings()?.minimum_payment_threshold || 0; // ⚠️ Usar 0 como fallback
    const remaining = threshold - earningsTotal;
    return remaining > 0 ? remaining : 0;
  }

  // 🔥 NUEVO: Obtener el umbral mínimo configurado
  getMinimumThreshold(): number {
    return this.settings()?.minimum_payment_threshold || 0;
  }

  // 🔥 NUEVO: Obtener los días hasta que las ganancias estén disponibles
  getDaysUntilAvailable(): number {
    return this.settings()?.days_until_available ?? 0; // ⚠️ Usar ?? en lugar de || para manejar el 0 correctamente
  }

  // 🔧 NUEVO: Procesar ventas existentes para crear ganancias
  isProcessingSales = signal(false);

  processExistingSales() {
    if (!confirm('⚠️ ¿Procesar todas las ventas existentes?\n\nEsto creará registros de ganancias para los instructores de todas las ventas pagadas que aún no tienen ganancias asociadas.\n\n¿Deseas continuar?')) {
      return;
    }

    this.isProcessingSales.set(true);
    console.log('🔧 [Frontend] Iniciando procesamiento de ventas existentes...');

    this.http.post<{
      success: boolean;
      message: string;
      processed: number;
      skipped: number;
      total: number;
    }>('http://localhost:3000/api/sales/process-existing-sales', {}).subscribe({
      next: (result) => {
        console.log('✅ [Frontend] Resultado:', result);
        this.isProcessingSales.set(false);
        
        alert(`✅ Proceso completado:\n\n` +
              `📊 Ventas procesadas: ${result.processed}\n` +
              `⏩ Ventas omitidas (ya tenían ganancias): ${result.skipped}\n` +
              `📦 Total de ventas: ${result.total}\n\n` +
              `Recargando lista de instructores...`);
        
        // Recargar la lista de instructores
        this.loadInstructors();
      },
      error: (err) => {
        console.error('❌ [Frontend] Error al procesar ventas:', err);
        this.isProcessingSales.set(false);
        alert('❌ Error al procesar ventas: ' + (err.error?.message || err.message));
      }
    });
  }
}
