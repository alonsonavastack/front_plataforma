import { Component, inject, effect, signal, OnInit, OnDestroy, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../layout/header/header';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ProfileService } from '../../core/services/profile';
import { CheckoutService } from '../../core/services/checkout.service';
import { CountryCodeSelectorComponent, CountryCode } from '../../shared/country-code-selector/country-code-selector';

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
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HeaderComponent, CountryCodeSelectorComponent],
  templateUrl: './profile-student.html',
})
export class ProfileStudentComponent implements OnInit, OnDestroy {
  // Usamos ProfileService para las acciones de 'update', pero no para leer el estado.
  profileService = inject(ProfileService);
  profileStudentService = inject(ProfileStudentService);
  projectService = inject(ProjectService);
  checkoutService = inject(CheckoutService);
  authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  // Exponer Math para usarlo en el template
  Math = Math;

  // Exponer datos bancarios para la plantilla
  bankDetails = this.checkoutService.bankDetails;

  // Señal para manejar la pestaña activa (inicializada desde localStorage si existe)
  activeSection = signal<ProfileSection>(
    (typeof window !== 'undefined' && localStorage.getItem('profile-active-section') as ProfileSection) || 'courses'
  );

  // Señal para el estado de envío del formulario
  isSubmitting = signal(false);

  // Señal para el estado de envío del formulario de contraseña
  isPasswordSubmitting = signal(false);

  // Señal para mostrar un indicador de carga en el archivo que se está descargando
  downloadingFileId = signal<string | null>(null);

  // Señal para el código de país seleccionado
  selectedCountryCode = signal('+52'); // Por defecto México

  // Señales para la paginación de compras
  purchasesCurrentPage = signal(1);
  purchasesPerPage = signal(10);

  // Señales para la paginación de proyectos
  projectsCurrentPage = signal(1);
  projectsPerPage = signal(10);

  // Señales para la paginación de cursos
  coursesCurrentPage = signal(1);
  coursesPerPage = signal(10);

  // Computed para las compras paginadas
  paginatedSales = computed(() => {
    const sales = this.studentProfile()?.sales || [];
    const page = this.purchasesCurrentPage();
    const perPage = this.purchasesPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return sales.slice(start, end);
  });

  // Computed para los proyectos paginados
  paginatedProjects = computed(() => {
    const projects = this.studentProfile()?.projects || [];
    const page = this.projectsCurrentPage();
    const perPage = this.projectsPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return projects.slice(start, end);
  });

  // Computed para los cursos paginados
  paginatedCourses = computed(() => {
    const courses = this.studentProfile()?.enrolled_courses || [];
    const page = this.coursesCurrentPage();
    const perPage = this.coursesPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return courses.slice(start, end);
  });

  // Computed para el total de páginas
  totalPurchasesPages = computed(() => {
    const sales = this.studentProfile()?.sales || [];
    const perPage = this.purchasesPerPage();
    return Math.ceil(sales.length / perPage);
  });

  totalProjectsPages = computed(() => {
    const projects = this.studentProfile()?.projects || [];
    const perPage = this.projectsPerPage();
    return Math.ceil(projects.length / perPage);
  });

  totalCoursesPages = computed(() => {
    const courses = this.studentProfile()?.enrolled_courses || [];
    const perPage = this.coursesPerPage();
    return Math.ceil(courses.length / perPage);
  });

