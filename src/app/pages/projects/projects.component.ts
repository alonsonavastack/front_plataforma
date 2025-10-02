import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal, computed } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Project } from "../../core/models/home.models";
import { ProjectService } from "../../core/services/project.service";
import { CoursesService } from "../../core/services/courses";
import { environment } from "../../../environments/environment";

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './projects.component.html',
})
export class ProjectsComponent implements OnInit {
  projectService = inject(ProjectService);
  coursesService = inject(CoursesService);

  // --- State Management with Signals ---
  private projectsState = signal<{
    projects: Project[];
    isLoading: boolean;
    error: any;
  }>({
    projects: [],
    isLoading: false,
    error: null,
  });

  // Computed signals
  projects = computed(() => this.projectsState().projects);
  isLoading = computed(() => this.projectsState().isLoading);

  // Filter signals
  searchTerm = signal('');
  selectedCategory = signal('');

  // Get config from courses service (already loaded with signals)
  categories = computed(() => this.coursesService.config().categories);
  users = computed(() => this.coursesService.config().users);

  // --- Modal State ---
  isModalOpen = signal(false);
  isEditing = signal(false);
  currentProjectId = signal<string | null>(null);
  imagePreview = signal<string | null>(null);

  projectForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    subtitle: new FormControl('', [Validators.required]),
    description: new FormControl('', [Validators.required]),
    price_usd: new FormControl(0, [Validators.required, Validators.min(0)]),
    price_mxn: new FormControl(0, [Validators.required, Validators.min(0)]),
    categorie: new FormControl('', [Validators.required]),
    state: new FormControl(1, [Validators.required]),
    portada: new FormControl<File | null>(null),
    url_video: new FormControl(''),
  });

  ngOnInit(): void {
    this.loadProjects();
    this.coursesService.reloadConfig();
  }

  loadProjects(): void {
    this.projectsState.update(s => ({ ...s, isLoading: true }));

    this.projectService.list(this.searchTerm(), this.selectedCategory()).subscribe({
      next: (response) => {
        console.log('Proyectos cargados:', response.projects);
        this.projectsState.set({
          projects: response.projects,
          isLoading: false,
          error: null,
        });
      },
      error: (err) => {
        this.projectsState.set({
          projects: [],
          isLoading: false,
          error: err,
        });
        console.error('Error al cargar proyectos:', err);
      }
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.loadProjects();
  }

  onCategoryFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCategory.set(value);
    this.loadProjects();
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.projectForm.reset({
      title: '',
      subtitle: '',
      description: '',
      price_usd: 0,
      price_mxn: 0,
      categorie: '',
      state: 1,
      portada: null,
      url_video: '',
    });
    this.imagePreview.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(project: Project): void {
    console.log('Abriendo modal de edición con proyecto:', project);
    this.isEditing.set(true);
    this.currentProjectId.set(project._id);

    // Extraer el ID de la categoría si es un objeto
    const categoryId = typeof project.categorie === 'object' ? project.categorie._id : project.categorie;

    this.projectForm.patchValue({
      title: project.title,
      subtitle: project.subtitle,
      description: project.description,
      price_usd: project.price_usd,
      price_mxn: project.price_mxn,
      categorie: categoryId,
      state: project.state || 1,
      url_video: project.url_video || '',
    });

    this.imagePreview.set(project.imagen ? this.buildImageUrl(project.imagen) : null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.projectForm.reset();
    this.imagePreview.set(null);
    this.currentProjectId.set(null);
    this.isEditing.set(false);
  }

  onImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.projectForm.patchValue({ portada: file });

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  saveProject(): void {
    if (this.projectForm.invalid) {
      Object.keys(this.projectForm.controls).forEach(key => {
        this.projectForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formData = new FormData();
    const formValue = this.projectForm.value;

    formData.append('title', formValue.title || '');
    formData.append('subtitle', formValue.subtitle || '');
    formData.append('description', formValue.description || '');
    formData.append('price_usd', formValue.price_usd?.toString() || '0');
    formData.append('price_mxn', formValue.price_mxn?.toString() || '0');
    formData.append('categorie', formValue.categorie || '');
    formData.append('state', formValue.state?.toString() || '1');
    formData.append('url_video', formValue.url_video || '');

    if (formValue.portada) {
      formData.append('imagen', formValue.portada);
    }

    if (this.isEditing()) {
      formData.append('_id', this.currentProjectId() || '');
      this.updateProject(formData);
    } else {
      this.createProject(formData);
    }
  }

  createProject(formData: FormData): void {
    this.projectsState.update(s => ({ ...s, isLoading: true }));

    this.projectService.register(formData).subscribe({
      next: (response) => {
        alert('Proyecto creado exitosamente');
        this.closeModal();
        this.loadProjects();
      },
      error: (error) => {
        console.error('Error al crear proyecto:', error);
        alert(error.error?.message_text || 'Error al crear el proyecto');
        this.projectsState.update(s => ({ ...s, isLoading: false }));
      }
    });
  }

  updateProject(formData: FormData): void {
    this.projectsState.update(s => ({ ...s, isLoading: true }));

    this.projectService.update(formData).subscribe({
      next: (response) => {
        alert('Proyecto actualizado exitosamente');
        this.closeModal();
        this.loadProjects();
      },
      error: (error) => {
        console.error('Error al actualizar proyecto:', error);
        alert(error.error?.message_text || 'Error al actualizar el proyecto');
        this.projectsState.update(s => ({ ...s, isLoading: false }));
      }
    });
  }

  deleteProject(project: Project): void {
    const confirmDelete = confirm(`¿Estás seguro de eliminar el proyecto "${project.title}"?`);
    if (!confirmDelete) return;

    this.projectsState.update(s => ({ ...s, isLoading: true }));

    this.projectService.delete(project._id).subscribe({
      next: (response) => {
        alert('Proyecto eliminado exitosamente');
        this.loadProjects();
      },
      error: (error) => {
        console.error('Error al eliminar proyecto:', error);
        alert('Error al eliminar el proyecto');
        this.projectsState.update(s => ({ ...s, isLoading: false }));
      }
    });
  }

  buildImageUrl(imagen: string): string {
    // Corregido: La ruta base es 'project' (singular) para coincidir con el backend.
    return `${environment.url}project/imagen-project/${imagen}`;
  }

  getStateBadgeClass(state: number | undefined): string {
    switch(state) {
      case 1: return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 2: return 'bg-lime-500/20 text-lime-400 border border-lime-500/30';
      case 3: return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  }

  getStateText(state: number | undefined): string {
    switch(state) {
      case 1: return 'Borrador';
      case 2: return 'Público';
      case 3: return 'Anulado';
      default: return 'Desconocido';
    }
  }
}
