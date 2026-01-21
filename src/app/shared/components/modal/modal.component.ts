import { Component, ElementRef, ViewChild, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 🔥 Import FormsModule
import { ModalService } from '../../../core/services/modal.service';
import { AnimateService } from '../../../core/animate.service';

@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [CommonModule, FormsModule], // 🔥 Add FormsModule
    templateUrl: './modal.component.html',
    styleUrls: ['./modal.component.css']
})
export class ModalComponent {
    modalService = inject(ModalService);
    animateService = inject(AnimateService);

    @ViewChild('backdrop') backdrop!: ElementRef;
    @ViewChild('modal') modal!: ElementRef;

    // 🔥 Local state for prompt input
    localInputValue = '';

    constructor() {
        effect(() => {
            if (this.modalService.isOpen()) {
                // Reset input value when modal opens
                this.localInputValue = '';

                // Wait for view to initialize
                setTimeout(() => {
                    if (this.backdrop?.nativeElement && this.modal?.nativeElement) {
                        this.animateService.animateModalEnter(
                            this.backdrop.nativeElement,
                            this.modal.nativeElement
                        );
                    }
                });
            }
        });
    }

    close(confirmed: boolean) {
        if (this.backdrop?.nativeElement && this.modal?.nativeElement) {
            this.animateService.animateModalLeave(
                this.backdrop.nativeElement,
                this.modal.nativeElement
            ).then(() => {
                this.modalService.close(confirmed, this.localInputValue);
            });
        } else {
            this.modalService.close(confirmed, this.localInputValue);
        }
    }

    confirm() {
        if (this.modalService.options()?.isPrompt && !this.localInputValue) {
            // Optional: prevent confirming if empty? Or let it pass and validate outside?
            // For now, let's assume non-empty is required for prompts
            // But to be safe/flexible, we just pass what we have.
            // If stricter validation is needed, we can add it here.
        }
        this.close(true);
    }

    cancel() {
        this.close(false);
    }

    onBackdropClick() {
        this.close(false);
    }
}
