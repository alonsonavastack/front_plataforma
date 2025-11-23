// checkout.component.ts - 🆕 SISTEMA DE COMPRA DIRECTA (SIN CARRITO)
import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CheckoutService, PaymentMethod } from '../../core/services/checkout.service';
import { AuthService } from '../../core/services/auth';
import { WalletService } from '../../core/services/wallet.service';
import { PurchasesService } from '../../core/services/purchases.service';
import { ProfileService } from '../../core/services/profile.service'; // 🔥 NUEVO
import { ProfileStudentService } from '../../core/services/profile-student.service'; // 🔥 CRÍTICO
import { environment } from '../../../environments/environment';

interface CheckoutProduct {
  _id: string;
  title: string;
  subtitle?: string;
  price_usd: number;
  imagen?: string;
  slug?: string;
  type: 'course' | 'project';
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent implements OnInit, OnDestroy {
  checkoutService = inject(CheckoutService);
  authService = inject(AuthService);
  walletService = inject(WalletService);
  purchasesService = inject(PurchasesService);
  profileService = inject(ProfileService); // 🔥 NUEVO
  router = inject(Router);

  // 🔥 IMPORTAR ProfileStudentService para recargar correctamente
  private profileStudentService = inject(ProfileStudentService);

  // 🆕 PRODUCTO ÚNICO EN CHECKOUT
  product = signal<CheckoutProduct | null>(null);
  productType = signal<'course' | 'project' | null>(null);

  // State
  selectedPaymentMethod = signal<string>('');
  isProcessing = signal(false);
  showSuccess = signal(false);
  showWarningModal = signal(false);
  errorMessage = signal<string>('');
  transactionNumber = signal<string>('');

  // 🆕 Wallet state
  walletBalance = computed(() => this.walletService.balance());
  useWalletBalance = signal(false);
  walletAmount = signal(0);

  // 🆕 Total y restante
  subtotal = computed(() => this.product()?.price_usd || 0);

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

  user = computed(() => this.authService.user());

  // Payment methods
  paymentMethods = this.checkoutService.paymentMethods;

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

    // 🆕 Effect para validar que hay producto
    effect(() => {
      const prod = this.product();
      if (!prod && !this.showSuccess()) {
        console.log('⚠️ [Checkout] No hay producto, redirigiendo a home');
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

    console.log('🛒 [Checkout] Navigation state:', state);

    if (state && state.product && state.productType) {
      const prod: CheckoutProduct = {
        ...state.product,
        type: state.productType
      };
      this.product.set(prod);
      this.productType.set(state.productType);

      console.log('✅ [Checkout] Producto cargado:', prod);
    } else {
      console.log('❌ [Checkout] No se recibió producto, redirigiendo...');
      this.router.navigate(['/']);
      return;
    }

    // 🆕 Cargar saldo de billetera y transacciones
    this.walletService.loadWallet();

    // Pre-llenar el formulario con datos del usuario
    const currentUser = this.user();
    if (currentUser) {
      this.checkoutForm.patchValue({
        billingName: `${currentUser.name} ${currentUser.surname}`,
        billingEmail: currentUser.email || '',
      });
    }
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

      console.log('💰 [Checkout] Validando selección de billetera:', {
        balance,
        total,
        sufficient: balance >= total
      });

      // Si el saldo no cubre el total, mostrar error y no permitir selección
      if (balance < total) {
        this.errorMessage.set(
          `❌ Saldo insuficiente. Tienes $${balance.toFixed(2)} USD pero el total es $${total.toFixed(2)} USD. ` +
          `Necesitas $${(total - balance).toFixed(2)} USD más. Por favor, selecciona otro método de pago o usa tu saldo parcialmente.`
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

      console.log('💰 [Checkout] Toggle billetera activado:', {
        total,
        balance,
        amountToUse,
        coversTotal: amountToUse >= total
      });
    } else {
      this.walletAmount.set(0);
      // Si se desactiva y estaba en wallet, limpiar selección
      if (this.selectedPaymentMethod() === 'wallet') {
        this.selectedPaymentMethod.set('');
      }
    }
  }

  processPayment(): void {
    // 🔥 Prevenir múltiples clics
    if (this.isProcessing() || this.showSuccess()) {
      console.log('⚠️ Pago ya en proceso o completado. Ignorando clic adicional.');
      return;
    }

    const prod = this.product();
    if (!prod) {
      this.errorMessage.set('Error: No hay producto seleccionado');
      return;
    }

    // 🔒 VALIDACIÓN CRÍTICA 1: Si usa billetera, verificar saldo suficiente
    if (this.useWalletBalance() && this.walletAmount() > 0) {
      const balance = this.walletBalance();
      const requestedAmount = this.walletAmount();

      if (balance < requestedAmount) {
        this.errorMessage.set(
          `❌ Error crítico: Saldo insuficiente. Tienes ${balance.toFixed(2)} USD ` +
          `pero intentas usar ${requestedAmount.toFixed(2)} USD. Por favor, recarga la página.`
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

    console.log('🚀 Iniciando proceso de pago...');
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

    console.log('💰 [DEBUG] Estado de billetera:', {
      walletIsActive,
      walletAmountUsed,
      remaining,
      selectedMethod: this.selectedPaymentMethod()
    });

    // CASO 1: Pago 100% con billetera (toggle activo Y saldo cubre todo)
    if (walletIsActive && remaining === 0 && walletAmountUsed > 0) {
      finalPaymentMethod = 'wallet';
      finalWalletAmount = walletAmountUsed;
      finalRemainingAmount = 0;
      console.log('✅ CASO 1: Pago 100% con billetera');
    }
    // CASO 2: Pago mixto (billetera + otro método)
    else if (walletIsActive && walletAmountUsed > 0 && remaining > 0) {
      finalPaymentMethod = this.selectedPaymentMethod() || 'transfer';
      finalWalletAmount = walletAmountUsed;
      finalRemainingAmount = remaining;
      console.log('✅ CASO 2: Pago mixto - billetera + ' + finalPaymentMethod);
      
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
      console.log('✅ CASO 3: Pago sin billetera - método: ' + finalPaymentMethod);
      
      // Validar que seleccionó un método
      if (!finalPaymentMethod) {
        this.errorMessage.set('Por favor selecciona un método de pago');
        this.isProcessing.set(false);
        return;
      }
    }

    console.log('📤 [ENVÍO] Datos finales:', {
      method_payment: finalPaymentMethod,
      use_wallet: walletIsActive && walletAmountUsed > 0,
      wallet_amount: finalWalletAmount,
      remaining_amount: finalRemainingAmount
    });

    // Preparar datos de la venta
    const checkoutData: any = {
      method_payment: finalPaymentMethod,
      currency_total: 'USD',
      currency_payment: 'USD',
      total: this.subtotal(),
      n_transaccion: this.checkoutService.generateTransactionNumber(),
      price_dolar: this.checkoutService.getExchangeRate(),
      detail: [{
        product: prod._id,
        product_type: prod.type,
        title: prod.title,
        price_unit: prod.price_usd,
        discount: 0
      }],
      // 🔥 SIEMPRE enviar estos campos con valores correctos
      use_wallet: walletIsActive && finalWalletAmount > 0,
      wallet_amount: finalWalletAmount,
      remaining_amount: finalRemainingAmount
    };

    this.transactionNumber.set(checkoutData.n_transaccion);

    // Procesar la venta
    this.checkoutService.processSale(checkoutData).subscribe({
      next: (response) => {
        console.log('✅ Venta exitosa:', response);
        console.log('📦 Respuesta completa del backend:', JSON.stringify(response, null, 2));
        
        this.isProcessing.set(false);
        this.showSuccess.set(true);

        // 🔄 Recargar servicios después de una venta exitosa
        console.log('🔄 [Checkout] Iniciando recarga de servicios...');
        
        // 1. Recargar billetera inmediatamente si se usó
        if (walletIsActive && finalWalletAmount > 0) {
          console.log('💰 [Checkout] Recargando saldo de billetera...');
          this.walletService.loadWallet();
        }

        // 2. Recargar perfil con un pequeño delay para asegurar que el backend terminó
        setTimeout(() => {
          console.log('🔄 [Checkout] Recargando datos del perfil...');
          console.log('🕒 [Checkout] Timestamp:', new Date().toISOString());
          
          // 🔥 CRÍTICO: Llamar a loadProfile() que hace request HTTP directo
          this.profileStudentService.loadProfile().subscribe({
            next: (profileData) => {
              console.log('✅ [Checkout] Perfil recargado exitosamente');
              console.log('📦 [Checkout] Proyectos en perfil:', profileData.projects?.length || 0);
              
              if (profileData.projects && profileData.projects.length > 0) {
                console.log('📦 [Checkout] Lista de proyectos:');
                profileData.projects.forEach((p, i) => {
                  console.log(`   ${i + 1}. ${p.title}`);
                });
              }
              
              // También recargar otros servicios
              this.purchasesService.loadPurchasedProducts();
              this.profileService.reloadProfile();
              
              console.log('✅ [Checkout] Todos los servicios recargados exitosamente');
            },
            error: (err) => {
              console.error('❌ [Checkout] Error al recargar perfil:', err);
              // Aún así, intentar recargar otros servicios
              this.purchasesService.loadPurchasedProducts();
              this.profileService.reloadProfile();
              this.profileStudentService.reloadProfile();
            }
          });
        }, 2000); // Aumentado a 2 segundos para dar más tiempo al backend
      },
      error: (error) => {
        console.error('❌ Error al procesar la venta:', error);
        console.error('📋 Detalles del error:', JSON.stringify(error, null, 2));
        this.errorMessage.set(
          error.error?.message || 'Hubo un error al procesar tu pago. Por favor intenta de nuevo.'
        );
        this.isProcessing.set(false);
      }
    });
  }

  closeSuccessModalAndRedirect(): void {
    this.showSuccess.set(false);

    // 🔥 NUEVO: Si pagó 100% con billetera, no mostrar advertencia y redirigir directo
    if (this.isFullWalletPayment()) {
      console.log('✨ Pago 100% con billetera - Omitiendo modal de advertencia');
      this.closeWarningAndRedirect();
      return;
    }

    // 🔥 Mostrar el modal de advertencia para pagos mixtos o transferencias
    this.showWarningModal.set(true);
  }

  // 🔥 Cerrar el modal de advertencia y redirigir
  closeWarningAndRedirect(): void {
    this.showWarningModal.set(false);
    
    // Redirigir al perfil del estudiante a la sección correcta según el tipo de producto
    const productType = this.productType();
    const fragment = productType === 'project' ? 'projects' : 'courses';
    
    console.log(`📨 Redirigiendo a profile-student#${fragment}`);
    
    // 🔥 SOLUCIÓN OPTIMIZADA: Navegación con Angular Router
    // Al llegar a profile-student, los datos ya estarán actualizados gracias al setTimeout previo
    this.router.navigate(['/profile-student'], { fragment });
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

  formatPrice(price: number): string {
    return price.toFixed(2);
  }

  getPaymentMethodInfo(methodId: string): PaymentMethod | undefined {
    return this.paymentMethods.find(m => m.id === methodId);
  }

  getProductTypeName(type: string): string {
    return type === 'course' ? 'Curso' : 'Proyecto';
  }

  // 📋 Función para copiar al portapapeles
  copyToClipboard(text: string, type: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log(`✅ ${type} copiado al portapapeles:`, text);
      alert(`✅ ${type === 'cuenta' ? 'Número de cuenta' : type === 'clabe' ? 'CLABE' : 'Número de transacción'} copiado al portapapeles`);
    }).catch(err => {
      console.error('❌ Error al copiar:', err);
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
