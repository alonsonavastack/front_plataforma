import { Injectable, signal, computed, effect, inject, resource } from '@angular/core';


export interface Currency {
    code: string;
    name: string;
    symbol: string;
    flag: string;
}

export interface ExchangeRates {
    USD: number;
    EUR: number;
    COP: number;
    PEN: number;
}

@Injectable({
    providedIn: 'root'
})
export class CurrencyService {
    // 🇲🇽 MONEDA BASE: PESO MEXICANO
    private readonly BASE_CURRENCY = 'MXN';

    // 🇲🇽 Moneda seleccionada (SIEMPRE MXN)
    selectedCurrencyCode = signal<string>('MXN');

    selectedCurrency = computed(() => ({
        code: 'MXN', name: 'Peso Mexicano', symbol: '$', flag: '🇲🇽'
    }));

    constructor() { }

    setCurrency(code: string) {
        // No-op: Always MXN
        this.selectedCurrencyCode.set('MXN');
    }

    /**
     * 💵 Legacy support: treats input as MXN
     */
    convertUSDtoMXN(amount: number): number {
        return amount || 0;
    }

    /**
     * 💰 Legacy support: treats input as MXN and returns MXN
     */
    convertMXNtoSelected(amountMXN: number): number {
        return amountMXN || 0;
    }

    /**
     * 📊 Formatea un monto en MXN
     */
    format(amount: number): string {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    /**
     * 🇲🇽 Formatea siempre en MXN (para checkout)
     */
    formatMXN(amount: number): string {
        return this.format(amount);
    }

    /**
     * 📈 Rate is always 1 (MXN -> MXN)
     */
    getCurrentRate(): number {
        return 1;
    }

    /**
     * 🛒 Helpers para Checkout (legacy support)
     */
    getCheckoutPriceMXN(price: number): number {
        return price;
    }

    formatCheckoutPrice(price: number): string {
        return this.format(price);
    }

    getNumericMXN(price: number): number {
        return price;
    }
}
