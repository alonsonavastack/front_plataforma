// src/app/pages/course-detail/course-detail.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { environment } from '../../../environments/environment.development';
import { HeaderComponent } from '../../layout/header/header';
import { AuthService } from '../../core/services/auth';
import { HomeService } from '../../core/services/home';
import { CartService } from '../../core/services/cart.service';

type TabType = 'overview' | 'curriculum' | 'instructor' | 'reviews';

@Component({
  standalone: true,
  selector: 'app-course-detail',
  imports: [CommonModule, RouterLink, HeaderComponent],
  templateUrl: './course-detail.html',
})
export class CourseDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(HomeService);
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  // Estado de tabs
  activeTab = signal<TabType>('overview');
  setActiveTab(tab: TabType) {
    this.activeTab.set(tab);
  }

  // slug de la ruta
  slug = signal<string>('');

  // resource para el detalle
  detailRes = this.api.coursePublicResource(() => this.slug());
  isLoading = this.detailRes.isLoading;

  // Galería base (endpoint imágenes de curso)
  galeria = environment.images.course;

  // Estado para el video preview
  showVideoPreview = signal(false);

  // Helper robusto para construir URL de imagen
  buildImage(part: string | null | undefined): string {
    if (!part) return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800';
    const p = String(part).trim();
    if (/^https?:\/\//i.test(p)) return p;
    const base = this.galeria.endsWith('/') ? this.galeria : this.galeria + '/';
    return base + encodeURIComponent(p);
  }

  // Helper para avatar del instructor
  buildAvatarUrl(avatar: string | null | undefined): string {
    if (!avatar) return 'https://ui-avatars.com/api/?name=Instructor&background=a3e635&color=0f172a&size=128';
    const a = String(avatar).trim();
    if (/^https?:\/\//i.test(a)) return a;
    return `${environment.images.user}${encodeURIComponent(a)}`;
  }

  // ----- helpers seguros (try/catch para evitar ResourceValueError) -----
  safeDetail(): any {
    try {
      return this.detailRes.value();
    } catch {
      return {
        course: undefined,
        reviews: [],
        course_instructor: [],
        course_relateds: [],
        student_have_course: false,
      };
    }
  }

  hasError(): boolean {
    try {
      this.detailRes.value();
      return false;
    } catch {
      return true;
    }
  }

  errorMessage(): string {
    try {
      this.detailRes.value();
      return '';
    } catch (e: any) {
      const cause = e?.cause ?? e;
      return (
        (typeof cause?.message === 'string' && cause.message) ||
        'Error al cargar el curso'
      );
    }
  }

  course = computed<any>(() => this.safeDetail().course);
  reviews = computed<any[]>(() => this.safeDetail().reviews ?? []);
  moreFromInstructor = computed<any[]>(() => this.safeDetail().course_instructor ?? []);
  relatedCourses = computed<any[]>(() => this.safeDetail().course_relateds ?? []);
  studentHasCourse = computed<boolean>(() => !!this.safeDetail().student_have_course);

  // Video URL segura
  videoUrl = computed<SafeResourceUrl | null>(() => {
    const c = this.course();
    if (!c?.vimeo_id) return null;
    const url = `https://player.vimeo.com/video/${c.vimeo_id}?badge=0&autopause=0&player_id=0&app_id=58479`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  // ----- UI helpers -----
  coverUrl(): string {
    const c = this.course();
    const img = c?.['imagen'] || c?.['cover'] || c?.['portada'] || null;
    return this.buildImage(img);
  }

  instructorName(): string {
    const u = this.course()?.['user'];
    return typeof u === 'object'
      ? [u?.['name'], u?.['surname']].filter(Boolean).join(' ')
      : 'Instructor';
  }

  instructorAvatar(): string {
    const u = this.course()?.['user'];
    return typeof u === 'object' ? this.buildAvatarUrl(u?.['avatar']) : '';
  }

  instructorDescription(): string {
    const u = this.course()?.['user'];
    return typeof u === 'object' ? (u?.['description'] || 'Instructor profesional con amplia experiencia.') : '';
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
    const p0 = this.priceOriginal(),
      p1 = this.priceCurrent();
    if (!p0 || !p1) return null;
    return Math.round((1 - p1 / p0) * 100);
  }

  // métricas superiores
  metaStudents(): number {
    return Number(this.course()?.['n_students'] ?? 0);
  }
  metaReviews(): number {
    return Number(this.course()?.['n_reviews'] ?? 0);
  }
  metaRating(): string {
    return String(this.course()?.['avg_rating'] ?? '0.0');
  }
  totalTime(): string {
    const totalSeconds = Number(this.course()?.['time_total'] ?? 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m de contenido`;
  }
  totalClasses(): number {
    return Number(this.course()?.['num_clases_total'] ?? 0);
  }
  totalFiles(): number {
    return Number(this.course()?.['files_total'] ?? 0);
  }

  // Instructor meta
  instructorCourses(): number {
    return Number(this.course()?.['count_course_instructor'] ?? 0);
  }
  instructorStudents(): number {
    return Number(this.course()?.['n_students_instructor'] ?? 0);
  }
  instructorRating(): string {
    return String(this.course()?.['avg_rating_instructor'] ?? '0.0');
  }
  instructorReviews(): number {
    return Number(this.course()?.['num_review_instructor'] ?? 0);
  }

  // Requirements y Who is it for
  requirements = computed<string[]>(() => {
    return this.course()?.['requirements'] ?? [];
  });

  whoIsItFor = computed<string[]>(() => {
    return this.course()?.['who_is_it_for'] ?? [];
  });

  // acordeón simple
  openSections = signal<Record<string, boolean>>({});
  toggleSection(id: string) {
    const curr = { ...this.openSections() };
    curr[id] = !curr[id];
    this.openSections.set(curr);
  }
  isSectionOpen(id: string): boolean {
    return !!this.openSections()[id];
  }

  // Rating stars helper
  getStarArray(rating: number): boolean[] {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= rating);
    }
    return stars;
  }

  // Helper para formatear duración de secciones
  formatSectionDuration(seconds: number | undefined | null): string {
    if (!seconds || seconds <= 0) {
      return '0m';
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  }
  // acciones
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
    // Agregar al carrito y redirigir al checkout
    this.cartService.addToCart(this.course(), 'course');
    this.router.navigate(['/checkout']);
  }

  reload() {
    this.detailRes.reload();
  }

  ngOnInit(): void {
    const s = this.route.snapshot.paramMap.get('slug') ?? '';
    this.slug.set(s);
  }
}
