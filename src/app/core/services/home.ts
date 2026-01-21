// src/app/core/services/home.ts
import { HttpClient } from "@angular/common/http";
import { computed, effect, inject, Injectable, signal } from "@angular/core";
import { environment } from "../../../environments/environment";
import { CoursePublic, Project, SearchCourseBody } from "../models/home.models";
import { toQuery } from "../utils/resource-helpers";
import { map, catchError, throwError } from "rxjs";

// 📦 Interfaces
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
  projects_featured?: Project[];
  courses_featured?: CoursePublic[];
}

export interface CoursePublicWithMalla extends CoursePublic {
  malla_curricular?: any[];
  malla?: any[];
}

export interface CourseDetailResponse {
  course: CoursePublicWithMalla | undefined;
  reviews: any[];
  course_instructor: CoursePublic[];
  course_relateds: CoursePublic[];
  student_have_course: boolean;
}

export interface ProjectDetailResponse {
  project: Project | undefined;
  reviews: any[];
  project_relateds: Project[];
  student_have_project: boolean;
  metrics?: {
    avg_rating: string;
    total_reviews: number;
  }
}

@Injectable({ providedIn: "root" })
export class HomeService {
  private http = inject(HttpClient);
  private base = environment.url;

  // ✅ Signals manuales con estado - SIMPLE Y EFECTIVO
  private homeData = signal<HomeApiResponse>({
    categories: [],
    courses_top: [],
    categories_sections: [],
    courses_banners: [],
    campaing_banner: null,
    courses_flash: [],
    campaing_flash: null,
    projects_featured: [],
    courses_featured: [],
  });

  private homeLoading = signal(false);
  private homeError = signal<any>(null);

  private coursesData = signal<CoursePublic[]>([]);
  private coursesLoading = signal(false);

  private projectsData = signal<Project[]>([]);
  private projectsLoading = signal(false);

  // 📊 Signals públicos readonly
  home = this.homeData.asReadonly();
  isLoadingHome = this.homeLoading.asReadonly();
  hasErrorHome = computed(() => !!this.homeError());
  errorHome = this.homeError.asReadonly();

  allCourses = this.coursesData.asReadonly();
  allProjects = this.projectsData.asReadonly();

  isLoadingCourses = this.coursesLoading.asReadonly();
  isLoadingProjects = this.projectsLoading.asReadonly();

  // 🎯 Featured courses
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

  // 🔄 Métodos de carga - SIMPLE
  reloadHome() {
    this.homeLoading.set(true);
    this.homeError.set(null);
    const url = `${this.base}home/list${toQuery({ TIME_NOW: Date.now() })}`;

    this.http.get<HomeApiResponse>(url).subscribe({
      next: (data) => {
        this.homeData.set(data);
        this.homeLoading.set(false);
      },
      error: (err) => {
        this.homeError.set(err);
        this.homeLoading.set(false);
      }
    });
  }

  reloadAllCourses() {
    this.coursesLoading.set(true);
    const url = `${this.base}home/get_all_courses`;

    this.http.get<{ courses: CoursePublic[] }>(url).pipe(
      map(response => response.courses || [])
    ).subscribe({
      next: (data) => {
        this.coursesData.set(data);
        this.coursesLoading.set(false);
      },
      error: () => {
        this.coursesLoading.set(false);
      }
    });
  }

  reloadAllProjects() {
    this.projectsLoading.set(true);
    const url = `${this.base}home/get_all_projects`;

    this.http.get<{ projects: Project[] }>(url).pipe(
      map(response => response.projects || [])
    ).subscribe({
      next: (data) => {
        this.projectsData.set(data);
        this.projectsLoading.set(false);
      },
      error: () => {
        this.projectsLoading.set(false);
      }
    });
  }

  // 🔍 Búsqueda
  searchCourses(body: SearchCourseBody) {
    const url = `${this.base}home/search_course${toQuery({ TIME_NOW: Date.now() })}`;
    const term = (body.q ?? "").trim();
    const payload: any = {
      q: term || undefined,
      search: term || undefined,
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

  // 📄 Detalle de curso - REACTIVO AUTOMÁTICO con effect
  coursePublicResource = (slugSignal: () => string) => {
    const data = signal<CourseDetailResponse>({
      course: undefined,
      reviews: [],
      course_instructor: [],
      course_relateds: [],
      student_have_course: false,
    });
    const loading = signal(false);
    const error = signal<any>(null);
    let lastSlug = '';

    const load = () => {
      const slug = slugSignal();

      if (!slug || slug === lastSlug) return;
      lastSlug = slug;

      loading.set(true);
      error.set(null);
      const url = `${this.base}home/landing-curso/${slug}${toQuery({ TIME_NOW: Date.now() })}`;

      this.http.get<CourseDetailResponse>(url).subscribe({
        next: (response) => {
          data.set(response);
          loading.set(false);
        },
        error: (err) => {
          error.set(err);
          loading.set(false);
        }
      });
    };

    // ✅ Effect detecta cambios AUTOMÁTICAMENTE
    effect(() => {
      load();
    }, { allowSignalWrites: true });

    return {
      value: data.asReadonly(),
      isLoading: loading.asReadonly(),
      hasError: computed(() => !!error()),
      error: error.asReadonly(),
      reload: load,
    };
  };

  // 📄 Detalle de proyecto - REACTIVO AUTOMÁTICO
  projectPublicResource = (idSignal: () => string) => {
    const data = signal<ProjectDetailResponse>({
      project: undefined,
      reviews: [],
      project_relateds: [],
      student_have_project: false,
    });
    const loading = signal(false);
    const error = signal<any>(null);
    let lastId = '';

    const load = () => {
      const id = idSignal();

      if (!id || id === lastId) return;
      lastId = id;

      loading.set(true);
      error.set(null);
      const url = `${this.base}home/landing-project/${id}${toQuery({ TIME_NOW: Date.now() })}`;

      this.http.get<ProjectDetailResponse>(url).subscribe({
        next: (response) => {
          data.set(response);
          loading.set(false);
        },
        error: (err) => {
          error.set(err);
          loading.set(false);
        }
      });
    };

    effect(() => {
      load();
    }, { allowSignalWrites: true });

    return {
      value: data.asReadonly(),
      isLoading: loading.asReadonly(),
      hasError: computed(() => !!error()),
      error: error.asReadonly(),
      reload: load,
    };
  };

  buildCourseImageUrl(imageName?: string): string {
    if (!imageName) return 'https://i.pravatar.cc/300?u=placeholder';
    return `${this.base}courses/imagen-course/${imageName}`;
  }

  buildProjectImageUrl(imageName?: string): string {
    if (!imageName) return 'https://i.pravatar.cc/300?u=placeholder';
    return `${this.base}projects/imagen-project/${imageName}`;
  }

  downloadProjectFile(projectId: string, filename: string) {
    const url = `${this.base}projects/download-file/${projectId}/${filename}`;
    return this.http.get(url, { responseType: 'blob' });
  }
}
