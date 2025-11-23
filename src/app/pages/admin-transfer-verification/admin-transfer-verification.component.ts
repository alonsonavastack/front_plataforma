// pages/admin-transfer-verification/admin-transfer-verification.component.ts
// 🏦 COMPONENTE DE VERIFICACIÓN DE TRANSFERENCIAS BANCARIAS

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransferVerificationService, TransferSale } from '../../core/services/transfer-verification.service';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-admin-transfer-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-transfer-verification.component.html'
})
export class AdminTransferVerificationComponent implements OnInit {
  // 💉 SERVICES
  transferService = inject(TransferVerificationService);
  authService = inject(AuthService);

  // 🎯 STATE
  selectedTransfer = signal<TransferSale | null>(null);
  showVerifyModal = signal(false);
  showRejectModal = signal(false);
  
  // Formulario de verificación
  verificationNotes = signal('');
  receiptFile = signal<File | null>(null);
  receiptPreview = signal<string | null>(null);
  
  // Formulario de rechazo
  rejectionReason = signal('');
  
  // Loading states
  isVerifying = signal(false);
  isRejecting = signal(false);

  // 📊 COMPUTED SIGNALS
  transfers = computed(() => this.transferService.transfers());
  stats = computed(() => this.transferService.stats());
  isLoading = computed(() => this.transferService.isLoading());
  
  hasPendingTransfers = computed(() => this.transfers().length > 0);
  
  totalPendingAmount = computed(() => {
    return this.transfers().reduce((sum, t) => sum + t.total, 0);
  });

  ngOnInit(): void {
    console.log('🏦 [TransferVerification] Componente inicializado');
    this.loadData();
  }

  /**
   * 🔄 CARGAR DATOS
   */
  loadData(): void {
    this.transferService.reloadAll();
  }

  /**
   * ✅ ABRIR MODAL DE VERIFICACIÓN
   */
  openVerifyModal(transfer: TransferSale): void {
    this.selectedTransfer.set(transfer);
    this.verificationNotes.set('Transferencia verificada y aprobada por el administrador');
    this.receiptFile.set(null);
    this.receiptPreview.set(null);
    this.showVerifyModal.set(true);
    
    console.log('📋 [TransferVerification] Modal de verificación abierto:', transfer._id);
  }

  /**
   * 🚫 ABRIR MODAL DE RECHAZO
   */
  openRejectModal(transfer: TransferSale): void {
    this.selectedTransfer.set(transfer);
    this.rejectionReason.set('');
    this.showRejectModal.set(true);
    
    console.log('❌ [TransferVerification] Modal de rechazo abierto:', transfer._id);
  }

  /**
   * 📎 MANEJAR SELECCIÓN DE ARCHIVO
   */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Solo se permiten archivos PDF o imágenes (JPG, PNG)');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo no puede superar los 5MB');
      return;
    }

    this.receiptFile.set(file);

    // Preview para imágenes
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.receiptPreview.set(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      this.receiptPreview.set(null);
    }

    console.log('📎 [TransferVerification] Archivo seleccionado:', file.name);
  }

  /**
   * ✅ VERIFICAR TRANSFERENCIA
   */
  async verifyTransfer(): Promise<void> {
    const transfer = this.selectedTransfer();
    if (!transfer) return;

    if (!confirm('¿Estás seguro de aprobar esta transferencia? Se inscribirá automáticamente al estudiante en los cursos.')) {
      return;
    }

    this.isVerifying.set(true);

    const data: any = {
      verification_notes: this.verificationNotes()
    };

    if (this.receiptFile()) {
      data.receipt = this.receiptFile()!;
    }

    this.transferService.verifyTransfer(transfer._id, data).subscribe({
      next: (response) => {
        console.log('✅ [TransferVerification] Transferencia verificada exitosamente');
        alert(`✅ Transferencia verificada exitosamente\n\n${response.enrollments_created} inscripciones creadas`);
        this.closeVerifyModal();
        this.loadData();
      },
      error: (error) => {
        console.error('❌ [TransferVerification] Error:', error);
        alert('Error al verificar transferencia: ' + (error.error?.message || error.message));
      },
      complete: () => {
        this.isVerifying.set(false);
      }
    });
  }

  /**
   * 🚫 RECHAZAR TRANSFERENCIA
   */
  async rejectTransfer(): Promise<void> {
    const transfer = this.selectedTransfer();
    if (!transfer) return;

    const reason = this.rejectionReason().trim();
    if (!reason) {
      alert('Debe proporcionar una razón de rechazo');
      return;
    }

    if (!confirm('¿Estás seguro de rechazar esta transferencia? El estudiante será notificado.')) {
      return;
    }

    this.isRejecting.set(true);

    this.transferService.rejectTransfer(transfer._id, reason).subscribe({
      next: () => {
        console.log('✅ [TransferVerification] Transferencia rechazada');
        alert('✅ Transferencia rechazada exitosamente');
        this.closeRejectModal();
        this.loadData();
      },
      error: (error) => {
        console.error('❌ [TransferVerification] Error:', error);
        alert('Error al rechazar transferencia: ' + (error.error?.message || error.message));
      },
      complete: () => {
        this.isRejecting.set(false);
      }
    });
  }

  /**
   * ❌ CERRAR MODALES
   */
  closeVerifyModal(): void {
    this.showVerifyModal.set(false);
    this.selectedTransfer.set(null);
    this.verificationNotes.set('');
    this.receiptFile.set(null);
    this.receiptPreview.set(null);
  }

  closeRejectModal(): void {
    this.showRejectModal.set(false);
    this.selectedTransfer.set(null);
    this.rejectionReason.set('');
  }

  /**
   * 📄 VER COMPROBANTE DEL ESTUDIANTE (SI EXISTE)
   */
  viewStudentReceipt(transfer: TransferSale): void {
    const url = transfer.transfer_receipt?.student_receipt?.url;
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('El estudiante no ha subido comprobante');
    }
  }

  /**
   * 💰 FORMATEAR MONEDA
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * 📅 FORMATEAR FECHA
   */
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * 🎨 COLOR POR ESTADO
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'Pendiente': return 'bg-yellow-500/20 text-yellow-300';
      case 'Pagado': return 'bg-green-500/20 text-green-300';
      case 'Cancelado': return 'bg-red-500/20 text-red-300';
      default: return 'bg-slate-500/20 text-slate-300';
    }
  }

  /**
   * 🔄 RECARGAR
   */
  refresh(): void {
    console.log('🔄 [TransferVerification] Recargando datos...');
    this.loadData();
  }
}
