import { Component, signal, computed, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-refund-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Modal de Reembolso con Flowbite -->
    @if (isOpen()) {
      <div
        id="refund-modal"
        tabindex="-1"
        aria-hidden="false"
        class="fixed top-0 left-0 right-0 z-50 w-full h-full overflow-x-hidden overflow-y-auto bg-gray-900/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        (click)="onBackdropClick($event)"
      >
        <div class="relative w-full max-w-2xl max-h-full" (click)="$event.stopPropagation()">
          <!-- Contenido del Modal -->
          <div class="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-white/10 animate-slideUp">

            <!-- Header del Modal -->
            <div class="flex items-center justify-between p-6 border-b border-white/10 rounded-t-2xl bg-gradient-to-r from-lime-500/10 to-green-500/10">
              <div>
                <h3 class="text-2xl font-bold text-white flex items-center gap-3">
                  <svg class="w-8 h-8 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Solicitar Reembolso a Billetera
                </h3>
                <p class="text-sm text-slate-400 mt-1">
                  El saldo se acreditará automáticamente a tu billetera
                </p>
              </div>
              <button
                type="button"
                (click)="close()"
                class="text-slate-400 bg-transparent hover:bg-white/10 hover:text-white rounded-lg text-sm w-8 h-8 flex items-center justify-center transition-all duration-200"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
              </button>
            </div>

            <!-- Body del Modal -->
            <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

              <!-- Información de la Compra -->
              @if (saleInfo(); as info) {
                <div class="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20">
                  <h4 class="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Información de la Compra
                  </h4>
                  <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p class="text-slate-400">Transacción</p>
                      <p class="text-white font-mono font-semibold">{{ info.transactionNumber }}</p>
                    </div>
                    <div>
                      <p class="text-slate-400">Fecha</p>
                      <p class="text-white font-semibold">{{ info.date }}</p>
                    </div>
                    <div>
                      <p class="text-slate-400">Total Pagado</p>
                      <p class="text-lime-400 font-bold text-lg">\${{ info.total }} {{ info.currency }}</p>
                    </div>
                    <div>
                      <p class="text-slate-400">Productos</p>
                      <p class="text-white font-semibold">{{ info.items }} item(s)</p>
                    </div>
                  </div>
                </div>
              }

              <!-- 🆕 Información de Billetera -->
              <div class="bg-gradient-to-r from-lime-500/10 to-green-500/10 rounded-xl p-4 border border-lime-500/20">
                <div class="flex items-start gap-3">
                  <svg class="w-6 h-6 text-lime-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div class="flex-1">
                    <h4 class="text-sm font-semibold text-lime-400 mb-2">
                      💰 Reembolso a Billetera Digital
                    </h4>
                    <div class="text-xs text-lime-200/80 space-y-1.5">
                      <p class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        <span><strong>Acreditación instantánea</strong> - No esperes días por transferencias</span>
                      </p>
                      <p class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        <span><strong>Sin datos bancarios</strong> - Proceso simple y seguro</span>
                      </p>
                      <p class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        <span><strong>Úsalo en futuras compras</strong> - Disponible de inmediato</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Formulario de Reembolso -->
              <form class="space-y-5">

                <!-- Motivo del Reembolso -->
                <div>
                  <label for="reason_type" class="block mb-2 text-sm font-semibold text-slate-200">
                    Motivo del Reembolso <span class="text-red-400">*</span>
                  </label>
                  <select
                    id="reason_type"
                    [(ngModel)]="formData.reason_type"
                    name="reason_type"
                    class="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-lime-500 focus:border-lime-500 block w-full p-3 transition-all duration-200"
                  >
                    <option value="course_not_started">No he comenzado el curso</option>
                    <option value="dissatisfied">No cumple mis expectativas</option>
                    <option value="technical_issues">Problemas técnicos</option>
                    <option value="duplicate_purchase">Compra duplicada</option>
                    <option value="instructor_request">Solicitud del instructor</option>
                    <option value="other">Otro motivo</option>
                  </select>
                </div>

                <!-- Descripción Detallada -->
                <div>
                  <label for="reason_description" class="block mb-2 text-sm font-semibold text-slate-200">
                    Descripción Detallada <span class="text-red-400">*</span>
                  </label>
                  <textarea
                    id="reason_description"
                    [(ngModel)]="formData.reason_description"
                    name="reason_description"
                    rows="4"
                    placeholder="Por favor describe detalladamente el motivo de tu solicitud (mínimo 20 caracteres)..."
                    maxlength="500"
                    class="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-lime-500 focus:border-lime-500 block w-full p-3 transition-all duration-200 resize-none"
                  ></textarea>
                  <div class="flex items-center justify-between mt-2">
                    @if (isDescriptionValid()) {
                      <p class="text-xs text-green-400 flex items-center gap-1">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        Descripción válida
                      </p>
                    } @else {
                      <p class="text-xs text-orange-400">
                        Faltan {{ getRemainingChars() }} caracteres
                      </p>
                    }
                    <p class="text-xs text-slate-500">
                      {{ formData.reason_description.length }} / 500
                    </p>
                  </div>
                </div>

                <!-- Nota Informativa -->
                <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div class="flex gap-3">
                    <svg class="w-6 h-6 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="text-xs text-blue-200">
                      <p class="font-semibold mb-1">¿Qué sucederá después?</p>
                      <ul class="list-disc list-inside space-y-1 text-blue-300/90">
                        <li>Tu solicitud será revisada por un administrador</li>
                        <li>Una vez aprobada, <strong>el saldo se acreditará automáticamente</strong> a tu billetera</li>
                        <li>Recibirás una notificación cuando el proceso esté completo</li>
                        <li>Podrás usar tu saldo en cualquier curso o proyecto</li>
                        <li>Solo puedes solicitar reembolsos dentro de los primeros 7 días</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <!-- Footer del Modal -->
            <div class="flex items-center gap-3 p-6 border-t border-white/10 rounded-b-2xl bg-slate-800/50">
              <button
                type="button"
                (click)="close()"
                class="flex-1 text-slate-300 bg-slate-700 hover:bg-slate-600 focus:ring-4 focus:ring-slate-500/50 font-medium rounded-lg text-sm px-5 py-3 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="submit()"
                [disabled]="!isFormValid()"
                [class.opacity-50]="!isFormValid()"
                [class.cursor-not-allowed]="!isFormValid()"
                class="flex-1 text-white bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 focus:ring-4 focus:ring-lime-500/50 font-bold rounded-lg text-sm px-5 py-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-lime-500/25"
              >
                Enviar Solicitud
              </button>
            </div>

          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Animaciones del Modal */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out;
    }

    .animate-slideUp {
      animation: slideUp 0.3s ease-out;
    }

    /* Scrollbar personalizado */
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.5);
      border-radius: 10px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(132, 204, 22, 0.3);
      border-radius: 10px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(132, 204, 22, 0.5);
    }
  `]
})
export class RefundModalComponent {
  // Inputs
  isOpen = input.required<boolean>();
  sale = input<any>(null);
  userFullName = input<string>(''); // Ya no se usa, pero lo mantenemos por compatibilidad

  // Outputs
  onClose = output<void>();
  onSubmit = output<any>();

  // Estado del formulario - SIN CAMPOS BANCARIOS
  formData = {
    reason_type: 'dissatisfied',
    reason_description: ''
  };

  // Computed: Información de la venta
  saleInfo = computed(() => {
    const saleData = this.sale();
    if (!saleData) return null;

    return {
      transactionNumber: saleData.n_transaccion || 'N/A',
      total: saleData.total || 0,
      currency: saleData.currency_total || 'USD',
      date: saleData.createdAt ? new Date(saleData.createdAt).toLocaleDateString('es-MX') : 'N/A',
      items: saleData.detail?.length || 0
    };
  });

  // Validación del formulario - SOLO MOTIVO Y DESCRIPCIÓN
  isFormValid(): boolean {
    return (
      this.formData.reason_type.trim().length > 0 &&
      this.formData.reason_description.trim().length >= 20
    );
  }

  // Validación de la descripción
  isDescriptionValid(): boolean {
    return this.formData.reason_description.trim().length >= 20;
  }

  // Caracteres restantes
  getRemainingChars(): number {
    const minChars = 20;
    const currentLength = this.formData.reason_description.trim().length;
    return Math.max(0, minChars - currentLength);
  }

  // Cerrar modal
  close(): void {
    this.resetForm();
    this.onClose.emit();
  }

  // Click en el backdrop
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).id === 'refund-modal') {
      this.close();
    }
  }

  // Enviar formulario
  submit(): void {
    if (!this.isFormValid()) {
      alert('❌ Por favor completa todos los campos correctamente.');
      return;
    }

    const saleData = this.sale();
    if (!saleData) {
      alert('❌ Error: No se encontró la información de la venta.');
      return;
    }

    // Emitir SOLO los datos necesarios (sin campos bancarios)
    this.onSubmit.emit({
      sale_id: saleData._id,
      reason_type: this.formData.reason_type,
      reason_description: this.formData.reason_description
    });

    // Resetear el formulario
    this.resetForm();
  }

  // Resetear formulario
  private resetForm(): void {
    this.formData = {
      reason_type: 'dissatisfied',
      reason_description: ''
    };
  }
}