  // Computed para el array de números de página
  purchasesPageNumbers = computed(() => {
    const total = this.totalPurchasesPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  projectsPageNumbers = computed(() => {
    const total = this.totalProjectsPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  coursesPageNumbers = computed(() => {
    const total = this.totalCoursesPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  // --- Lógica para el modal de video ---
  showVideoModal = signal(false);
  videoUrl = signal<SafeResourceUrl | null>(null);

  // Señales computadas para obtener los datos del servicio
  studentProfile = computed(() => this.profileStudentService.profileData());
  isLoading = computed(() => this.profileStudentService.isLoading());
  user = computed(() => this.authService.user());

  // Formulario para editar el perfil
  profileForm = new FormGroup({
    name: new FormControl(''),
    surname: new FormControl(''),
    email: new FormControl({ value: '', disabled: true }), // El email no se puede cambiar
    phone: new FormControl(''),
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
        // Buscar el teléfono en ambos lugares (studentProfileData.profile o authUser)
        let phoneNumber = studentProfileData?.profile?.phone || authUser?.phone || '';
        let countryCode = '+52'; // Por defecto México

        if (phoneNumber && phoneNumber.startsWith('+')) {
          // Buscar el código de país más largo que coincida
          const possibleCodes = ['+52', '+1', '+34', '+54', '+57', '+51', '+56', '+58', '+593', '+502', '+53', '+591', '+504', '+595', '+503', '+505', '+506', '+507', '+598', '+55', '+33'];
          for (const code of possibleCodes) {
            if (phoneNumber.startsWith(code)) {
              countryCode = code;
              phoneNumber = phoneNumber.substring(code.length);
              break;
            }
          }
        }

        this.selectedCountryCode.set(countryCode);

        this.profileForm.patchValue({
          name: dataToUse.name || '',
          surname: dataToUse.surname || '',
          email: dataToUse.email || '',
          phone: phoneNumber,
          profession: dataToUse.profession || '',
          description: dataToUse.description || '',
        });
      }
    });

    // 🔥 Effect para controlar el scroll del body cuando el modal de video está abierto
    effect(() => {
      if (this.showVideoModal()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  ngOnInit(): void {
    this.profileStudentService.loadProfile().subscribe();
    console.log('📍 Sección actual al iniciar:', this.activeSection());
  }

  ngOnDestroy(): void {
    // 🔥 Asegurar que el scroll se restaure al salir del componente
    document.body.style.overflow = '';
  }

  // Cambia la sección activa y la guarda en localStorage
  setActiveSection(section: ProfileSection) {
    // Validar que la sección sea válida
    if (!['courses', 'projects', 'purchases', 'edit'].includes(section)) {
      console.error('❌ Sección inválida:', section);
      return;
    }

    console.log('📦 Guardando sección:', section);
    this.activeSection.set(section);

    // 🔥 Guardar en localStorage para persistir entre recargas
    try {
      localStorage.setItem('profile-active-section', section);
      console.log('✅ Sección guardada exitosamente');
      console.log('📍 Verificando localStorage:', localStorage.getItem('profile-active-section'));
    } catch (error) {
      console.error('❌ Error al guardar en localStorage:', error);
    }
  }

  // Maneja la selección de país
  onCountrySelected(country: CountryCode) {
    this.selectedCountryCode.set(country.dialCode);
  }

  // Envía los datos del formulario para actualizar el perfil

  onSubmitProfile() {
    if (this.profileForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    const formData = this.profileForm.getRawValue();

    // Combinar código de país con número de teléfono
    const fullPhoneNumber = formData.phone ? this.selectedCountryCode() + formData.phone : '';

    const updateData = {
      ...formData,
      phone: fullPhoneNumber
    };

    this.profileService.update(updateData).subscribe({
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

  // Métodos de paginación para compras
  changePurchasesPage(page: number): void {
    this.purchasesCurrentPage.set(page);
    const purchasesSection = document.querySelector('.purchases-section');
    if (purchasesSection) {
      purchasesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  changePurchasesPerPage(perPage: number): void {
    this.purchasesPerPage.set(perPage);
    this.purchasesCurrentPage.set(1);
  }

  previousPurchasesPage(): void {
    const current = this.purchasesCurrentPage();
    if (current > 1) {
      this.changePurchasesPage(current - 1);
    }
  }

  nextPurchasesPage(): void {
    const current = this.purchasesCurrentPage();
    const total = this.totalPurchasesPages();
    if (current < total) {
      this.changePurchasesPage(current + 1);
    }
  }

  // Métodos de paginación para proyectos
  changeProjectsPage(page: number): void {
    this.projectsCurrentPage.set(page);
    const projectsSection = document.querySelector('.projects-section');
    if (projectsSection) {
      projectsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  changeProjectsPerPage(perPage: number): void {
    this.projectsPerPage.set(perPage);
    this.projectsCurrentPage.set(1);
  }

  previousProjectsPage(): void {
    const current = this.projectsCurrentPage();
    if (current > 1) {
      this.changeProjectsPage(current - 1);
    }
  }

  nextProjectsPage(): void {
    const current = this.projectsCurrentPage();
    const total = this.totalProjectsPages();
    if (current < total) {
      this.changeProjectsPage(current + 1);
    }
  }

  // Métodos de paginación para cursos
  changeCoursesPage(page: number): void {
    this.coursesCurrentPage.set(page);
    const coursesSection = document.querySelector('.courses-section');
    if (coursesSection) {
      coursesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  changeCoursesPerPage(perPage: number): void {
    this.coursesPerPage.set(perPage);
    this.coursesCurrentPage.set(1);
  }

  previousCoursesPage(): void {
    const current = this.coursesCurrentPage();
    if (current > 1) {
      this.changeCoursesPage(current - 1);
    }
  }

  nextCoursesPage(): void {
    const current = this.coursesCurrentPage();
    const total = this.totalCoursesPages();
    if (current < total) {
      this.changeCoursesPage(current + 1);
    }
  }

  isPurchaseDetailsVisible(saleId: string): boolean {
    return this.expandedPurchases.has(saleId);
  }

  getProductTypeName(type: 'course' | 'project'): string {
    return type === 'course' ? 'Curso' : 'Proyecto';
  }

  /**
   * Convierte una URL de YouTube a formato embed
   * Soporta formatos:
   * - https://www.youtube.com/watch?v=VIDEO_ID
   * - https://youtu.be/VIDEO_ID
   * - https://www.youtube.com/embed/VIDEO_ID (ya está en formato correcto)
   */
  private convertToEmbedUrl(url: string): string {
    try {
      // Si ya es una URL de embed, la retornamos tal cual
      if (url.includes('/embed/')) {
        return url;
      }

      let videoId: string | null = null;

      // Formato: https://www.youtube.com/watch?v=VIDEO_ID
      if (url.includes('watch?v=')) {
        const urlObj = new URL(url);
        videoId = urlObj.searchParams.get('v');
      }
      // Formato: https://youtu.be/VIDEO_ID
      else if (url.includes('youtu.be/')) {
        const parts = url.split('youtu.be/');
        if (parts[1]) {
          videoId = parts[1].split('?')[0].split('&')[0];
        }
      }
      // Formato: https://www.youtube.com/v/VIDEO_ID
      else if (url.includes('/v/')) {
        const parts = url.split('/v/');
        if (parts[1]) {
          videoId = parts[1].split('?')[0].split('&')[0];
        }
      }

      // Si encontramos un video ID, construimos la URL de embed
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }

      // Si no es una URL de YouTube reconocida, la retornamos tal cual
      // (podría ser Vimeo u otra plataforma)
      return url;
    } catch (error) {
      console.error('Error al convertir URL de video:', error);
      return url;
    }
  }

  onOpenVideo(project: Project, event: MouseEvent): void {
    event.stopPropagation(); // Evita que otros eventos de clic se disparen
    const videoLink = project.video_link || project.url_video;
    if (videoLink) {
      // Convertimos la URL a formato embed si es necesario
      const embedUrl = this.convertToEmbedUrl(videoLink);
      // Sanitizamos la URL para prevenir ataques XSS
      const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
      this.videoUrl.set(safeUrl);
      this.showVideoModal.set(true);
    }
  }

  closeVideoModal(): void {
    this.showVideoModal.set(false);
    this.videoUrl.set(null);
  }

  // 📋 Función para copiar al portapapeles
  copyToClipboard(text: string, type: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log(`✅ ${type} copiado al portapapeles:`, text);
      // Podrías agregar una notificación toast aquí
      let message = '';
      if (type === 'cuenta') message = 'Número de cuenta copiado';
      else if (type === 'clabe') message = 'CLABE copiada';
      else if (type === 'transaccion') message = 'Número de transacción copiado';
      else message = `${type} copiado`;
      alert(`✅ ${message} al portapapeles`);
    }).catch(err => {
      console.error('❌ Error al copiar:', err);
      alert('❌ No se pudo copiar. Por favor, copia manualmente.');
    });
  }

}
