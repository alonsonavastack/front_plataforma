// src/app/pages/home/home.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CoursePublic } from '../../core/models/home.models';
import { HomeService } from '../../core/services/home';
import { CourseCardComponent } from '../../shared/course-card/course-card';
import { PillFilterComponent } from '../../shared/pill-filter/pill-filter';
import { HeaderComponent } from "../../layout/header/header";

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, CourseCardComponent, PillFilterComponent, HeaderComponent],
  templateUrl: './home.html',
})
export class HomeComponent implements OnInit {
  private api = inject(HomeService);

  // ---------- UI state ----------
  q = signal<string>('');
  selectedCategorie = signal<string | undefined>(undefined);

  // Loading del httpResource
  isLoading = this.api.isLoadingHome;

  // ---------- Error-safe helpers ----------
  hasHomeError(): boolean {
    try { this.api.home(); return false; }
    catch { return true; }
  }

  homeErrorMessage(): string {
    try { this.api.home(); return ''; }
    catch (e: any) {
      const cause = e?.cause ?? e;
      return (typeof cause?.message === 'string' && cause.message) || 'Error interno del servidor';
    }
  }

  categoriesSafe(): any[] {
    try { return this.api.home().categories ?? []; }
    catch { return []; }
  }

  featuredSafe(): CoursePublic[] {
    try { return this.api.featuredCourses(); }
    catch { return []; }
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
    const base = this.searchRows() ?? this.featuredSafe();
    const cat = this.selectedCategorie();
    const term = this.q().trim().toLowerCase();

    const result = base.filter((c: any) => {
      const catId = typeof c?.categorie === 'object' ? c.categorie._id : c.categorie;
      const byCat = !cat || catId === cat;
      const byQ = !term || (c?.title || '').toLowerCase().includes(term);
      return byCat && byQ;
    });
    console.log('Cursos a mostrar:', result);
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
  }

  // ---------- Handlers de búsqueda ----------
  private sanitizeTerm(v: string): string {
    return v.replace(/\s+/g, ' ').replace(/^\s+/, '');
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
    if (ev.key === 'Enter') this.submitSearch();
    else if (ev.key === 'Escape') this.clearSearch();
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
    this.q.set('');
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
    this.api.searchCourses({
      q: term || undefined,
      categorie: this.selectedCategorie() || undefined,
    }).subscribe({
      next: rows => {
        // Si la API devuelve resultados, los usamos. Si no, hacemos un fallback local.
        const results = (Array.isArray(rows) && rows.length > 0) ? rows : this.getLocalFallback(term);
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
      const byTitle = (c?.title || '').toLowerCase().includes(localTerm);
      const catId = typeof c?.categorie === 'string' ? c.categorie : c?.categorie?._id;
      const byCat = !cat || catId === cat;
      return byTitle && byCat;
    });
  }

  selectCategorie(id?: string): void {
    this.selectedCategorie.set(id);
    // Si no hay término, volvemos a featured
    if (this.q().trim().length === 0) {
      this.searchRows.set(null);
      return;
    }
    // Si hay término >= 3, relanza con nueva categoría (o si se forzó manual)
    if (this.q().trim().length >= 3) this.runSearch();
  }

  // ---------- Recargar ----------
  reload(): void {
    clearTimeout(this.debounceId);
    this.api.reloadHome();   // revalida httpResource
    this.searchRows.set(null);
    // Si prefieres limpiar también el input:
    // this.q.set('');
  }
}
