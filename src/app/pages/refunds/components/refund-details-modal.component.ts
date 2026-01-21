import { Component, input, output } from '@angular/core';

import { Refund } from '../../../core/services/refunds.service';

@Component({
  selector: 'app-refund-details-modal',
  standalone: true,
  imports: [],
  template: `
    @if (show()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto"
        (click)="handleBackdropClick($event)"
      >
        <!-- Modal -->
        <div
          class="bg-slate-800 border border-white/20 rounded-lg max-w-3xl w-full my-8 max-h-[90vh] flex flex-col"
          (click)="$event.stopPropagation()"
        >
          <!-- Header (fixed) -->
          <div class="border-b border-white/10 p-6 flex-shrink-0">
            <div class="flex items-start justify-between">
              <div>
                <h2 class="text-2xl font-bold text-white mb-2">
                  💸 Detalles del Reembolso
                </h2>
                @if (refund()) {
                  <p class="text-slate-400">
                    Solicitud #{{ refund()!._id?.slice(-8) }}
                  </p>
                }
              </div>
              <button
                (click)="closeModal()"
                class="text-slate-400 hover:text-white transition-colors"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          @if (refund(); as ref) {
            <!-- Content (scrollable) -->
            <div class="overflow-y-auto flex-1 p-6 space-y-6">
              <!-- Estado -->
              <div class="bg-slate-900 rounded-lg p-4">
                <h3 class="text-sm font-medium text-slate-400 mb-3">Estado de la Solicitud</h3>
                <div class="flex items-center justify-between">
                  <span [class]="'px-4 py-2 rounded-full text-sm font-medium ' + getStatusBadgeClass(ref.status)">
                    {{ getStatusLabel(ref.status) }}
                  </span>
                  <span class="text-sm text-slate-400">
                    Solicitado: {{ formatDate(ref.requestedAt) }}
                  </span>
                </div>
              </div>

              <!-- Información del Usuario -->
              <div class="bg-slate-900 rounded-lg p-4">
                <h3 class="text-sm font-medium text-slate-400 mb-3">Cliente</h3>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-slate-400">Nombre:</span>
                    <span class="text-white font-medium">
                      {{ ref.user?.name }} {{ ref.user?.surname }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Email:</span>
                    <span class="text-white">{{ ref.user?.email }}</span>
                  </div>
                </div>
              </div>

              <!-- Curso/Proyecto -->
              <div class="bg-slate-900 rounded-lg p-4">
                <h3 class="text-sm font-medium text-slate-400 mb-3">Producto</h3>
                @if (ref.course) {
                  <div class="flex items-center gap-3">
                    <span class="text-3xl">📚</span>
                    <div>
                      <div class="text-white font-medium">{{ ref.course.title }}</div>
                      <div class="text-sm text-slate-400">Curso</div>
                    </div>
                  </div>
                }
                @if (ref.project) {
                  <div class="flex items-center gap-3">
                    <span class="text-3xl">🎯</span>
                    <div>
                      <div class="text-white font-medium">{{ ref.project.title }}</div>
                      <div class="text-sm text-slate-400">Proyecto</div>
                    </div>
                  </div>
                }
              </div>

              <!-- Motivo -->
              <div class="bg-slate-900 rounded-lg p-4">
                <h3 class="text-sm font-medium text-slate-400 mb-3">Motivo del Reembolso</h3>
                <div class="space-y-2">
                  <div>
                    <span [class]="'px-3 py-1 rounded-full text-xs font-medium ' + getStatusBadgeClass(ref.reason.type)">
                      {{ getReasonLabel(ref.reason.type) }}
                    </span>
                  </div>
                  <p class="text-white text-sm">{{ ref.reason.description }}</p>
                </div>
              </div>

              <!-- Cálculos Financieros -->
              @if (ref.calculations) {
                <div class="bg-slate-900 rounded-lg p-4">
                  <h3 class="text-sm font-medium text-slate-400 mb-4">📊 Desglose Financiero</h3>

                  <div class="space-y-3">
                    <!-- Monto Original -->
                    <div class="flex justify-between py-2 border-b border-white/10">
                      <span class="text-slate-300">Monto Original Pagado</span>
                      <span class="text-white font-medium">{{ formatCurrency(ref.originalAmount) }}</span>
                    </div>

                    <!-- Info de Billetera Digital -->
                    <div class="bg-gradient-to-r from-lime-500/10 to-green-500/10 rounded-lg p-4 border border-lime-500/20 my-4">
                      <div class="flex items-start gap-3">
                        <svg class="w-6 h-6 text-lime-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div class="flex-1">
                          <h4 class="text-sm font-semibold text-lime-400 mb-2">💰 Reembolso a Billetera Digital</h4>
                          <div class="text-xs text-lime-200/80 space-y-1.5">
                            <p class="flex items-center gap-2">
                              <svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                              </svg>
                              <span>El estudiante recibe el <strong>100% del monto pagado</strong></span>
                            </p>
                            <p class="flex items-center gap-2">
                              <svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                              </svg>
                              <span>Acreditación automática a billetera</span>
                            </p>
                            <p class="flex items-center gap-2">
                              <svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                              </svg>
                              <span>Las comisiones quedan en la plataforma</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="border-t-2 border-lime-500/30 my-3"></div>

                    <!-- Total a Reembolsar -->
                    <div class="flex justify-between py-3 bg-lime-500/10 -mx-2 px-2 rounded">
                      <span class="text-lime-300 font-bold">💰 A Acreditar en Billetera</span>
                      <span class="text-lime-300 font-bold text-lg">
                        {{ formatCurrency(ref.calculations.refundAmount) }}
                      </span>
                    </div>

                    <div class="text-center text-sm text-lime-300 font-medium mt-2 bg-lime-500/5 py-2 rounded">
                      ✅ {{ ref.calculations.refundPercentage.toFixed(0) }}% del pago original
                    </div>

                    <!-- Datos históricos (colapsable) -->
                    <details class="mt-4">
                      <summary class="cursor-pointer text-xs text-slate-400 hover:text-slate-300 transition-colors">
                        📄 Ver desglose histórico (solo referencia)
                      </summary>
                      <div class="mt-3 space-y-2 text-xs text-slate-500 pl-4 border-l-2 border-slate-700">
                        <div class="flex justify-between">
                          <span>Subtotal sin IVA:</span>
                          <span>{{ formatCurrency(ref.calculations.subtotal) }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span>IVA ({{ (ref.calculations.ivaRate * 100).toFixed(0) }}%):</span>
                          <span>{{ formatCurrency(ref.calculations.iva) }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span>Comisión Plataforma ({{ (ref.calculations.platformFeeRate * 100).toFixed(0) }}%):</span>
                          <span>{{ formatCurrency(ref.calculations.platformFee) }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span>Comisión Procesamiento ({{ (ref.calculations.processingFeeRate * 100).toFixed(0) }}%):</span>
                          <span>{{ formatCurrency(ref.calculations.processingFee) }}</span>
                        </div>
                        <p class="text-[10px] text-slate-600 mt-2 italic">
                          * Estos datos son solo para referencia. Las comisiones no se deducen del reembolso.
                        </p>
                      </div>
                    </details>
                  </div>
                </div>
              }

              <!-- Método de Pago / Detalles -->
              @if (ref.refundDetails) {
                <div class="bg-slate-900 rounded-lg p-4">
                  <h3 class="text-sm font-medium text-slate-400 mb-3">💳 Método de Pago</h3>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-slate-400">Método:</span>
                      <span class="text-white">{{ ref.sale?.paymentMethod || 'N/A' }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">Titular / Nota:</span>
                      <span class="text-white">{{ ref.refundDetails.accountHolder || '-' }}</span>
                    </div>
                    @if (ref.refundDetails.receiptNumber) {
                      <div class="flex justify-between">
                        <span class="text-slate-400">Referencia / ID:</span>
                        <span class="text-lime-300 font-medium">{{ ref.refundDetails.receiptNumber }}</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Comprobante de Reembolso -->
              @if (ref.status === 'completed' && ref.refundDetails && ref.refundDetails.receiptImage) {
                <div class="bg-slate-900 rounded-lg p-4">
                  <h3 class="text-sm font-medium text-slate-400 mb-3">📄 Comprobante de Reembolso</h3>
                  <div class="space-y-3">
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-white text-sm">Archivo subido:</span>
                      <span class="text-lime-300 text-sm">✅ Disponible</span>
                    </div>

                    <!-- Vista previa del comprobante -->
                    <div class="border border-white/10 rounded-lg overflow-hidden bg-slate-800">
                      @if (isImageFile(ref.refundDetails.receiptImage!)) {
                        <!-- Es una imagen -->
                        <div class="relative group">
                          <img
                            [src]="getReceiptUrl(ref.refundDetails.receiptImage!)"
                            [alt]="'Comprobante de reembolso'"
                            class="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                            (click)="openImageInNewTab(ref.refundDetails.receiptImage!)"
                            (error)="onImageError($event)"
                          />
                          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <span class="opacity-0 group-hover:opacity-100 text-white text-sm font-medium transition-opacity">
                              🔍 Click para ampliar
                            </span>
                          </div>
                        </div>
                      } @else {
                        <!-- Es un PDF -->
                        <div class="p-6 text-center">
                          <div class="text-6xl mb-3">📄</div>
                          <p class="text-white font-medium mb-2">Documento PDF</p>
                          <p class="text-sm text-slate-400 mb-4">{{ ref.refundDetails.receiptImage }}</p>
                          <button
                            (click)="openPdfInNewTab(ref.refundDetails.receiptImage!)"
                            class="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black rounded-lg transition-colors text-sm font-medium"
                          >
                            📥 Abrir PDF
                          </button>
                        </div>
                      }
                    </div>

                    <!-- Botón de descarga -->
                    <div class="flex gap-2">
                      <button
                        (click)="downloadReceipt(ref.refundDetails.receiptImage!)"
                        class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar Comprobante
                      </button>
                    </div>
                  </div>
                </div>
              }

              <!-- Notas Administrativas -->
              @if (ref.adminNotes) {
                <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <h3 class="text-sm font-medium text-yellow-300 mb-2">📝 Notas del Administrador</h3>
                  <p class="text-white text-sm">{{ ref.adminNotes }}</p>
                  @if (ref.reviewedBy) {
                    <p class="text-xs text-slate-400 mt-2">
                      Revisado por: {{ ref.reviewedBy.name }} {{ ref.reviewedBy.surname }}
                    </p>
                  }
                </div>
              }

              <!-- Timeline -->
              <div class="bg-slate-900 rounded-lg p-4">
                <h3 class="text-sm font-medium text-slate-400 mb-3">⏱️ Historial</h3>
                <div class="space-y-2">
                  <div class="flex items-center gap-3 text-sm">
                    <span class="w-24 text-slate-400">Solicitado:</span>
                    <span class="text-white">{{ formatDate(ref.requestedAt) }}</span>
                  </div>
                  @if (ref.reviewedAt) {
                    <div class="flex items-center gap-3 text-sm">
                      <span class="w-24 text-slate-400">Revisado:</span>
                      <span class="text-white">{{ formatDate(ref.reviewedAt) }}</span>
                    </div>
                  }
                  @if (ref.processedAt) {
                    <div class="flex items-center gap-3 text-sm">
                      <span class="w-24 text-slate-400">Procesado:</span>
                      <span class="text-white">{{ formatDate(ref.processedAt) }}</span>
                    </div>
                  }
                  @if (ref.completedAt) {
                    <div class="flex items-center gap-3 text-sm">
                      <span class="w-24 text-slate-400">Completado:</span>
                      <span class="text-white">{{ formatDate(ref.completedAt) }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Footer (fixed) -->
            <div class="border-t border-white/10 p-6 flex-shrink-0">
              <button
                (click)="closeModal()"
                class="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class RefundDetailsModalComponent {
  // Inputs
  show = input.required<boolean>();
  refund = input.required<Refund | null>();

  // Outputs
  close = output<void>();

  closeModal() {
    this.close.emit();
  }

  handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeModal();
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
      failed: 'bg-red-500/20 text-red-300',
      course_not_started: 'bg-blue-500/20 text-blue-300',
      dissatisfied: 'bg-orange-500/20 text-orange-300',
      technical_issues: 'bg-red-500/20 text-red-300',
      duplicate_purchase: 'bg-purple-500/20 text-purple-300',
      instructor_request: 'bg-cyan-500/20 text-cyan-300',
      other: 'bg-slate-500/20 text-slate-300'
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

  // Métodos para manejo de comprobantes
  isImageFile(filename: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const lowerFilename = filename.toLowerCase();
    return imageExtensions.some(ext => lowerFilename.endsWith(ext));
  }

  getReceiptUrl(filename: string): string {
    // Asumiendo que los comprobantes se guardan en uploads/refunds/
    return `http://localhost:3000/api/refunds/receipt-image/${filename}`;
  }

  openImageInNewTab(filename: string): void {
    const url = this.getReceiptUrl(filename);
    window.open(url, '_blank');
  }

  openPdfInNewTab(filename: string): void {
    const url = this.getReceiptUrl(filename);
    window.open(url, '_blank');
  }

  downloadReceipt(filename: string): void {
    const url = this.getReceiptUrl(filename);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'https://via.placeholder.com/400x300?text=Comprobante+no+disponible';
  }
}
