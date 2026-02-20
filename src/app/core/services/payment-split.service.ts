import { Injectable } from '@angular/core';

export interface PaymentSplit {
    totalPaid: number;
    stripeFee: number;
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

    /**
     * Calcula el desglose de pago con fees de Stripe México.
     * Stripe MX: 3.6% + $3.00 MXN + IVA
     * @param amount Monto total de la transacción en MXN
     */
    calculateSplit(amount: number): PaymentSplit {
        if (!amount || amount <= 0) {
            return {
                totalPaid: 0,
                stripeFee: 0,
                netAmount: 0,
                vendorShare: 0,
                platformShare: 0,
                currency: 'MXN',
                error: true,
                message: 'El monto debe ser mayor a 0'
            };
        }

        // Stripe México: 3.6% + $3.00 MXN fijo + 16% IVA sobre el fee
        const FIXED_FEE = 3.00;
        const PERCENTAGE_FEE = 0.036; // 3.6%
        const IVA = 1.16;

        const rawFee = ((amount * PERCENTAGE_FEE) + FIXED_FEE) * IVA;
        const stripeFee = parseFloat(rawFee.toFixed(2));

        const netAmount = parseFloat((amount - stripeFee).toFixed(2));

        let vendorShare = 0;
        let platformShare = 0;

        if (netAmount > 0) {
            vendorShare = parseFloat((netAmount * 0.70).toFixed(2));
            platformShare = parseFloat((netAmount - vendorShare).toFixed(2));
        }

        return {
            totalPaid: parseFloat(amount.toFixed(2)),
            stripeFee,
            netAmount,
            vendorShare,
            platformShare,
            currency: 'MXN'
        };
    }
}
