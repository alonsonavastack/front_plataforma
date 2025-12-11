import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminPaymentService, InstructorWithEarnings, CommissionSettings } from '../../core/services/admin-payment.service';
import { ModalService } from '../../core/services/modal.service';

@Component({
  selector: 'app-admin-instructor-payments',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-instructor-payments.html',
})
export class AdminInstructorPaymentsComponent implements OnInit {
  private adminPaymentService = inject(AdminPaymentService);
  private router = inject(Router);
  private modalService = inject(ModalService);

  instructors = this.adminPaymentService.instructors;
  summary = this.adminPaymentService.summary;
  isLoading = this.adminPaymentService.isLoadingInstructors;
  error = this.adminPaymentService.instructorsError;

  // Configuración de comisiones
  settings = this.adminPaymentService.commissionSettings;
  isLoadingSettings = this.adminPaymentService.isLoadingCommission;

  filterForm = new FormGroup({
    status: new FormControl('all'),
    minAmount: new FormControl<number | null>(0),
    country: new FormControl('all'), // 🔥 NUEVO: Filtro por país
    paymentMethod: new FormControl('all'), // 🔥 NUEVO: Filtro por método de pago
  });

  hasInstructors = computed(() => this.instructors().length > 0);
  totalEarnings = computed(() => Number(this.summary()?.totalEarnings) || 0);

  // 🔥 NUEVO: Filtros de país y método de pago
  availableCountries = computed(() => {
    const instructors = this.instructors();
    const countries = new Set<string>();
    instructors.forEach((i: InstructorWithEarnings) => {
      const country = i.instructor.country || i.paymentConfig.country || 'INTL';
      countries.add(country);
    });
    return Array.from(countries).sort();
  });

  // Instructores filtrados
  filteredInstructors = computed(() => {
    let instructors = this.instructors();
    const country = this.filterForm.get('country')?.value;
    const paymentMethod = this.filterForm.get('paymentMethod')?.value;

    if (country && country !== 'all') {
      instructors = instructors.filter((i: InstructorWithEarnings) => {
        const instructorCountry = i.instructor.country || i.paymentConfig.country || 'INTL';
        return instructorCountry === country;
      });
    }

    if (paymentMethod && paymentMethod !== 'all') {
      instructors = instructors.filter((i: InstructorWithEarnings) => i.paymentConfig.preferredMethod === paymentMethod);
    }

    return instructors;
  });

  // Paginación
  currentPage = signal(1);
  itemsPerPage = signal(10);
  Math = Math;

  paginatedInstructors = computed(() => {
    const instructors = this.filteredInstructors();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return instructors.slice(start, end);
  });

