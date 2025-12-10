// pages/admin-payment-dashboard/admin-payment-dashboard.component.ts
// 📊 DASHBOARD COMPLETO DE ADMINISTRACIÓN DE PAGOS

import { Component, OnInit, inject, signal, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PaymentDashboardService, SaleItem, SalesFilter } from '../../core/services/payment-dashboard.service';
import { TransferVerificationService } from '../../core/services/transfer-verification.service';

@Component({
  selector: 'app-admin-payment-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-payment-dashboard.component.html'
})
export class AdminPaymentDashboardComponent implements OnInit {
  // 💉 SERVICES
  dashboardService = inject(PaymentDashboardService);
  transferService = inject(TransferVerificationService);

  // 🎯 STATE
  activeTab = signal<'overview' | 'sales' | 'wallets' | 'refunds'>('overview');

  // Filtros de ventas
  filters = signal<SalesFilter>({
    status: '',
    method_payment: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    page: 1,
    limit: 20
  });

  // Modal de detalle
  selectedSale = signal<SaleItem | null>(null);
  showDetailModal = signal(false);

  // Modal de verificación rápida
  showVerifyModal = signal(false);
  verificationNotes = signal('');
  isVerifying = signal(false);

  // 📊 COMPUTED SIGNALS
  stats = computed(() => this.dashboardService.stats());
  sales = computed(() => this.dashboardService.sales());
  pagination = computed(() => this.dashboardService.pagination());
  walletsStats = computed(() => this.dashboardService.walletsStats());
  isLoading = computed(() => this.dashboardService.isLoading());

  // Alertas
  pendingTransfers = computed(() => this.dashboardService.pendingTransfers());
  pendingRefunds = computed(() => this.dashboardService.pendingRefunds());
  hasAlerts = computed(() => this.dashboardService.hasAlerts());

  // Métodos de pago disponibles
  paymentMethods = [
    { value: '', label: 'Todos los métodos' },
    { value: 'wallet', label: '💰 Billetera Digital' },
    { value: 'transfer', label: '🏦 Transferencia' },
    { value: 'paypal', label: '💳 PayPal' },
    { value: 'stripe', label: '💳 Stripe' },
    { value: 'mercadopago', label: '💳 MercadoPago' }
  ];

