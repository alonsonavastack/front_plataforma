// src/app/pages/course-detail/course-detail.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment.development';
import { HeaderComponent } from '../../layout/header/header';
import { AuthService } from '../../core/services/auth';
import { HomeService } from '../../core/services/home';
import { CartService } from '../../core/services/cart.service';

@Component({
  standalone: true,
  selector: 'app-course-detail',
  imports: [CommonModule, RouterLink, HeaderComponent],
  templateUrl: './course-detail.html',
})
export class CourseDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api   = inject(HomeService);
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // slug de la ruta
  slug = signal<string>('');

  // resource para el detalle
  detailRes = this.api.coursePublicResource(() => this.slug());
  isLoading = this.detailRes.isLoading;

  // Galería base (endpoint imágenes de curso)
  galeria = environment.images.course;

  // Helper robusto para construir URL de imagen
  buildImage(part: string | null | undefined): string {
    if (!part) return 'https://picsum.photos/seed/fallback/600/360';
    const p = String(part).trim();
    if (/^https?:\/\//i.test(p)) return p; // ya es absoluta
    const base = this.galeria.endsWith('/') ? this.galeria : this.galeria + '/';
    return base + encodeURIComponent(p);
  }

  // ----- helpers seguros (try/catch para evitar ResourceValueError) -----
  safeDetail(): any {
    try { return this.detailRes.value(); }
    catch { return { course: undefined, reviews: [], course_instructor: [], course_relateds: [], student_have_course: false }; }
  }
  hasError(): boolean {
    try { this.detailRes.value(); return false; } catch { return true; }
  }
  errorMessage(): string {
    try { this.detailRes.value(); return ''; }
    catch (e: any) {
      const cause = e?.cause ?? e;
      return (typeof cause?.message === 'string' && cause.message) || 'Error al cargar el curso';
    }
  }

  course = computed<any>(() => this.safeDetail().course);
  reviews = computed<any[]>(() => this.safeDetail().reviews ?? []);
  moreFromInstructor = computed<any[]>(() => this.safeDetail().course_instructor ?? []);
  relatedCourses = computed<any[]>(() => this.safeDetail().course_relateds ?? []);
  studentHasCourse = computed<boolean>(() => !!this.safeDetail().student_have_course);

  // ----- UI helpers -----
  coverUrl(): string {
    const c = this.course();
    const img = c?.['imagen'] || c?.['cover'] || c?.['portada'] || null;
    return this.buildImage(img);
  }
  instructorName(): string {
    const u = this.course()?.['user'];
    return typeof u === 'object' ? [u?.['name'], u?.['surname']].filter(Boolean).join(' ') : 'Instructor';
  }
  categoryTitle(): string {
    const cat = this.course()?.['categorie'];
    return typeof cat === 'object' ? (cat?.['title'] ?? 'Categoría') : 'Categoría';
  }

  // precios
  hasDiscount(): boolean {
    const c = this.course();
    return !!(c?.['price_discount'] && c['price_usd'] && c['price_discount'] < c['price_usd']);
  }
  priceCurrent(): number {
    const c = this.course();
    return Number(c?.['price_discount'] ?? c?.['price_usd'] ?? 0);
  }
  priceOriginal(): number {
    const c = this.course();
    return Number(c?.['price_usd'] ?? 0);
  }
  discountPercent(): number | null {
    if (!this.hasDiscount()) return null;
    const p0 = this.priceOriginal(), p1 = this.priceCurrent();
    if (!p0 || !p1) return null;
    return Math.round((1 - p1 / p0) * 100);
  }

  // métricas superiores
  metaStudents(): number { return Number(this.course()?.['n_students'] ?? 0); }
  metaReviews(): number { return Number(this.course()?.['n_reviews'] ?? 0); }
  metaRating(): string  { return String(this.course()?.['avg_rating'] ?? '0.0'); }
  totalTime(): string   { return String(this.course()?.['time_total'] ?? '0'); }
  totalClasses(): number { return Number(this.course()?.['num_clases_total'] ?? 0); }
  totalFiles(): number { return Number(this.course()?.['files_total'] ?? 0); }

  // acordeón simple
  openSections = signal<Record<string, boolean>>({});
  toggleSection(id: string) {
    const curr = { ...this.openSections() };
    curr[id] = !curr[id];
    this.openSections.set(curr);
  }
  isSectionOpen(id: string): boolean { return !!this.openSections()[id]; }

  // acciones (por cablear)
  addToCart() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.cartService.addToCart(this.course(), 'course');
  }
  buyNow() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    console.log('buy now', this.course()?._id);
  }
  reload()    { this.detailRes.reload(); }

  ngOnInit(): void {
    const s = this.route.snapshot.paramMap.get('slug') ?? '';
    this.slug.set(s);
  }
}
