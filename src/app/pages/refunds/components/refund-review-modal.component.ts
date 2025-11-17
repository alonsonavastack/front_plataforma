import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Refund } from '../../../core/services/refunds.service';

@Component({
  selector: 'app-refund-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (show()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto"
        (click)="handleBackdropClick($event)"
      >
        <!-- Modal -->
        <div
          class="bg-slate-800 border border-white/20 rounded-lg max-w-2xl w-full my-8 max-h-[90vh] flex flex-col"
          (click)="$event.stopPropagation()"
        >
          <!-- Header (fixed) -->
          <div class="border-b border-white/10 p-6 flex-shrink-0">
            <div class="flex items-start justify-between">
              <div>
                <h2 class="text-2xl font-bold text-white mb-2">
                  ✅ Revisar Reembolso
                </h2>
                @if (refund()) {
                  <p class="text-slate-400">
                    Solicitud de {{ refund()!.user?.name }} {{ refund()!.user?.surname }}
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
            <div class="overflow-y-auto flex-1 p-6 space-y-4">
              <!-- Resumen del Reembolso -->
              <div class="bg-slate-900 rounded-lg p-4">
                <h3 class="text-sm font-medium text-slate-400 mb-3">Resumen</h3>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-slate-400">Monto Original:</span>
                    <span class="text-white font-medium">{{ formatCurrency(ref.originalAmount) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">A Reembolsar:</span>
                    <span class="text-lime-300 font-bold">{{ formatCurrency(ref.calculations.refundAmount) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-400">Destino:</span>
                    <span class="text-lime-300 text-sm flex items-center gap-1">
                      💰 Billetera Digital
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Producto:</span>
                    <span class="text-white">{{ ref.course?.title || ref.project?.title }}</span>
                  </div>
                </div>
              </div>

              <!-- Motivo -->
              <div class="bg-slate-900 rounded-lg p-4">
                <h3 class="text-sm font-medium text-slate-400 mb-3">Motivo</h3>
                <div class="space-y-2">
                  <span [class]="'px-3 py-1 rounded-full text-xs font-medium ' + getStatusBadgeClass(ref.reason.type)">
                    {{ getReasonLabel(ref.reason.type) }}
                  </span>
                  <p class="text-white text-sm mt-2">{{ ref.reason.description }}</p>
                </div>
              </div>

              <!-- 🆕 Info de Billetera Digital -->
              <div class="bg-gradient-to-r from-lime-500/10 to-green-500/10 rounded-lg p-4 border border-lime-500/20">
                <div class="flex items-start gap-3">
                  <svg class="w-6 h-6 text-lime-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div class="flex-1">
                    <h3 class="text-sm font-semibold text-lime-400 mb-2">💰 Reembolso a Billetera Digital</h3>
                    <div class="text-xs text-lime-200/80 space-y-1.5">
                      <p class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        <span>Al aprobar, <strong>el saldo se acreditará automáticamente</strong> a la billetera del estudiante</span>
                      </p>
                      <p class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        <span>No requiere transferencias bancarias manuales</span>
                      </p>
                      <p class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        <span>El estudiante podrá usar el saldo inmediatamente</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Notas Administrativas -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">
                  Notas (opcional para aprobar, obligatorio para rechazar)
                </label>
                <textarea
                  [(ngModel)]="notes"
                  rows="4"
                  placeholder="Escribe notas sobre esta decisión..."
                  class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                ></textarea>
              </div>

              <!-- Advertencia -->
              <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <span class="text-2xl flex-shrink-0">ℹ️</span>
                  <div class="text-sm text-blue-300">
                    <p class="font-medium mb-1">¿Qué sucederá al aprobar?</p>
                    <ul class="list-disc list-inside space-y-1 text-blue-200">
                      <li>El reembolso se marcará automáticamente como "Completado"</li>
                      <li>El saldo se acreditará <strong>instantáneamente</strong> a la billetera del estudiante</li>
                      <li>El estudiante recibirá una notificación por email</li>
                      <li>El curso/proyecto será removido de su perfil</li>
                      <li>Al rechazar, el cliente recibirá una notificación con el motivo</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer (fixed) -->
            <div class="border-t border-white/10 p-6 flex-shrink-0">
              <div class="flex gap-3">
                <button
                  (click)="handleApprove()"
                  [disabled]="isProcessing()"
                  class="flex-1 px-4 py-3 bg-lime-500 hover:bg-lime-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors"
                >
                  @if (isProcessing()) {
                    <span class="inline-block animate-spin mr-2">⏳</span>
                  }
                  ✅ Aprobar Reembolso
                </button>

                <button
                  (click)="handleReject()"
                  [disabled]="isProcessing()"
                  class="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  @if (isProcessing()) {
                    <span class="inline-block animate-spin mr-2">⏳</span>
                  }
                  ❌ Rechazar
                </button>

                <button
                  (click)="closeModal()"
                  [disabled]="isProcessing()"
                  class="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class RefundReviewModalComponent {
  // Inputs
  show = input.required<boolean>();
  refund = input.required<Refund | null>();

  // Outputs
  close = output<void>();
  approve = output<string>(); // Emite las notas
  reject = output<string>();  // Emite las notas

  // State
  notes = '';
  isProcessing = signal(false);

  closeModal() {
    this.notes = '';
    this.isProcessing.set(false);
    this.close.emit();
  }

  handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !this.isProcessing()) {
      this.closeModal();
    }
  }

  handleApprove() {
    const ref = this.refund();
    if (!ref || this.isProcessing()) return;

    const confirmMsg = `¿Aprobar reembolso de ${this.formatCurrency(ref.calculations.refundAmount)}?\n\n💰 El saldo se acreditará AUTOMÁTICAMENTE a la billetera digital del estudiante.\n\n✅ No requiere transferencia bancaria manual.\n✅ El estudiante podrá usar el saldo inmediatamente.`;

    if (!confirm(confirmMsg)) return;

    this.isProcessing.set(true);
    this.approve.emit(this.notes.trim());
  }

  handleReject() {
    if (!this.refund() || this.isProcessing()) return;

    if (!this.notes.trim()) {
      alert('⚠️ Debes proporcionar un motivo para rechazar la solicitud');
      return;
    }

    if (!confirm('¿Rechazar esta solicitud de reembolso?\n\nEl cliente recibirá una notificación.')) return;

    this.isProcessing.set(true);
    this.reject.emit(this.notes.trim());
  }

  // Helpers
  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      course_not_started: 'bg-blue-500/20 text-blue-300',
      dissatisfied: 'bg-orange-500/20 text-orange-300',
      technical_issues: 'bg-red-500/20 text-red-300',
      duplicate_purchase: 'bg-purple-500/20 text-purple-300',
      instructor_request: 'bg-cyan-500/20 text-cyan-300',
      other: 'bg-slate-500/20 text-slate-300'
    };
    return classes[status] || 'bg-slate-500/20 text-slate-300';
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}
