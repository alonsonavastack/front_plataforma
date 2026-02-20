// checkout.component.ts - 🔥 VERSIÓN CORREGIDA COMPLETA
import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { MxnCurrencyPipe } from '../../shared/pipes/mxn-currency.pipe';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CheckoutService, PaymentMethod } from '../../core/services/checkout.service';
import { AuthService } from '../../core/services/auth';
import { WalletService } from '../../core/services/wallet.service';
import { PurchasesService } from '../../core/services/purchases.service';
import { ProfileService } from '../../core/services/profile.service';
import { ProfileStudentService } from '../../core/services/profile-student.service';
import { ModalService } from '../../core/services/modal.service';
import { DiscountService } from '../../core/services/discount.service';
import { CartService, CartItem } from '../../core/services/cart.service';
import { CurrencyService } from '../../services/currency.service';
import { CouponService } from '../../core/services/coupon.service'; // 🔥 IMPORT NUEVO
import { environment } from '../../../environments/environment';

interface CheckoutProduct {
  _id: string;
  title: string;
  subtitle?: string;
  price_mxn: number;
  imagen?: string;
  slug?: string;
  type: 'course' | 'project';
  categorie?: any;
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
  profileService = inject(ProfileService);
  modalService = inject(ModalService);
  discountService = inject(DiscountService);
  cartService = inject(CartService);
  currencyService = inject(CurrencyService);
  couponService = inject(CouponService); // 🔥 INJECT NUEVO
  router = inject(Router);

  private profileStudentService = inject(ProfileStudentService);

  // 🔥 NUEVO: Signal para verificar si el producto ya fue comprado
  alreadyPurchased = computed(() => {
    const prod = this.product();
    if (!prod) return false;
    return this.purchasesService.isPurchased(prod._id);
  });

  // Producto único en checkout
  product = signal<CheckoutProduct | null>(null);
  productType = signal<'course' | 'project' | null>(null);

  // Carrito
  cartItems = computed(() => this.cartService.cart());
  isDirectBuy = signal(true);

  // State
  selectedPaymentMethod = signal<string>('');
  isProcessing = signal(false);
  showSuccess = signal(false);
  showWarningModal = signal(false);
  errorMessage = signal<string>('');
  transactionNumber = signal<string>('');

  // 🔥 CUPONES
  couponCode = signal('');
  appliedCoupon = signal<any>(null);
  couponError = signal('');
  isCheckingCoupon = signal(false);

  // Stripe state
  public stripeLoading = signal<boolean>(false);
  public renderingPaypal = signal<boolean>(false); // kept for template compat — always false

  // Multi-country support
  countries = this.checkoutService.supportedCountries;
  selectedCountry = signal<string>('MX');
  selectedCountryData = computed(() =>
    this.countries().find((c: any) => c.code === this.selectedCountry())
  );

  // 💰 Wallet state
  walletBalance = computed(() => this.walletService.balance());
  useWalletBalance = signal(false);
  walletAmount = signal(0);

  // Descuentos
  discounts = computed(() => this.discountService.discounts());

