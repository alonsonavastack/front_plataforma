import { CommonModule } from "@angular/common";
import {
  CoursePublic,
  Project,
  Enrollment,
  User,
} from "../../core/models/home.models";
import { HomeService } from "../../core/services/home";
import { AuthService } from "../../core/services/auth";
// import { CartService } from "../../core/services/cart.service"; // 🗑️ ELIMINADO - Sistema de compra directa

import { CourseCardComponent } from "../../shared/course-card/course-card";
import { environment } from "../../../environments/environment";
import { HeaderComponent } from "../../layout/header/header";
import { FooterComponent } from "../../layout/footer/footer"; // 🔥 NUEVO
import { CurrencyService } from '../../services/currency.service'; // 🔥 NUEVO
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import {
  Component,
  OnInit,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  untracked,
  ChangeDetectionStrategy
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { ProfileService } from "../../core/services/profile.service";
import { CategoriesService } from "../../core/services/categories";
import { ProjectsCardComponent } from "../../shared/projects-card/projects-card";
import { DiscountService } from "../../core/services/discount.service";
import { SearchService } from "../../core/services/search";
import { CarouselComponent } from "../carousel/carousel.component";
import { PurchasesService } from "../../core/services/purchases.service";
import { InstructorCardComponent, Instructor } from '../../shared/instructor-card/instructor-card.component';
import { HttpClient } from '@angular/common/http';
import { SystemConfigService } from '../../core/services/system-config.service';
import { ToastService } from '../../core/services/toast.service';
import { Subscription } from 'rxjs';
import { LegalModalComponent, LegalModalType } from '../../shared/legal-modal/legal-modal.component';
import { RefundsService } from '../../core/services/refunds.service'; // 🔥 NUEVO
import { WalletService } from '../../core/services/wallet.service'; // 💰 Para billetera
import { MxnCurrencyPipe } from '../../shared/pipes/mxn-currency.pipe';
import { SeoService } from '../../core/services/seo.service'; // 🆕

@Component({
  standalone: true,
  selector: "app-home",
  imports: [
    CommonModule,
    RouterLink,
    CourseCardComponent,
    HeaderComponent,
    FooterComponent, // 🔥 NUEVO
    ProjectsCardComponent,
    CarouselComponent,
    InstructorCardComponent,
    LegalModalComponent,
    MxnCurrencyPipe,
  ],
  templateUrl: "./home.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, OnDestroy {
  api = inject(HomeService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  // cartService = inject(CartService); // 🗑️ ELIMINADO - Sistema de compra directa
  authService = inject(AuthService);
  profileService = inject(ProfileService);
  categoriesService = inject(CategoriesService);
  discountService = inject(DiscountService);
  searchService = inject(SearchService);
  purchasesService = inject(PurchasesService);
  private http = inject(HttpClient);
  systemConfigService = inject(SystemConfigService);
  private toast = inject(ToastService);
  refundsService = inject(RefundsService); // 🔥 NUEVO
  walletService = inject(WalletService); // 💰 Para billetera
  currencyService = inject(CurrencyService); // 💱 Conversor de moneda
  private seoService = inject(SeoService); // 🆕

  // 🚨 Control de errores
  private errorToastShown = false;

  // Signals para instructores
  instructors = signal<Instructor[]>([]);
  searchInstructorTerm = signal<string>('');

  // 📜 Signals para Legal Modal
  isLegalModalOpen = signal<boolean>(false);
  legalModalType = signal<LegalModalType>(null);

  // 🔥 System Config
  systemConfig = computed(() => this.systemConfigService.config());
  systemLogo = computed(() => {
    const config = this.systemConfig();
    if (config?.logo) {
      return this.systemConfigService.buildLogoUrl(config.logo);
    }
    return 'assets/images/logo-default.png'; // Fallback
  });
  systemName = computed(() => {
    const config = this.systemConfig();
    return config?.siteName || 'Dev-Sharks';
  });

  // 🔥 CHECK: Módulo de cursos habilitado
  coursesEnabled = computed(() => {
    return this.systemConfigService.config()?.modules?.courses ?? true;
  });

  // Computed para filtrar instructores
  filteredInstructors = computed(() => {
    // Normalizar término de búsqueda (minúsculas y sin acentos)
    const rawSearch = this.searchInstructorTerm().toLowerCase().trim();
    const search = rawSearch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const all = this.instructors();

    if (!search) return all;

    return all.filter(instructor => {
      // Normalizar nombre y apellido
      const fullNameRaw = `${instructor.name} ${instructor.surname}`.toLowerCase();
      const fullName = fullNameRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Normalizar profesión
      const professionRaw = (instructor.profession || '').toLowerCase();
      const profession = professionRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      return fullName.includes(search) || profession.includes(search);
    });
  });

  // ---------- UI state ----------
  q = signal<string>("");
  selectedCategorie = signal<string | undefined>(undefined);

  // ✅ Loading del httpResource
  isLoading = this.api.isLoadingHome;
  hasError = this.api.hasErrorHome;
  homeError = this.api.errorHome; // ✅ Signal de error

  // Cursos del usuario
  enrolledCourses = this.profileService.enrolledCourses;

  // Proyectos comprados del usuario
  purchasedProjects = this.profileService.purchasedProjects;

  // ---------- PAGINACIÓN ----------
  catalogPage = signal<number>(1);
  catalogItemsPerPage = signal<number>(10); // Opciones: 10, 15, 20
  catalogTotalItems = computed(() => this.catalogResults().length);
  catalogTotalPages = computed(() =>
    Math.ceil(this.catalogTotalItems() / this.catalogItemsPerPage())
  );

  // Resultados paginados
  catalogResultsPaginated = computed(() => {
    const results = this.catalogResults();
    const page = this.catalogPage();
    const perPage = this.catalogItemsPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return results.slice(start, end);
  });

  // ---------- Catálogo con filtros ----------
  catalogShowCourses = signal<boolean>(true);
  catalogShowProjects = signal<boolean>(true);
  catalogCategory = signal<string>("");
  catalogPriceRange = signal<string>("");
  catalogLevel = signal<string>("");
  catalogSortBy = signal<string>("recent");

  // Control de visibilidad de filtros en móvil
  showCatalogFilters = signal<boolean>(false);

  // Helpers para el contador de filtros activos
  hasActiveFilters = computed(() => {
    return (
      this.catalogCategory() !== "" ||
      this.catalogPriceRange() !== "" ||
      this.catalogLevel() !== "" ||
      !this.catalogShowCourses() ||
      !this.catalogShowProjects()
    );
  });

  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.catalogCategory()) count++;
    if (this.catalogPriceRange()) count++;
    if (this.catalogLevel()) count++;
    if (!this.catalogShowCourses()) count++;
    if (!this.catalogShowProjects()) count++;
    return count;
  });

  // Resultados del catálogo combinando cursos y proyectos
  catalogResults = computed(() => {
    let items: any[] = [];

    // Agregar cursos si está seleccionado Y habilitado
    if (this.catalogShowCourses() && this.coursesEnabled()) {
      const coursesWithType = (this.api.allCourses() ?? []).map(
        (c: CoursePublic) => ({ ...c, type: "course" })
      );
      items = [...items, ...coursesWithType];
    }

    // Agregar proyectos si está seleccionado
    if (this.catalogShowProjects()) {
      const projectsWithType = (this.api.allProjects() ?? []).map(
        (p: Project) => ({ ...p, type: "project" })
      );
      items = [...items, ...projectsWithType];
    }

    // Filtrar por categoría
    const cat = this.catalogCategory();
    if (cat) {
      items = items.filter((item) => {
        const catId =
          typeof item.categorie === "object"
            ? item.categorie._id
            : item.categorie;
        return catId === cat;
      });
    }

    // Filtrar por precio
    const priceRange = this.catalogPriceRange();
    if (priceRange) {
      const [min, max] = priceRange
        .split("-")
        .map((v) => (v ? parseFloat(v) : null));
      items = items.filter((item) => {
        const price = item.price_mxn || 0;
        if (min !== null && max !== null) {
          return price >= min && price <= max;
        } else if (min !== null) {
          return price >= min;
        } else if (max !== null) {
          return price <= max;
        }
        return true;
      });
    }

    // Filtrar por nivel (solo cursos)
    const level = this.catalogLevel();
    if (level) {
      items = items.filter(
        (item) => item.type === "course" && item.level === level
      );
    }

    // Ordenar
    const sortBy = this.catalogSortBy();
    if (sortBy === "price-low") {
      items.sort((a, b) => (a.price_mxn || 0) - (b.price_mxn || 0));
    } else if (sortBy === "price-high") {
      items.sort((a, b) => (b.price_mxn || 0) - (a.price_mxn || 0));
    } else if (sortBy === "popular") {
      items.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    }

    return items;
  });

  // Métodos de paginación
  goToPage(page: number): void {
    if (page < 1 || page > this.catalogTotalPages()) return;
    this.catalogPage.set(page);
    // Scroll to top del catálogo
    const catalogSection = document.getElementById('catalog-section');
    if (catalogSection) {
      catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  nextPage(): void {
    if (this.catalogPage() < this.catalogTotalPages()) {
      this.goToPage(this.catalogPage() + 1);
    }
  }

  prevPage(): void {
    if (this.catalogPage() > 1) {
      this.goToPage(this.catalogPage() - 1);
    }
  }

  changeItemsPerPage(count: number): void {
    this.catalogItemsPerPage.set(count);
    this.catalogPage.set(1); // Reset a la primera página
  }

  // Computed para generar el array de páginas a mostrar
  visiblePages = computed(() => {
    const current = this.catalogPage();
    const total = this.catalogTotalPages();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      // Mostrar todas las páginas si son 7 o menos
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Siempre mostrar primera página
      pages.push(1);

      if (current > 3) {
        pages.push('...');
      }

      // Páginas alrededor de la actual
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push('...');
      }

      // Siempre mostrar última página
      pages.push(total);
    }

    return pages;
  });

  constructor() {
    // ✅ Effect: Mostrar toast SOLO UNA VEZ cuando hay error
    effect(() => {
      const error = this.homeError();
      if (error && !this.errorToastShown) {
        this.errorToastShown = true;
        this.toast.networkError();
      }
    });

    // ✅ Effect: Recargar compras cuando el usuario inicia sesión
    effect(() => {
      if (this.authService.isLoggedIn()) {
        untracked(() => {
          this.purchasesService.loadPurchasedProducts();
        });
      }
    });
  }

  // ✅ Computed helpers - httpResource maneja los errores automáticamente
  categoriesSafe = computed(() => this.api.home().categories ?? []);
  featuredSafe = computed(() => this.api.home().courses_featured ?? []);
  featuredCoursesEnabled = computed(() => Array.isArray(this.api.home().courses_featured));
  featuredProjects = computed(() => this.api.home().projects_featured ?? []);

  // --- Video Modal State ---
  videoModalUrl = signal<string | null>(null);

  // 🔥 Project Detail Modal State
  selectedProject = signal<Project | null>(null);

  sanitizedVideoUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.videoModalUrl();
    if (!url) return null;

    let embedUrl = "";
    const youtubeRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);

    if (youtubeMatch && youtubeMatch[1]) {
      const videoId = youtubeMatch[1];
      embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    else if (url.includes("vimeo.com/")) {
      const videoId = url.split("vimeo.com/")[1].split(/[\/?]/)[0];
      embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }

    return embedUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl)
      : null;
  });

  openVideoModal(url: string | undefined): void {
    if (url) this.videoModalUrl.set(url);
  }

  // 🔥 Abrir modal de detalle de proyecto
  openProjectModal(project: Project): void {
    this.selectedProject.set(project);
    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';
  }

  // 🔥 Cerrar modal de detalle de proyecto
  closeProjectModal(): void {
    this.selectedProject.set(null);
    // Restaurar scroll del body
    document.body.style.overflow = 'auto';
  }

  // 🆕 COMPRA DIRECTA - Sin carrito
  buyCourseDirect(course: CoursePublic): void {
    if (!this.coursesEnabled()) return; // 🔥 Seguridad extra

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(["/login"]);
      return;
    }

    // Navegar al checkout con el curso
    this.router.navigate(['/checkout'], {
      state: {
        productType: 'course',
        product: course
      }
    });
  }

  buyProjectDirect(project: Project): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(["/login"]);
      return;
    }

    // Navegar al checkout con el proyecto
    this.router.navigate(['/checkout'], {
      state: {
        productType: 'project',
        product: project
      }
    });
  }

  // --- Course Enrollment Methods ---
  isCourseEnrolled(courseId: string): boolean {
    if (!this.authService.isLoggedIn()) {
      return false;
    }

    // ✅ SOLUCIÓN CORRECTA: Solo usar PurchasesService
    // El backend ya filtra productos reembolsados, así que confiamos en esa lógica
    const isPurchased = this.purchasesService.isPurchased(courseId);

    return isPurchased;
  }

  // --- Project Purchase Methods ---
  isProjectPurchased(projectId: string): boolean {
    if (!this.authService.isLoggedIn()) {
      return false;
    }

    // ✅ SOLUCIÓN CORRECTA: Solo usar PurchasesService
    // El backend ya filtra productos reembolsados, así que confiamos en esa lógica
    const isPurchased = this.purchasesService.isPurchased(projectId);

    return isPurchased;
  }

  // ---------- Búsqueda pro ----------
  private debounceId: any = null;
  minLen = 2;
  searching = signal<boolean>(false);
  isSearchLoading = this.searchService.isLoading;
  isResultsVisible = signal<boolean>(false);
  // searchRows = this.searchService.results;
  searchRows = computed(() => {
    const results = this.searchService.results();
    if (this.coursesEnabled()) {
      return results;
    }
    // Filtrar cursos si el módulo está desactivado
    return results.filter(item => item.item_type !== 'course');
  });

  courses = computed<CoursePublic[]>(() => {
    if (!this.coursesEnabled()) return []; // 🔥 Ocultar si está deshabilitado
    return this.featuredSafe();
  });

  searchDisabled = computed<boolean>(() => {
    const term = this.q().trim();
    const hasCat = !!this.selectedCategorie();
    if (this.searching()) return true;
    if (hasCat) return false;
    return term.length < this.minLen;
  });

  ngOnInit(): void {
    // 🆕 SEO para Home
    this.seoService.setSeo({
      title: 'Dev Hub Sharks - Cursos y Proyectos Reales',
      description: 'Aprende desarrollo web con cursos y proyectos reales. Angular, Node.js, y más. Únete a Dev Hub Sharks.',
      keywords: 'dev hub shark, dev hub sharks, cursos programación, proyectos, angular, fullstack',
      type: 'website'
    });

    // 🔥 Cargar configuración del sistema PRIMERO


    // ✅ httpResource carga automáticamente, pero forzamos reload con timestamp
    this.api.reloadHome();
    this.api.reloadAllCourses();
    this.api.reloadAllProjects();

    // Cargar datos del usuario si está autenticado
    if (this.authService.isLoggedIn()) {
      this.profileService.reloadProfile();
      this.purchasesService.loadPurchasedProducts();

      // 💰 Cargar saldo de billetera
      this.walletService.loadWallet();
    }

    // Cargar categorías e instructores (silencioso si falla)
    this.categoriesService.reload();
    this.loadInstructors();
  }


  // ---------- Handlers de búsqueda ----------
  private sanitizeTerm(v: string): string {
    return v.replace(/\s+/g, " ").replace(/^\s+/, "");
  }

  onSearchInput(raw: string): void {
    const v = this.sanitizeTerm(raw);
    this.q.set(v);
    this.isResultsVisible.set(true);

    if (v.trim().length === 0) {
      this.clearSearch();
      return;
    }

    clearTimeout(this.debounceId);
    this.debounceId = setTimeout(() => {
      if (this.q().trim().length >= 3) this.runSearch();
    }, 400);
  }

  onSearchKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Enter") {
      this.submitSearch();
      this.isResultsVisible.set(false);
    }
    else if (ev.key === "Escape") {
      this.clearSearch();
      this.isResultsVisible.set(false);
    }
  }

  submitSearch(): void {
    const term = this.q().trim();
    if (!term && !this.selectedCategorie()) {
      this.clearSearch();
      return;
    }
    this.runSearch(true);
  }

  clearSearch(): void {
    clearTimeout(this.debounceId);
    this.q.set("");
    this.isResultsVisible.set(false);
    this.searchService.runSearch({ q: '' });
  }

  private runSearch(manual = false): void {
    const term = this.q().trim();

    if (!manual) {
      if (term.length < 3 && !this.selectedCategorie()) return;
    } else {
      if (term.length < 1 && !this.selectedCategorie()) return;
    }

    this.searchService.runSearch({
      q: term || undefined,
      categoryId: this.selectedCategorie() || undefined,
    }).subscribe();
  }

  selectCategorie(id?: string): void {
    this.selectedCategorie.set(id);
    this.runSearch(true);
  }

  // ---------- Recargar ----------
  reload(): void {
    clearTimeout(this.debounceId);
    this.errorToastShown = false; // 🔄 Resetear flag de error
    this.api.reloadHome();
    this.api.reloadAllCourses();
    this.api.reloadAllProjects();
    this.clearSearch();
  }

  // --- Métodos para el panel de búsqueda ---
  hideResultsPanel() {
    setTimeout(() => this.isResultsVisible.set(false), 300);
  }

  onClickOutsideSearch(event: MouseEvent) {
    if (this.isResultsVisible()) {
      this.isResultsVisible.set(false);
    }
  }

  navigateToDetail(item: any) {
    this.isResultsVisible.set(false);
    if (item.item_type === 'course') {
      if (!this.coursesEnabled()) return; // 🔥 Bloqueo extra
      this.router.navigate(['/course-detail', item.slug]);
    } else if (item.item_type === 'project') {
      this.openVideoModal(item.url_video);
    }
  }

  clearCatalogFilters(): void {
    this.catalogShowCourses.set(true);
    this.catalogShowProjects.set(true);
    this.catalogCategory.set("");
    this.catalogPriceRange.set("");
    this.catalogLevel.set("");
    this.catalogSortBy.set("recent");
    this.catalogPage.set(1);
  }

  toggleCatalogFilters(): void {
    this.showCatalogFilters.update((v) => !v);
  }

  navigateToCourse(course: any, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.coursesEnabled()) return; // 🔥 Bloquear navegación

    console.log('Navigate to course:', course);
    if (course.slug) {
      this.router.navigate(["/course-detail", course.slug]);
    } else {
      console.error('Course slug is missing:', course);
    }
  }

  navigateToProjectDetail(projectId: string): void {
    this.router.navigate(['/project-detail', projectId]);
  }

  // Métodos para el carrusel de cursos destacados
  scrollFeaturedCourses(direction: 'left' | 'right'): void {
    const container = document.getElementById('featured-courses-carousel');
    if (container) {
      const scrollAmount = 350; // px a desplazar
      const scrollTo = direction === 'right'
        ? container.scrollLeft + scrollAmount
        : container.scrollLeft - scrollAmount;

      container.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      });
    }
  }

  // Métodos para el carrusel de proyectos destacados
  scrollFeaturedProjects(direction: 'left' | 'right'): void {
    const container = document.getElementById('featured-projects-carousel');
    if (container) {
      const scrollAmount = 350; // px a desplazar
      const scrollTo = direction === 'right'
        ? container.scrollLeft + scrollAmount
        : container.scrollLeft - scrollAmount;

      container.scrollTo({
        left: scrollTo,
        behavior: 'smooth'
      });
    }
  }

  // ========== MÉTODOS PARA INSTRUCTORES ==========

  /**
   * Cargar lista de instructores
   * 🔇 SILENCIADO: Sin logs, sin toasts (carga silenciosa en background)
   */
  private loadInstructors(): void {
    this.http.get<any>(`${environment.url}users/list-instructors`)
      .subscribe({
        next: (response) => {
          this.instructors.set(response.users || []);
        },
        error: (error) => {
          // 🔇 Silencioso: No mostrar error de instructores al usuario
          // Es una funcionalidad secundaria, no crítica
        }
      });
  }

  /**
   * Scroll del carrusel de instructores
   */
  scrollInstructors(direction: 'left' | 'right'): void {
    const carousel = document.getElementById('instructors-carousel');
    if (!carousel) return;

    const scrollAmount = 340; // Ancho de card + gap
    const targetScroll = direction === 'left'
      ? carousel.scrollLeft - scrollAmount
      : carousel.scrollLeft + scrollAmount;

    carousel.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }

  /**
   * Buscar instructores
   */
  onSearchInstructor(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchInstructorTerm.set(input.value);
  }

  /**
   * Limpiar búsqueda de instructores
   */
  clearInstructorSearch(): void {
    this.searchInstructorTerm.set('');
  }

  /**
   * Construir URL de imagen de proyecto
   */
  buildProjectImageUrl(imagen?: string): string {
    if (!imagen) return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800';
    return `${environment.images.project}${imagen}`;
  }

  /**
   * Construir URL de imagen de curso
   */
  getCourseImageUrl(imagen?: string): string {
    if (!imagen) return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800';
    const img = String(imagen).trim();
    if (/^https?:\/\//i.test(img)) return img;
    const base = environment.images.course.endsWith('/')
      ? environment.images.course
      : environment.images.course + '/';
    return base + encodeURIComponent(img);
  }

  // ========== MÉTODOS PARA LEGAL MODAL ==========

  /**
   * Abrir modal legal (Privacidad o Términos)
   */
  openLegalModal(type: 'privacy' | 'terms'): void {
    this.legalModalType.set(type);
    this.isLegalModalOpen.set(true);
  }

  /**
   * Cerrar modal legal
   */
  closeLegalModal(): void {
    this.isLegalModalOpen.set(false);
    setTimeout(() => {
      this.legalModalType.set(null);
    }, 300); // Delay para animación
  }

  // 🔥 Helper para obtener usuario de proyecto (Fix TS2339)
  getProjectUser(project: Project): User | null {
    if (project.user && typeof project.user === 'object' && 'name' in project.user) {
      return project.user as User;
    }
    return null;
  }
  // 🔥 CLEANUP: Asegurar que el scroll se restaura al salir
  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
  }
}

