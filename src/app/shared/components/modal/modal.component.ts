import { Component, ElementRef, ViewChild, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../core/services/modal.service';
import { AnimateService } from '../../../core/animate.service';

@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './modal.component.html',
    styleUrls: ['./modal.component.css']
})
export class ModalComponent {
    modalService = inject(ModalService);
    animateService = inject(AnimateService);

    @ViewChild('backdrop') backdrop!: ElementRef;
    @ViewChild('modal') modal!: ElementRef;

    constructor() {
        effect(() => {
            if (this.modalService.isOpen()) {
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
                this.modalService.close(confirmed);
            });
        } else {
            this.modalService.close(confirmed);
        }
    }

    confirm() {
        this.close(true);
    }

    cancel() {
        this.close(false);
    }

    onBackdropClick() {
        this.close(false);
    }
}
