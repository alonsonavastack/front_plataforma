// Cart system removed: purchases are direct via `/checkout`.
// This file was intentionally simplified to avoid accidental usage.

import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartService {

  // No-op methods to avoid runtime errors if some code still imports this service.
  addToCart() { throw new Error('CartService.addToCart is deprecated. Use direct purchase API.'); }
  removeFromCart() { throw new Error('CartService.removeFromCart is deprecated.'); }
  reloadCart() { /* no-op */ }
  toggleDrawer() { /* no-op */ }
}
