import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CourseCardComponent } from '../../shared/course-card/course-card';
import { ProjectsCard } from '../../shared/projects-card/projects-card';
import { Project as CoreProject } from '../../core/models/home.models';

interface InstructorProfile {
  _id: string;
  name: string;
  surname: string;
  email: string;
  avatar?: string;
  profession?: string;
  description?: string;
  phone?: string;
  birthday?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  twitch?: string;
  website?: string;
  discord?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
  createdAt?: string;
}

interface Course {
  _id: string;
  title: string;
  subtitle?: string;
  slug: string;
  imagen?: string;
  price_usd: number;
  level?: string;
  categorie?: any;
  avg_rating?: number;
  count_class?: number;
}

interface InstructorProject {
  _id: string;
  title: string;
  subtitle: string; // ✅ REQUERIDO desde backend
  imagen: string; // ✅ REQUERIDO
  price_usd: number;
  price_mxn?: number; // ✅ Opcional (legacy)
  description?: string; // ✅ Opcional
  url_video?: string;
  categorie: { _id: string; title: string }; // ✅ REQUERIDO
  state?: number;
  user?: any; // ✅ Para el instructor
  createdAt?: string;
}

@Component({
  selector: 'app-instructor-profile',
  standalone: true,
  imports: [CommonModule, CourseCardComponent, ProjectsCard, NgOptimizedImage, FormsModule],
  templateUrl: './instructor-profile.component.html'
})
export class InstructorProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  // Signals
  instructor = signal<InstructorProfile | null>(null);
  courses = signal<Course[]>([]);
  projects = signal<InstructorProject[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // 🆕 FILTROS
  searchTerm = signal('');
  selectedCategory = signal<string>('all'); // 'all' o ID de categoría
  activeTab = signal<'courses' | 'projects'>('courses'); // Tab activo

  // ✅ Categorías únicas (cursos + proyectos)
  availableCategories = computed(() => {
    const courseCats = this.courses()
      .map(c => c.categorie)
      .filter(cat => cat && cat._id && cat.title);

    const projectCats = this.projects()
      .map(p => p.categorie)
      .filter(cat => cat && cat._id && cat.title);

    const allCats = [...courseCats, ...projectCats];

    // Eliminar duplicados por _id
    const uniqueCats = allCats.reduce((acc: { _id: string; title: string }[], cat) => {
      if (!acc.some((c: { _id: string; title: string }) => c._id === cat._id)) {
        acc.push(cat);
      }
      return acc;
    }, [] as { _id: string; title: string }[]);

    return uniqueCats.sort((a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title));
  });

  // ✅ Cursos filtrados
  filteredCourses = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    const categoryId = this.selectedCategory();
    const allCourses = this.courses();

    console.log('📘 [filteredCourses] Total cursos:', allCourses.length);
    console.log('🔍 [filteredCourses] Búsqueda:', search);
    console.log('📂 [filteredCourses] Categoría:', categoryId);

    const filtered = allCourses.filter(course => {
      // Filtro de búsqueda
      const matchesSearch = !search ||
        course.title.toLowerCase().includes(search) ||
        course.subtitle?.toLowerCase().includes(search) || false;

      // Filtro de categoría
      const courseCatId = course.categorie?._id?.toString() || course.categorie?.toString() || '';
      const matchesCategory = categoryId === 'all' || courseCatId === categoryId;

      return matchesSearch && matchesCategory;
    });

    console.log('✅ [filteredCourses] Cursos filtrados:', filtered.length);
    return filtered;
  });

  // ✅ Proyectos filtrados
  filteredProjects = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    const categoryId = this.selectedCategory();
    const allProjects = this.projects();

    console.log('🎯 [filteredProjects] Total proyectos:', allProjects.length);
    console.log('🔍 [filteredProjects] Búsqueda:', search);
    console.log('📂 [filteredProjects] Categoría:', categoryId);

    const filtered = allProjects.filter(project => {
      // Filtro de búsqueda
      const matchesSearch = !search ||
        project.title.toLowerCase().includes(search) ||
        project.subtitle.toLowerCase().includes(search) ||
        project.description?.toLowerCase().includes(search) || false;

      // Filtro de categoría
      const projectCatId = project.categorie?._id?.toString() || '';
      const matchesCategory = categoryId === 'all' || projectCatId === categoryId;

      return matchesSearch && matchesCategory;
    });

    console.log('✅ [filteredProjects] Proyectos filtrados:', filtered.length);
    return filtered;
  });

  // ✅ Contador de filtros activos
  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.searchTerm()) count++;
    if (this.selectedCategory() !== 'all') count++;
    return count;
  });

  // ✅ Nombre de categoría seleccionada
  selectedCategoryName = computed(() => {
    const categoryId = this.selectedCategory();
    if (categoryId === 'all') return null;

    const category = this.availableCategories().find((c: { _id: string }) => c._id === categoryId);
    return category?.title || null;
  });

  // ✅ Mostrar TODOS los proyectos públicos
  // Backend ya filtra por state: 2 (públicos), así que mostramos todos
  // Estados: 1=Borrador, 2=Público, 3=Anulado
  validProjects = computed(() => {
    return this.projects(); // Ya vienen filtrados del backend
  });

  // Computed
  fullName = computed(() => {
    const instr = this.instructor();
    return instr ? `${instr.name} ${instr.surname}` : '';
  });

  initials = computed(() => {
    const instr = this.instructor();
    if (!instr) return '';
    return `${instr.name.charAt(0)}${instr.surname.charAt(0)}`.toUpperCase();
  });

  socialLinks = computed(() => {
    const instr = this.instructor();
    if (!instr) return [];

    const links = [
      { name: 'Facebook', url: instr.facebook, icon: 'facebook', classes: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20', iconClasses: 'text-blue-400' },
      { name: 'Instagram', url: instr.instagram, icon: 'instagram', classes: 'bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20', iconClasses: 'text-pink-400' },
      { name: 'YouTube', url: instr.youtube, icon: 'youtube', classes: 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20', iconClasses: 'text-red-400' },
      { name: 'TikTok', url: instr.tiktok, icon: 'tiktok', classes: 'bg-slate-700/50 border-white/20 hover:bg-slate-600/50', iconClasses: 'text-white' },
      { name: 'Twitch', url: instr.twitch, icon: 'twitch', classes: 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20', iconClasses: 'text-purple-400' },
      { name: 'Website', url: instr.website, icon: 'website', classes: 'bg-lime-400/10 border-lime-400/20 hover:bg-lime-400/20', iconClasses: 'text-lime-400' },
      { name: 'Discord', url: instr.discord, icon: 'discord', classes: 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20', iconClasses: 'text-indigo-400' },
      { name: 'LinkedIn', url: instr.linkedin, icon: 'linkedin', classes: 'bg-sky-600/10 border-sky-600/20 hover:bg-sky-600/20', iconClasses: 'text-sky-400' },
      { name: 'Twitter', url: instr.twitter, icon: 'twitter', classes: 'bg-gray-600/20 border-gray-500/20 hover:bg-gray-600/30', iconClasses: 'text-gray-300' },
      { name: 'GitHub', url: instr.github, icon: 'github', classes: 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/80', iconClasses: 'text-gray-300' }
    ];

    return links.filter(link => link.url && link.url.trim() !== '');
  });

  totalContent = computed(() => {
    return this.courses().length + this.projects().length;
  });

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const instructorId = params['id'];
      if (instructorId) {
        this.loadInstructorProfile(instructorId);
      }
    });
  }

  private loadInstructorProfile(instructorId: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    // Cargar perfil del instructor
    this.http.get<any>(`${environment.url}users/instructor-profile/${instructorId}`)
      .subscribe({
        next: (response) => {
          console.log('✅ [InstructorProfile] Respuesta del backend:', response);
          console.log('👨‍🏫 [InstructorProfile] Instructor:', response.instructor);
          console.log('📚 [InstructorProfile] Cursos:', response.courses?.length || 0);
          console.log('🎯 [InstructorProfile] Proyectos RAW:', response.projects);

          this.instructor.set(response.instructor);
          this.courses.set(response.courses || []);

          // ✅ Mapear proyectos para asegurar compatibilidad
          const mappedProjects = (response.projects || []).map((p: any) => ({
            ...p,
            subtitle: p.subtitle || 'Sin subtitulo',
            imagen: p.imagen || '',
            categorie: p.categorie || { _id: '', title: 'Sin categoría' }
          }));

          console.log('🔄 [InstructorProfile] Proyectos mapeados:', mappedProjects);
          this.projects.set(mappedProjects);
          console.log('✅ [InstructorProfile] Proyectos finales:', this.validProjects());

          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('❌ Error cargando perfil:', error);
          this.error.set('No se pudo cargar el perfil del instructor');
          this.isLoading.set(false);
        }
      });
  }

  getAvatarUrl(): string {
    const instr = this.instructor();
    if (instr?.avatar) {
      return `${environment.url}users/imagen-usuario/${instr.avatar}`;
    }
    return `https://ui-avatars.com/api/?name=${this.fullName()}&background=84cc16&color=fff&size=256&bold=true`;
  }

  getCourseImageUrl(imagen?: string): string {
    if (!imagen) return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800';
    const img = String(imagen).trim();
    if (/^https?:\/\//i.test(img)) return img;
    const base = environment.images.course.endsWith('/')
      ? environment.images.course
      : environment.images.course + '/';
    return base + encodeURIComponent(img);
  }

  getProjectImageUrl(imagen?: string): string {
    if (!imagen) return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800';
    return `${environment.url}project/imagen-project/${imagen}`;
  }

  navigateToCourse(course: Course): void {
    this.router.navigate(['/course-detail', course.slug]);
  }

  openVideoModal(url?: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  openSocialMedia(url?: string): void {
    if (url) {
      // Asegurar que la URL tenga protocolo
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      window.open(fullUrl, '_blank');
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  getJoinedDate(): string {
    const instr = this.instructor();
    if (!instr?.createdAt) return '';
    const date = new Date(instr.createdAt);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('all');
  }

  setActiveTab(tab: 'courses' | 'projects'): void {
    this.activeTab.set(tab);
  }
}
