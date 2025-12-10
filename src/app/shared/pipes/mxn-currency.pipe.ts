import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService } from '../../services/currency.service';

/**
 * 💰 Pipe MXN Currency
 * 
 * Convierte automáticamente precios USD (BD) a la moneda seleccionada por el usuario
 * 
 * Uso:
 * {{ priceUSD | mxnCurrency }}                    → Convierte y formatea en moneda seleccionada
 * {{ priceUSD | mxnCurrency:currencyCode() }}     → Reactivo a cambios de moneda
 * 
 * Ejemplos:
 * - Input: 10 USD | Output (MXN): $205 (redondeado hacia arriba)
 * - Input: 10 USD | Output (USD): $10
 */
@Pipe({
    name: 'mxnCurrency',
    standalone: true,
    pure: false
})
export class MxnCurrencyPipe implements PipeTransform {
    private currencyService = inject(CurrencyService);

    transform(valueUSD: number | undefined | null, triggerArg?: string): string {
        // 1. Validar entrada (Modelo en USD)
        if (valueUSD === undefined || valueUSD === null) return '';
        if (valueUSD === 0) return this.currencyService.format(0);

        // 2. Paso fundamental: Convertir el modelo (USD) a la moneda base del sistema (MXN)
        // Esto satisface el requerimiento "Quiero que todo sea en Pesos Mexicanos"
        const amountMXN = this.currencyService.convertUSDtoMXN(valueUSD);

        // 3. Convertir de MXN a la moneda seleccionada por el usuario
        // Si el usuario seleccionó MXN, esto retornará el mismo valor
        const finalAmount = this.currencyService.convertMXNtoSelected(amountMXN);

        // 4. Formatear
        return this.currencyService.format(finalAmount);
    }
}
