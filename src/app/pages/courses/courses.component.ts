import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { CourseAdmin, CourseSection } from "../../core/models/home.models"; // Asegúrate que este import es correcto
import { CoursesService } from "../../core/services/courses";
import { environment } from "../../../environments/environment";

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './courses.component.html',
})
export class CoursesComponent implements OnInit {
  coursesService = inject(CoursesService);

  // --- State Management ---
  viewMode = signal<'list' | 'content'>('list'); // Initial view is list
  selectedCourse = signal<CourseAdmin | null>(null);

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
    price_soles: new FormControl(0, [Validators.required, Validators.min(0)]),
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

  ngOnInit(): void {
    this.coursesService.reloadList();
    this.coursesService.reloadConfig();
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.courseForm.reset({
      level: 'Basico',
      idioma: 'Español',
      price_usd: 0,
      price_soles: 0,
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

}
