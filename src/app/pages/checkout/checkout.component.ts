// checkout.component.ts - 🆕 SISTEMA DE COMPRA DIRECTA (SIN CARRITO)
import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { MxnCurrencyPipe } from '../../shared/pipes/mxn-currency.pipe';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CheckoutService, PaymentMethod } from '../../core/services/checkout.service';
import { AuthService } from '../../core/services/auth';
import { WalletService } from '../../core/services/wallet.service';
import { PurchasesService } from '../../core/services/purchases.service';
import { ProfileService } from '../../core/services/profile.service'; // 🔥 NUEVO
import { ProfileStudentService } from '../../core/services/profile-student.service'; // 🔥 CRÍTICO
import { ModalService } from '../../core/services/modal.service';
import { DiscountService } from '../../core/services/discount.service'; // 🔥 NUEVO
import { CartService, CartItem } from '../../core/services/cart.service'; // 🆕 CartService restaurado
import { CurrencyService } from '../../services/currency.service'; // 🇲🇽 NUEVO
import { environment } from '../../../environments/environment';

interface CheckoutProduct {
  _id: string;
  title: string;
  subtitle?: string;
  price_mxn: number;
  imagen?: string;
  slug?: string;
  type: 'course' | 'project';
  categorie?: any; // 🔥 Necesario para descuentos por categoría
}

