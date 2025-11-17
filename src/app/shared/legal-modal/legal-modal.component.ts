import { Component, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

export type LegalModalType = 'privacy' | 'terms' | null;

@Component({
  selector: 'app-legal-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './legal-modal.component.html',
  styleUrls: ['./legal-modal.component.css']
})
export class LegalModalComponent {
  // Inputs
  isOpen = input.required<boolean>();
  modalType = input.required<LegalModalType>();

  // Outputs
  close = output<void>();

  constructor() {
    // Effect para controlar el overflow del body
    effect(() => {
      if (this.isOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
    });
  }

  closeModal(): void {
    this.close.emit();
  }

  // Prevenir que el click en el contenido cierre el modal
  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }
}
