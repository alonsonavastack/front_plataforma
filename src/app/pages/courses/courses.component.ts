import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { CourseAdmin, CourseClase, CourseSection } from "../../core/models/home.models";
import { CoursesService } from "../../core/services/courses";
import { environment } from "../../../environments/environment";
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
    vimeo_link: new FormControl(''),
    time: new FormControl(0), // Campo para la duración en segundos
  });

  private vimeoSub: Subscription | null = null;

  ngOnInit(): void {
    this.coursesService.reloadList();
    this.coursesService.reloadConfig();
    this.setupVimeoListener();
  }

  ngOnDestroy(): void {
    this.vimeoSub?.unsubscribe();
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.courseForm.reset({
      level: 'Basico',
      idioma: 'Español',
      price_usd: 0,
      price_mxn: 0,
    });
    this.imagePreview.set(null);
    this.isModalOpen.set(true);
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
  }

  closeModal(): void {
    this.isModalOpen.set(false);
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
  }

  openEditSectionModal(section: CourseSection): void {
    this.isEditingSection.set(true);
    this.currentSectionId.set(section._id);
    this.sectionForm.patchValue({ title: section.title });
    this.isSectionModalOpen.set(true);
  }

  closeSectionModal(): void {
    this.isSectionModalOpen.set(false);
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
  }

  openEditClassModal(clase: CourseClase): void {
    this.isEditingClass.set(true);
    this.currentClassId.set(clase._id);
    const vimeoLink = clase.vimeo_id ? `https://vimeo.com/${clase.vimeo_id}` : '';
    this.classForm.patchValue({ ...clase, vimeo_link: vimeoLink, time: clase.time || 0 });
    this.isClassModalOpen.set(true);
  }

  closeClassModal(): void {
    this.isClassModalOpen.set(false);
  }

  onClassSubmit(): void {
    if (this.classForm.invalid || !this.selectedSection()) return;

    const sectionId = this.selectedSection()!._id;
    const formValue = this.classForm.getRawValue();

    // Extraemos el ID del video del enlace de Vimeo
    let vimeoId: string | undefined = undefined;
    if (formValue.vimeo_link) {
      // Regex para extraer el ID de varias URLs de Vimeo (ej: https://vimeo.com/12345, https://player.vimeo.com/video/12345)
      const match = formValue.vimeo_link.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
      if (match) {
        vimeoId = match[1];
      }
    }

    if (this.isEditingClass()) {
      const classId = this.currentClassId()!;
      const payload = { title: formValue.title!, description: formValue.description, vimeo_id: vimeoId, time: formValue.time };
      this.coursesService.updateClass(classId, payload).subscribe(() => {
        this.coursesService.reloadClasses(sectionId);
        this.closeClassModal();
      });
    } else {
      const payload = { title: formValue.title!, description: formValue.description, section: sectionId, vimeo_id: vimeoId, time: formValue.time };
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

  private setupVimeoListener(): void {
    this.vimeoSub = this.classForm.get('vimeo_link')!.valueChanges.pipe(
      debounceTime(700), // Espera 700ms después de que el usuario deja de escribir
      distinctUntilChanged(), // Solo emite si el valor ha cambiado
      filter(url => !!url && url.includes('vimeo.com')), // Solo si es una URL de vimeo válida
      switchMap(url => this.coursesService.getVimeoData(url!)), // Llama al servicio
      tap(response => {
        if (response && response.duration) {
          // Actualiza el campo 'time' del formulario con la duración obtenida
          this.classForm.patchValue({ time: response.duration });
        }
      })
    ).subscribe();
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