interface Country {
  code: string;
  name: string;
  currency: string;
  symbol: string;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MxnCurrencyPipe],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent implements OnInit, OnDestroy {
  checkoutService = inject(CheckoutService);
  authService = inject(AuthService);
  walletService = inject(WalletService);
  purchasesService = inject(PurchasesService);
  profileService = inject(ProfileService); // 🔥 NUEVO
  modalService = inject(ModalService);
  discountService = inject(DiscountService); // 🔥 NUEVO
  cartService = inject(CartService); // 🆕
  currencyService = inject(CurrencyService); // 🇲🇽 NUEVO
  router = inject(Router);

  // 🔥 IMPORTAR ProfileStudentService para recargar correctamente
  private profileStudentService = inject(ProfileStudentService);

  // 🆕 PRODUCTO ÚNICO EN CHECKOUT (Compra Directa)
  product = signal<CheckoutProduct | null>(null);
  productType = signal<'course' | 'project' | null>(null);

  // 🆕 CARRITO (Compra Mixta)
  cartItems = computed(() => this.cartService.cart());
  isDirectBuy = signal(true); // true = compra directa, false = carrito

  // State
  selectedPaymentMethod = signal<string>('');
  isProcessing = signal(false);
  showSuccess = signal(false);
  showWarningModal = signal(false);
  errorMessage = signal<string>('');
  transactionNumber = signal<string>('');




  // 🆕 Multi-country support - FROM SERVICE
  countries = this.checkoutService.supportedCountries;
  selectedCountry = signal<string>('MX'); // Default to Mexico
  selectedCountryData = computed(() =>
    this.countries().find((c: any) => c.code === this.selectedCountry())
  );

  // 🆕 Conversion state (simulated for UI before backend confirmation)
  // In a real app, you might want to fetch live rates or use the backend response
  // For now, we'll rely on the backend to do the actual conversion during payment
  // but we can show an estimate if we had the rates. 
  // Since the prompt says backend handles it, we will show the conversion *result* 
  // after the user selects transfer or in the summary if we fetch rates.
  // For this implementation, we will focus on sending the country.
  // 🆕 Wallet state
  walletBalance = computed(() => this.walletService.balance());
  useWalletBalance = signal(false);
  walletAmount = signal(0);

  // 🆕 Descuentos
  discounts = computed(() => this.discountService.discounts());

  // 🔥 Calcular el mejor descuento disponible (para compra directa o carrito)
  bestDiscount = computed(() => {
    // Si es carrito, no aplicamos descuentos individuales complejos por ahora
    // O podríamos iterar sobre cada item. Para simplificar, en carrito usaremos descuentos simples si existen.
    // EN ESTA VERSIÓN: Descuentos solo para Compra Directa por simplicidad, o implementar lógica iterativa.

    if (!this.isDirectBuy()) return null; // TODO: Implementar descuentos globales o por item en carrito

    const prod = this.product();
    const type = this.productType();
    const allDiscounts = this.discounts();

    if (!prod || !type || !allDiscounts.length) return null;

    const now = Date.now();
    // Filtrar descuentos activos
    const activeDiscounts = allDiscounts.filter(d => d.state && d.start_date_num <= now && d.end_date_num >= now);

    let best = null;
    let finalPrice = prod.price_mxn;

    for (const discount of activeDiscounts) {
      let applies = false;

      // 1. Por Curso
      if (discount.type_segment === 1 && type === 'course') {
        if (discount.courses && discount.courses.some((c: any) => c._id === prod._id || c === prod._id)) {
          applies = true;
        }
      }
      // 2. Por Categoría
      else if (discount.type_segment === 2) {
        // Necesitamos la categoría del producto. Si viene populada en prod.categorie
        const catId = prod.categorie?._id || prod.categorie;
        if (catId && discount.categories && discount.categories.some((c: any) => c._id === catId || c === catId)) {
          applies = true;
        }
      }
      // 3. Por Proyecto
      else if (discount.type_segment === 3 && type === 'project') {
        if (discount.projects && discount.projects.some((p: any) => p._id === prod._id || p === prod._id)) {
          applies = true;
        }
      }

      if (applies) {
        let calculatedPrice = finalPrice;
        if (discount.type_discount === 1) { // Porcentaje
          calculatedPrice = prod.price_mxn - (prod.price_mxn * discount.discount / 100);
        } else { // Monto fijo
          calculatedPrice = prod.price_mxn - discount.discount;
        }

        if (calculatedPrice < 0) calculatedPrice = 0;

        // Si este descuento da un precio menor, es el mejor
        if (calculatedPrice < finalPrice) {
          finalPrice = calculatedPrice;
          best = {
            ...discount,
            finalPrice,
            savedAmount: prod.price_mxn - finalPrice
          };
        }
      }
    }

    return best;
  });

  // 🆕 Helper para saber si hay descuento activo
  hasDiscount = computed(() => !!this.bestDiscount());

  // 🆕 Total y restante (considerando descuento) - EN MXN
  subtotal = computed(() => {
    if (this.isDirectBuy()) {
      const discount = this.bestDiscount();
      return discount ? discount.finalPrice : (this.product()?.price_mxn || 0);
    } else {
      // Suma del carrito
      return this.cartService.total();
    }
  });

  originalPrice = computed(() => {
    if (this.isDirectBuy()) {
      return this.product()?.price_mxn || 0;
    }
    return this.subtotal(); // En carrito no mostramos precio "original" tachado global por ahora
  });

  // Legacy (mantener compatibilidad si algo lo usa, pero es redundante)
  subtotalMXN = computed(() => this.subtotal());
  originalPriceMXN = computed(() => this.originalPrice());

  remainingAmount = computed(() => {
    if (!this.useWalletBalance()) return this.subtotal();
    const remaining = this.subtotal() - this.walletAmount();
    return Math.max(0, remaining);
  });

  // 🆕 UX IMPROVEMENTS
  isLoadingWallet = computed(() => this.walletService.loading());
  walletTransactions = computed(() => this.walletService.transactions());
  recentTransactions = computed(() => this.walletTransactions().slice(0, 3));

  // Computed para saber si es pago 100% con wallet
  isFullWalletPayment = computed(() => {
    return this.useWalletBalance() && this.remainingAmount() === 0;
  });

  // Computed para saber si es pago mixto
  isMixedPayment = computed(() => {
    return this.useWalletBalance() && this.walletAmount() > 0 && this.remainingAmount() > 0;
  });

  // 🎁 NUEVO: Detectar si el producto es GRATIS (precio final = 0)
  isFreeProduct = computed(() => {
    return this.subtotal() === 0;
  });

  // 🎁 NUEVO: Métodos de pago permitidos (solo wallet si es gratis)
  allowedPaymentMethods = computed(() => {
    if (this.isFreeProduct()) {
      // Si es gratis, solo permitir billetera
      return this.paymentMethods().filter(m => m.id === 'wallet');
    }
    // Si no es gratis, permitir todos los métodos
    return this.paymentMethods();
  });

  user = computed(() => this.authService.user());

  // Payment methods - FROM SERVICE
  paymentMethods = this.checkoutService.availablePaymentMethods;

  // 🔥 Datos bancarios desde el servicio
  bankDetails = this.checkoutService.bankDetails;

  // Formulario para información adicional
  checkoutForm = new FormGroup({
    acceptTerms: new FormControl(false, [Validators.requiredTrue]),
    billingName: new FormControl('', [Validators.required]),
    billingEmail: new FormControl('', [Validators.required, Validators.email]),
    billingPhone: new FormControl('', []),
  });

  constructor() {
    // 🔥 Effect para controlar el scroll del body cuando los modales están abiertos
    effect(() => {
      const isModalOpen = this.showSuccess() || this.showWarningModal();
      if (isModalOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    // 🆕 Effect para validar que hay producto o carrito
    effect(() => {
      const prod = this.product();
      const cartCount = this.cartService.count();

      if (!prod && cartCount === 0 && !this.showSuccess()) {
        this.router.navigate(['/']);
      }
    });
  }

  ngOnInit(): void {
    // Verificar que el usuario esté logueado
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    // 🆕 Obtener producto desde navigation state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || (history.state as any);


    if (state && state.product && state.productType) {
      // MODO COMPRA DIRECTA
      const prod: CheckoutProduct = {
        ...state.product,
        type: state.productType
      };
      this.product.set(prod);
      this.productType.set(state.productType);
      this.isDirectBuy.set(true);

    } else {
      // MODO CARRITO
      if (this.cartService.count() > 0) {
        this.isDirectBuy.set(false);
      } else {
        this.router.navigate(['/']);
        return;
      }
    }

    // 🆕 Cargar saldo de billetera y transacciones
    this.walletService.loadWallet();

    // 🆕 Cargar descuentos
    this.discountService.loadDiscounts().subscribe();

    // 🆕 Recargar configuración del servicio para asegurar frescura
    this.checkoutService.reloadConfig();

    // NOTE: Countries and Payment Settings are now loaded via signals
    // filtered in 'availablePaymentMethods' computed property of the service.

    // Pre-llenar el formulario con datos del usuario
    const currentUser = this.user();
    if (currentUser) {
      this.checkoutForm.patchValue({
        billingName: `${currentUser.name} ${currentUser.surname}`,
        billingEmail: currentUser.email || '',
      });
    }

    // 🎁 NUEVO: Si el producto es GRATIS, auto-seleccionar billetera
    setTimeout(() => {
      if (this.isFreeProduct()) {

        this.selectPaymentMethod('wallet');
      }
    }, 100);
  }

  ngOnDestroy(): void {
    // 🔥 Asegurar que el scroll se restaure al salir del componente
    document.body.style.overflow = '';
  }

  selectPaymentMethod(methodId: string): void {
    // 🔒 VALIDACIÓN CRÍTICA: Si selecciona billetera, verificar saldo
    if (methodId === 'wallet') {
      const balance = this.walletBalance();
      const total = this.subtotal();


      // Si el saldo no cubre el total, mostrar error y no permitir selección
      if (balance < total) {
        this.errorMessage.set(
          `❌ Saldo insuficiente. Tienes $${balance.toFixed(2)} MXN pero el total es $${total.toFixed(2)} MXN. ` +
          `Necesitas $${(total - balance).toFixed(2)} MXN más. Por favor, selecciona otro método de pago o usa tu saldo parcialmente.`
        );
        return; // No seleccionar el método
      }

      // Si el saldo es suficiente, activar el uso de billetera
      this.toggleWalletPayment(true);
    }

    this.selectedPaymentMethod.set(methodId);
    this.errorMessage.set('');
  }

  // 🆕 Toggle uso de billetera
  toggleWalletPayment(force?: boolean): void {
    const newValue = force !== undefined ? force : !this.useWalletBalance();
    this.useWalletBalance.set(newValue);

    if (newValue) {
      // Calcular cuánto del saldo de billetera se puede usar
      const total = this.subtotal();
      const balance = this.walletBalance();
      const amountToUse = Math.min(balance, total);
      this.walletAmount.set(amountToUse);

    } else {
      this.walletAmount.set(0);
      // Si se desactiva y estaba en wallet, limpiar selección
      if (this.selectedPaymentMethod() === 'wallet') {
        this.selectedPaymentMethod.set('');
      }
    }
  }

  async processPayment() {


    // 🔥 Prevenir múltiples clics
    if (this.isProcessing() || this.showSuccess()) {

      return;
    }

    // AGREGAR ESTE CÓDIGO AL INICIO:
    // ⚠️ POLÍTICA DE REEMBOLSOS
    const confirmed = await this.modalService.confirm({
      title: 'Política de Reembolsos',
      icon: 'warning',
      message: `✓ Tienes 3 DÍAS para solicitar reembolso
✓ No puedes haber visto más del 20% del contenido
✓ Máximo 1 reembolso por curso
✓ Máximo 3 reembolsos totales en 6 meses

¿Deseas continuar con la compra?`,
      confirmText: 'Aceptar y Continuar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) {

      return;
    }

    const prod = this.product();
    const isDirect = this.isDirectBuy();
    const cartItems = this.cartItems();

    if (isDirect && !prod) {
      this.errorMessage.set('Error: No hay producto seleccionado');
      return;
    }

    if (!isDirect && cartItems.length === 0) {
      this.errorMessage.set('Error: El carrito está vacío');
      return;
    }

    // 🔒 VALIDACIÓN CRÍTICA 1: Si usa billetera, verificar saldo suficiente
    if (this.useWalletBalance() && this.walletAmount() > 0) {
      const balance = this.walletBalance();
      const requestedAmount = this.walletAmount();

      if (balance < requestedAmount) {
        this.errorMessage.set(
          `❌ Error crítico: Saldo insuficiente. Tienes ${balance.toFixed(2)} MXN ` +
          `pero intentas usar ${requestedAmount.toFixed(2)} MXN. Por favor, recarga la página.`
        );
        return;
      }
    }

    if (this.checkoutForm.invalid) {

      Object.keys(this.checkoutForm.controls).forEach(key => {
        this.checkoutForm.get(key)?.markAsTouched();
      });
      this.errorMessage.set('Por favor completa todos los campos requeridos');
      return;
    }

    this.isProcessing.set(true);
    this.errorMessage.set('');

    // ════════════════════════════════════════════════════════════════
    // 🔥 CORRECCIÓN CRÍTICA: Determinar el método de pago correctamente
    // ════════════════════════════════════════════════════════════════

    const walletIsActive = this.useWalletBalance();
    const walletAmountUsed = this.walletAmount();
    const remaining = this.remainingAmount();

    let finalPaymentMethod: string;
    let finalWalletAmount: number;
    let finalRemainingAmount: number;

    // CASO 1: Pago 100% con billetera (toggle activo Y saldo cubre todo)
    if (walletIsActive && remaining === 0 && walletAmountUsed > 0) {
      finalPaymentMethod = 'wallet';
      finalWalletAmount = walletAmountUsed;
      finalRemainingAmount = 0;
    }
    // CASO 2: Pago mixto (billetera + otro método)
    else if (walletIsActive && walletAmountUsed > 0 && remaining > 0) {
      finalPaymentMethod = this.selectedPaymentMethod() || 'transfer';
      finalWalletAmount = walletAmountUsed;
      finalRemainingAmount = remaining;

      // Validar que seleccionó un método para el restante
      if (!this.selectedPaymentMethod()) {
        this.errorMessage.set('Por favor selecciona un método de pago para el saldo restante');
        this.isProcessing.set(false);
        return;
      }
    }
    // CASO 3: Sin billetera - Pago normal
    else {
      finalPaymentMethod = this.selectedPaymentMethod() || '';
      finalWalletAmount = 0;
      finalRemainingAmount = this.subtotal();

      // Validar que seleccionó un método
      if (!finalPaymentMethod) {
        this.errorMessage.set('Por favor selecciona un método de pago');
        this.isProcessing.set(false);
        return;
      }
    }


    // Preparar items de la venta
    let detail = [];
    // 🔥 FIX: Definir discount aquí para que esté disponible en el bloque if
    const discount = this.bestDiscount();

    if (isDirect) {
      // Compra Directa
      detail = [{
        product: prod!._id,
        product_type: prod!.type,
        title: prod!.title,
        price_unit: this.subtotal(), // Precio final con descuento
        discount: discount ? discount.discount : 0,
        type_discount: discount ? discount.type_discount : 0,
        campaign_discount: discount ? discount.type_campaign : null
      }];
    } else {
      // Compra de Carrito
      detail = cartItems.map(item => ({
        product: item._id,
        product_type: item.type,
        title: item.title,
        price_unit: item.price_mxn,
        discount: 0, // TODO: Implementar descuentos en carrito
        type_discount: 0,
        campaign_discount: null
      }));
    }

    const checkoutData: any = {
      method_payment: finalPaymentMethod,
      currency_total: 'MXN',
      currency_payment: 'MXN',
      total: this.subtotal(), // 🔥 Precio final
      n_transaccion: this.checkoutService.generateTransactionNumber(),
      // price_dolar: this.checkoutService.getExchangeRate(), // REMOVED
      detail: detail,
      // 🔥 SIEMPRE enviar estos campos con valores correctos
      use_wallet: walletIsActive && finalWalletAmount > 0,
      wallet_amount: finalWalletAmount,
      remaining_amount: finalRemainingAmount,
      // country: this.selectedCountry() // REMOVED
    };


    this.transactionNumber.set(checkoutData.n_transaccion);

    // Procesar la venta
    this.checkoutService.processSale(checkoutData).subscribe({
      next: (response: any) => {


        // 🔥 MERCADO PAGO REDIRECTION
        if (response.init_point) {


          // ✅ CRÍTICO: Recargar billetera ANTES de redirigir
          // Así el saldo se actualiza en segundo plano mientras carga MP
          if (walletIsActive && finalWalletAmount > 0) {
            this.walletService.loadWallet();
          }

          // Pequeño delay para asegurar que la petición se envió
          setTimeout(() => {
            window.location.href = response.init_point;
          }, 100);

          return;
        }

        // 🚨 ERROR: Si es Mercado Pago pero no hay link, mostrar error
        if (finalPaymentMethod === 'mercadopago' && !response.init_point) {
          console.error('❌ [processPayment] Error: Mercado Pago seleccionado pero no hay init_point');
          this.errorMessage.set('Error: No se pudo generar el enlace de pago de Mercado Pago. Por favor contacta soporte.');
          this.isProcessing.set(false);
          return;
        }

        this.isProcessing.set(false);
        this.showSuccess.set(true);

        // 🔄 Recargar servicios después de una venta exitosa

        // 1. Recargar billetera inmediatamente si se usó
        if (walletIsActive && finalWalletAmount > 0) {
          this.walletService.loadWallet();
        }

        // 2. Recargar perfil con un pequeño delay para asegurar que el backend terminó
        setTimeout(() => {

          // 🔥 CRÍTICO: Llamar a reloadProfile() para actualizar el estado global
          this.profileStudentService.reloadProfile();

          // También recargar otros servicios
          this.purchasesService.loadPurchasedProducts();
          this.profileService.reloadProfile();

        }, 2000); // Aumentado a 2 segundos para dar más tiempo al backend

        // 3. Limpiar carrito si fue compra de carrito
        if (!this.isDirectBuy()) {
          this.cartService.clearCart();
        }
      },
      error: (error) => {
        console.error('❌ [processPayment] Error en la petición:', error);
        this.errorMessage.set(
          error.error?.message || 'Hubo un error al procesar tu pago. Por favor intenta de nuevo.'
        );
        this.isProcessing.set(false);
      }
    });
  }

  closeSuccessModalAndRedirect(): void {
    this.showSuccess.set(false);

    // 🔥 FIX: Si pagó 100% con billetera, NO mostrar modal de advertencia
    if (this.isFullWalletPayment()) {
      // Redirigir directo sin mostrar el modal de transferencia
      // 🔥 FIX: Redirigir siempre a 'purchases' para que el usuario vea su historial y estado
      this.router.navigate(['/profile-student'], { fragment: 'purchases' });
      return;
    }

    // 🔥 Solo mostrar el modal de advertencia para pagos mixtos o transferencias
    this.showWarningModal.set(true);
  }

  // 🔥 Cerrar el modal de advertencia y redirigir
  closeWarningAndRedirect(): void {
    this.showWarningModal.set(false);

    // 🔥 SOLUCIÓN OPTIMIZADA: Navegación con Angular Router
    // Redirigir siempre a 'purchases' para que el usuario vea su historial y pueda subir comprobantes si es necesario
    this.router.navigate(['/profile-student'], { fragment: 'purchases' });
  }

  buildImageUrl(imagen?: string): string {
    if (!imagen) {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzFlMjkzYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NDc0OGIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TaW4gSW1hZ2VuPC90ZXh0Pjwvc3ZnPg==';
    }

    const img = String(imagen).trim();

    // Si ya es una URL completa, devolverla tal cual
    if (/^https?:\/\//i.test(img)) {
      return img;
    }

    // Construir la URL según el tipo de producto
    const productType = this.productType();
    if (productType === 'project') {
      return `${environment.images.project}${img}`;
    }

    // Por defecto, cursos
    return `${environment.images.course}${img}`;
  }

  // 🆕 Eliminar item del carrito
  removeFromCart(itemId: string, type: 'course' | 'project') {
    this.cartService.removeFromCart(itemId, type);
    // Si el carrito queda vacío, el effect redirigirá al home
  }

  formatPrice(price: number): string {
    return price.toFixed(2);
  }

  getPaymentMethodInfo(methodId: string): PaymentMethod | undefined {
    return this.paymentMethods().find(m => m.id === methodId);
  }

  getProductTypeName(type: string): string {
    return type === 'course' ? 'Curso' : 'Proyecto';
  }

  // 📋 Función para copiar al portapapeles
  copyToClipboard(text: string, type: string): void {
    navigator.clipboard.writeText(text).then(() => {
      alert(`✅ ${type === 'cuenta' ? 'Número de cuenta' : type === 'clabe' ? 'CLABE' : 'Número de transacción'} copiado al portapapeles`);
    }).catch(err => {
      alert('❌ No se pudo copiar. Por favor, copia manualmente.');
    });
  }

  // 🆕 HELPER METHODS PARA UX
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;

    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  }

  getTransactionIcon(type: string): string {
    switch (type) {
      case 'credit': return '💰';
      case 'debit': return '💳';
      case 'refund': return '🔄';
      default: return '💵';
    }
  }

  getTransactionColor(type: string): string {
    switch (type) {
      case 'credit': return 'text-green-400';
      case 'debit': return 'text-red-400';
      case 'refund': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  }

  // 🆕 Volver al home
  goBack(): void {
    this.router.navigate(['/']);
  }
}
