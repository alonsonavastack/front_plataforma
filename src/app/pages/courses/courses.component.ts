import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, inject, signal, effect, computed } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { CourseAdmin, CourseClase, CourseSection } from "../../core/models/home.models";
import { CoursesService } from "../../core/services/courses";
import { environment } from "../../../environments/environment";
import { AuthService } from "../../core/services/auth";
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { debounceTime, distinctUntilChanged, filter, switchMap, tap } from "rxjs/operators";
import { Subscription } from "rxjs";

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './courses.component.html',
})
export class CoursesComponent implements OnInit, OnDestroy {
  coursesService = inject(CoursesService);
  authService = inject(AuthService);

  // Exponer Math para usarlo en el template
  Math = Math;

  // --- State Management ---
  viewMode = signal<'list' | 'content' | 'classes'>('list'); // 'list', 'content' (secciones), 'classes' (clases de una sección)
  selectedCourse = signal<CourseAdmin | null>(null);
  selectedSection = signal<CourseSection | null>(null);

  // --- Course Modal State ---
  isModalOpen = signal(false);
  isEditing = signal(false);
  currentCourseId = signal<string | null>(null);
  imagePreview = signal<string | null>(null);

  courseForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    subtitle: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    price_usd: new FormControl(0, [Validators.required, Validators.min(0)]),
    price_mxn: new FormControl(0, [Validators.required, Validators.min(0)]),
    categorie: new FormControl('', [Validators.required]),
    user: new FormControl('', [Validators.required]),
    level: new FormControl('Basico', [Validators.required]),
    idioma: new FormControl('Español', [Validators.required]),
    portada: new FormControl<File | null>(null),
    state: new FormControl(1), // Se añade el control 'state' con valor por defecto 1 (Borrador)
  });

  // --- Section Modal and Form State ---
  isSectionModalOpen = signal(false);
  isEditingSection = signal(false);
  currentSectionId = signal<string | null>(null);
  sectionForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
  });

  // --- Class Modal and Form State ---
  isClassModalOpen = signal(false);
  isEditingClass = signal(false);
  currentClassId = signal<string | null>(null);
  classForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    video_platform: new FormControl<'vimeo' | 'youtube'>('vimeo', [Validators.required]), // 🎬 NUEVO
    video_link: new FormControl(''), // 🔄 Renombrado de vimeo_link a video_link
    time: new FormControl(0), // Campo para la duración en segundos
  });

  private videoLinkSub: Subscription | null = null; // 🔄 Renombrado de vimeoSub

  // --- INICIO: Lógica de Filtros ---

  searchTerm = signal('');
  categoryFilter = signal('');
  instructorFilter = signal('');

  // Computed signals para obtener los nombres de categoría e instructor seleccionados
  selectedCategoryName = computed(() => {
    const categoryId = this.categoryFilter();
    if (!categoryId) return null;
    
    const category = this.coursesService.config().categories.find(
      c => c._id?.toString() === categoryId
    );
    return category?.title || null;
  });

  selectedInstructorName = computed(() => {
    const instructorId = this.instructorFilter();
    if (!instructorId) return null;
    
    const instructor = this.coursesService.config().users.find(
      u => u._id?.toString() === instructorId
    );
    return instructor?.name || null;
  });

  // Helper para normalizar texto (quitar tildes y a minúsculas)
  private normalizeText(text: string): string {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  filteredCourses = computed(() => {
    const allCourses = this.coursesService.courses();
    const term = this.normalizeText(this.searchTerm());
    const categoryId = this.categoryFilter();
    const instructorId = this.instructorFilter();

    console.log('🔍 Filtros aplicados:', { term, categoryId, instructorId });
    console.log('📚 Total de cursos:', allCourses.length);

    return allCourses.filter(course => {
      // Normalizar búsqueda por título
      const titleMatch = term ? this.normalizeText(course.title).includes(term) : true;

      // Comparar IDs de categoría (asegurando que ambos sean strings y se compare correctamente)
      const courseCategId = course.categorie?._id?.toString() || '';
      const categoryMatch = categoryId ? courseCategId === categoryId : true;

      // Comparar IDs de instructor (asegurando que ambos sean strings y se compare correctamente)
      const courseUserId = course.user?._id?.toString() || '';
      const instructorMatch = instructorId ? courseUserId === instructorId : true;

      // Debug para el primer curso
      if (allCourses.indexOf(course) === 0) {
        console.log('🔎 Primer curso debug:', {
          title: course.title,
          categId: courseCategId,
          userId: courseUserId,
          titleMatch,
          categoryMatch,
          instructorMatch,
        });
      }

      return titleMatch && categoryMatch && instructorMatch;
    });
  });

  // Métodos para manejar cambios en los filtros
  onSearch(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onCategoryFilter(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    console.log('📂 Categoría seleccionada:', value);
    this.categoryFilter.set(value);
    this.currentPage.set(1);
  }

  onInstructorFilter(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    console.log('👨‍🏫 Instructor seleccionado:', value);
    this.instructorFilter.set(value);
    this.currentPage.set(1);
  }

  // Método para limpiar todos los filtros
  clearAllFilters() {
    this.searchTerm.set('');
    this.categoryFilter.set('');
    this.instructorFilter.set('');
    this.currentPage.set(1);
  }

  // --- FIN: Lógica de Filtros ---

  // --- INICIO: Lógica de paginación ---

  currentPage = signal(1);
  itemsPerPage = signal(10); // Valor inicial

  paginatedCourses = computed(() => {
    const courses = this.filteredCourses() || []; // Usamos los cursos filtrados
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return courses.slice(start, end);
  });

  totalPages = computed(() => {
    const total = this.filteredCourses()?.length || 0; // Usamos el total de cursos filtrados
    return Math.ceil(total / this.itemsPerPage());
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const current = this.currentPage();
    const pages: (number | string)[] = [1];

    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');

    pages.push(total);
    return pages;
  });

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  previousPage(): void {
    this.changePage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.changePage(this.currentPage() + 1);
  }

  changePerPage(perPage: number): void {
    this.itemsPerPage.set(perPage);
    this.currentPage.set(1);
  }

  // --- FIN: Lógica de paginación ---

  constructor() {
    effect(() => {
      const user = this.authService.user();
      const userControl = this.courseForm.get('user');

      if (user?.rol === 'instructor') {
        // Para el formulario del modal de creación/edición
        userControl?.setValue(user._id, { emitEvent: false });
        userControl?.disable();
        // Para el filtro de la lista
        this.instructorFilter.set(user._id);
        console.log('📌 Instructor auto-filtrado:', user._id);
      } else if (userControl?.disabled) {
        userControl?.enable();
      }
    });

    // 🐛 DEBUG: Observar cambios en los filtros
    effect(() => {
      console.log('🔄 CAMBIO EN FILTROS:', {
        search: this.searchTerm(),
        category: this.categoryFilter(),
        instructor: this.instructorFilter(),
        totalCourses: this.coursesService.courses().length,
        filteredCourses: this.filteredCourses().length
      });
    });
  }

  ngOnInit(): void {
    this.coursesService.reloadList();
    this.coursesService.reloadConfig(); // Aseguramos que la configuración (categorías, usuarios) se cargue
    this.setupVideoListener(); // 🔄 Renombrado
  }

  ngOnDestroy(): void {
    this.videoLinkSub?.unsubscribe(); // 🔄 Renombrado
  }

  openCreateModal(): void {
    console.log('🎯 Abriendo modal de crear curso');
    this.isEditing.set(false);
    this.courseForm.reset({
      level: 'Basico',
      idioma: 'Español',
      price_usd: 0,
      price_mxn: 0,
      state: 1, // Borrador por defecto
    });
    this.imagePreview.set(null);
    this.isModalOpen.set(true);

    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';

    console.log('✅ Modal abierto:', this.isModalOpen());
  }

  openEditModal(course: CourseAdmin): void {
    this.isEditing.set(true);
    this.currentCourseId.set(course._id);
    this.courseForm.patchValue({
      ...course,
      categorie: course.categorie._id,
      user: course.user._id,
    });
    this.imagePreview.set(course.imagen ? this.buildImageUrl(course.imagen) : null);
    this.isModalOpen.set(true);

    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    // Restaurar scroll del body
    document.body.style.overflow = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.courseForm.patchValue({ portada: file });
      const reader = new FileReader();
      reader.onload = () => this.imagePreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.courseForm.invalid) return;

    const formData = new FormData();
    const formValue = this.courseForm.getRawValue();

    Object.keys(formValue).forEach(key => {
      const value = formValue[key as keyof typeof formValue];
      if (value !== null && value !== undefined) {
        if (key === 'portada' && value instanceof File) {
          formData.append(key, value);
        } else if (key !== 'portada') {
          formData.append(key, String(value));
        }
      }
    });

    if (this.isEditing()) {
      formData.append('_id', this.currentCourseId()!);
      this.coursesService.update(formData).subscribe(() => {
        this.coursesService.reloadList();
        this.closeModal();
      });
    } else {
      this.coursesService.register(formData).subscribe(() => {
        this.coursesService.reloadList();
        this.closeModal();
      });
    }
  }

  deleteCourse(id: string): void {
    if (confirm('¿Estás seguro? Esta acción eliminará el curso y todo su contenido.')) {
      this.coursesService.remove(id).subscribe(() => this.coursesService.reloadList());
    }
  }

  buildImageUrl(imageName?: string): string {
    if (!imageName) return 'https://i.pravatar.cc/150?u=placeholder';
    return `${environment.images.course}${imageName}`;
  }

  // --- View and Section Management ---
  switchToContentView(course: CourseAdmin): void {
    this.selectedCourse.set(course);
    this.coursesService.reloadSections(course._id);
    this.viewMode.set('content');
  }

  switchToListView(): void {
    this.selectedCourse.set(null);
    this.viewMode.set('list');
  }

  // --- Section Modal Methods ---
  openCreateSectionModal(): void {
    this.isEditingSection.set(false);
    this.sectionForm.reset();
    this.isSectionModalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  openEditSectionModal(section: CourseSection): void {
    this.isEditingSection.set(true);
    this.currentSectionId.set(section._id);
    this.sectionForm.patchValue({ title: section.title });
    this.isSectionModalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeSectionModal(): void {
    this.isSectionModalOpen.set(false);
    document.body.style.overflow = '';
  }

  onSectionSubmit(): void {
    if (this.sectionForm.invalid || !this.selectedCourse()) return;
    const courseId = this.selectedCourse()!._id;
    const data = { ...this.sectionForm.value, course: courseId };

    if (this.isEditingSection()) {
      const sectionId = this.currentSectionId()!;
      this.coursesService.updateSection(sectionId, data).subscribe(() => {
        this.coursesService.reloadSections(courseId);
        this.closeSectionModal();
      });
    } else {
      this.coursesService.createSection(data as { title: string, course: string }).subscribe(() => {
        this.coursesService.reloadSections(courseId);
        this.closeSectionModal();
      });
    }
  }

  deleteSection(sectionId: string): void {
    if (confirm('¿Seguro que quieres eliminar esta sección?')) {
      this.coursesService.removeSection(sectionId).subscribe(() => {
        if (this.selectedCourse()) {
          this.coursesService.reloadSections(this.selectedCourse()!._id);
        }
      });
    }
  }

  // --- Class Management ---
  switchToClassesView(section: CourseSection): void {
    this.selectedSection.set(section);
    this.coursesService.reloadClasses(section._id); // Cargar las clases de la sección
    this.viewMode.set('classes');
    console.log('Cambiando a vista de clases para la sección:', section.title);
  }

  openCreateClassModal(): void {
    this.isEditingClass.set(false);
    this.currentClassId.set(null);
    this.classForm.reset();
    this.isClassModalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  openEditClassModal(clase: CourseClase): void {
    this.isEditingClass.set(true);
    this.currentClassId.set(clase._id);

    // 🎬 Determinar la plataforma y construir el link correcto
    let videoPlatform: 'vimeo' | 'youtube' = 'vimeo';
    let videoLink = '';

    if (clase.video_platform) {
      // Nuevo formato con video_platform
      videoPlatform = clase.video_platform as 'vimeo' | 'youtube';
      if (clase.video_id) {
        videoLink = videoPlatform === 'youtube'
          ? `https://www.youtube.com/watch?v=${clase.video_id}`
          : `https://vimeo.com/${clase.video_id}`;
      }
    } else if (clase.vimeo_id) {
      // Formato legacy con vimeo_id
      videoPlatform = 'vimeo';
      videoLink = `https://vimeo.com/${clase.vimeo_id}`;
    }

    this.classForm.patchValue({
      ...clase,
      video_platform: videoPlatform,
      video_link: videoLink,
      time: clase.time || 0
    });
    this.isClassModalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeClassModal(): void {
    this.isClassModalOpen.set(false);
    document.body.style.overflow = '';
  }

  onClassSubmit(): void {
    if (this.classForm.invalid || !this.selectedSection()) return;

    const sectionId = this.selectedSection()!._id;
    const formValue = this.classForm.getRawValue();
    const platform = formValue.video_platform!;

    // 🎬 Extraer el ID del video según la plataforma
    let videoId: string | undefined = undefined;
    if (formValue.video_link) {
      if (platform === 'youtube') {
        // Regex para YouTube (múltiples formatos)
        const match = formValue.video_link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?/]+)/);
        if (match) {
          videoId = match[1];
        }
      } else {
        // Regex para Vimeo
        const match = formValue.video_link.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
        if (match) {
          videoId = match[1];
        }
      }
    }

    if (this.isEditingClass()) {
      const classId = this.currentClassId()!;
      const payload = {
        title: formValue.title!,
        description: formValue.description,
        video_platform: platform,
        video_id: videoId,
        time: formValue.time
      };
      this.coursesService.updateClass(classId, payload).subscribe(() => {
        this.coursesService.reloadClasses(sectionId);
        this.closeClassModal();
      });
    } else {
      const payload = {
        title: formValue.title!,
        description: formValue.description,
        section: sectionId,
        video_platform: platform,
        video_id: videoId,
        time: formValue.time
      };
      this.coursesService.createClass(payload).subscribe(() => {
        this.coursesService.reloadSections(this.selectedCourse()!._id); // Actualiza el contador
        this.coursesService.reloadClasses(sectionId);
        this.closeClassModal();
      });
    }
  }

  deleteClass(classId: string): void {
    if (confirm('¿Seguro que quieres eliminar esta clase?')) {
      this.coursesService.removeClass(classId).subscribe(() => {
        this.coursesService.reloadSections(this.selectedCourse()!._id);
        this.coursesService.reloadClasses(this.selectedSection()!._id);
      });
    }
  }

  dropClass(event: CdkDragDrop<CourseClase[]>) {
    const sectionId = this.selectedSection()?._id;
    if (!sectionId) return;

    // Actualiza el estado local en el servicio para un feedback visual inmediato
    this.coursesService.updateLocalClassOrder(event.previousIndex, event.currentIndex);

    const orderedIds = this.coursesService.classes().map(clase => clase._id);

    // Llamamos al servicio para persistir el nuevo orden
    this.coursesService.reorderClasses(orderedIds).subscribe(); // La suscripción es importante para que la petición se envíe
  }

  // 🎬 Método para escuchar cambios en el video link y obtener duración automáticamente
  private setupVideoListener(): void {
    this.videoLinkSub = this.classForm.get('video_link')!.valueChanges.pipe(
      debounceTime(700), // Espera 700ms después de que el usuario deja de escribir
      distinctUntilChanged(), // Solo emite si el valor ha cambiado
      filter(url => {
        // Solo procesar si hay URL y es válida
        if (!url) return false;
        const platform = this.classForm.get('video_platform')!.value;
        if (platform === 'youtube') {
          return url.includes('youtube.com') || url.includes('youtu.be');
        }
        return url.includes('vimeo.com');
      }),
      switchMap(url => {
        const platform = this.classForm.get('video_platform')!.value;
        // Llamar al servicio correcto según la plataforma
        if (platform === 'youtube') {
          return this.coursesService.getYoutubeData(url!);
        }
        return this.coursesService.getVimeoData(url!);
      }),
      tap(response => {
        if (response && response.duration) {
          // Actualiza el campo 'time' del formulario con la duración obtenida
          this.classForm.patchValue({ time: response.duration }, { emitEvent: false });
          console.log('✅ Duración obtenida:', response.duration, 'segundos');
        }
      })
    ).subscribe({
      error: (err) => {
        console.error('❌ Error al obtener duración del video:', err);
        // Opcional: Mostrar mensaje al usuario
      }
    });
  }

  formatDuration(seconds: number | undefined | null): string {
    if (!seconds || seconds <= 0) {
      return '-';
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m} min`;
  }
}
