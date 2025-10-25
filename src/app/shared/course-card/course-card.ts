// src/app/shared/course-card/course-card.ts
import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment.development';
import { PurchasesService } from '../../core/services/purchases.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth';

type AnyObj = Record<string, any>;

@Component({
  standalone: true,
  selector: 'course-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './course-card.html',
})
export class CourseCardComponent {
  // Hacer Math disponible en el template
  Math = Math;
  course = input.required<AnyObj>();

  private purchasesService = inject(PurchasesService);
  private cartService = inject(CartService);
  private authService = inject(AuthService);

  galeria = environment.images.course;

  private buildImage(part: string | null | undefined): string {
    if (!part) return 'https://picsum.photos/seed/course-card/640/360';
    const p = String(part).trim();
    if (/^https?:\/\//i.test(p)) {
      return p;
    }
    const base = this.galeria.endsWith('/') ? this.galeria : this.galeria + '/';
    return base + encodeURIComponent(p);
  }

  title = computed(() => this.course()?.['title'] ?? '');
  slug  = computed(() => this.course()?.['slug'] ?? '');
  courseId = computed(() => this.course()?.['_id'] ?? '');

  isLink = computed(() => !!this.slug());

  coverUrl = computed(() => {
    const c = this.course();
    const img = c?.['imagen'] || c?.['cover'] || c?.['portada'] || null;
    return this.buildImage(img);
  });

  category = computed(() => {
    const cat = this.course()?.['categorie'];
    return typeof cat === 'string' ? undefined : (cat?.['title'] ?? undefined);
  });

  instructor = computed(() => {
    const u = this.course()?.['user'];
    const name = (u && typeof u === 'object')
      ? [u['name'], u['surname']].filter(Boolean).join(' ')
      : '';
    return name || undefined;
  });

  priceOriginal = computed<number>(() => Number(this.course()?.['price_usd'] ?? 0));
  priceCurrent  = computed<number>(() =>
    Number(this.course()?.['final_price_usd'] ?? this.priceOriginal())
  );
  hasDiscount   = computed<boolean>(() =>
    !!this.course()?.['discount_active'] && this.priceCurrent() < this.priceOriginal()
  );
  discountPct   = computed<number | null>(() => {
    const p0 = this.priceOriginal();
    const p1 = this.priceCurrent();
    if (!p0 || !(p1 < p0)) return null;
    return Math.round((1 - p1 / p0) * 100);
  });

  rating  = computed<string>(() =>
    String(this.course()?.['avg_rating'] ?? this.course()?.['avgRating'] ?? '')
  );
  reviews = computed<number>(() =>
    Number(this.course()?.['n_reviews'] ?? this.course()?.['nReviews'] ?? 0)
  );

  // Verificar si ya fue comprado
  isPurchased = computed(() => {
    const id = this.courseId();
    return id ? this.purchasesService.isPurchased(id) : false;
  });

  // Verificar si está en el carrito
  isInCart = computed(() => {
    const id = this.courseId();
    if (!id) return false;
    return this.cartService.items().some(item =>
      item.product._id === id && item.product_type === 'course'
    );
  });

  // Agregar al carrito
  addToCart() {
    const id = this.courseId();
    if (!id || this.isPurchased() || this.isInCart()) return;

    if (!this.authService.isLoggedIn()) {
      alert('Debes iniciar sesión para agregar al carrito');
      return;
    }

    this.cartService.addToCart(this.course(), 'course');
  }
}
