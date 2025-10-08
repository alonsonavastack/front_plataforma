import { Component, inject, effect, signal, OnInit, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ProfileService } from '../../core/services/profile';
import { HeaderComponent } from '../../layout/header/header';
import { RouterLink } from '@angular/router';
import { ProfileStudentService, EnrolledCourse, Sale, Project, ProjectFile } from '../../core/services/profile-student.service';
import { ProjectService } from '../../core/services/project.service';
import { environment } from '../../../environments/environment';

type ProfileSection = 'courses' | 'projects' | 'purchases' | 'edit';

// Validador personalizado para confirmar que las contraseñas coinciden
export const passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  return control.get('newPassword')?.value === control.get('confirmPassword')?.value ? null : { passwordsMismatch: true };
};

@Component({
  standalone: true,
  selector: 'app-profile-student',
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent, RouterLink],
  templateUrl: './profile-student.html',
})
export class ProfileStudentComponent implements OnInit {
  // Usamos ProfileService para las acciones de 'update', pero no para leer el estado.
  profileService = inject(ProfileService);
  profileStudentService = inject(ProfileStudentService);
  projectService = inject(ProjectService);
  authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);

  // Señal para manejar la pestaña activa
  activeSection = signal<ProfileSection>('courses');

  // Señal para el estado de envío del formulario
  isSubmitting = signal(false);

  // Señal para el estado de envío del formulario de contraseña
  isPasswordSubmitting = signal(false);

  // Señal para mostrar un indicador de carga en el archivo que se está descargando
  downloadingFileId = signal<string | null>(null);

  // Señales computadas para obtener los datos del servicio
  studentProfile = computed(() => this.profileStudentService.profileData());
  isLoading = computed(() => this.profileStudentService.isLoading());
  user = computed(() => this.authService.user());

  // Formulario para editar el perfil
  profileForm = new FormGroup({
    name: new FormControl(''),
    surname: new FormControl(''),
    email: new FormControl({ value: '', disabled: true }), // El email no se puede cambiar
    profession: new FormControl(''),
    description: new FormControl(''),
  });

  // Formulario para cambiar la contraseña
  passwordForm = new FormGroup({
    currentPassword: new FormControl('', [Validators.required]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required]),
  }, {
    validators: passwordsMatchValidator
  });

  constructor() {
    // Usamos un effect para reaccionar cuando los datos del perfil se cargan.
    // Esto llenará el formulario automáticamente.
    effect(() => {
      const studentProfileData = this.studentProfile();
      const authUser = this.user();

      // Priorizamos los datos más completos del endpoint de estudiante
      const dataToUse = studentProfileData?.profile || authUser;

      if (dataToUse?.email) {
        this.profileForm.patchValue({
          name: dataToUse.name || '',
          surname: dataToUse.surname || '',
          email: dataToUse.email || '',
          profession: dataToUse.profession || '',
          description: dataToUse.description || '',
        });
      }
    });
  }

  ngOnInit(): void {
    this.profileStudentService.loadProfile().subscribe();
  }

  // Cambia la sección activa
  setActiveSection(section: ProfileSection) {
    this.activeSection.set(section);
  }

  // Envía los datos del formulario para actualizar el perfil
  onSubmitProfile() {
    if (this.profileForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    const formData = this.profileForm.getRawValue();

    this.profileService.update(formData).subscribe({
      next: (response) => {
        // Después de actualizar, recargamos los datos para reflejar los cambios.
        // Y reseteamos el formulario con los nuevos datos para que vuelva al estado 'pristine'.
        const updatedUser = response.user || response.profile || response;
        this.profileForm.reset(updatedUser);

        this.profileStudentService.loadProfile().subscribe();
        alert('¡Perfil actualizado con éxito!');
        this.isSubmitting.set(false);
      },
      error: (err) => {
        console.error('Error al actualizar el perfil:', err);
        alert('Ocurrió un error al actualizar tu perfil.');
        this.isSubmitting.set(false);
      },
    });
  }

  // Envía los datos del formulario para cambiar la contraseña
  onSubmitPassword() {
    if (this.passwordForm.invalid) {
      return;
    }

    this.isPasswordSubmitting.set(true);
    const { newPassword, currentPassword } = this.passwordForm.getRawValue();

    // El backend espera 'password' para la nueva contraseña y 'old_password' para la actual.
    const payload = { password: newPassword, old_password: currentPassword };

    this.http.post<any>(`${environment.url}profile-student/update-password`, payload).subscribe({
      next: () => {
        alert('¡Contraseña actualizada con éxito! Se cerrará la sesión por seguridad.');
        this.passwordForm.reset();
        this.isPasswordSubmitting.set(false);
        this.authService.logout(); // Cierra la sesión y redirige a /login
      },
      error: (err) => {
        console.error('Error al actualizar la contraseña:', err);
        alert(err.error.message_text || 'Ocurrió un error al cambiar tu contraseña.');
        this.isPasswordSubmitting.set(false);
      },
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      // Usamos el método específico para avatares
      this.profileService.updateAvatar(file).subscribe({
        next: (response) => {
          // Actualizamos el usuario en el AuthService para que el cambio se refleje en toda la app
          // El tap en el servicio ya se encarga de esto, pero una doble confirmación no hace daño
          if (response.user) {
            this.authService.user.set(response.user);
          }
          alert('¡Avatar actualizado con éxito!');
        },
        error: (err) => {
          console.error('Error al subir el avatar:', err);
          alert('Ocurrió un error al subir tu avatar.');
        }
      });
    }
  }

  buildImageUrl(imageName?: string): string {
    if (!imageName) return 'https://i.pravatar.cc/300?u=placeholder';
    return `${environment.images.course}${imageName}`;
  }

  buildProjectImageUrl(imageName?: string): string {
    if (!imageName) return 'https://via.placeholder.com/300x200?text=No+Image';
    // CORRECCIÓN: Usamos la URL base de la API y la ruta correcta para las imágenes de proyectos.
    return `${environment.url}project/imagen-project/${imageName}`;
  }

  buildProjectFileUrl(projectId: string, filename: string): string {
    return `${environment.url}project/download-file/${projectId}/${filename}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getSanitizedVideoUrl(url: string): SafeResourceUrl | null {
    if (!url) return null;

    let embedUrl = '';
    // Vimeo: https://vimeo.com/VIDEO_ID -> https://player.vimeo.com/video/VIDEO_ID
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1].split(/[\/?]/)[0];
      embedUrl = `https://player.vimeo.com/video/${videoId}`;
    }

    // Devuelve una URL segura para ser usada en un iframe
    return embedUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl) : null;
  }

  downloadProjectFile(project: Project, file: ProjectFile): void {
    if (this.downloadingFileId()) return; // Evitar descargas múltiples

    this.downloadingFileId.set(file._id);

    this.projectService.downloadFile(project._id, file.filename).subscribe({
      next: (blob) => {
        // Crear un enlace temporal en memoria para el archivo descargado (Blob)
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = file.name; // Usar el nombre original del archivo
        a.click();

        // Limpiar el objeto URL después de la descarga
        URL.revokeObjectURL(objectUrl);
        this.downloadingFileId.set(null);
      },
      error: (err) => {
        console.error('Error al descargar el archivo:', err);
        alert('No se pudo descargar el archivo. Por favor, intenta de nuevo.');
        this.downloadingFileId.set(null);
      }
    });
  }

  // --- Lógica para Desplegables (Dropdowns) ---

  // Señal para el dropdown de descarga de archivos de proyectos
  openDropdownId = signal<string | null>(null);
  // Usamos un Set para los detalles de las compras, permitiendo múltiples abiertos si es necesario
  expandedPurchases = new Set<string>();

  toggleDropdown(id: string) {
    if (this.openDropdownId() === id) {
      this.openDropdownId.set(null); // Cierra el dropdown actual
    } else {
      this.openDropdownId.set(id); // Abre el nuevo dropdown
    }
  }

  isDropdownOpen(id: string): boolean {
    return this.openDropdownId() === id;
  }

  // Cerrar dropdown al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isDropdownButton = target.closest('button[data-dropdown]');
    const isDropdownMenu = target.closest('[data-dropdown-menu]');

    if (!isDropdownButton && !isDropdownMenu) {
      this.openDropdownId.set(null);
    }
  }

  /**
   * Muestra u oculta los detalles de una compra.
   * @param saleId El ID de la venta.
   */
  togglePurchaseDetails(saleId: string): void {
    if (this.expandedPurchases.has(saleId)) {
      this.expandedPurchases.delete(saleId);
    } else {
      this.expandedPurchases.add(saleId);
    }
  }

  isPurchaseDetailsVisible(saleId: string): boolean {
    return this.expandedPurchases.has(saleId);
  }

  getProductTypeName(type: 'course' | 'project'): string {
    return type === 'course' ? 'Curso' : 'Proyecto';
  }
}
