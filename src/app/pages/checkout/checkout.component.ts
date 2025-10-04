import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
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
export class CheckoutComponent implements OnInit {
  cartService = inject(CartService);
  checkoutService = inject(CheckoutService);
  authService = inject(AuthService);
  router = inject(Router);

  // State
  selectedPaymentMethod = signal<string>('');
  isProcessing = signal(false);
  showSuccess = signal(false);
  errorMessage = signal<string>('');
  transactionNumber = signal<string>(''); // Para guardar el número de referencia

  // Computed values
  cartItems = computed(() => {
    const items = this.cartService.items();
    console.log('Cart items in checkout:', items); // Debug
    return items;
  });
  subtotal = computed(() => this.cartService.subtotal());
  user = computed(() => this.authService.user());

  // Payment methods
  paymentMethods = this.checkoutService.paymentMethods;

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

      // Solo actuamos cuando la carga ha terminado y no hay items.
      if (!isLoading && items.length === 0) {
        this.router.navigate(['/']);
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

  selectPaymentMethod(methodId: string): void {
    this.selectedPaymentMethod.set(methodId);
    this.errorMessage.set('');
  }

  processPayment(): void {
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

    this.isProcessing.set(true);
    this.errorMessage.set('');

    // Preparar datos de la venta
    const checkoutData = {
      method_payment: this.selectedPaymentMethod(),
      currency_total: 'USD',
      currency_payment: 'USD',
      total: this.subtotal(),
      // Generamos el número de transacción y lo guardamos en la señal
      n_transaccion: this.checkoutService.generateTransactionNumber(), price_dolar: this.checkoutService.getExchangeRate(),
    };
    this.transactionNumber.set(checkoutData.n_transaccion);

    // Procesar la venta
    this.checkoutService.processSale(checkoutData).subscribe({
      next: (response) => {
        console.log('Venta exitosa:', response);
        this.showSuccess.set(true);

        // Limpiar el carrito
        this.cartService.reloadCart();

        // Redirigir después de 3 segundos
        setTimeout(() => {
          this.router.navigate(['/profile-student']);
        }, 3000);
      },
      error: (error) => {
        console.error('Error al procesar la venta:', error);
        this.errorMessage.set('Hubo un error al procesar tu pago. Por favor intenta de nuevo.');
        this.isProcessing.set(false);
      }
    });
  }

  // El backend ya devuelve la URL completa de la imagen, solo necesitamos devolverla
  buildImageUrl(imagen: string): string {
    if (!imagen) {
      console.warn('No image provided');
      return 'https://via.placeholder.com/150x100?text=Sin+Imagen';
    }

    console.log('Image URL:', imagen); // Debug
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
}
