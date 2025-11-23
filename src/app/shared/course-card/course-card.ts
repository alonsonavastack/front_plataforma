// src/app/shared/course-card/course-card.ts
import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment.development';
import { PurchasesService } from '../../core/services/purchases.service';
import { AuthService } from '../../core/services/auth';
import { ToastService } from '../../core/services/toast.service';
import { CoursePublic } from '../../core/models/home.models';

type AnyObj = Record<string, any>;

@Component({
  standalone: true,
  selector: 'course-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './course-card.html',
})
export class CourseCardComponent {
  // 🔥 Output para compra directa
  buyNowClick = output<CoursePublic>();

  // Hacer Math disponible en el template
  Math = Math;
  course = input.required<CoursePublic>();

  private purchasesService = inject(PurchasesService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
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
    const img = c.imagen || null;
    return this.buildImage(img);
  });

  category = computed(() => {
    const cat = this.course().categorie;
    return typeof cat === 'string' ? undefined : (cat?.title ?? undefined);
  });

  instructor = computed(() => {
    const u = this.course().user;
    const name = (u && typeof u === 'object')
      ? [u.name, u.surname].filter(Boolean).join(' ')
      : '';
    return name || undefined;
  });

  priceOriginal = computed<number>(() => Number(this.course().price_usd ?? 0));
  priceCurrent  = computed<number>(() =>
    Number(this.course().final_price_usd ?? this.priceOriginal())
  );
  hasDiscount   = computed<boolean>(() =>
    !!this.course().discount_active && this.priceCurrent() < this.priceOriginal()
  );
  discountPct   = computed<number | null>(() => {
    const p0 = this.priceOriginal();
    const p1 = this.priceCurrent();
    if (!p0 || !(p1 < p0)) return null;
    return Math.round((1 - p1 / p0) * 100);
  });

  rating  = computed<string>(() =>
    String(this.course().AVG_RATING ?? '')
  );
  reviews = computed<number>(() =>
    Number(this.course().N_REVIEWS ?? 0)
  );

  // Verificar si ya fue comprado
  isPurchased = computed(() => {
    const id = this.courseId();
    return id ? this.purchasesService.isPurchased(id) : false;
  });

  // 🔥 Método actualizado para emitir evento de compra
  price = computed(() => this.priceCurrent());

  buyNow() {
    const id = this.courseId();
    if (!id || this.isPurchased()) return;

    if (!this.authService.isLoggedIn()) {
      this.toast.error('Debes iniciar sesión para comprar');
      return;
    }

    this.buyNowClick.emit(this.course());
  }
}