  // Estados disponibles
  statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'Pendiente', label: '⏳ Pendiente' },
    { value: 'Pagado', label: '✅ Pagado' },
    { value: 'Cancelado', label: '❌ Cancelado' }
  ];

  ngOnInit(): void {
    this.loadDashboard();
  }

  /**
   * 🔄 CARGAR DASHBOARD
   */
  loadDashboard(): void {
    this.dashboardService.loadAll();
  }

  /**
   * 📋 CAMBIAR TAB
   */
  setActiveTab(tab: 'overview' | 'sales' | 'wallets' | 'refunds'): void {
    this.activeTab.set(tab);

    if (tab === 'wallets') {
      this.dashboardService.loadWalletsStats().subscribe();
    } else if (tab === 'refunds') {
      this.dashboardService.loadRefundsSummary().subscribe();
    }
  }

  /**
   * 🔄 ACTUALIZAR FILTRO INDIVIDUAL
   */
  updateFilter(filterKey: keyof SalesFilter, value: any): void {
    const currentFilters = this.filters();
    (currentFilters as any)[filterKey] = value;
    this.filters.set({ ...currentFilters });
  }

  /**
   * 🔍 APLICAR FILTROS
   */
  applyFilters(): void {
    const currentFilters = this.filters();
    currentFilters.page = 1; // Reset a página 1
    this.filters.set({ ...currentFilters });
    this.dashboardService.loadSales(currentFilters).subscribe();
  }

  /**
   * 🧹 LIMPIAR FILTROS
   */
  clearFilters(): void {
    this.filters.set({
      status: '',
      method_payment: '',
      dateFrom: '',
      dateTo: '',
      search: '',
      page: 1,
      limit: 20
    });
    this.dashboardService.loadSales(this.filters()).subscribe();
  }

  /**
   * 📄 CAMBIAR PÁGINA
   */
  changePage(page: number): void {
    if (page < 1 || page > this.pagination().pages) return;

    const currentFilters = this.filters();
    currentFilters.page = page;
    this.filters.set({ ...currentFilters });
    this.dashboardService.loadSales(currentFilters).subscribe();
  }

  /**
   * 👁️ VER DETALLE DE VENTA
   */
  viewSaleDetail(sale: SaleItem): void {
    this.selectedSale.set(sale);
    this.showDetailModal.set(true);
  }

  /**
   * ✅ ABRIR MODAL DE VERIFICACIÓN RÁPIDA
   */
  openQuickVerify(sale: SaleItem): void {
    if (sale.method_payment !== 'transfer' || sale.status !== 'Pendiente') {
      alert('Solo se pueden verificar transferencias pendientes');
      return;
    }

    this.selectedSale.set(sale);
    this.verificationNotes.set('Verificado desde el Dashboard de Pagos');
    this.showVerifyModal.set(true);
  }

  /**
   * ✅ VERIFICAR TRANSFERENCIA RÁPIDA
   */
  quickVerify(): void {
    const sale = this.selectedSale();
    if (!sale) return;

    if (!confirm('¿Verificar esta transferencia? Se inscribirá automáticamente al estudiante.')) {
      return;
    }

    this.isVerifying.set(true);

    this.transferService.verifyTransfer(sale._id, {
      verification_notes: this.verificationNotes()
    }).subscribe({
      next: (response) => {
        alert('✅ Transferencia verificada exitosamente');
        this.closeVerifyModal();
        this.loadDashboard();
      },
      error: (error) => {
        alert('Error: ' + (error.error?.message || error.message));
      },
      complete: () => {
        this.isVerifying.set(false);
      }
    });
  }

  /**
   * ❌ CERRAR MODALES
   */
  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedSale.set(null);
  }

  closeVerifyModal(): void {
    this.showVerifyModal.set(false);
    this.selectedSale.set(null);
    this.verificationNotes.set('');
  }

  /**
   * ✅ VERIFICAR TRANSFERENCIA RÁPIDA (desde modal)
   */
  verifyFromModal(): void {
    this.quickVerify();
  }

  /**
   * 📤 EXPORTAR A CSV
   */
  exportToCSV(): void {
    this.dashboardService.exportSales(this.filters());
  }

  /**
   * 🔄 RECARGAR
   */
  refresh(): void {
    this.loadDashboard();
  }

  // ============ HELPERS ============

  /**
   * 📊 Calcula el porcentaje de ancho para la barra de métodos de pago
   */
  getMethodPercentage(count: number): number {
    const stats = this.stats();
    if (!stats?.sales?.byMethod) return 0;

    const total = stats.sales.byMethod.reduce((sum: number, m) => sum + (m.count || 0), 0);
    if (total === 0) return 0;
    return (count / total) * 100;
  }

  /**
   * 📊 Calcula la altura relativa para el gráfico de días
   */
  getDayHeight(amount: number): number {
    const stats = this.stats();
    if (!stats?.sales?.byDay) return 0;

    const max = Math.max(
      ...(stats.sales.byDay || []).map((d) => d.total || 0),
      1
    );

    if (max === 0) return 0;
    return (amount / max) * 100;
  }  /**
   * 🖼️ Obtiene la URL de la imagen del producto
   */
  getProductImage(productType: string, imagePath: string | undefined): string {
    if (!imagePath) {
      return '/assets/placeholder.png';
    }

    // Si ya es una URL completa, retornarla
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    // Construir URL según el tipo de producto
    const environment = {
      images: {
        course: 'http://localhost:3000/api/course/imagen/',
        project: 'http://localhost:3000/api/project/imagen/',
        user: 'http://localhost:3000/api/user/imagen/'
      }
    };

    const baseUrl = environment.images[productType as keyof typeof environment.images]
      || environment.images.course;

    return baseUrl + imagePath;
  }

  formatCurrency(amount: number, currency: string = 'MXN'): string {
    return this.dashboardService.formatCurrency(amount, currency);
  }

  getStatusColor(status: string): string {
    return this.dashboardService.getStatusColor(status);
  }

  getMethodColor(method: string): string {
    return this.dashboardService.getMethodColor(method);
  }

  getMethodIcon(method: string): string {
    return this.dashboardService.getMethodIcon(method);
  }

  getMethodName(method: string): string {
    return this.dashboardService.getMethodName(method);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatShortDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric'
    });
  }

  // Paginación
  get visiblePages(): number[] {
    const total = this.pagination().pages;
    const current = this.pagination().page;
    const pages: number[] = [];

    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
      pages.push(i);
    }

    return pages;
  }
}