  // Mejor descuento disponible
  bestDiscount = computed(() => {
    if (!this.isDirectBuy()) return null;

    const prod = this.product();
    const type = this.productType();
    const allDiscounts = this.discounts();

    if (!prod || !type || !allDiscounts.length) return null;

    const now = Date.now();
    const activeDiscounts = allDiscounts.filter(d => d.state && d.start_date_num <= now && d.end_date_num >= now);

    let best = null;
    let finalPrice = prod.price_mxn;

    for (const discount of activeDiscounts) {
      let applies = false;

      if (discount.type_segment === 1 && type === 'course') {
        if (discount.courses && discount.courses.some((c: any) => c._id === prod._id || c === prod._id)) {
          applies = true;
        }
      } else if (discount.type_segment === 2) {
        const catId = prod.categorie?._id || prod.categorie;
        if (catId && discount.categories && discount.categories.some((c: any) => c._id === catId || c === catId)) {
          applies = true;
        }
      } else if (discount.type_segment === 3 && type === 'project') {
        if (discount.projects && discount.projects.some((p: any) => p._id === prod._id || p === prod._id)) {
          applies = true;
        }
      }

      if (applies) {
        let calculatedPrice = finalPrice;
        if (discount.type_discount === 1) {
          calculatedPrice = prod.price_mxn - (prod.price_mxn * discount.discount / 100);
        } else {
          calculatedPrice = prod.price_mxn - discount.discount;
        }

        if (calculatedPrice < 0) calculatedPrice = 0;

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

  hasDiscount = computed(() => !!this.bestDiscount());

  // 🔥 Total y restante (considerando descuento y CUPÓN) - EN MXN
  subtotal = computed(() => {
    let price = 0;
    if (this.isDirectBuy()) {
      const discount = this.bestDiscount();
      price = discount ? discount.finalPrice : (this.product()?.price_mxn || 0);
    } else {
      price = this.cartService.total();
    }

    // 🔥 APLICAR DESCUENTO DE CUPÓN SI EXISTE
    const coupon = this.appliedCoupon();
    if (coupon && coupon.discount_percentage > 0) {
      price = price - (price * (coupon.discount_percentage / 100));
    }

    return Math.max(0, price);
  });

  originalPrice = computed(() => {
    if (this.isDirectBuy()) {
      return this.product()?.price_mxn || 0;
    }
    return this.subtotal();
  });

  subtotalMXN = computed(() => this.subtotal());
  originalPriceMXN = computed(() => this.originalPrice());

  // 🔥 FIX CRÍTICO: Calcular monto restante correctamente
  remainingAmount = computed(() => {
    if (!this.useWalletBalance()) return this.subtotal();
    const remaining = this.subtotal() - this.walletAmount();
    return Math.max(0, remaining);
  });

  isLoadingWallet = computed(() => this.walletService.loading());
  walletTransactions = computed(() => this.walletService.transactions());
  recentTransactions = computed(() => this.walletTransactions().slice(0, 3));

  // 🔥 NUEVO: Computed signals para estados de pago
  isFullWalletPayment = computed(() => {
    return this.useWalletBalance() && this.walletAmount() > 0 && this.remainingAmount() === 0;
  });

  isMixedPayment = computed(() => {
    return this.useWalletBalance() && this.walletAmount() > 0 && this.remainingAmount() > 0;
  });

  needsAdditionalPaymentMethod = computed(() => {
    return this.useWalletBalance() && this.remainingAmount() > 0 && !this.selectedPaymentMethod();
  });

  isFreeProduct = computed(() => {
    return this.subtotal() === 0;
  });

  allowedPaymentMethods = computed(() => {
    if (this.isFreeProduct()) {
      return this.paymentMethods().filter(m => m.id === 'wallet');
    }
    return this.paymentMethods();
  });

  user = computed(() => this.authService.user());

  paymentMethods = this.checkoutService.availablePaymentMethods;

  availableMethodIds = computed(() => this.paymentMethods().map(m => m.id));
  allowedMethodIds = computed(() => this.allowedPaymentMethods().map(m => m.id));

  checkoutForm = new FormGroup({
    acceptTerms: new FormControl(false, [Validators.requiredTrue]),
    billingName: new FormControl('', [Validators.required]),
    billingEmail: new FormControl('', [Validators.required, Validators.email]),
    billingPhone: new FormControl('', []),
  });

  constructor() {
    effect(() => {
      const isModalOpen = this.showSuccess() || this.showWarningModal();
      if (isModalOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    effect(() => {
      const prod = this.product();
      const cartCount = this.cartService.count();

      if (!prod && cartCount === 0 && !this.showSuccess()) {
        this.router.navigate(['/']);
      }
    });


  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || (history.state as any);

    if (state && state.product && state.productType) {
      const prod: CheckoutProduct = {
        ...state.product,
        type: state.productType
      };
      this.product.set(prod);
      this.productType.set(state.productType);
      this.isDirectBuy.set(true);

      // 🔥 NUEVO: Verificar si ya compró el producto después de cargar purchases
      setTimeout(() => {
        if (this.alreadyPurchased()) {
          this.modalService.alert({
            title: '✅ Ya adquiriste este producto',
            message: `Ya tienes acceso a "${prod.title}". Puedes verlo en tu perfil.`,
            icon: 'info'
          }).then(() => {
            this.router.navigate(['/profile-student']);
          });
        }
      }, 1000); // Esperar 1 segundo para que purchases se cargue

    } else {
      if (this.cartService.count() > 0) {
        this.isDirectBuy.set(false);
      } else {
        this.router.navigate(['/']);
        return;
      }
    }

    this.walletService.loadWallet();
    this.discountService.loadDiscounts().subscribe();
    this.checkoutService.reloadConfig();

    // 🔥 NUEVO: Cargar productos comprados
    this.purchasesService.loadPurchasedProducts();

    const currentUser = this.user();
    if (currentUser) {
      this.checkoutForm.patchValue({
        billingName: `${currentUser.name} ${currentUser.surname}`,
        billingEmail: currentUser.email || '',
      });
    }

    setTimeout(() => {
      if (this.isFreeProduct()) {
        this.selectPaymentMethod('wallet');
      }

      // 🔥 VERIFICAR CUPÓN PENDIENTE
      const pendingCoupon = localStorage.getItem('pending_coupon');
      if (pendingCoupon) {
        // 🔒 LOG REMOVIDO POR SEGURIDAD
        this.couponCode.set(pendingCoupon);
        this.checkCoupon();
        localStorage.removeItem('pending_coupon');
      }
    }, 100);
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  // 🔥 MÉTODOS AUXILIARES PARA EL TEMPLATE

  formatPrice(amount: number): string {
    return amount.toFixed(2);
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  buildImageUrl(imageName?: string, itemType?: string): string {
    if (!imageName) return 'https://via.placeholder.com/400x300?text=Sin+Imagen';

    // Si ya es una URL completa, retornarla directamente
    if (imageName.startsWith('http://') || imageName.startsWith('https://')) {
      return imageName;
    }

    // Determinar el tipo: usar itemType si se proporciona, sino el del producto actual
    const type = itemType || (this.isDirectBuy() ? this.productType() : 'course');

    // Usar las URLs configuradas en environment
    if (type === 'project') {
      return `${environment.images.project}${imageName}`;
    } else {
      return `${environment.images.course}${imageName}`;
    }
  }

  getProductTypeName(type: string): string {
    return type === 'course' ? 'Curso' : 'Proyecto';
  }

  getTransactionIcon(type: string): string {
    const icons: Record<string, string> = {
      credit: '💳',
      refund: '↩️',
      withdrawal: '💸',
      purchase: '🛒',
      bonus: '🎁',
      default: '💰'
    };
    return icons[type] || icons['default'];
  }

  getTransactionColor(type: string): string {
    const colors: Record<string, string> = {
      credit: 'text-green-400',
      refund: 'text-lime-400',
      withdrawal: 'text-red-400',
      purchase: 'text-orange-400',
      bonus: 'text-purple-400',
      default: 'text-gray-400'
    };
    return colors[type] || colors['default'];
  }

  getPaymentMethodInfo(methodId: string): PaymentMethod | undefined {
    return this.paymentMethods().find(m => m.id === methodId);
  }

  removeFromCart(itemId: string, itemType: string): void {
    // cartService expects itemType to be 'course' | 'project'
    this.cartService.removeFromCart(itemId, itemType as 'course' | 'project');
  }

  // 🔥 FIX CRÍTICO: Mejorar selección de método de pago
  selectPaymentMethod(methodId: string): void {
    // 🔒 LOG REMOVIDO POR SEGURIDAD

    // 🔒 VALIDACIÓN: Si selecciona billetera como método principal (no mixto)
    if (methodId === 'wallet' && !this.useWalletBalance()) {
      const balance = this.walletBalance();
      const total = this.subtotal();

      // Si el saldo no cubre el total, mostrar error
      if (balance < total) {
        this.errorMessage.set(
          `❌ Saldo insuficiente. Tienes $${balance.toFixed(2)} MXN pero el total es $${total.toFixed(2)} MXN. ` +
          `Activa el toggle "Usar saldo" para hacer un pago mixto.`
        );
        return;
      }

      // Si el saldo es suficiente, activar el uso de billetera automáticamente
      this.toggleWalletPayment(true);
    }

    this.selectedPaymentMethod.set(methodId);
    this.errorMessage.set('');


  }

  // 🔥 FIX: Mejorar toggle de billetera
  toggleWalletPayment(force?: boolean): void {
    const newValue = force !== undefined ? force : !this.useWalletBalance();
    this.useWalletBalance.set(newValue);

    if (newValue) {
      // Calcular cuánto del saldo se puede usar
      const total = this.subtotal();
      const balance = this.walletBalance();
      const amountToUse = Math.min(balance, total);

      this.walletAmount.set(amountToUse);

      // 🔥 NUEVO: Si la billetera cubre todo, auto-seleccionar wallet
      if (amountToUse >= total) {
        this.selectedPaymentMethod.set('wallet');
      } else {
        // 🔥 NUEVO: Si no cubre todo, limpiar método seleccionado para forzar selección
        if (this.selectedPaymentMethod() === 'wallet') {
          this.selectedPaymentMethod.set('');
        }
      }

    } else {
      this.walletAmount.set(0);
      if (this.selectedPaymentMethod() === 'wallet') {
        this.selectedPaymentMethod.set('');
      }
    }
  }

  async processPayment() {
    // 🔒 LOG REMOVIDO POR SEGURIDAD

    if (this.isProcessing() || this.showSuccess()) {
      return;
    }

    // ⚠️ POLÍTICA DE REEMBOLSOS
    const confirmed = await this.modalService.confirm({
      title: 'Política de Reembolsos',
      icon: 'warning',
      message: `✓ Tienes 7 DÍAS para solicitar reembolso
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

    // 🔒 VALIDACIÓN: Si usa billetera, verificar saldo suficiente
    if (this.useWalletBalance() && this.walletAmount() > 0) {
      const balance = this.walletBalance();
      const requestedAmount = this.walletAmount();

      if (balance < requestedAmount) {
        this.errorMessage.set(
          `❌ Error crítico: Saldo insuficiente. Tienes $${balance.toFixed(2)} MXN ` +
          `pero intentas usar $${requestedAmount.toFixed(2)} MXN. Por favor, recarga la página.`
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

    // 🔥 CORRECCIÓN CRÍTICA: Determinar método de pago correctamente
    const walletIsActive = this.useWalletBalance();
    const walletAmountUsed = this.walletAmount();
    const remaining = this.remainingAmount();

    let finalPaymentMethod: string;
    let finalWalletAmount: number;
    let finalRemainingAmount: number;

    // CASO 1: Pago 100% con billetera
    if (walletIsActive && remaining === 0 && walletAmountUsed > 0) {
      finalPaymentMethod = 'wallet';
      finalWalletAmount = walletAmountUsed;
      finalRemainingAmount = 0;
    }
    // CASO 2: Pago mixto (billetera + otro método)
    else if (walletIsActive && walletAmountUsed > 0 && remaining > 0) {
      if (!this.selectedPaymentMethod()) {
        this.errorMessage.set(
          `⚠️ Pago Mixto Requerido\n\n` +
          `Tu billetera cubre $${walletAmountUsed.toFixed(2)} MXN de los $${this.subtotal().toFixed(2)} MXN totales.\n\n` +
          `Por favor, selecciona un método de pago para completar los $${remaining.toFixed(2)} MXN restantes.`
        );
        this.isProcessing.set(false);
        return;
      }

      finalPaymentMethod = this.selectedPaymentMethod();
      finalWalletAmount = walletAmountUsed;
      finalRemainingAmount = remaining;
    }
    // CASO 3: Sin billetera - Pago normal
    else {
      finalPaymentMethod = this.selectedPaymentMethod() || '';
      finalWalletAmount = 0;
      finalRemainingAmount = this.subtotal();

      if (!finalPaymentMethod) {
        this.errorMessage.set('Por favor selecciona un método de pago');
        this.isProcessing.set(false);
        return;
      }
    }

    // 🔒 LOG REMOVIDO POR SEGURIDAD
    // Preparar items del carrito/producto
    let items: any[] = [];

    if (isDirect && prod) {
      items = [{
        product: prod._id,
        product_type: this.productType(),
        title: prod.title,
        price_unit: this.subtotal(),
        imagen: prod.imagen
      }];
    } else {
      items = cartItems.map(item => ({
        product: item._id,
        product_type: item.type,
        title: item.title,
        price_unit: item.price_mxn,
        imagen: item.imagen
      }));
    }

    const nTransaccion = this.checkoutService.generateTransactionNumber();
    this.transactionNumber.set(nTransaccion);

    const payload: any = {
      n_transaccion: nTransaccion,
      method_payment: finalPaymentMethod,
      subtotal_mxn: finalRemainingAmount,
      total: finalRemainingAmount,
      use_wallet: walletIsActive,
      wallet_amount: finalWalletAmount,
      remaining_amount: finalRemainingAmount,
      detail: items,
      billing: {
        name: this.checkoutForm.value.billingName || '',
        email: this.checkoutForm.value.billingEmail || '',
        phone: this.checkoutForm.value.billingPhone || ''
      }
    };

    // 🔥 Guardar payload temporal (sin loguear info sensible)
    if (this.appliedCoupon()) {
      payload.coupon_code = this.appliedCoupon().code;
    }
    (this as any).pendingPaymentPayload = payload;

    try {
      if (finalPaymentMethod === 'wallet') {
        // Pago 100% con wallet
        const resp = await this.checkoutService.processWalletPayment(payload).toPromise();
        // 🔒 LOG REMOVIDO POR SEGURIDAD

        this.showSuccess.set(true);
        this.walletService.loadWallet();

        setTimeout(() => {
          this.profileStudentService.reloadProfile();
          this.purchasesService.loadPurchasedProducts();
          this.profileService.reloadProfile();
        }, 1500);

        if (!isDirect) {
          this.cartService.clearCart();
        }

      } else {
        // Otros métodos (stripe, oxxo, etc)
        const resp = await this.checkoutService.processSale(payload).toPromise();
        // 🔒 LOG REMOVIDO POR SEGURIDAD

        if (resp && resp.session_url) {
          window.location.href = resp.session_url;
          return;
        }

        this.showSuccess.set(true);

        if (finalWalletAmount > 0) {
          this.walletService.loadWallet();
        }

        setTimeout(() => {
          this.profileStudentService.reloadProfile();
          this.purchasesService.loadPurchasedProducts();
          this.profileService.reloadProfile();
        }, 1500);

        if (!isDirect) {
          this.cartService.clearCart();
        }
      }

    } catch (error: any) {
      // 🔒 LOG REMOVIDO POR SEGURIDAD
      this.errorMessage.set(error?.error?.message || 'Error al procesar el pago');
    } finally {
      this.isProcessing.set(false);
    }
  }

  closeSuccessModalAndRedirect(): void {
    this.showSuccess.set(false);
    this.router.navigate(['/profile-student']);
  }

  // 🔥 MÉTODOS DE CUPÓN
  checkCoupon() {
    const code = this.couponCode().trim();
    if (!code) return;

    // Solo validamos para compra directa por ahora (o el primer item del carrito si se soportara)
    // El backend CouponController.validate pide code y product_id.
    // Si es carrito, ¿qué ID mandamos? El requerimiento dice "seleccionar el proyecto" al crear cupón.
    // Asumiremos que el cupón aplica a un producto específico.
    // Si es carrito con múltiples items, esto se complica.
    // Por simplicidad y seguridad, validemos con el item principal (compra directa) o iteremos.

    let productId = '';

    if (this.isDirectBuy() && this.product()) {
      productId = this.product()!._id;
    } else if (this.cartItems().length > 0) {
      // Si es carrito, tomamos el primer item por ahora para validar existencia
      // Idealmente el backend valida contra array de items.
      // Pero el requerimiento inicial era "checkout functionality to apply coupons".
      // Vamos a usar el ID del primer item como referencia base.
      productId = this.cartItems()[0]._id;
    } else {
      return;
    }

    this.isCheckingCoupon.set(true);
    this.couponError.set('');
    this.appliedCoupon.set(null);

    this.couponService.validateCoupon(code, productId).subscribe({
      next: (res: any) => {
        if (res.valid) {
          this.appliedCoupon.set(res.coupon);
          // recalcular totales (automático por computed)
        } else {
          this.couponError.set(res.message || 'Cupón no válido');
        }
        this.isCheckingCoupon.set(false);
      },
      error: (err) => {
        this.couponError.set(err.error?.message || 'Error al validar cupón');
        this.isCheckingCoupon.set(false);
      }
    });
  }

  removeCoupon() {
    this.appliedCoupon.set(null);
    this.couponCode.set('');
    this.couponError.set('');
  }
}
