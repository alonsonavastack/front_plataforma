// src/app/pages/home/home.ts
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

@Component({
  standalone: true,
  selector: "app-home",
  imports: [
    CommonModule,
    CourseCardComponent,
    PillFilterComponent,
    HeaderComponent,
    ProjectsCard,
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

  // ---------- UI state ----------
  q = signal<string>("");
  selectedCategorie = signal<string | undefined>(undefined);

  // Loading del httpResource
  isLoading = this.api.isLoadingHome;

  // Cursos del usuario
  enrolledCourses = this.profileService.enrolledCourses;

  // Proyectos comprados del usuario
  purchasedProjects = this.profileService.purchasedProjects;

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
      // Ordenar por rating o número de estudiantes si está disponible
      items.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    }
    // 'recent' es el orden por defecto

    return items;
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
      const cause = e?.cause ?? e;
      return (
        (typeof cause?.message === "string" && cause.message) ||
        "Error interno del servidor"
      );
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
    // Regex para extraer el ID de video de varias URLs de YouTube (youtube.com/watch, youtu.be/, etc.)
    const youtubeRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);

    if (youtubeMatch && youtubeMatch[1]) {
      const videoId = youtubeMatch[1];
      embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    // Vimeo: https://vimeo.com/VIDEO_ID -> https://player.vimeo.com/video/VIDEO_ID
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
    // Usamos preventDefault en lugar de stopPropagation porque el botón está fuera del enlace <a>
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
    // La respuesta del perfil tiene el curso anidado.
    // enrolled_courses: [{ course: { _id: '...' } }]
    return this.enrolledCourses().some(
      (enrollment: Enrollment) => enrollment.course?._id === courseId
    );
  }

  // --- Project Purchase Methods ---
  isProjectPurchased(projectId: string): boolean {
    if (!this.authService.isLoggedIn()) {
      return false;
    }
    // Verifica si el proyecto está en la lista de proyectos comprados
    return this.purchasedProjects().some(
      (project: any) =>
        project._id === projectId || project.project?._id === projectId
    );
  }

  // ---------- Búsqueda pro ----------
  private debounceId: any = null;
  // Permite buscar con 1 caracter si el usuario presiona Enter (submit manual),
  // y con 3+ caracteres en auto-búsqueda (debounce).
  minLen = 2;
  searching = signal<boolean>(false);
  searchRows = signal<CoursePublic[] | null>(null); // resultados de POST /home/search_course

  // Lista efectiva para pintar (featured o searchRows) con filtros locales
  courses = computed<CoursePublic[]>(() => {
    const isSearchActive = this.searchRows() !== null;
    const base = isSearchActive ? this.searchRows()! : this.featuredSafe();

    // Imprime en consola solo cuando se están mostrando los cursos destacados
    if (!isSearchActive) {
      console.log("Cursos Destacados (datos recibidos):", base);
    }

    const cat = this.selectedCategorie();
    const term = this.q().trim().toLowerCase();

    const result = base.filter((c: any) => {
      const catId =
        typeof c?.categorie === "object" ? c.categorie._id : c.categorie;
      const byCat = !cat || catId === cat;
      const byQ = !term || (c?.title || "").toLowerCase().includes(term);
      return byCat && byQ;
    });
    return result;
  });

  // Botón Buscar deshabilitado si: ya está buscando, o no hay categoría y el término es < minLen
  searchDisabled = computed<boolean>(() => {
    const term = this.q().trim();
    const hasCat = !!this.selectedCategorie();
    if (this.searching()) return true;
    if (hasCat) return false;
    return term.length < this.minLen;
  });

  ngOnInit(): void {
    // Inicia la carga de datos para la página de inicio.
    this.api.reloadHome();
    this.api.reloadAllCourses(); // Carga todos los cursos para el catálogo
    this.api.reloadAllProjects(); // Carga todos los proyectos para el catálogo
    // Si el usuario está logueado, carga su perfil para obtener los cursos.
    if (this.authService.isLoggedIn()) {
      this.profileService.reloadProfile();
    }
    // Cargamos las categorías para los filtros.
    this.categoriesService.reload();
  }

  // ---------- Handlers de búsqueda ----------
  private sanitizeTerm(v: string): string {
    return v.replace(/\s+/g, " ").replace(/^\s+/, "");
  }

  onSearchInput(raw: string): void {
    const v = this.sanitizeTerm(raw);
    this.q.set(v);

    if (v.trim().length === 0) {
      this.searchRows.set(null);
      return;
    }

    // Auto-buscar solo si hay >= 3 chars
    clearTimeout(this.debounceId);
    this.debounceId = setTimeout(() => {
      if (this.q().trim().length >= 3) this.runSearch();
    }, 400);
  }

  onSearchKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Enter") this.submitSearch();
    else if (ev.key === "Escape") this.clearSearch();
  }

  submitSearch(): void {
    const term = this.q().trim();
    // Si no hay término ni categoría, solo limpiamos resultados
    if (!term && !this.selectedCategorie()) {
      this.searchRows.set(null);
      return;
    }
    this.runSearch(true); // true = submit manual (permite 1+ char)
  }

  clearSearch(): void {
    clearTimeout(this.debounceId);
    this.q.set("");
    this.searchRows.set(null);
  }

  /**
   * Ejecuta búsqueda:
   * - si manual = true, permite 1+ caracter
   * - si manual = false (debounce), exige 3+ caracteres
   * Además, hace fallback local: si el API devuelve vacío, filtramos los featured.
   */
  private runSearch(manual = false): void {
    const term = this.q().trim();

    if (!manual) {
      if (term.length < 3 && !this.selectedCategorie()) return;
    } else {
      if (term.length < 1 && !this.selectedCategorie()) return;
    }

    this.searching.set(true);
    this.api
      .searchCourses({
        q: term || undefined,
        categorie: this.selectedCategorie() || undefined,
      })
      .subscribe({
        next: (rows) => {
          // Si la API devuelve resultados, los usamos. Si no, hacemos un fallback local.
          const results =
            Array.isArray(rows) && rows.length > 0
              ? rows
              : this.getLocalFallback(term);
          this.searchRows.set(results);
        },
        error: () => {
          // En caso de error en la API, también usamos el fallback local.
          this.searchRows.set(this.getLocalFallback(term));
        },
        complete: () => this.searching.set(false),
      });
  }

  private getLocalFallback(term: string): CoursePublic[] {
    const localTerm = term.toLowerCase();
    const cat = this.selectedCategorie();
    return this.featuredSafe().filter((c: any) => {
      const byTitle = (c?.title || "").toLowerCase().includes(localTerm);
      const catId =
        typeof c?.categorie === "string" ? c.categorie : c?.categorie?._id;
      const byCat = !cat || catId === cat;
      return byTitle && byCat;
    });
  }

  selectCategorie(id?: string): void {
    this.selectedCategorie.set(id);
    // Si se selecciona "Todas" (id es undefined), reseteamos los resultados de búsqueda
    // para volver a mostrar los cursos destacados.
    if (!id) {
      this.searchRows.set(null);
    } else {
      this.runSearch(true); // Si se selecciona una categoría específica, ejecutamos la búsqueda.
    }
  }

  // ---------- Recargar ----------
  reload(): void {
    clearTimeout(this.debounceId);
    this.api.reloadHome(); // revalida httpResource
    this.searchRows.set(null);
    // Si prefieres limpiar también el input:
    // this.q.set('');
  }

  buildProjectImageUrl(imagen: string): string {
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
  }

  toggleCatalogFilters(): void {
    this.showCatalogFilters.update((v) => !v);
  }

  // Método temporal para depurar navegación
  navigateToCourse(course: any, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    console.log("Intentando navegar a:", course);
    console.log("Slug:", course.slug);
    if (course.slug) {
      this.router.navigate(["/course-detail", course.slug]);
    } else {
      console.error("El curso no tiene slug:", course);
    }
  }
}
