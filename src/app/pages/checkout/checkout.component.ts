import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CartService, CartItem } from '../../core/services/cart.service';
import { CheckoutService, PaymentMethod } from '../../core/services/checkout.service';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent implements OnInit, OnDestroy {
  cartService = inject(CartService);
  checkoutService = inject(CheckoutService);
  authService = inject(AuthService);
  router = inject(Router);

  // State
  selectedPaymentMethod = signal<string>('');
  isProcessing = signal(false);
  showSuccess = signal(false);
  showWarningModal = signal(false); // 🔥 Nuevo modal de advertencia
  errorMessage = signal<string>('');
  transactionNumber = signal<string>(''); // Para guardar el número de referencia

  // Computed values
  cartItems = computed(() => {
    const items = this.cartService.items();
    return items;
  });
  subtotal = computed(() => this.cartService.subtotal());
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
    // Usamos un 'effect' para reaccionar a los cambios en el carrito de forma asíncrona.
    // Esto soluciona el problema de la redirección prematura.
    effect(() => {
      // Este código se ejecutará cuando `cartItems()` o `isLoading()` cambien.
      const items = this.cartItems();
      const isLoading = this.cartService.isLoading();

      // Solo actuamos cuando la carga ha terminado, no hay items Y NO se está mostrando el modal de éxito
      if (!isLoading && items.length === 0 && !this.showSuccess() && !this.showWarningModal()) {
        this.router.navigate(['/']);
      }
    });

    // 🔥 Effect para controlar el scroll del body cuando los modales están abiertos
    effect(() => {
      const isModalOpen = this.showSuccess() || this.showWarningModal();
      if (isModalOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  ngOnInit(): void {
    // Verificar que el usuario esté logueado
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Forzar la recarga del carrito para asegurar que los datos están actualizados.
    this.cartService.reloadCart();

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
    this.selectedPaymentMethod.set(methodId);
    this.errorMessage.set('');
  }

  processPayment(): void {
    // 🔥 Prevenir múltiples clics - Si ya está procesando o ya se mostró éxito, no hacer nada
    if (this.isProcessing() || this.showSuccess()) {
      console.log('⚠️ Pago ya en proceso o completado. Ignorando clic adicional.');
      return;
    }

    if (!this.selectedPaymentMethod()) {
      this.errorMessage.set('Por favor selecciona un método de pago');
      return;
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

    // Preparar datos de la venta
    const checkoutData = {
      method_payment: this.selectedPaymentMethod(),
      currency_total: 'USD',
      currency_payment: 'USD',
      total: this.subtotal(),
      // Generamos el número de transacción y lo guardamos en la señal
      n_transaccion: this.checkoutService.generateTransactionNumber(),
      price_dolar: this.checkoutService.getExchangeRate(),
    };
    this.transactionNumber.set(checkoutData.n_transaccion);

    // Procesar la venta
    this.checkoutService.processSale(checkoutData).subscribe({
      next: (response) => {
        console.log('✅ Venta exitosa:', response);
        this.isProcessing.set(false);
        this.showSuccess.set(true);

        // NO limpiar el carrito aquí, lo haremos cuando el usuario cierre el modal
        // Esto permite que el modal permanezca visible con toda la información
      },
      error: (error) => {
        console.error('❌ Error al procesar la venta:', error);
        this.errorMessage.set('Hubo un error al procesar tu pago. Por favor intenta de nuevo.');
        this.isProcessing.set(false);
      }
    });
  }

  closeSuccessModalAndRedirect(): void {
    this.showSuccess.set(false);
    // 🔥 Mostrar el modal de advertencia después de cerrar el modal de éxito
    this.showWarningModal.set(true);
  }

  // 🔥 Nuevo método para cerrar el modal de advertencia y redirigir
  closeWarningAndRedirect(): void {
    this.showWarningModal.set(false);
    // Limpiar el carrito DESPUÉS de que el usuario cierre el modal de advertencia
    this.cartService.reloadCart();
    // Redirigir al perfil del estudiante directamente a la sección de Mis Compras
    this.router.navigate(['/profile-student'], { fragment: 'purchases' });
  }

  // El backend ya devuelve la URL completa de la imagen, solo necesitamos devolverla
  buildImageUrl(imagen: string): string {
    if (!imagen) {
      return 'https://via.placeholder.com/150x100?text=Sin+Imagen';
    }

    return imagen;
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
      // Podrías agregar una notificación toast aquí
      alert(`✅ ${type === 'cuenta' ? 'Número de cuenta' : type === 'clabe' ? 'CLABE' : 'Número de transacción'} copiado al portapapeles`);
    }).catch(err => {
      console.error('❌ Error al copiar:', err);
      alert('❌ No se pudo copiar. Por favor, copia manualmente.');
    });
  }
}
