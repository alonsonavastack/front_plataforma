import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { AuthService } from './auth';
import { tap } from 'rxjs';

// Definimos una interfaz para los artículos del carrito para tener un tipado fuerte.
export interface CartItem {
  _id: string;
  product: {
    _id: string;
    title: string;
    imagen: string;
  };
  product_type: 'course' | 'project';
  price_unit: number;
  total: number;
}

export interface CartListResponse {
  carts: CartItem[];
}

type CartState = { carts: CartItem[], isLoading: boolean, error: any };

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly API_URL = environment.url;

  // --- Signals para el estado del carrito ---

  // El panel del carrito está abierto o cerrado.
  readonly isDrawerOpen = signal(false);
  private state = signal<CartState>({
    carts: [],
    isLoading: false,
    error: null,
  });


  constructor() {
    // Este efecto se ejecutará automáticamente cuando el usuario inicie sesión.
    // Al depender directamente del token, nos aseguramos que la recarga ocurra
    // solo cuando la autenticación está 100% lista.
    effect(() => {
      // Solo cargar el carrito si el usuario está logueado Y es un cliente.
      if (this.authService.isLoggedIn() && this.authService.user()?.rol === 'cliente') {
        this.reloadCart();
      }
    });
  }

  // --- Signals computados derivados del estado ---

  readonly items = computed(() => this.state().carts);
  // Cantidad total de artículos para el badge del ícono.
  readonly totalItems = computed(() => this.items().length); // Derivado de items
  readonly isLoading = computed(() => this.state().isLoading);

  // Suma total del precio de los artículos.
  readonly subtotal = computed(() =>
    this.items().reduce((acc: number, item: CartItem) => acc + item.total, 0)
  );

  // --- Métodos para interactuar con el carrito ---

  /** Carga los artículos del carrito desde el backend. */
  reloadCart() {
    const isClient = this.authService.user()?.rol === 'cliente';
    if (!this.authService.token() || !isClient) {
      this.state.set({ carts: [], isLoading: false, error: null });
      return;
    }

    this.state.update((s: CartState) => ({ ...s, isLoading: true }));

    this.http.get<CartListResponse>(`${this.API_URL}cart/list`).subscribe({
      next: (response) => {
        this.state.update((s: CartState) => ({ ...s, carts: response.carts, isLoading: false }));
      },
      error: (err) => {
        console.error('Error loading cart:', err);
        this.state.update((s: CartState) => ({ ...s, carts: [], isLoading: false, error: err }));
      }
    });
  }

  /** Agrega un artículo al carrito. */
  addToCart(product: any, productType: 'course' | 'project') {
    // Evita agregar duplicados
    if (this.items().some((item: CartItem) => item.product._id === product._id)) {
      console.log('El artículo ya está en el carrito.');
      this.isDrawerOpen.set(true); // Abrimos el carrito para que el usuario lo vea
      return;
    }

    // El backend necesita el precio para crear el registro en el carrito.
    const price = product.price_discount ?? product.price_usd;
    const payload = {
      product: product._id,
      product_type: productType,
      price_unit: price,
      subtotal: price, // Añadir subtotal
      total: price,    // Añadir total
    };

    this.http.post<{ cart: CartItem }>(`${this.API_URL}cart/add`, payload).subscribe(({ cart }) => {
      this.reloadCart(); // Recargar el carrito para reflejar el nuevo artículo
      this.isDrawerOpen.set(true); // Abrimos el carrito al agregar
    });
  }

  /** Elimina un artículo del carrito. */
  removeFromCart(cartId: string) {
    // Llama al backend para eliminarlo de la base de datos.
    this.http.delete(`${this.API_URL}cart/remove/${cartId}`).subscribe(() => {
      this.reloadCart(); // Recargamos el carrito para asegurar consistencia.
    });
  }

  /** Abre o cierra el panel del carrito. */
  toggleDrawer() {
    this.isDrawerOpen.update(isOpen => !isOpen);
  }
}
