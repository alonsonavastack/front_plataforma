import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaxBreakdownService } from '../../../core/services/tax-breakdown.service';

@Component({
    selector: 'app-sale-detail-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './sale-detail-modal.component.html',
})
export class SaleDetailModalComponent {
    @Input() retention: any;
    @Output() close = new EventEmitter<void>();
    @Output() declared = new EventEmitter<void>();

    private taxService = inject(TaxBreakdownService);
    isDeclaring = signal(false);
    isResending = signal(false);

    /**
     * Calcula el monto total que pagó el cliente
     */
    getClientTotal(): number {
        if (this.retention?.sale?.total_amount) {
            return this.retention.sale.total_amount;
        }
        const netoRepartir = this.retention.gross_earning * 2;
        const paypalIn = this.getPayPalInCommission();
        return netoRepartir + paypalIn;
    }

    /**
     * Calcula la comisión de PayPal al recibir el pago
     */
    getPayPalInCommission(): number {
        if (this.retention?.platform_breakdown?.paypal_receive_commission) {
            return this.retention.platform_breakdown.paypal_receive_commission;
        }
        const clientTotal = this.retention?.sale?.total_amount || (this.retention.gross_earning * 2 + 8.40);
        return (clientTotal * 0.04) + 4.00;
    }

    /**
     * Declarar CFDI (primera vez)
     */
    onDeclare() {
        if (this.isDeclaring()) return;

        this.isDeclaring.set(true);
        this.taxService.generateCFDI(this.retention._id).subscribe({
            next: (res: any) => {
                console.log('✅ Declaración exitosa', res);
                // Actualizar el status localmente para que el botón cambie
                this.retention.status = 'declared';
                // Si el backend devolvió URLs de CFDI, guardarlas para mostrar botones de descarga
                if (res?.urls) {
                    this.retention.cfdi_xml_url = res.urls.xml;
                    this.retention.cfdi_pdf_url = res.urls.pdf;
                }
                this.isDeclaring.set(false);
                this.declared.emit();
                // NO cerrar el modal para que vean el botón de reenviar
            },
            error: (err) => {
                console.error('❌ Error declarando', err);
                alert('Error al declarar. Intenta de nuevo.');
                this.isDeclaring.set(false);
            }
        });
    }
}
