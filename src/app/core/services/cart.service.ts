import { Injectable, signal, computed, effect } from '@angular/core';

export interface CartItem {
  _id: string;
  title: string;
  price_mxn: number;
  imagen?: string;
  type: 'course' | 'project';
  subtitle?: string;
  slug?: string;
  categorie?: any;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems = signal<CartItem[]>([]);

  public cart = computed(() => this.cartItems());
  public total = computed(() => this.cartItems().reduce((acc, item) => acc + item.price_mxn, 0));
  public count = computed(() => this.cartItems().length);

  constructor() {
    // Cargar del localStorage al iniciar
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        // Verificar si hay items con formato antiguo (price_usd)
        const hasLegacyItems = parsedCart.some((item: any) => item.price_usd !== undefined || item.price_mxn === undefined);

        if (hasLegacyItems) {
          console.warn('🧹 Clearing legacy cart data (USD -> MXN migration)');
          this.cartItems.set([]);
          localStorage.removeItem('cart');
        } else {
          this.cartItems.set(parsedCart);
        }
      } catch (e) {
        console.error('Error parsing cart from localStorage', e);
        this.cartItems.set([]);
      }
    }

    // Guardar en localStorage cuando cambie
    effect(() => {
      localStorage.setItem('cart', JSON.stringify(this.cartItems()));
    });
  }

  addToCart(item: CartItem): boolean {
    const currentCart = this.cartItems();
    // Verificar duplicados
    if (currentCart.some(i => i._id === item._id && i.type === item.type)) {
      return false; // Ya existe
    }
    this.cartItems.update(items => [...items, item]);
    return true;
  }

  removeFromCart(itemId: string, type: 'course' | 'project') {
    this.cartItems.update(items => items.filter(i => !(i._id === itemId && i.type === type)));
  }

  clearCart() {
    this.cartItems.set([]);
  }

  isInCart(itemId: string, type: 'course' | 'project'): boolean {
    return this.cartItems().some(i => i._id === itemId && i.type === type);
  }
}
