import { HttpEventType, HttpEvent } from '@angular/common/http';
import { Component, OnInit, inject, signal, computed } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Project } from "../../core/models/home.models";
import { ProjectService } from "../../core/services/project.service";
import { CoursesService } from "../../core/services/courses";
import { environment } from "../../../environments/environment";
import { AuthService } from "../../core/services/auth";

import { ToastService } from "../../core/services/toast.service"; // 🆕

interface ProjectFile {
  _id: string;
  name: string;
  filename: string;
  size: number;
  uploadDate: string;
}

import { MxnCurrencyPipe } from '../../shared/pipes/mxn-currency.pipe';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [ReactiveFormsModule, MxnCurrencyPipe],
  templateUrl: './projects.component.html',
})
export class ProjectsComponent implements OnInit {
  projectService = inject(ProjectService);
  coursesService = inject(CoursesService);
  public authService = inject(AuthService);

  private toast = inject(ToastService); // 🆕

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

  // Map para almacenar el estado de ventas de cada proyecto
  projectSalesStatus = signal<Map<string, { hasSales: boolean; canDelete: boolean; isChecking: boolean }>>(new Map());

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
  uploadPercentage = signal(0); // 🆕 Progreso de subida
  deletePercentage = signal(0); // 🆕 Progreso de eliminación

  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  projectForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    subtitle: new FormControl('', [Validators.required]),
    description: new FormControl('', [Validators.required]),
    price_mxn: new FormControl(0, [Validators.required, Validators.min(0)]),
    isFree: new FormControl(false), // Indica si el proyecto es gratuito
    categorie: new FormControl('', [Validators.required]),
    state: new FormControl(1, [Validators.required]),
    portada: new FormControl<File | null>(null),
    url_video: new FormControl(''),
  });

  // 🔥 Signal para mensaje de error de precio
  priceErrorMessage = computed(() => {
    const priceControl = this.projectForm.get('price_mxn');
    const isFreeControl = this.projectForm.get('isFree');

    if (!priceControl || !isFreeControl) return null;

    const price = priceControl.value || 0;
    const isFree = isFreeControl.value;

    // Si es gratuito, no mostrar error
    if (isFree) return null;

    // Si el precio está entre 0.01 y 9.99, mostrar error
    if (price > 0 && price < 10) {
      return 'El precio mínimo debe ser $10.00 MXN';
    }

    return null;
  });

  ngOnInit(): void {
    this.loadProjects();
    this.coursesService.reloadConfig();

    // 🔥 Listener para el checkbox de "Gratuito"
    this.projectForm.get('isFree')?.valueChanges.subscribe(isFree => {
      const priceControl = this.projectForm.get('price_mxn');

      if (isFree) {
        // Si es gratuito, poner precio en 0 (NO deshabilitar el control)
        priceControl?.setValue(0);
      }
    });
  }

  loadProjects(): void {
    this.projectsState.update(s => ({ ...s, isLoading: true }));

    this.projectService.list(this.searchTerm(), this.selectedCategory()).subscribe({
      next: (response) => {
        this.projectsState.set({
          projects: response.projects,
          isLoading: false,
          error: null,
        });

        // Verificar ventas de cada proyecto
        this.checkProjectsSales(response.projects);
      },
      error: (err) => {
        this.projectsState.set({
          projects: [],
          isLoading: false,
          error: err,
        });
      }
    });
  }

  /**
   * Verificar el estado de ventas de todos los proyectos
   * MEJORADO: Fuerza actualización del template con cada verificación
   */
  private checkProjectsSales(projects: Project[]): void {

    if (projects.length === 0) {
      return;
    }

    // Inicializar TODOS los proyectos como "verificando"
    const statusMap = new Map<string, { hasSales: boolean; canDelete: boolean; isChecking: boolean }>();
    projects.forEach(project => {
      statusMap.set(project._id, { hasSales: false, canDelete: false, isChecking: true });
    });

    // Forzar actualización inicial
    this.projectSalesStatus.set(new Map(statusMap));

    // Verificar cada proyecto individualmente
    let completed = 0;
    const total = projects.length;

    projects.forEach((project, index) => {

      this.projectService.checkSales(project._id).subscribe({
        next: (response) => {

          // Actualizar el estado de este proyecto específico
          statusMap.set(project._id, {
            hasSales: response.hasSales,
            canDelete: response.canDelete,
            isChecking: false
          });

          completed++;

          // CRÍTICO: Crear NUEVO Map para forzar detección de cambios en Angular
          this.projectSalesStatus.set(new Map(statusMap));


          if (completed === total) {
            statusMap.forEach((status, projectId) => {
              const proj = projects.find(p => p._id === projectId);
            });
          }
        },
        error: (err) => {

          // En caso de error, asumir que tiene ventas (por seguridad)
          statusMap.set(project._id, {
            hasSales: true,  // Por seguridad
            canDelete: false,
            isChecking: false
          });

          completed++;

          // CRÍTICO: Crear NUEVO Map
          this.projectSalesStatus.set(new Map(statusMap));

          if (completed === total) {
          }
        }
      });
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
      price_mxn: 0,
      isFree: false, // ✅ AGREGAR: Checkbox de gratuito por defecto false
      categorie: '',
      state: 1,
      portada: null,
      url_video: '',
    });
    this.imagePreview.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(project: Project): void {
    this.isEditing.set(true);
    this.currentProjectId.set(project._id);

    // Extraer el ID de la categoría si es un objeto
    const categoryId = typeof project.categorie === 'object' ? project.categorie._id : project.categorie;

    this.projectForm.patchValue({
      title: project.title,
      subtitle: project.subtitle,
      description: project.description,
      price_mxn: project.price_mxn,
      isFree: project.isFree || false, // Agregar campo isFree
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

    // 🔥 VALIDACIÓN DE PRECIO
    const isFree = this.projectForm.get('isFree')?.value;
    const price = this.projectForm.get('price_mxn')?.value || 0;

    // Si NO es gratuito y el precio es menor a $10, mostrar error
    if (!isFree && price > 0 && price < 10) {
      alert('⚠️ El precio mínimo debe ser $10.00 MXN o puedes marcarlo como gratuito');
      return;
    }

    const formData = new FormData();
    const formValue = this.projectForm.value;

    formData.append('title', formValue.title || '');
    formData.append('subtitle', formValue.subtitle || '');
    formData.append('description', formValue.description || '');

    // 🔥 Si es gratuito, enviar 0; si no, enviar el precio (habilitando el control temporalmente)
    if (isFree) {
      formData.append('price_mxn', '0');
      formData.append('isFree', 'true');
    } else {
      // Habilitar temporalmente el control para obtener su valor
      const priceControl = this.projectForm.get('price_mxn');
      const wasdisabled = priceControl?.disabled;
      if (wasdisabled) priceControl?.enable();

      formData.append('price_mxn', priceControl?.value?.toString() || '0');
      formData.append('isFree', 'false');

      if (wasdisabled) priceControl?.disable();
    }

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
        alert(error.error?.message_text || 'Error al actualizar el proyecto');
        this.projectsState.update(s => ({ ...s, isLoading: false }));
      }
    });
  }

  /**
   * Eliminar proyecto con validaciones de seguridad
   * - Instructores pueden eliminar sus propios proyectos sin ventas
   * - Admins pueden eliminar cualquier proyecto sin ventas
   * - NO se puede eliminar si tiene ventas asociadas
   */
  deleteProject(project: Project): void {

    // Obtener estado de ventas del proyecto
    const salesStatus = this.projectSalesStatus().get(project._id);

    // VALIDACIÓN 1: Verificar si aún se está checando
    if (!salesStatus || salesStatus.isChecking) {
      alert('⏳ Por favor espera, estamos verificando el estado del proyecto...');
      return;
    }

    // VALIDACIÓN 2: Si tiene ventas, bloquear eliminación
    if (salesStatus.hasSales) {
      alert(
        `🚫 No se puede eliminar "${project.title}"\n\n` +
        `Este proyecto tiene estudiantes que ya lo compraron.\n` +
        `No se puede eliminar para proteger la integridad de los datos.`
      );
      return;
    }


    // Confirmación del usuario
    const confirmDelete = confirm(
      `⚠️ ¿Estás seguro de eliminar "${project.title}"?\n\n` +
      `Esta acción es permanente y no se puede deshacer.`
    );

    if (!confirmDelete) {
      return;
    }

    this.projectsState.update(s => ({ ...s, isLoading: true }));

    this.projectService.delete(project._id).subscribe({
      next: (response: any) => {

        // Verificar si el backend bloqueó por ventas
        if (response.code === 403) {
          alert(`🚫 ${response.message}`);
          this.projectsState.update(s => ({ ...s, isLoading: false }));
        }
        // Eliminación exitosa
        else if (response.code === 200 || response.message?.includes('ELIMINÓ')) {
          alert('✅ Proyecto eliminado exitosamente');
          this.loadProjects(); // Recargar lista
        }
        // Respuesta inesperada
        else {
          alert('✅ Proyecto eliminado');
          this.loadProjects();
        }
      },
      error: (error) => {

        const errorMsg = error.error?.message || 'Error al eliminar el proyecto';
        alert(`❌ ${errorMsg}`);
        this.projectsState.update(s => ({ ...s, isLoading: false }));
      }
    });
  }

  /**
   * Verificar si el usuario actual puede eliminar un proyecto específico
   * @param project Proyecto a verificar
   * @returns true si puede eliminar, false si no
   */
  canDeleteProject(project: Project): boolean {
    const user = this.authService.user();
    if (!user) {
      return false;
    }

    // Obtener estado de ventas del Map
    const salesStatus = this.projectSalesStatus().get(project._id);

    // Si aún se está verificando, no mostrar botón activo
    if (!salesStatus || salesStatus.isChecking) {
      return false;
    }

    // 🔒 VALIDACIÓN CRÍTICA: Si tiene ventas, NADIE puede eliminar
    if (salesStatus.hasSales) {
      return false;
    }

    // Si NO tiene ventas, verificar permisos de usuario:

    // 1. Admin puede eliminar cualquier proyecto (sin ventas)
    if (user.rol === 'admin') {
      return true;
    }

    // 2. Instructor solo puede eliminar SUS PROPIOS proyectos (sin ventas)
    if (user.rol === 'instructor') {
      const projectUserId = typeof project.user === 'object' ? project.user._id : project.user;
      return projectUserId === user._id;
    }

    // 3. Cualquier otro rol no puede eliminar
    return false;
  }

  buildImageUrl(imagen: string): string {
    return `${environment.url}projects/imagen-project/${imagen}`; // ✅ projects (plural)
  }

  getStateBadgeClass(state: number | undefined): string {
    switch (state) {
      case 1: return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 2: return 'bg-lime-500/20 text-lime-400 border border-lime-500/30';
      case 3: return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  }

  getStateText(state: number | undefined): string {
    switch (state) {
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
      next: (event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            if (event.total) {
              const progress = Math.round((100 * event.loaded) / event.total);
              this.uploadPercentage.set(progress);
            }
            break;

          case HttpEventType.Response:
            // Al finalizar, aseguramos 100% y esperamos un poco
            this.uploadPercentage.set(100);

            setTimeout(() => {
              const response = event.body;
              this.fileSuccessMessage.set(`Se subieron ${response.uploadedFiles} archivo(s) correctamente`);

              if (response.errors && response.errors.length > 0) {
                this.fileErrorMessages.set(response.errors);
              }

              this.selectedFiles.set([]);
              this.loadProjectFiles(projectId);
              this.uploadingFiles.set(false);
              this.uploadPercentage.set(0); // Resetear progreso

              setTimeout(() => {
                this.fileSuccessMessage.set('');
              }, 5000);
            }, 1000); // 1 segundo de "Completado" al 100%
            break;
        }
      },
      error: (error) => {
        this.fileErrorMessages.set(['Error al subir los archivos. Por favor, intenta de nuevo.']);
        this.uploadingFiles.set(false);
        this.uploadPercentage.set(0);
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
    this.deletePercentage.set(0);

    // Simular progreso de eliminación (hasta 90%)
    let progress = 0;
    const interval = setInterval(() => {
      if (progress < 90) {
        progress += Math.floor(Math.random() * 5) + 5;
        if (progress > 90) progress = 90;
        this.deletePercentage.set(progress);
      }
    }, 200);

    this.projectService.deleteFile(projectId, file._id).subscribe({
      next: (response) => {
        clearInterval(interval);
        this.deletePercentage.set(100);

        setTimeout(() => {
          this.fileSuccessMessage.set('Archivo eliminado correctamente');
          this.loadProjectFiles(projectId);
          this.deletingFileId.set(null);
          this.deletePercentage.set(0);

          setTimeout(() => {
            this.fileSuccessMessage.set('');
          }, 3000);
        }, 1000); // 1 segundo en 100%
      },
      error: (error) => {
        clearInterval(interval);
        this.fileErrorMessages.set(['Error al eliminar el archivo']);
        this.deletingFileId.set(null);
        this.deletePercentage.set(0);
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
