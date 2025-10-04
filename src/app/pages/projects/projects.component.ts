import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal, computed } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Project } from "../../core/models/home.models";
import { ProjectService } from "../../core/services/project.service";
import { CoursesService } from "../../core/services/courses";
import { environment } from "../../../environments/environment";

interface ProjectFile {
  _id: string;
  name: string;
  filename: string;
  size: number;
  uploadDate: string;
}

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

  // --- FILES State ---
  isFilesModalOpen = signal(false);
  selectedFiles = signal<File[]>([]);
  projectFiles = signal<ProjectFile[]>([]);
  uploadingFiles = signal(false);
  deletingFileId = signal<string | null>(null);
  fileErrorMessages = signal<string[]>([]);
  fileSuccessMessage = signal<string>('');

  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

  // ===== MÉTODOS PARA GESTIÓN DE ARCHIVOS ZIP =====

  openFilesModal(project: Project): void {
    this.currentProjectId.set(project._id);
    this.selectedFiles.set([]);
    this.fileErrorMessages.set([]);
    this.fileSuccessMessage.set('');
    this.loadProjectFiles(project._id);
    this.isFilesModalOpen.set(true);
  }

  closeFilesModal(): void {
    this.isFilesModalOpen.set(false);
    this.currentProjectId.set(null);
    this.selectedFiles.set([]);
    this.projectFiles.set([]);
    this.fileErrorMessages.set([]);
    this.fileSuccessMessage.set('');
  }

  loadProjectFiles(projectId: string): void {
    this.projectService.getByIdAdmin(projectId).subscribe({
      next: (response) => {
        this.projectFiles.set(response.project.files || []);
      },
      error: (error) => {
        console.error('Error al cargar archivos:', error);
      }
    });
  }

  onZipFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);
    const errors: string[] = [];
    const validFiles: File[] = [];

    files.forEach(file => {
      // Validar extensión
      if (!file.name.toLowerCase().endsWith('.zip')) {
        errors.push(`${file.name}: Solo se permiten archivos ZIP`);
        return;
      }

      // Validar tamaño
      if (file.size > this.MAX_FILE_SIZE) {
        errors.push(`${file.name}: Excede el tamaño máximo de 50MB`);
        return;
      }

      validFiles.push(file);
    });

    this.selectedFiles.update(current => [...current, ...validFiles]);
    this.fileErrorMessages.set(errors);

    // Limpiar el input
    input.value = '';
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.update(files => files.filter((_, i) => i !== index));
  }

  uploadZipFiles(): void {
    const files = this.selectedFiles();
    if (files.length === 0) return;

    const projectId = this.currentProjectId();
    if (!projectId) return;

    this.uploadingFiles.set(true);
    this.fileErrorMessages.set([]);
    this.fileSuccessMessage.set('');

    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`file${index}`, file);
    });

    this.projectService.uploadFiles(projectId, formData).subscribe({
      next: (response) => {
        this.fileSuccessMessage.set(`Se subieron ${response.uploadedFiles} archivo(s) correctamente`);

        if (response.errors && response.errors.length > 0) {
          this.fileErrorMessages.set(response.errors);
        }

        this.selectedFiles.set([]);
        this.loadProjectFiles(projectId);
        this.uploadingFiles.set(false);

        setTimeout(() => {
          this.fileSuccessMessage.set('');
        }, 5000);
      },
      error: (error) => {
        console.error('Error al subir archivos:', error);
        this.fileErrorMessages.set(['Error al subir los archivos. Por favor, intenta de nuevo.']);
        this.uploadingFiles.set(false);
      }
    });
  }

  deleteZipFile(file: ProjectFile): void {
    if (!confirm(`¿Estás seguro de eliminar el archivo "${file.name}"?`)) {
      return;
    }

    const projectId = this.currentProjectId();
    if (!projectId) return;

    this.deletingFileId.set(file._id);

    this.projectService.deleteFile(projectId, file._id).subscribe({
      next: (response) => {
        this.fileSuccessMessage.set('Archivo eliminado correctamente');
        this.loadProjectFiles(projectId);
        this.deletingFileId.set(null);

        setTimeout(() => {
          this.fileSuccessMessage.set('');
        }, 3000);
      },
      error: (error) => {
        console.error('Error al eliminar archivo:', error);
        this.fileErrorMessages.set(['Error al eliminar el archivo']);
        this.deletingFileId.set(null);
      }
    });
  }

  downloadZipFile(file: ProjectFile): void {
    const projectId = this.currentProjectId();
    if (!projectId) return;

    const url = this.projectService.getFileDownloadUrl(projectId, file.filename);
    window.open(url, '_blank');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
