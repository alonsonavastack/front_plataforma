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

  // 🆕 PayPal state
  public paypalOrderId = signal<string | null>(null); // for debugging and capture
  public paypalButtonsRendered = signal<boolean>(false);
  public pendingSaleTx = signal<string | null>(null);
  public renderingPaypal = signal<boolean>(false);




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

  // Dynamically load PayPal SDK
  private async loadPayPalSdk(): Promise<void> {
    // If PayPal SDK already loaded, resolve
    if ((window as any).paypal) {
      console.log('✅ [loadPayPalSdk] PayPal SDK ya estaba cargado');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const clientId = environment.paypal?.clientId || '';
      if (!clientId) {
        console.error('❌ [loadPayPalSdk] No PayPal clientId in frontend environment');
        return reject(new Error('No PayPal clientId in environment.'));
      }

      console.log('🔄 [loadPayPalSdk] Cargando PayPal SDK...');
      const script = document.createElement('script');
      
      // 🔥 PARÁMETROS MEJORADOS para mejor compatibilidad y visibilidad
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=MXN&intent=capture&disable-funding=credit,card&components=buttons&enable-funding=venmo`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('✅ [loadPayPalSdk] PayPal SDK loaded successfully');
        // Pequeña espera para asegurar inicialización completa
        setTimeout(() => resolve(), 100);
      };
      
      script.onerror = (err) => {
        console.error('❌ [loadPayPalSdk] Failed to load:', err);
        reject(err || new Error('Failed to load PayPal SDK'));
      };
      
      document.head.appendChild(script);
    });
  }

  // Helper para esperar el container
  private async waitForContainer(selector: string, timeout = 3000): Promise<HTMLElement | null> {
    const interval = 50;
    let waited = 0;
    
    while (waited < timeout) {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        console.log('✅ [waitForContainer] Container encontrado:', selector);
        return el;
      }
      await new Promise(r => setTimeout(r, interval));
      waited += interval;
    }
    
    console.error('❌ [waitForContainer] Container NO encontrado después de', timeout, 'ms');
    return null;
  }

  // Render PayPal Buttons into container with server-side create/capture
  public async renderPayPalButtons(nTransaccion?: string | null) {
    console.log('🚦 [renderPayPalButtons] 1. INICIO');
    console.log('💡 [renderPayPalButtons] nTransaccion recibido:', nTransaccion);
    
    if (!nTransaccion) {
      nTransaccion = this.transactionNumber() || null;
    }
    if (!nTransaccion) {
      console.error('❌ [renderPayPalButtons] ERROR: No hay nTransaccion');
      throw new Error('renderPayPalButtons: nTransaccion is required');
    }
    
    console.log('🔄 [renderPayPalButtons] 2. Reseteando estado...');
    this.paypalButtonsRendered.set(false);
    
    try {
      console.log('🔄 [renderPayPalButtons] 3. Cargando PayPal SDK...');
      await this.loadPayPalSdk();
      console.log('✅ [renderPayPalButtons] SDK cargado exitosamente');
      
      this.renderingPaypal.set(true);

      // Create a PayPal order on the server to ensure amounts are validated
      console.log('🔄 [renderPayPalButtons] 4. Creando orden en el servidor...');
      const res = await this.checkoutService.createPaypalOrder(nTransaccion);
      console.log('✅ [renderPayPalButtons] Respuesta del servidor:', res);
      
      if (!res || !res.orderId) {
        console.error('❌ [renderPayPalButtons] ERROR: Respuesta inválida:', res);
        this.errorMessage.set('No se pudo crear la orden de PayPal. Por favor intenta de nuevo.');
        return;
      }
      
      const orderId = res.orderId;
      console.log('✅ [renderPayPalButtons] Order ID:', orderId);
      this.paypalOrderId.set(orderId);

      const paypal = (window as any).paypal;
      if (!paypal) {
        console.error('❌ [renderPayPalButtons] ERROR: PayPal SDK no disponible');
        throw new Error('PayPal SDK not present');
      }
      
      console.log('✅ [renderPayPalButtons] PayPal SDK disponible:', typeof paypal);

      // Wait for container to be present in DOM
      console.log('🔄 [renderPayPalButtons] 5. Esperando container...');
      const container = await this.waitForContainer('#paypal-button-container', 5000);
      if (!container) {
        console.error('❌ [renderPayPalButtons] ERROR: Container no encontrado');
        this.errorMessage.set('No se pudo inicializar PayPal. Intenta recargar la página.');
        this.renderingPaypal.set(false);
        return;
      }
      
      console.log('✅ [renderPayPalButtons] 6. Container listo, limpiando...');
      container.innerHTML = '';

      try {
        console.log('🔄 [renderPayPalButtons] 7. Renderizando botones de PayPal...');
        
        await paypal.Buttons({
          createOrder: () => {
            console.log('👁️ [PayPal] createOrder llamado, retornando:', orderId);
            return orderId;
          },
          onApprove: async (data: any, actions: any) => {
            console.log('✅ [PayPal] onApprove - Pago aprobado:', data);
            try {
              console.log('🔄 [PayPal] Capturando orden en el servidor...');
              const captureResult = await this.checkoutService.capturePaypalOrder(nTransaccion, data.orderID || orderId);
              console.log('✅ [PayPal] Orden capturada:', captureResult);
              
              // Proceso exitoso
              this.paypalButtonsRendered.set(true);
              this.showSuccess.set(true);
              this.pendingSaleTx.set(null);

              // Recargar servicios
              if (this.useWalletBalance() && this.walletAmount() > 0) {
                console.log('🔄 [PayPal] Recargando wallet...');
                this.walletService.loadWallet();
              }
              
              setTimeout(() => {
                console.log('🔄 [PayPal] Recargando servicios de perfil...');
                this.profileStudentService.reloadProfile();
                this.purchasesService.loadPurchasedProducts();
                this.profileService.reloadProfile();
              }, 1500);
              
              if (!this.isDirectBuy()) {
                console.log('🗑️ [PayPal] Limpiando carrito...');
                this.cartService.clearCart();
              }
            } catch (captureError) {
              console.error('❌ [PayPal] Error al capturar:', captureError);
              this.errorMessage.set('Ocurrió un error al procesar el pago. Intenta de nuevo.');
              this.renderingPaypal.set(false);
            }
          },
          onError: (err: any) => {
            console.error('❌ [PayPal] Error en Buttons:', err);
            this.errorMessage.set('Error al cargar PayPal. Intenta de nuevo.');
            this.renderingPaypal.set(false);
            this.paypalButtonsRendered.set(false);
          },
          onCancel: (data: any) => {
            console.info('⚠️ [PayPal] Pago cancelado por el usuario');
            this.renderingPaypal.set(false);
            this.paypalButtonsRendered.set(false);
          },
          // 🔥 NUEVO: Estilos para forzar visibilidad
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 45
          }
        }).render('#paypal-button-container');
        
        console.log('✅ [renderPayPalButtons] 8. Botones renderizados exitosamente!');
        this.pendingSaleTx.set(null);
        this.paypalButtonsRendered.set(true);
        this.renderingPaypal.set(false);
        
      } catch (btnErr) {
        console.error('❌ [renderPayPalButtons] ERROR en render:', btnErr);
        this.errorMessage.set('Error al inicializar PayPal.');
        this.paypalButtonsRendered.set(false);
        this.renderingPaypal.set(false);
        return;
      }

    } catch (err) {
      console.error('❌ [renderPayPalButtons] ERROR general:', err);
      this.errorMessage.set('No se pudo iniciar PayPal.');
      this.paypalButtonsRendered.set(false);
    }
  }

  // 🧪 Debug helper to manually force render PayPal from console
  public debugRenderPayPalNow() {
    const nTrans = this.transactionNumber() || this.checkoutService.generateTransactionNumber();
    console.info('🧪 [debug] Forcing renderPayPalButtons with', nTrans);
    this.renderPayPalButtons(nTrans);
  }
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

  // Debug lists for UI
  availableMethodIds = computed(() => this.paymentMethods().map(m => m.id));
  allowedMethodIds = computed(() => this.allowedPaymentMethods().map(m => m.id));



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

    // 🆕 Reset PayPal buttons when method changes
    effect(() => {
      if (this.selectedPaymentMethod() !== 'paypal') {
        this.paypalButtonsRendered.set(false);
        this.paypalOrderId.set(null);
        const container = document.getElementById('paypal-button-container');
        if (container) container.innerHTML = '';
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
          `❌ Saldo insuficiente. Tienes ${balance.toFixed(2)} MXN pero el total es ${total.toFixed(2)} MXN. ` +
          `Necesitas ${(total - balance).toFixed(2)} MXN más. Por favor, selecciona otro método de pago o usa tu saldo parcialmente.`
        );
        return; // No seleccionar el método
      }

      // Si el saldo es suficiente, activar el uso de billetera
      this.toggleWalletPayment(true);
    }

    this.selectedPaymentMethod.set(methodId);
    this.errorMessage.set('');
    
    // 🔥 NUEVO: Si selecciona PayPal, procesar automáticamente
    if (methodId === 'paypal' && this.checkoutForm.valid) {
      console.log('🅿️ [selectPaymentMethod] PayPal seleccionado, iniciando proceso automáticamente...');
      setTimeout(() => {
        this.processPayment();
      }, 300); // Pequeño delay para que la UI se actualice
    }
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
    console.log('👁️ [processPayment] 1. Iniciando proceso de pago...');
    console.log('👁️ [processPayment] Estado actual:', {
      isProcessing: this.isProcessing(),
      showSuccess: this.showSuccess(),
      selectedMethod: this.selectedPaymentMethod(),
      useWallet: this.useWalletBalance(),
      walletAmount: this.walletAmount(),
      remainingAmount: this.remainingAmount(),
      subtotal: this.subtotal()
    });

    // 🔥 Prevenir múltiples clics
    if (this.isProcessing() || this.showSuccess()) {
      console.log('⚠️ [processPayment] Bloqueado: Ya está procesando o completado');
      return;
    }

    console.info('🔄 [Checkout] processPayment started', {
      method: this.selectedPaymentMethod(),
      remaining: this.remainingAmount(),
      useWallet: this.useWalletBalance(),
      walletAmount: this.walletAmount(),
      transactionNumber: this.transactionNumber()
    });

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
      finalPaymentMethod = this.selectedPaymentMethod();
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
        console.info('🔄 [Checkout] processSale response', response);
        if (response.sale) {
          this.transactionNumber.set(response.sale.n_transaccion);
        }

        // Si el método seleccionado es PayPal, renderizar botones
        // 🔥 FIX: No verificar remainingAmount(), sino subtotal()
        if (this.selectedPaymentMethod() === 'paypal') {
          const amountToPay = this.remainingAmount() > 0 ? this.remainingAmount() : this.subtotal();
          
          if (amountToPay > 0) {
            console.log('✅ [processPayment] Detectado PayPal, monto a pagar:', amountToPay);
            console.log('📊 [processPayment] Datos:', {
              selected: this.selectedPaymentMethod(),
              remaining: this.remainingAmount(),
              subtotal: this.subtotal(),
              amountToPay,
              txn: this.transactionNumber()
            });
            
            // Close loader and set rendering state
            this.isProcessing.set(false);
            this.renderingPaypal.set(true);
            
            // If we have a server-side tx id, use it
            const nTrans = response.sale?.n_transaccion || this.transactionNumber();
            console.log('🔄 [processPayment] Llamando renderPayPalButtons con:', nTrans);
            
            this.renderPayPalButtons(nTrans).finally(() => {
              console.log('✅ [processPayment] renderPayPalButtons finalizado');
              this.renderingPaypal.set(false);
            });
            return;
          } else {
            console.warn('⚠️ [processPayment] PayPal seleccionado pero monto a pagar es 0');
            this.errorMessage.set('Error: El monto a pagar debe ser mayor a 0');
            this.isProcessing.set(false);
            return;
          }
        }

        // ✅ ÉXITO (Wallet / Otros métodos)
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
        }, 2000);

        // 3. Limpiar carrito si fue compra de carrito
        if (!this.isDirectBuy()) {
          this.cartService.clearCart();
        }
      },
      error: (error) => {
        console.error('❌ [processPayment] Error en la petición:', error);
        // 409 Conflict - existing pending sale
        if (error.status === 409 && error.error?.n_transaccion) {
          console.info('ℹ️ [Checkout] Found existing pending sale; resuming PayPal for', error.error.n_transaccion);
          // If PayPal selected, try to render buttons for pending sale
          if (this.selectedPaymentMethod() === 'paypal' && this.remainingAmount() > 0) {
            this.isProcessing.set(false);
            this.renderingPaypal.set(true);
            this.renderPayPalButtons(error.error.n_transaccion);
            return;
          }

          // If not PayPal or remaining=0, show message
          this.pendingSaleTx.set(error.error?.n_transaccion || null);
          if (error.error?.n_transaccion) this.transactionNumber.set(error.error.n_transaccion);
          this.errorMessage.set(error.error?.message || 'Tienes una venta pendiente. Por favor revisa tus transacciones.');
          this.isProcessing.set(false);
          return;
        }

        this.errorMessage.set(
          error.error?.message || 'Hubo un error al procesar tu pago. Por favor intenta de nuevo.'
        );
        this.isProcessing.set(false);
      }
    });
  }

  closeSuccessModalAndRedirect(): void {
    this.showSuccess.set(false);
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
