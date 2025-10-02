import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { HomeService } from '../../core/services/home';
import { HeaderComponent } from '../../layout/header/header';
import { CourseClase } from '../../core/models/home.models';

@Component({
  standalone: true,
  selector: 'app-learning',
  imports: [CommonModule, RouterLink, HeaderComponent],
  templateUrl: './learning.component.html',
})
export class LearningComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(HomeService);
  private sanitizer = inject(DomSanitizer);

  // --- State ---
  slug = signal<string>('');
  courseDetail = this.api.coursePublicResource(() => this.slug());
  isLoading = this.courseDetail.isLoading;

  // Señal para la clase actualmente seleccionada
  activeClass = signal<CourseClase | null>(null);

  // Señal para las secciones abiertas en el acordeón
  openSections = signal<Record<string, boolean>>({});

  // Señal para controlar la visibilidad del menú en móviles
  isMenuOpen = signal(false);

  // --- Computed Signals ---

  // Extrae el curso de la respuesta de la API de forma segura
  course = computed(() => {
    try {
      return this.courseDetail.value()?.course;
    } catch {
      return null;
    }
  });

  // Extrae la malla curricular
  curriculum = computed(() => this.course()?.malla_curricular || []);

  // Construye la URL segura para el iframe de Vimeo
  videoUrl = computed<SafeResourceUrl | null>(() => {
    const vimeoId = this.activeClass()?.vimeo_id;
    if (!vimeoId) return null;
    const url = `https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0&app_id=58479`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  constructor() {
    // Efecto para seleccionar la primera clase del curso cuando los datos se cargan
    effect(() => {
      const malla = this.curriculum();
      if (malla.length > 0 && malla[0].clases?.length > 0 && !this.activeClass()) {
        const firstClass = malla[0].clases[0];
        this.selectClass(firstClass);
        // Abrir la primera sección por defecto
        this.toggleSection(malla[0]._id);
      }
    });
  }

  ngOnInit(): void {
    const s = this.route.snapshot.paramMap.get('slug') ?? '';
    this.slug.set(s);
  }

  // --- Methods ---

  // Selecciona una clase para reproducirla
  selectClass(clase: CourseClase) {
    this.activeClass.set(clase);
  }

  // Abre o cierra el menú lateral en vista móvil
  toggleMenu() {
    this.isMenuOpen.update(v => !v);
  }

  // Abre o cierra una sección del acordeón
  toggleSection(id: string) {
    this.openSections.update(current => ({
      ...current,
      [id]: !current[id]
    }));
  }

  // Verifica si una sección está abierta
  isSectionOpen(id: string): boolean {
    return !!this.openSections()[id];
  }

  // Formatea la duración de segundos a un formato legible
  formatDuration(seconds: number | undefined | null): string {
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
}
