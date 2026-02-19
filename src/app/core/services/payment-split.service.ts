import { Injectable } from '@angular/core';

export interface PaymentSplit {
    totalPaid: number;
    paypalFee: number;
    netAmount: number;
    vendorShare: number;
    platformShare: number;
    currency: string;
    error?: boolean;
    message?: string;
}

@Injectable({
    providedIn: 'root'
})
export class PaymentSplitService {

    constructor() { }

    /**
     * Calcula el desglose de pago simétrico al backend.
     * @param amount Monto total de la transacción
     */
    calculateSplit(amount: number): PaymentSplit {
        if (!amount || amount <= 0) {
            return {
                totalPaid: 0,
                paypalFee: 0,
                netAmount: 0,
                vendorShare: 0,
                platformShare: 0,
                currency: 'MXN',
                error: true,
                message: 'El monto debe ser mayor a 0'
            };
        }

        // Constantes PayPal México
        const FIXED_FEE = 4.00;
        const PERCENTAGE_FEE = 0.0395; // 3.95%
        const IVA = 1.16;

        // Cálculo inicial
        let rawFee = ((amount * PERCENTAGE_FEE) + FIXED_FEE) * IVA;

        // REDONDEO STEP 1: Fee de PayPal a 2 decimales
        let paypalFee = parseFloat(rawFee.toFixed(2));

        // Evitar fee negativo o mayor al monto
        if (paypalFee > amount) {
            paypalFee = amount;
        }

        // 3. Monto Neto (Usando el fee ya redondeado)
        const netAmount = parseFloat((amount - paypalFee).toFixed(2));

        let vendorShare = 0;
        let platformShare = 0;

        if (netAmount > 0) {
            // REDONDEO STEP 2: Vendor share a 2 decimales
            vendorShare = parseFloat((netAmount * 0.70).toFixed(2));

            // REDONDEO STEP 3: Platform share es el restante exacto
            platformShare = parseFloat((netAmount - vendorShare).toFixed(2));
        }

        return {
            totalPaid: parseFloat(amount.toFixed(2)),
            paypalFee: paypalFee,
            netAmount: netAmount,
            vendorShare: vendorShare,
            platformShare: platformShare,
            currency: 'MXN'
        };
    }
}