  totalPages = computed(() => {
    const total = this.filteredInstructors().length;
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
    this.loadSettings();
  }

  loadSettings() {
    this.adminPaymentService.reloadCommissionSettings();
  }

  loadInstructors() {
    const formValue = this.filterForm.value;
    const filters: { status?: string; minAmount?: number } = {};

    if (formValue.status && formValue.status !== 'all') {
      filters.status = formValue.status;
    }
    if (formValue.minAmount && formValue.minAmount > 0) {
      filters.minAmount = formValue.minAmount;
    }

    const status = filters.status || 'all';
    const minAmount = filters.minAmount || 0;

    this.adminPaymentService.setInstructorFilters({ status, minAmount });
  }

  onFilterChange() {
    this.currentPage.set(1);
    // Solo recargar si cambia el filtro de status o minAmount
    const country = this.filterForm.get('country')?.value;
    const paymentMethod = this.filterForm.get('paymentMethod')?.value;

    // Si solo cambió país o método, no recargar (se filtra en el computed)
    if (country === 'all' && paymentMethod === 'all') {
      this.loadInstructors();
    }
  }

  clearFilters() {
    this.filterForm.reset({
      status: 'all',
      minAmount: 0,
      country: 'all',
      paymentMethod: 'all'
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
      currency: 'MXN'
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
    if (!config || !config.preferredMethod) return 'Sin método de pago configurado';
    if (config.preferredMethod === 'paypal') {
      return `PayPal: ${config.paypalConnected ? 'Conectado' : 'No Conectado'}`;
    }
    if (config.preferredMethod === 'paypal') {
      return `PayPal: ${config.paypalConnected ? 'Conectado' : 'No Conectado'}`;
    }
    return 'Método de pago no especificado';
  }

  getMethodBadgeClass(method: string): string {
    const colors = {
      paypal: 'text-blue-600 bg-blue-100',
      wallet: 'text-purple-600 bg-purple-100',
      none: 'text-gray-600 bg-gray-100'
    };
    return colors[method as keyof typeof colors] || 'text-orange-600 bg-orange-100';
  }

  getMethodText(method: string): string {
    const texts = {
      paypal: 'PayPal',
      wallet: 'Billetera',
      none: 'No configurado'
    };
    return texts[method as keyof typeof texts] || method.charAt(0).toUpperCase() + method.slice(1);
  }

  // 🔥 NUEVO: Obtener bandera de país
  getCountryFlag(country: string): string {
    const flags: Record<string, string> = {
      'MX': '🇲🇽',
      'AR': '🇦🇷',
      'CO': '🇨🇴',
      'CL': '🇨🇱',
      'PE': '🇵🇪',
      'BR': '🇧🇷',
      'INTL': '🌎'
    };
    return flags[country] || '🌍';
  }

  // 🔥 NUEVO: Obtener nombre del país
  getCountryName(country: string): string {
    const names: Record<string, string> = {
      'MX': 'México',
      'AR': 'Argentina',
      'CO': 'Colombia',
      'CL': 'Chile',
      'PE': 'Perú',
      'BR': 'Brasil',
      'INTL': 'Internacional'
    };
    return names[country] || country;
  }

  // 🔥 NUEVO: Determinar si se puede pagar con Mercado Pago


  viewInstructorDetails(instructorId: string) {
    if (instructorId) {
      this.router.navigate(['/admin-instructor-payments', instructorId]);
    }
  }

  getInstructorAvatarUrl(instructor: any): string {
    if (!instructor || !instructor.avatar) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor?.name || 'User')}&background=667eea&color=fff`;
    }
    return `http://localhost:3000/api/users/imagen-usuario/${instructor.avatar}`;
  }

  hasReachedThreshold(earningsTotal: number): boolean {
    const threshold = this.settings()?.minimum_payment_threshold || 0;
    return earningsTotal >= threshold;
  }

  amountToReachThreshold(earningsTotal: number): number {
    const threshold = this.settings()?.minimum_payment_threshold || 0;
    const remaining = threshold - earningsTotal;
    return remaining > 0 ? remaining : 0;
  }

  getMinimumThreshold(): number {
    return this.settings()?.minimum_payment_threshold || 0;
  }

  getDaysUntilAvailable(): number {
    return this.settings()?.days_until_available ?? 0;
  }

  isProcessingSales = signal(false);

  async processExistingSales() {
    const confirmed = await this.modalService.confirm({
      title: '¿Procesar productos de ventas existentes?',
      message: 'Esto creará registros de ganancias para los instructores por cada producto vendido que aún no tenga ganancias asociadas.\n\n⚠️ IMPORTANTE: NO se crearán ganancias para productos con reembolso completado.\n\n¿Deseas continuar?',
      icon: 'warning',
      confirmText: 'Aceptar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) {
      return;
    }

    this.isProcessingSales.set(true);

    this.adminPaymentService.processExistingSales().subscribe({
      next: (result: any) => {
        this.isProcessingSales.set(false);

        let message = `✅ Proceso completado:\n\n` +
          `📦 Productos procesados: ${result.processed}\n` +
          `⏩ Productos omitidos: ${result.skipped}\n` +
          `   (ver detalles más abajo)\n` +
          `📊 Total de productos: ${result.total}\n` +
          `💳 Ventas revisadas: ${result.sales_reviewed}\n\n`;

        if (result.skipped_details && Array.isArray(result.skipped_details) && result.skipped_details.length > 0) {
          message += 'Detalles de productos omitidos:\n';
          const maxShow = 10;
          result.skipped_details.slice(0, maxShow).forEach((d: any, i: number) => {
            message += `${i + 1}. Sale ${d.sale} - ${d.title || d.product} - Motivo: ${d.reason}` + (d.error ? ` (error: ${d.error})` : '') + '\n';
          });
          if (result.skipped_details.length > maxShow) {
            message += `... y ${result.skipped_details.length - maxShow} más\n`;
          }
          message += '\n';
        }

        if (result.processed_details && Array.isArray(result.processed_details) && result.processed_details.length > 0) {
          message += 'Productos procesados:\n';
          result.processed_details.slice(0, 10).forEach((p: any, i: number) => {
            message += `${i + 1}. Sale ${p.sale} - ${p.title || p.product}\n`;
          });
          if (result.processed_details.length > 10) {
            message += `... y ${result.processed_details.length - 10} más\n`;
          }
          message += '\n';
        }

        message += 'Recargando lista de instructores...';

        this.modalService.alert({
          title: 'Proceso Completado',
          message: message,
          icon: 'success',
          confirmText: 'Entendido'
        });

        this.loadInstructors();
      },
      error: (err) => {
        this.isProcessingSales.set(false);
        this.modalService.alert({
          title: 'Error',
          message: '❌ Error al procesar ventas: ' + (err.error?.message || err.message),
          icon: 'error',
          confirmText: 'Cerrar'
        });
      }
    });
  }
}
