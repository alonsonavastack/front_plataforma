import { Component, OnInit, signal, computed, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RefundsService, Refund } from '../../core/services/refunds.service';
import { AuthService } from '../../core/services/auth';

// Importar modales
import { RefundDetailsModalComponent } from './components/refund-details-modal.component';
import { RefundReviewModalComponent } from './components/refund-review-modal.component';
import { RefundCompleteModalComponent } from './components/refund-complete-modal.component';

@Component({
  selector: 'app-refunds',
  standalone: true,
  imports: [
    FormsModule,
    RefundDetailsModalComponent,
    RefundReviewModalComponent,
    RefundCompleteModalComponent
  ],
  templateUrl: './refunds.component.html'
})
export class RefundsComponent implements OnInit {
  private refundsService = inject(RefundsService);
  private authService = inject(AuthService);

  // Signals
  refunds = computed(() => this.refundsService.refunds());
  isLoading = computed(() => this.refundsService.isLoading());

  // Filtros
  statusFilter = signal<string>('all');
  searchTerm = signal('');
  currentPage = signal(1);
  itemsPerPage = signal(10);

  // Modal de detalles
  showDetailsModal = signal(false);
  selectedRefund = signal<Refund | null>(null);

  // Modal de revisión
  showReviewModal = signal(false);
  reviewRefund = signal<Refund | null>(null);

  // Modal de completar
  showCompleteModal = signal(false);
  completeRefund = signal<Refund | null>(null);

  // Computed: Refunds filtrados
  filteredRefunds = computed(() => {
    const status = this.statusFilter();
    const search = this.searchTerm().toLowerCase().trim();
    let filtered = this.refunds();

    // Filtrar por estado
    if (status !== 'all') {
      filtered = filtered.filter(r => r.status === status);
    }

    // Filtrar por búsqueda (nombre usuario, curso, monto)
    if (search) {
      filtered = filtered.filter(r => {
        const userName = r.user?.name?.toLowerCase() || '';
        const userSurname = r.user?.surname?.toLowerCase() || '';
        const courseName = r.course?.title?.toLowerCase() || '';
        const projectName = r.project?.title?.toLowerCase() || '';
        const amount = r.originalAmount.toString();

        return userName.includes(search) ||
          userSurname.includes(search) ||
          courseName.includes(search) ||
          projectName.includes(search) ||
          amount.includes(search);
      });
    }

    return filtered;
  });

  // Computed: Paginación
  totalPages = computed(() =>
    Math.ceil(this.filteredRefunds().length / this.itemsPerPage())
  );

  paginatedRefunds = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredRefunds().slice(start, end);
  });

  // Computed: Estadísticas
  stats = computed(() => {
    const refunds = this.filteredRefunds();
    return {
      total: refunds.length,
      pending: refunds.filter(r => r.status === 'pending').length,
      processing: refunds.filter(r => r.status === 'processing').length,
      completed: refunds.filter(r => r.status === 'completed').length,
      rejected: refunds.filter(r => r.status === 'rejected').length,
      totalOriginal: refunds.reduce((sum, r) => sum + r.originalAmount, 0),
      totalRefunded: refunds.reduce((sum, r) => sum + (r.calculations?.refundAmount || 0), 0)
    };
  });

  // Usuario actual
  user = computed(() => this.authService.user());

  async ngOnInit() {
    await this.loadRefunds();
  }

  async loadRefunds() {
    await this.refundsService.loadRefunds();
  }

  // Abrir modal de detalles
  openDetailsModal(refund: Refund) {
    this.selectedRefund.set(refund);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal() {
    this.showDetailsModal.set(false);
    this.selectedRefund.set(null);
  }

  // Abrir modal de revisión
  openReviewModal(refund: Refund) {
    this.reviewRefund.set(refund);
    this.showReviewModal.set(true);
  }

  closeReviewModal() {
    this.showReviewModal.set(false);
    this.reviewRefund.set(null);
  }

  // Aprobar reembolso
  async handleApprove(notes: string) {
    const refund = this.reviewRefund();
    if (!refund) return;

    try {
      await this.refundsService.reviewRefund(refund._id!, 'approved', notes);
      alert('✅ Reembolso aprobado. Ahora debe procesarse el pago.');
      this.closeReviewModal();
    } catch (error) {
      alert('❌ Error al aprobar reembolso');

    }
  }

  // Rechazar reembolso
  async handleReject(notes: string) {
    const refund = this.reviewRefund();
    if (!refund) return;

    try {
      await this.refundsService.reviewRefund(refund._id!, 'rejected', notes);
      alert('✅ Reembolso rechazado');
      this.closeReviewModal();
    } catch (error) {
      alert('❌ Error al rechazar reembolso');

    }
  }

  // Abrir modal de completar
  openCompleteModal(refund: Refund) {
    this.completeRefund.set(refund);
    this.showCompleteModal.set(true);
  }

  closeCompleteModal() {
    this.showCompleteModal.set(false);
    this.completeRefund.set(null);
  }

  // Marcar como completado
  async handleComplete(data: { receiptNumber: string; receiptImage?: string }) {
    const refund = this.completeRefund();
    if (!refund) return;

    try {
      // ✅ CORRECCIÓN: Pasar receiptImage (string) en lugar de receiptFile (File)
      await this.refundsService.markCompleted(refund._id!, data.receiptNumber, data.receiptImage);
      alert('✅ Reembolso completado');
      this.closeCompleteModal();
    } catch (error) {
      alert('❌ Error al completar reembolso');

    }
  }

  // Helpers
  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-300',
      approved: 'bg-green-500/20 text-green-300',
      rejected: 'bg-red-500/20 text-red-300',
      processing: 'bg-blue-500/20 text-blue-300',
      completed: 'bg-lime-500/20 text-lime-300',
      failed: 'bg-red-500/20 text-red-300'
    };
    return classes[status] || 'bg-slate-500/20 text-slate-300';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      processing: 'Procesando',
      completed: 'Completado',
      failed: 'Fallido'
    };
    return labels[status] || status;
  }

  getReasonLabel(type: string): string {
    const labels: Record<string, string> = {
      course_not_started: 'Curso no iniciado',
      dissatisfied: 'Insatisfecho',
      technical_issues: 'Problemas técnicos',
      duplicate_purchase: 'Compra duplicada',
      instructor_request: 'Solicitud del instructor',
      other: 'Otro'
    };
    return labels[type] || type;
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  // Navegación de paginación
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  // Puede revisar reembolso (Admin o Instructor dueño)
  canReview(refund: Refund): boolean {
    const currentUser = this.user();
    if (!currentUser) return false;
    if (refund.status !== 'pending') return false;

    if (currentUser.rol === 'admin') return true;

    if (currentUser.rol === 'instructor') {
      const courseUserId = refund.course?.user?._id || refund.course?.user;
      const projectUserId = refund.project?.user?._id || refund.project?.user;
      return courseUserId === currentUser._id || projectUserId === currentUser._id;
    }

    return false;
  }

  // Puede completar reembolso (Solo Admin)
  canComplete(refund: Refund): boolean {
    const currentUser = this.user();
    return currentUser?.rol === 'admin' && refund.status === 'processing';
  }

  // Exponer Math para el template
  Math = Math;
}
