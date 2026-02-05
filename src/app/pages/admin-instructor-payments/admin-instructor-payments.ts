import { Component, inject, signal, OnInit, computed, effect } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminPaymentService, InstructorWithEarnings, CommissionSettings } from '../../core/services/admin-payment.service';
import { ModalService } from '../../core/services/modal.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
  summary = this.adminPaymentService.instructorsSummary;
  isLoading = this.adminPaymentService.isLoadingInstructors;
  error = this.adminPaymentService.instructorsError;

  // Configuración de comisiones
  settings = this.adminPaymentService.commissionSettings;
  isLoadingSettings = this.adminPaymentService.isLoadingCommission;

  // 🆕 Formulario de filtros actualizado con fechas
  filterForm = new FormGroup({
    status: new FormControl('all'),
    minAmount: new FormControl<number | null>(0),
    country: new FormControl('all'),
    paymentMethod: new FormControl('all'), // ✅ Actualizado: solo wallet, paypal, mixed_paypal
    startDate: new FormControl<string | null>(null),
    endDate: new FormControl<string | null>(null),
  });

  hasInstructors = computed(() => this.instructors().length > 0);
  totalEarnings = computed(() => Number(this.summary()?.totalEarnings) || 0);

  // 🆕 Estadísticas por método de pago
  paymentMethodStats = computed(() => (this.summary() as any)?.paymentMethodStats || {
    wallet: { count: 0, total: 0 },
    paypal: { count: 0, total: 0 },
    mixed_paypal: { count: 0, total: 0, wallet_part: 0, paypal_part: 0 }
  });

  // Filtros de país
  availableCountries = computed(() => {
    const instructors = this.instructors();
    const countries = new Set<string>();
    instructors.forEach((i: InstructorWithEarnings) => {
      const country = i.instructor.country || i.paymentConfig.country || 'INTL';
      countries.add(country);
    });
    return Array.from(countries).sort();
  });

  // Instructores filtrados (solo por país en frontend, resto en backend)
  filteredInstructors = computed(() => {
    let instructors = this.instructors();
    const country = this.filterForm.get('country')?.value;

    if (country && country !== 'all') {
      instructors = instructors.filter((i: InstructorWithEarnings) => {
        const instructorCountry = i.instructor.country || i.paymentConfig.country || 'INTL';
        return instructorCountry === country;
      });
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
    // 🔥 Cargar datos iniciales
    this.loadInstructors();
    this.loadSettings();

    // 🔥 DEBOUNCING: Escuchar cambios en filtros con delay
    this.filterForm.valueChanges
      .pipe(
        debounceTime(500), // Esperar 500ms después del último cambio
        distinctUntilChanged() // Solo si el valor cambió
      )
      .subscribe(() => {
        // 🔒 LOG REMOVIDO POR SEGURIDAD
        this.currentPage.set(1);
        this.loadInstructors();
      });
  }

  loadSettings() {
    // 🔥 CORRECCIÓN: Suscribirse al observable
    this.adminPaymentService.loadCommissionSettings().subscribe({
      next: () => {
        // 🔒 LOG REMOVIDO POR SEGURIDAD
      },
      error: (err) => {
        console.error('❌ [AdminPayments] Error al cargar settings:', err);
      }
    });
  }

  loadInstructors() {
    const formValue = this.filterForm.value;

    // 🔒 LOG REMOVIDO POR SEGURIDAD

    const filters: {
      status?: string;
      minAmount?: number;
      paymentMethod?: string;
      startDate?: string;
      endDate?: string;
    } = {
      status: formValue.status === 'all' ? undefined : formValue.status || undefined,
      minAmount: (formValue.minAmount && formValue.minAmount > 0) ? formValue.minAmount : undefined,
      paymentMethod: formValue.paymentMethod === 'all' ? undefined : formValue.paymentMethod || undefined,
      startDate: formValue.startDate || undefined,
      endDate: formValue.endDate || undefined
    };

    // ✅ Limpiar propiedades undefined
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof typeof filters] === undefined) {
        delete filters[key as keyof typeof filters];
      }
    });

    // 🔒 LOG REMOVIDO POR SEGURIDAD
    // 🔒 LOG REMOVIDO POR SEGURIDAD

    // 🔥 CORRECCIÓN: Llamar al método correcto del servicio
    this.adminPaymentService.loadInstructors(filters).subscribe({
      next: () => {
        console.log('✅ [AdminPayments] Instructores cargados exitosamente');
      },
      error: (err) => {
        console.error('❌ [AdminPayments] Error al cargar instructores:', err);
      }
    });
  }

  onFilterChange() {
    // 🔥 REMOVIDO: Ya no necesitamos este método porque el debouncing
    // en ngOnInit maneja los cambios automáticamente
    // Este método se puede mantener vacío para compatibilidad con el template
  }

  clearFilters() {
    this.filterForm.reset({
      status: 'all',
      minAmount: 0,
      country: 'all',
      paymentMethod: 'all',
      startDate: null,
      endDate: null
    });
    this.currentPage.set(1);
    this.loadInstructors();
  }

  // 🆕 NUEVOS HELPERS para métodos de pago
  getPaymentMethodIcon(method: string): string {
    const icons: Record<string, string> = {
      wallet: '💰',
      paypal: '💳',
      mixed_paypal: '🔀'
    };
    return icons[method] || '❓';
  }

  getPaymentMethodName(method: string): string {
    const names: Record<string, string> = {
      wallet: 'Billetera',
      paypal: 'PayPal',
      mixed_paypal: 'Mixto (Wallet + PayPal)'
    };
    return names[method] || method;
  }

  getPaymentMethodBadgeClass(method: string): string {
    const classes: Record<string, string> = {
      wallet: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      paypal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      mixed_paypal: 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30'
    };
    return classes[method] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }

  // Métodos de navegación y helpers existentes
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

  viewInstructorDetails(instructorId: string) {
    if (instructorId) {
      this.router.navigate(['/admin-instructor-payments', instructorId]);
    }
  }

  getInstructorAvatarUrl(instructor: any): string {
    const environment = {
      images: {
        course: 'https://api.devhubsharks.com/api/courses/imagen-course/',
        project: 'https://api.devhubsharks.com/api/projects/imagen-project/',
        user: 'https://api.devhubsharks.com/api/users/imagen-usuario/'
      }
    };
    if (!instructor || !instructor.avatar) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor?.name || 'User')}&background=667eea&color=fff`;
    }
    return `${environment.images.user}${instructor.avatar}`;
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
          `📊 Total de productos: ${result.total}\n` +
          `💳 Ventas revisadas: ${result.sales_reviewed}\n\n`;

        if (result.skipped_details && Array.isArray(result.skipped_details) && result.skipped_details.length > 0) {
          message += 'Detalles de productos omitidos:\n';
          const maxShow = 10;
          result.skipped_details.slice(0, maxShow).forEach((d: any, i: number) => {
            message += `${i + 1}. Sale ${d.sale} - ${d.title || d.product} - Motivo: ${d.reason}\n`;
          });
          if (result.skipped_details.length > maxShow) {
            message += `... y ${result.skipped_details.length - maxShow} más\n`;
          }
        }

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
