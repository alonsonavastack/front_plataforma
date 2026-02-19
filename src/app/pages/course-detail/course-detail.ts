// src/app/pages/course-detail/course-detail.ts
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastService } from '../../core/services/toast.service';
import { SeoService } from '../../core/services/seo.service'; // 🆕

import { environment } from '../../../environments/environment';
import { HeaderComponent } from '../../layout/header/header';
import { AuthService } from '../../core/services/auth';
import { HomeService } from '../../core/services/home';
import { HttpClient } from '@angular/common/http';
import { CourseReviewsComponent } from '../../shared/course-reviews/course-reviews.component';
import { Review } from '../../core/services/review.service';


type TabType = 'overview' | 'curriculum' | 'instructor' | 'reviews';

import { MxnCurrencyPipe } from '../../shared/pipes/mxn-currency.pipe';

@Component({
  standalone: true,
  selector: 'app-course-detail',
  imports: [CommonModule, RouterLink, HeaderComponent, CourseReviewsComponent, MxnCurrencyPipe],
  templateUrl: './course-detail.html',
})
export class CourseDetailComponent {
  private route = inject(ActivatedRoute);
  private api = inject(HomeService);
  private http = inject(HttpClient);
  public authService = inject(AuthService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private toast = inject(ToastService);
  private seoService = inject(SeoService); // 🆕


  // ✅ Router signals
  private params = toSignal(this.route.paramMap, { initialValue: null });
  private errorToastShown = false;

  // Estado de tabs
  activeTab = signal<TabType>('overview');
  setActiveTab(tab: TabType) {
    this.activeTab.set(tab);
  }

  // ✅ slug reactivo desde router
  slug = computed(() => this.params()?.get('slug') || '');

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

  // ✅ Computed desde resource con tipado correcto
  hasError = this.detailRes.hasError;
  error = this.detailRes.error;

  // ✅ Computed con acceso seguro a propiedades
  course = computed<any>(() => {
    const detail = this.detailRes.value();
    return detail ? detail.course : undefined;
  });

  reviews = computed<any[]>(() => {
    const detail = this.detailRes.value();
    return detail?.reviews ?? [];
  });

  moreFromInstructor = computed<any[]>(() => {
    const detail = this.detailRes.value();
    return detail?.course_instructor ?? [];
  });

  relatedCourses = computed<any[]>(() => {
    const detail = this.detailRes.value();
    return detail?.course_relateds ?? [];
  });

  studentHasCourse = computed<boolean>(() => {
    const detail = this.detailRes.value();
    return !!detail?.student_have_course;
  });

  // NOTE: Cart removed — purchases are direct via API

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
    return !!(c?.['discount_active'] && c['final_price_mxn'] !== undefined && c['final_price_mxn'] < c['price_mxn']);
  }

  priceCurrent(): number {
    const c = this.course();
    return Number(c?.['final_price_mxn'] ?? c?.['price_mxn'] ?? 0);
  }

  priceOriginal(): number {
    const c = this.course();
    return Number(c?.['price_mxn'] ?? 0);
  }

  discountPercent(): number | null {
    if (!this.hasDiscount()) return null;
    const p0 = this.priceOriginal();
    const p1 = this.priceCurrent();
    if (!p0 || !(p1 < p0)) return null;
    return Math.round((1 - p1 / p0) * 100);
  }

  // Información del descuento
  discountValue(): number | null {
    const c = this.course();
    if (!c?.['discount_active']) return null;
    return Number(c.discount_active.discount ?? 0);
  }

  discountType(): number | null {
    const c = this.course();
    if (!c?.['discount_active']) return null;
    return Number(c.discount_active.type_discount ?? 1);
  }

  // métricas superiores
  metaStudents(): number {
    return Number(this.course()?.['N_STUDENTS'] ?? 0);
  }
  metaReviews(): number {
    return Number(this.course()?.['N_REVIEWS'] ?? 0);
  }
  metaRating(): string {
    return String(this.course()?.['AVG_RATING'] ?? '0.0');
  }
  totalTime(): string {
    const totalSeconds = Number(this.course()?.['time_total_course'] ?? 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m de contenido`;
  }
  totalClasses(): number {
    return Number(this.course()?.['N_CLASES'] ?? 0);
  }
  totalFiles(): number {
    return Number(this.course()?.['files_total_sections'] ?? 0);
  }

  // Instructor meta
  instructorCourses(): number {
    return Number(this.course()?.['instructor_info']?.['count_course_instructor'] ?? 0);
  }
  instructorStudents(): number {
    return Number(this.course()?.['instructor_info']?.['n_students_sum_total'] ?? 0);
  }
  instructorRating(): string {
    return String(this.course()?.['instructor_info']?.['avg_rating_instructor'] ?? '0.0');
  }
  instructorReviews(): number {
    return Number(this.course()?.['instructor_info']?.['num_review_sum_total'] ?? 0);
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
  // Compra directa: Navega al checkout con el producto
  buyNow() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    const c = this.course();
    if (!c || !c._id) return;

    // 🔥 NUEVO: Verificar si el usuario ya tiene el curso
    if (this.studentHasCourse()) {
      this.toast.info(
        'Ya tienes este curso',
        'Este curso ya está en tu biblioteca. Ve a "Mis Cursos" para acceder.'
      );
      // Redirigir a su perfil después de 2 segundos
      setTimeout(() => {
        this.router.navigate(['/profile-student']);
      }, 2000);
      return;
    }

    // Navegar al checkout pasando el producto en el state
    this.router.navigate(['/checkout'], {
      state: {
        product: c,
        productType: 'course'
      }
    });
  }



  reload() {
    this.detailRes.reload();
  }

  // Métodos para manejar eventos del componente de reviews
  onReviewAdded(review: Review) {
    this.toast.success('¡Review publicada!', 'Tu review ha sido publicada exitosamente');
    this.reload();
  }

  onReviewUpdated(review: Review) {
    this.toast.success('¡Review actualizada!', 'Tu review ha sido actualizada exitosamente');
    this.reload();
  }

  // Método para navegar a otro curso
  navigateToCourse(slug: string) {
    if (slug) {
      this.router.navigate(['/course-detail', slug]);
    }
  }

  constructor() {
    // ✅ Effect: Mostrar toast SOLO UNA VEZ cuando hay error
    effect(() => {
      const error = this.error();
      if (error && !this.errorToastShown) {
        this.errorToastShown = true;
        this.toast.error('Error al cargar', 'No se pudo cargar el curso. Verifica tu conexión.');
      }
    });

    // 🔥 NUEVO: Actualizar SEO cuando carga el curso
    effect(() => {
      const course = this.course();
      if (course) {
        this.seoService.setSeo({
          title: course.title,
          description: course.subtitle || course.description || 'Aprende con este curso en Dev Hub Sharks',
          image: this.coverUrl(),
          keywords: `curso, ${course.title}, ${this.categoryTitle()}, ${this.instructorName()}, aprender`,
          type: 'article'
        });
      }
    });

    // 🔥 NUEVO: Recargar cuando el usuario cambie (login/logout)
    effect(() => {
      const isLoggedIn = this.authService.isLoggedIn();
      const slug = this.slug();

      // Si hay un slug y el estado de login cambia, recargar
      if (slug) {
        this.detailRes.reload();
      }
    });
  }

  ngOnInit(): void {
    // ✅ Router signals manejan automáticamente los cambios de slug
  }

  ngOnDestroy(): void {
    // ✅ Sin cleanup manual - router signals se limpian solos
  }
}
