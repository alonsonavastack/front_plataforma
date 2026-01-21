import { Component, input, output, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Refund } from '../../../core/services/refunds.service';

@Component({
  selector: 'app-refund-complete-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (show()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto"
        (click)="handleBackdropClick($event)"
      >
        <!-- Modal -->
        <div
          class="bg-slate-800 border border-white/20 rounded-lg max-w-xl w-full my-8 max-h-[90vh] flex flex-col"
          (click)="$event.stopPropagation()"
        >
          <!-- Header (fixed) -->
          <div class="border-b border-white/10 p-6 flex-shrink-0">
            <div class="flex items-start justify-between">
              <div>
                <h2 class="text-2xl font-bold text-white mb-2">
                  💳 Completar Reembolso
                </h2>
                @if (refund()) {
                  <p class="text-slate-400">
                    Reembolso a {{ refund()!.user?.name }} {{ refund()!.user?.surname }}
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
              <!-- Resumen del Pago -->
              <div class="bg-lime-500/10 border border-lime-500/30 rounded-lg p-4">
                <div class="text-center">
                  <div class="text-sm text-lime-300 mb-2">Monto a Transferir</div>
                  <div class="text-3xl font-bold text-lime-300">
                    {{ formatCurrency(ref.calculations.refundAmount) }}
                  </div>
                  <div class="text-sm text-slate-400 mt-1">{{ ref.currency }}</div>
                </div>
              </div>

              <!-- Método de Pago -->
              <div class="bg-slate-900 rounded-lg p-4">
                <h3 class="text-sm font-medium text-slate-400 mb-3">💳 Método de Pago</h3>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-slate-400">Método:</span>
                    <span class="text-white font-medium">{{ ref.sale?.paymentMethod || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Nota:</span>
                    <span class="text-white">{{ ref.refundDetails.accountHolder || '-' }}</span>
                  </div>
                </div>
              </div>

              <!-- Campo: Número de Referencia / ID (opcional) -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">
                  Número de Referencia / ID de Transacción (opcional)
                </label>
                <input
                  type="text"
                  [(ngModel)]="receiptNumber"
                  placeholder="Ej: TR123456789 o TXN12345"
                  class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                  [disabled]="isProcessing()"
                />
                <p class="text-xs text-slate-400 mt-1">
                  Opcional: Ingresa el ID de transacción o referencia si aplica (PayPal / proveedor de pago).
                </p>
              </div>

              <!-- Campo: Comprobante (opcional) -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">
                  Comprobante (opcional)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  (change)="handleFileChange($event)"
                  class="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                  [disabled]="isProcessing()"
                />
                <p class="text-xs text-slate-400 mt-1">
                  Opcional: Sube el comprobante (imagen o PDF)
                </p>
              </div>

              <!-- Instrucciones -->
              <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <span class="text-2xl flex-shrink-0">ℹ️</span>
                  <div class="text-sm text-blue-300">
                      <p class="font-medium mb-1">Instrucciones:</p>
                      <ol class="list-decimal list-inside space-y-1 text-blue-200">
                        <li>Procesa el reembolso a través del método de pago indicado (PayPal o Wallet)</li>
                        <li>Si corresponde, ingresa el ID de transacción o número de referencia</li>
                        <li>Opcionalmente, sube un comprobante (imagen o PDF)</li>
                        <li>El cliente recibirá una notificación automáticamente</li>
                      </ol>
                    </div>
                </div>
              </div>

              <!-- Advertencia -->
              <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <span class="text-2xl flex-shrink-0">⚠️</span>
                  <div class="text-sm text-yellow-300">
                    <p class="font-medium mb-1">Importante:</p>
                    <p class="text-yellow-200">
                      Solo marca como completado si ya procesaste el reembolso.
                      Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer (fixed) -->
            <div class="border-t border-white/10 p-6 flex-shrink-0">
              <div class="flex gap-3">
                <button
                  (click)="handleComplete()"
                  [disabled]="isProcessing()"
                  class="flex-1 px-4 py-3 bg-lime-500 hover:bg-lime-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors"
                >
                  @if (isProcessing()) {
                    <span class="inline-block animate-spin mr-2">⏳</span>
                  }
                  ✅ Marcar como Completado
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
export class RefundCompleteModalComponent {
  // Inputs
  show = input.required<boolean>();
  refund = input.required<Refund | null>();

  // Outputs
  close = output<void>();
  complete = output<{ receiptNumber: string; receiptFile?: File }>();

  // State
  receiptNumber = '';
  receiptFile: File | undefined = undefined;
  isProcessing = signal(false);

  closeModal() {
    this.receiptNumber = '';
    this.receiptFile = undefined;
    this.isProcessing.set(false);
    this.close.emit();
  }

  handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !this.isProcessing()) {
      this.closeModal();
    }
  }

  handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('⚠️ El archivo no debe superar los 5MB');
        input.value = '';
        return;
      }

      // Validar tipo
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        alert('⚠️ Solo se permiten imágenes (JPG, PNG) o PDF');
        input.value = '';
        return;
      }

      // Guardar el archivo real
      this.receiptFile = file;

    }
  }

  handleComplete() {
    const ref = this.refund();
    if (!ref || this.isProcessing()) return;

    const reference = this.receiptNumber.trim() || 'N/A';
    const confirmMsg = `¿Confirmar que has procesado el reembolso de ${this.formatCurrency(ref.calculations.refundAmount)}?\n\nID de transacción: ${reference}\n\nEsta acción no se puede deshacer.`;

    if (!confirm(confirmMsg)) return;

    this.isProcessing.set(true);
    this.complete.emit({
      receiptNumber: this.receiptNumber.trim(),
      receiptFile: this.receiptFile
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }
}
