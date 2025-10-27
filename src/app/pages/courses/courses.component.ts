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

  // 🔥 NUEVO: Signal para almacenar el estado de ventas y estudiantes de cada curso
  courseSalesStatus = signal<Map<string, { 
    hasSales: boolean; 
    hasStudents: boolean; 
    canDelete: boolean; 
    isChecking: boolean;
    saleCount?: number;
    studentCount?: number;
  }>>(new Map());

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
    isFree: new FormControl(false), // Indica si el curso es gratuito
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
    // Effect 1: Auto-filtrar instructores
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

    // 🔥 Effect 3: Verificar ventas cuando se cargan los cursos
    effect(() => {
      const courses = this.coursesService.courses();
      if (courses.length > 0) {
        // Usar setTimeout para ejecutar fuera del ciclo de detección de cambios
        setTimeout(() => this.checkCoursesSales(courses), 0);
      }
    }, { allowSignalWrites: true });
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
      isFree: false, // ✅ AGREGAR: Checkbox de gratuito por defecto false
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
      isFree: course.isFree || false, // Agregar campo isFree
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

    // ✅ IMPORTANTE: Convertir boolean isFree a string para FormData
    Object.keys(formValue).forEach(key => {
      const value = formValue[key as keyof typeof formValue];
      if (value !== null && value !== undefined) {
        if (key === 'portada' && value instanceof File) {
          formData.append(key, value);
        } else if (key === 'isFree') {
          // 🔥 NUEVO: Enviar isFree explícitamente como 'true' o 'false'
          formData.append(key, value ? 'true' : 'false');
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

  deleteCourse(course: CourseAdmin): void {
    console.log('\n🗑️ INTENTO DE ELIMINACIÓN');
    console.log('=====================================');
    console.log('Curso:', course.title);
    console.log('ID:', course._id);
    
    // Obtener estado de ventas y estudiantes del curso
    const salesStatus = this.courseSalesStatus().get(course._id);
    console.log('Estado de ventas/estudiantes:', salesStatus);
    
    // VALIDACIÓN 1: Verificar si aún se está checando
    if (!salesStatus || salesStatus.isChecking) {
      console.log('⏳ Aún verificando estado...');
      alert('⏳ Por favor espera, estamos verificando el estado del curso...');
      return;
    }
    
    // VALIDACIÓN 2: Si tiene ventas, bloquear eliminación
    if (salesStatus.hasSales) {
      console.log('🚫 BLOQUEADO: Curso tiene ventas');
      alert(
        `🚫 No se puede eliminar "${course.title}"\n\n` +
        `Este curso tiene estudiantes que ya lo compraron.\n` +
        `Ventas registradas: ${salesStatus.saleCount || 0}\n` +
        `No se puede eliminar para proteger la integridad de los datos.`
      );
      return;
    }

    // VALIDACIÓN 3: Si tiene estudiantes inscritos, bloquear eliminación
    if (salesStatus.hasStudents) {
      console.log('🚫 BLOQUEADO: Curso tiene estudiantes inscritos');
      alert(
        `🚫 No se puede eliminar "${course.title}"\n\n` +
        `Este curso tiene estudiantes inscritos actualmente.\n` +
        `Estudiantes: ${salesStatus.studentCount || 0}\n` +
        `No se puede eliminar para proteger el acceso de los estudiantes.`
      );
      return;
    }

    console.log('✅ No tiene ventas ni estudiantes, permitiendo eliminación');

    // Confirmación del usuario
    const confirmDelete = confirm(
      `⚠️ ¿Estás seguro de eliminar "${course.title}"?\n\n` +
      `Esta acción eliminará:\n` +
      `- El curso y su portada\n` +
      `- Todas las secciones\n` +
      `- Todas las clases\n` +
      `- Todos los archivos asociados\n\n` +
      `Esta acción es permanente y no se puede deshacer.`
    );
    
    if (!confirmDelete) {
      console.log('❌ Usuario canceló la eliminación');
      return;
    }

    console.log('🔄 Enviando petición de eliminación al backend...');

    this.coursesService.remove(course._id).subscribe({
      next: (response: any) => {
        console.log('📬 Respuesta del backend:', response);
        console.log('=====================================\n');
        
        // Verificar si el backend bloqueó por ventas o estudiantes
        if (response.code === 403) {
          console.warn('⚠️ Backend bloqueó: Curso tiene ventas o estudiantes');
          alert(`🚫 ${response.message}`);
        } 
        // Eliminación exitosa
        else if (response.code === 200 || response.message?.includes('ELIMINÓ')) {
          console.log('✅ Curso eliminado exitosamente');
          alert('✅ Curso eliminado exitosamente');
          this.coursesService.reloadList(); // Recargar lista
        }
        // Respuesta inesperada
        else {
          console.log('⚠️ Respuesta sin code explícito, asumiendo éxito');
          alert('✅ Curso eliminado');
          this.coursesService.reloadList();
        }
      },
      error: (error) => {
        console.error('❌ ERROR al eliminar:', error);
        console.log('=====================================\n');
        
        const errorMsg = error.error?.message || 'Error al eliminar el curso';
        alert(`❌ ${errorMsg}`);
      }
    });
  }

  /**
   * Verificar si el usuario actual puede eliminar un curso específico
   * @param course Curso a verificar
   * @returns true si puede eliminar, false si no
   */
  canDeleteCourse(course: CourseAdmin): boolean {
    const user = this.authService.user();
    if (!user) {
      return false;
    }

    // Obtener estado de ventas del Map
    const salesStatus = this.courseSalesStatus().get(course._id);
    
    // Si aún se está verificando, no mostrar botón activo
    if (!salesStatus || salesStatus.isChecking) {
      return false;
    }
    
    // 🔒 VALIDACIÓN CRÍTICA: Si tiene ventas o estudiantes, NADIE puede eliminar
    if (salesStatus.hasSales || salesStatus.hasStudents) {
      return false;
    }

    // Si NO tiene ventas ni estudiantes, verificar permisos de usuario:
    
    // 1. Admin puede eliminar cualquier curso (sin ventas ni estudiantes)
    if (user.rol === 'admin') {
      return true;
    }

    // 2. Instructor solo puede eliminar SUS PROPIOS cursos (sin ventas ni estudiantes)
    if (user.rol === 'instructor') {
      const courseUserId = typeof course.user === 'object' ? course.user._id : course.user;
      return courseUserId === user._id;
    }

    // 3. Cualquier otro rol no puede eliminar
    return false;
  }

  /**
   * Verificar el estado de ventas y estudiantes de todos los cursos
   * MEJORADO: Fuerza actualización del template con cada verificación
   */
  private checkCoursesSales(courses: CourseAdmin[]): void {
    console.log('🔍 Verificando ventas y estudiantes de', courses.length, 'cursos...');
    
    if (courses.length === 0) {
      console.log('⚠️ No hay cursos para verificar');
      return;
    }
    
    // Inicializar TODOS los cursos como "verificando"
    const statusMap = new Map<string, { 
      hasSales: boolean; 
      hasStudents: boolean; 
      canDelete: boolean; 
      isChecking: boolean;
      saleCount?: number;
      studentCount?: number;
    }>();
    
    courses.forEach(course => {
      statusMap.set(course._id, { 
        hasSales: false, 
        hasStudents: false, 
        canDelete: false, 
        isChecking: true 
      });
    });
    
    // Forzar actualización inicial
    this.courseSalesStatus.set(new Map(statusMap));
    console.log('📊 Estado inicial (todos verificando):', statusMap.size, 'cursos');
    
    // Verificar cada curso individualmente
    let completed = 0;
    const total = courses.length;
    
    courses.forEach((course, index) => {
      console.log(`🔎 [${index + 1}/${total}] Verificando: "${course.title}" (ID: ${course._id})`);
      
      this.coursesService.checkSales(course._id).subscribe({
        next: (response) => {
          console.log(`✅ [${index + 1}/${total}] "${course.title}":`, {
            hasSales: response.hasSales,
            hasStudents: response.hasStudents,
            canDelete: response.canDelete,
            saleCount: response.saleCount || 0,
            studentCount: response.studentCount || 0
          });
          
          // Actualizar el estado de este curso específico
          statusMap.set(course._id, {
            hasSales: response.hasSales,
            hasStudents: response.hasStudents,
            canDelete: response.canDelete,
            isChecking: false,
            saleCount: response.saleCount,
            studentCount: response.studentCount
          });
          
          completed++;
          
          // CRÍTICO: Crear NUEVO Map para forzar detección de cambios en Angular
          this.courseSalesStatus.set(new Map(statusMap));
          
          console.log(`📈 Progreso: ${completed}/${total} verificados`);
          
          if (completed === total) {
            console.log('✅ ¡Verificación completada!\n', '📋 Resumen:');
            statusMap.forEach((status, courseId) => {
              const crs = courses.find(p => p._id === courseId);
              const canDeleteStr = status.canDelete ? '✅ PUEDE ELIMINAR' : '🚫 NO PUEDE ELIMINAR';
              console.log(`   - ${crs?.title || courseId}:`, canDeleteStr, `(ventas: ${status.hasSales}, estudiantes: ${status.hasStudents})`);
            });
          }
        },
        error: (err) => {
          console.error(`❌ [${index + 1}/${total}] Error al verificar "${course.title}":`, err);
          
          // En caso de error, asumir que tiene ventas/estudiantes (por seguridad)
          statusMap.set(course._id, { 
            hasSales: true,  // Por seguridad
            hasStudents: true, // Por seguridad
            canDelete: false, 
            isChecking: false 
          });
          
          completed++;
          
          // CRÍTICO: Crear NUEVO Map
          this.courseSalesStatus.set(new Map(statusMap));
          
          if (completed === total) {
            console.log('⚠️ Verificación completada con errores');
          }
        }
      });
    });
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
