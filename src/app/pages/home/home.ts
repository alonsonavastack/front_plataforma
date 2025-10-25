import { CommonModule } from "@angular/common";
import {
  CoursePublic,
  Project,
  Enrollment,
} from "../../core/models/home.models";
import { HomeService } from "../../core/services/home";
import { AuthService } from "../../core/services/auth";
import { CartService } from "../../core/services/cart.service";

import { CourseCardComponent } from "../../shared/course-card/course-card";
import { PillFilterComponent } from "../../shared/pill-filter/pill-filter";
import { environment } from "../../../environments/environment";
import { HeaderComponent } from "../../layout/header/header";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { ProfileService } from "../../core/services/profile.service";
import { CategoriesService } from "../../core/services/categories";
import { ProjectsCard } from "../../shared/projects-card/projects-card";
import { DiscountService } from "../../core/services/discount.service";
import { SearchService } from "../../core/services/search";
import { CarouselComponent } from "../carousel/carousel.component";
import { PurchasesService } from "../../core/services/purchases.service";

@Component({
  standalone: true,
  selector: "app-home",
  imports: [
    CommonModule,
    CourseCardComponent,
    PillFilterComponent,
    HeaderComponent,
    ProjectsCard,
    CarouselComponent,
  ],
  templateUrl: "./home.html",
})
export class HomeComponent implements OnInit {
  api = inject(HomeService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  cartService = inject(CartService);
  authService = inject(AuthService);
  profileService = inject(ProfileService);
  categoriesService = inject(CategoriesService);
  discountService = inject(DiscountService);
  searchService = inject(SearchService);
  purchasesService = inject(PurchasesService);

  // ---------- UI state ----------
  q = signal<string>("");
  selectedCategorie = signal<string | undefined>(undefined);

  // Loading del httpResource
  isLoading = this.api.isLoadingHome;

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

    // Agregar cursos si está seleccionado
    if (this.catalogShowCourses()) {
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
        const price = item.price_usd || 0;
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
      items.sort((a, b) => (a.price_usd || 0) - (b.price_usd || 0));
    } else if (sortBy === "price-high") {
      items.sort((a, b) => (b.price_usd || 0) - (a.price_usd || 0));
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
    // Imprime el arreglo completo de proyectos destacados cuando se cargan.
    effect(() => {
      const projects = this.featuredProjects();
      if (projects.length > 0) {
        console.log("Proyectos Destacados (arreglo completo):", projects);
      }
    });
    // Imprime el arreglo completo de descuentos cuando se cargan.
    effect(() => {
      const discounts = this.discountService.discounts();
      if (discounts.length > 0) {
        console.log("Descuentos activos (arreglo completo):", discounts);
      }
    });
  }

  // ---------- Error-safe helpers ----------
  hasHomeError(): boolean {
    try {
      this.api.home();
      return false;
    } catch {
      return true;
    }
  }

  homeErrorMessage(): string {
    try {
      this.api.home();
      return "";
    } catch (e: any) {
      return "No se pudo cargar el contenido. Por favor, verifica tu conexión a internet e intenta de nuevo.";
    }
  }

  categoriesSafe(): any[] {
    try {
      return this.api.home().categories ?? [];
    } catch {
      return [];
    }
  }

  featuredSafe(): CoursePublic[] {
    try {
      return this.api.home().courses_featured ?? [];
    } catch {
      return [];
    }
  }

  featuredCoursesEnabled = computed<boolean>(() => {
    try {
      return Array.isArray(this.api.home().courses_featured);
    } catch {
      return false;
    }
  });

  featuredProjects = computed<Project[]>(() => {
    try {
      return this.api.home().projects_featured ?? [];
    } catch {
      return [];
    }
  });

  // --- Video Modal State ---
  videoModalUrl = signal<string | null>(null);

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

  // --- Cart Methods ---
  isProjectInCart(projectId: string): boolean {
    return this.cartService
      .items()
      .some(
        (item) =>
          item.product._id === projectId && item.product_type === "project"
      );
  }

  addProjectToCart(project: Project): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(["/login"]);
      return;
    }
    this.cartService.addToCart(project, "project");
  }

  isCourseInCart(courseId: string): boolean {
    return this.cartService
      .items()
      .some(
        (item) =>
          item.product._id === courseId && item.product_type === "course"
      );
  }

  addCourseToCart(course: CoursePublic, event: MouseEvent): void {
    event.preventDefault();
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(["/login"]);
      return;
    }
    this.cartService.addToCart(course, "course");
  }

  // --- Course Enrollment Methods ---
  isCourseEnrolled(courseId: string): boolean {
    if (!this.authService.isLoggedIn()) {
      return false;
    }
    return this.enrolledCourses().some(
      (enrollment: Enrollment) => enrollment.course?._id === courseId
    );
  }

  // --- Project Purchase Methods ---
  isProjectPurchased(projectId: string): boolean {
    if (!this.authService.isLoggedIn()) {
      return false;
    }
    return this.purchasedProjects().some(
      (project: any) =>
        project._id === projectId || project.project?._id === projectId
    );
  }

  // ---------- Búsqueda pro ----------
  private debounceId: any = null;
  minLen = 2;
  searching = signal<boolean>(false);
  isSearchLoading = this.searchService.isLoading;
  isResultsVisible = signal<boolean>(false);
  searchRows = this.searchService.results;

  courses = computed<CoursePublic[]>(() => {
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
    this.api.reloadHome();
    this.api.reloadAllCourses();
    this.api.reloadAllProjects();
    if (this.authService.isLoggedIn()) {
      this.profileService.reloadProfile();
      this.purchasesService.loadPurchasedProducts();
    }
    this.categoriesService.reload();
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
    this.api.reloadHome();
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
      this.router.navigate(['/course-detail', item.slug]);
    } else if (item.item_type === 'project') {
      this.openVideoModal(item.url_video);
    }
  }

  buildProjectImageUrl(imagen?: string): string {
    if (!imagen) return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800';
    return `${environment.url}project/imagen-project/${imagen}`;
  }

  getCourseImageUrl(imagen?: string): string {
    if (!imagen)
      return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800";
    const img = String(imagen).trim();
    if (/^https?:\/\//i.test(img)) return img;
    const base = environment.images.course.endsWith("/")
      ? environment.images.course
      : environment.images.course + "/";
    return base + encodeURIComponent(img);
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
    if (course.slug) {
      this.router.navigate(["/course-detail", course.slug]);
    }
  }
}
