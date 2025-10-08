// src/app/core/services/home.service.ts
import { HttpClient } from "@angular/common/http";
import { computed, inject, Injectable, signal, effect } from "@angular/core";
import { environment } from "../../../environments/environment.development";
import { CoursePublic, Project, SearchCourseBody } from "../models/home.models";
import { toQuery } from "../utils/resource-helpers";
import { map, catchError, throwError, tap } from "rxjs";

interface HomeApiResponse {
  categories: any[];
  courses_top: CoursePublic[];
  categories_sections: Array<{
    _id: string;
    title: string;
    count_courses?: number;
    courses?: CoursePublic[];
  }>;
  courses_banners: CoursePublic[];
  campaing_banner: any;
  courses_flash: CoursePublic[];
  campaing_flash: any;
  projects_featured?: Project[]; // Añadido para proyectos destacados
  courses_featured?: CoursePublic[]; // Añadido para cursos destacados
}

@Injectable({ providedIn: "root" })
export class HomeService {
  http = inject(HttpClient);
  base = environment.url;

  private homeState = signal<{ data: HomeApiResponse, isLoading: boolean, error: any }>({
    data: {
      categories: [],
      courses_top: [],
      categories_sections: [],
      courses_banners: [],
      campaing_banner: null,
      courses_flash: [],
      campaing_flash: null,
      projects_featured: [],
      courses_featured: [],
    },
    isLoading: false,
    error: null,
  });

  // ---- filtros reactivos (opcional) ----
  private filtro = signal<{ q?: string; categorie?: string }>({});
  setFiltro(patch: { q?: string; categorie?: string }) {
    this.filtro.set({ ...this.filtro(), ...patch });
  }
  clearFiltro() {
    this.filtro.set({});
  }

  // Valor del recurso (¡OJO! si el resource está en error, .value() lanza en el componente)
  home = computed(() => {
    if (this.homeState().error) {
      // Lanza el error para que los componentes puedan atraparlo
      throw new Error('Failed to load home data', { cause: this.homeState().error });
    }
    return this.homeState().data;
  });
  isLoadingHome = computed(() => this.homeState().isLoading);

  reloadHome() {
    this.homeState.update(s => ({ ...s, isLoading: true }));
    const url = `${this.base}home/list${toQuery({ TIME_NOW: Date.now() })}`;
    this.http.get<HomeApiResponse>(url).subscribe({
      next: (data) => {
        this.homeState.set({ data, isLoading: false, error: null });
      },
      error: (err) => {
        console.error('Error loading home data:', err);
        this.homeState.update(s => ({ ...s, isLoading: false, error: err }));
      }
    });
  }

  /**
   * featuredCourses: une y desduplica los cursos que vienen en:
   * - courses_top
   * - categories_sections[].courses
   * - courses_banners
   * - courses_flash
   *
   * Nota: prioriza la última aparición por _id (mismo shape).
   */
  featuredCourses = computed<CoursePublic[]>(() => {
    const h = this.home();

    const top = (h.courses_top ?? []) as CoursePublic[];
    const fromCats = (h.categories_sections ?? []).flatMap(
      (cs: { courses?: CoursePublic[] }) => cs.courses ?? []
    ) as CoursePublic[];
    const banners = (h.courses_banners ?? []) as CoursePublic[];
    const flash = (h.courses_flash ?? []) as CoursePublic[];

    const map = new Map<string, CoursePublic>();
    for (const c of [...top, ...fromCats, ...banners, ...flash]) {
      const id = (c as any)?._id;
      if (id) map.set(id, c);
    }
    return Array.from(map.values());
  });

  // ---- SEARCH: /home/search_course (POST) ----
  // src/app/core/services/home.service.ts
  // src/app/core/services/home.service.ts
  searchCourses(body: SearchCourseBody) {
    // Corregido: el controlador usa 'search_course' con guion bajo
    const url = `${this.base}home/search_course${toQuery({
      TIME_NOW: Date.now(),
    })}`;

    const term = (body.q ?? "").trim();
    const payload: any = {
      // compat con tu controlador (lee req.body.search)
      q: term || undefined,
      search: term || undefined,
      // compat para categoría
      categorie: body.categorie || undefined,
      categorie_id: body.categorie || undefined,
    };

    return this.http.post<any>(url, payload).pipe(
      map((r) => {
        if (Array.isArray(r)) return r;
        if (Array.isArray(r?.courses)) return r.courses;
        if (Array.isArray(r?.data?.courses)) return r.data.courses;
        if (Array.isArray(r?.data)) return r.data;
        return [];
      }),
      catchError((err) => throwError(() => err))
    );
  }

  // ---- SHOW: /home/show_course/:slug (GET) ----
  // src/app/core/services/home.service.ts
  coursePublicResource = (slugSignal: () => string) => {
    const state = signal({
      value: {
        course: undefined,
        reviews: [],
        course_instructor: [],
        course_relateds: [],
        student_have_course: false,
      } as any,
      isLoading: false,
      error: null,
    });

    const reload = () => {
      const slug = slugSignal();
      if (!slug) return;

      state.update(s => ({ ...s, isLoading: true }));
      const url = `${this.base}home/landing-curso/${slug}${toQuery({ TIME_NOW: Date.now() })}`;

      this.http.get<any>(url).subscribe({
        next: (data) => state.set({ value: data, isLoading: false, error: null }),
        error: (err) => state.update(s => ({ ...s, isLoading: false, error: err })),
      });
    };

    effect(() => {
      reload();
    }, { allowSignalWrites: true });

    return {
      value: computed(() => {
        if (state().error) {
          throw new Error('Failed to load course details', { cause: state().error });
        }
        return state().value;
      }),
      isLoading: computed(() => state().isLoading),
      reload,
      }
  };

  buildCourseImageUrl(imageName?: string): string {
    if (!imageName) return 'https://i.pravatar.cc/300?u=placeholder';
    return `${this.base}courses/imagen-course/${imageName}`;
  }
}
