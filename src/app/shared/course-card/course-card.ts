// src/app/shared/course-card/course-card.ts
import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment.development';

type AnyObj = Record<string, any>;

@Component({
  standalone: true,
  selector: 'course-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './course-card.html',
})
export class CourseCardComponent {
  course = input.required<AnyObj>();

  galeria = environment.images.course;
  private buildImage(part: string | null | undefined): string {
    if (!part) return 'https://picsum.photos/seed/course-card/640/360';
    const p = String(part).trim();
    // Si ya es una URL absoluta o una ruta de API, la devuelve directamente.
    if (/^https?:\/\//i.test(p)) {
      return p;
    }
    const base = this.galeria.endsWith('/') ? this.galeria : this.galeria + '/';
    // Si no, construye la URL completa.
    return base + encodeURIComponent(p);
  }

  title = computed(() => this.course()?.['title'] ?? '');
  slug  = computed(() => this.course()?.['slug'] ?? '');

  isLink = computed(() => !!this.slug());

  coverUrl = computed(() => {
    const c = this.course();
    const img = c?.['imagen'] || c?.['cover'] || c?.['portada'] || null;
    return this.buildImage(img); // Usar el helper para construir la URL
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
}
