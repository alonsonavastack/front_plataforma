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

import { ProfileStudentService } from '../../core/services/profile-student.service';
import type { EnrolledCourse, Sale, Project, ProjectFile, ProfileData } from '../../core/services/profile-student.service';
import { ProjectService } from '../../core/services/project.service';
import { environment } from '../../../environments/environment';
type ProfileSection = 'courses' | 'projects' | 'purchases' | 'edit' | 'refunds' | 'wallet';

// Validador personalizado para confirmar que las contraseñas coinciden
export const passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  return control.get('newPassword')?.value === control.get('confirmPassword')?.value ? null : { passwordsMismatch: true };
};

// RefundModalComponent no se usa - modal está en el template principal
import { WalletService } from '../../core/services/wallet.service';
import { lastValueFrom } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';

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
  walletService = inject(WalletService);
  private toast = inject(ToastService);
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

  // Señal para los reembolsos - ahora computed desde el servicio
  refunds = computed(() => this.profileStudentService.refunds() as any[]);

  // 🆕 Señales para el modal de reembolso
  showRefundModal = signal(false);
  selectedSaleForRefund = signal<Sale | null>(null);

  // 🆕 Signals para reembolso parcial
  selectedSale = signal<any>(null);
  selectedProductsForRefund = signal<Set<string>>(new Set());
  showRefundProductSelector = signal(false);
  refundReason = signal('');
  refundReasonType = signal('not_expected');
  isSubmittingRefund = signal(false);

  // 🆕 Computed: Total seleccionado
  selectedRefundTotal = computed(() => {
    const sale = this.selectedSale();
    const selectedIds = this.selectedProductsForRefund();

    if (!sale || !sale.detail) return 0;

    return sale.detail
      .filter((item: any) => selectedIds.has(item.product._id || item.product))
      .reduce((sum: number, item: any) => sum + (item.price_unit || 0), 0);
  });

  // 🔥 NUEVO: Contar reembolsos completados para un producto específico
  getCompletedRefundsCountForProduct(productId: string): number {
    const refundList = this.refunds() as any[];
    if (!refundList || refundList.length === 0) {
      return 0;
    }

    const completedCount = refundList.filter((refund: any) => {
      if (refund.status !== 'completed') return false;

      const refundProductId = (refund.sale_detail_item?.product && typeof refund.sale_detail_item.product === 'object')
        ? refund.sale_detail_item.product._id
        : refund.sale_detail_item?.product;

      return refundProductId === productId;
    }).length;

    console.log('📊 [getCompletedRefundsCountForProduct]', {
      productId,
      completedCount,
      maxAllowed: 2
    });

    return completedCount;
  }

  // 🔥 NUEVO: Verificar si un producto específico ya tiene reembolso
  hasRefundForProduct(saleId: string, productId: string): boolean {
    const refundList = this.refunds() as any[];
    if (!refundList || refundList.length === 0) {
      console.log('📊 [hasRefundForProduct] No hay reembolsos - Resultado: false');
      return false;
    }

    console.log('🔍 [hasRefundForProduct] Verificando:', {
      saleId,
      productId,
      totalRefunds: refundList.length
    });

    const hasRefund = refundList.some((refund: any) => {
      // 🔥 CRÍTICO: Considerar solo reembolsos activos (no rechazados ni cancelados)
      if (!['pending', 'approved', 'processing', 'completed'].includes(refund.status)) {
        console.log('⏭️ [hasRefundForProduct] Reembolso no activo:', refund.status);
        return false;
      }

      const refundSaleId = (refund.sale && typeof refund.sale === 'object') ? refund.sale._id : refund.sale;
      const refundProductId = (refund.sale_detail_item?.product && typeof refund.sale_detail_item.product === 'object')
        ? refund.sale_detail_item.product._id
        : refund.sale_detail_item?.product;

      const match = refundSaleId === saleId && refundProductId === productId;

      if (match) {
        console.log('✅ [hasRefundForProduct] Producto ya tiene reembolso activo:', {
          refundId: refund._id,
          status: refund.status
        });
      }

      return match;
    });

    console.log('📊 [hasRefundForProduct] Resultado:', hasRefund);
    return hasRefund;
  }

  // 🔥 NUEVO: Verificar si la compra está dentro del período de reembolso (7 días)
  isWithinRefundPeriod(saleDate: string | Date): boolean {
    const purchaseDate = new Date(saleDate);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    const isWithin = diffInDays <= 7;

    console.log('📅 [isWithinRefundPeriod]', {
      purchaseDate: purchaseDate.toISOString(),
      diffInDays,
      isWithin,
      daysLeft: 7 - diffInDays
    });

    return isWithin;
  }

  // 🔥 NUEVO: Método helper para calcular días desde la compra (para usar en template)
  getDaysSincePurchase(saleDate: string | Date): number {
    const purchaseDate = new Date(saleDate);
    const now = new Date();
    return Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // 🔥 NUEVO: Método helper para calcular días restantes (para usar en template)
  getDaysLeftForRefund(saleDate: string | Date): number {
    const daysSince = this.getDaysSincePurchase(saleDate);
    return Math.max(0, 7 - daysSince);
  }

  // 🔥 NUEVO: Obtener productos reembolsables de una venta
  getRefundableProducts(sale: Sale): any[] {
    if (!sale || !sale.detail) {
      console.log('⚠️ [getRefundableProducts] Sale o detail undefined');
      return [];
    }

    console.log('🔍 [getRefundableProducts] Analizando venta:', {
      saleId: sale._id,
      totalProducts: sale.detail.length
    });

    const refundableProducts = sale.detail.filter(item => {
      // ✅ CORRECCIÓN: Extraer correctamente el productId con validación de null
      const productId = (item.product && typeof item.product === 'object' && item.product._id)
        ? item.product._id
        : typeof item.product === 'string'
          ? item.product
          : null;

      if (!productId) {
        console.log('⚠️ [getRefundableProducts] ProductId no encontrado:', item);
        return false;
      }

      // 🔥 VALIDACIÓN 1: Verificar si ya tiene reembolso activo para esta compra
      const hasActiveRefund = this.hasRefundForProduct(sale._id, productId);
      
      // 🔥 VALIDACIÓN 2: Verificar límite de reembolsos completados (2 máximo)
      const completedCount = this.getCompletedRefundsCountForProduct(productId);
      const reachedLimit = completedCount >= 2;

      console.log('📦 [getRefundableProducts] Producto:', {
        productId,
        title: item.title,
        hasActiveRefund,
        completedCount,
        reachedLimit,
        isRefundable: !hasActiveRefund && !reachedLimit
      });

      // Solo es reembolsable si NO tiene reembolso activo Y NO ha alcanzado el límite
      return !hasActiveRefund && !reachedLimit;
    });

    console.log('✅ [getRefundableProducts] Productos reembolsables:', refundableProducts.length);
    return refundableProducts;
  }

  // 🔥 NUEVO: Verificar si la venta tiene al menos un producto reembolsable
  hasRefundableProducts(sale: Sale): boolean {
    console.log('🎯 [hasRefundableProducts] Verificando venta:', sale._id);

    if (!sale) {
      console.log('❌ [hasRefundableProducts] Sale undefined');
      return false;
    }

    const withinPeriod = this.isWithinRefundPeriod(sale.createdAt);
    if (!withinPeriod) {
      console.log('⏰ [hasRefundableProducts] Fuera del período de 7 días');
      return false;
    }

    const refundableProducts = this.getRefundableProducts(sale);
    const hasProducts = refundableProducts.length > 0;

    console.log('📊 [hasRefundableProducts] Resultado:', {
      withinPeriod,
      refundableCount: refundableProducts.length,
      hasProducts
    });

    return hasProducts;
  }

  // 🆕 Toggle selección de producto
  toggleProductSelection(productId: string): void {
    const currentSet = this.selectedProductsForRefund();
    const newSet = new Set(currentSet);

    if (newSet.has(productId)) {
      newSet.delete(productId);
      console.log('➖ [toggleProductSelection] Producto deseleccionado:', productId);
    } else {
      newSet.add(productId);
      console.log('➕ [toggleProductSelection] Producto seleccionado:', productId);
    }

    this.selectedProductsForRefund.set(newSet);
    console.log('📋 [toggleProductSelection] Total seleccionados:', newSet.size);
  }

  // 🆕 Enviar solicitud de reembolso parcial
  submitPartialRefund(): void {
    const sale = this.selectedSale();
    const selectedIds = this.selectedProductsForRefund();
    const reason = this.refundReason();
    const reasonType = this.refundReasonType();

    // Validaciones
    if (!sale) {
      alert('⚠️ No se encontró la venta');
      return;
    }

    if (selectedIds.size === 0) {
      alert('⚠️ Debes seleccionar al menos un producto');
      return;
    }

    if (!reason.trim()) {
      alert('⚠️ Debes proporcionar una razón para el reembolso');
      return;
    }

    // 🔥 DEBUG: Validar valores antes de enviar
    console.log('🔍 [submitPartialRefund] Valores capturados:', {
      reasonType,
      reason,
      selectedProducts: Array.from(selectedIds)
    });

    // ✅ VALIDACIÓN: Asegurar que reasonType es un valor válido
    const validReasonTypes = ['not_expected', 'technical_issues', 'quality', 'duplicate_purchase', 'other'];
    if (!validReasonTypes.includes(reasonType)) {
      console.error('❌ [submitPartialRefund] Reason type inválido:', reasonType);
      alert('⚠️ Error: Tipo de motivo inválido. Por favor, selecciona una opción válida.');
      return;
    }

    if (!confirm(`¿Confirmas solicitar el reembolso de ${selectedIds.size} producto(s) por un total de ${this.selectedRefundTotal().toFixed(2)} USD?`)) {
      return;
    }

    this.isSubmittingRefund.set(true);

    // 🔥 Enviar una solicitud por cada producto seleccionado
    const refundPromises = Array.from(selectedIds).map(productId => {
      const item = sale.detail.find((d: any) => (d.product._id || d.product) === productId);

      if (!item) {
        console.warn('⚠️ [submitPartialRefund] Producto no encontrado:', productId);
        return Promise.resolve();
      }

      // ✅ VALIDACIÓN CRÃTICA: Asegurar que productId NO sea undefined
      const extractedProductId = typeof item.product === 'object' && item.product?._id 
        ? item.product._id 
        : item.product;

      if (!extractedProductId) {
        console.error('❌ [submitPartialRefund] product_id es undefined o null:', item);
        return Promise.reject({ 
          error: { 
            message: 'Error al procesar el producto. Por favor, intenta nuevamente.',
            reason: 'invalid_product_id'
          } 
        });
      }

      // 🔥 PAYLOAD MEJORADO: Asegurar formato correcto
      const refundData = {
        sale_id: sale._id,
        product_id: extractedProductId, // ✅ Usar el ID extraído y validado
        product_type: item.product_type,
        reason_type: reasonType,
        reason_description: reason.trim()
      };

      console.log('📤 [submitPartialRefund] Enviando payload completo:', {
        ...refundData,
        itemTitle: item.title,
        itemPrice: item.price_unit
      });

      return lastValueFrom(this.profileStudentService.requestRefund(sale._id, refundData));
    });

    // Esperar a que todas las solicitudes se completen
    Promise.all(refundPromises)
      .then(() => {
        // 🎨 Toast de éxito
        this.toast.success(
          '¡Solicitud Enviada!',
          `Reembolso de ${selectedIds.size} producto(s) solicitado correctamente (${this.selectedRefundTotal().toFixed(2)} USD)`,
          7000
        );

        // Cerrar modal
        this.showRefundProductSelector.set(false);

        // 🔥 CRITICAL: Recargar inmediatamente con múltiples intentos
        console.log('🔄 [submitPartialRefund] Iniciando recarga múltiple del perfil...');
        
        // Primera recarga inmediata
        this.profileStudentService.reloadProfile();
        
        // Segunda recarga después de 500ms
        setTimeout(() => {
          console.log('🔄 [submitPartialRefund] Recarga 2/3...');
          this.profileStudentService.reloadProfile();
        }, 500);
        
        // Tercera recarga después de 1500ms (por si acaso)
        setTimeout(() => {
          console.log('🔄 [submitPartialRefund] Recarga 3/3 (final)...');
          this.profileStudentService.reloadProfile();
          console.log('✅ [submitPartialRefund] Proceso de recarga completado');
        }, 1500);
      })
      .catch(error => {
        console.error('❌ Error al solicitar reembolso:', error);
        
        // 🔥 MANEJO MEJORADO: Verificar si es límite de reembolsos
        const errorMessage = error.error?.message || error.message || 'Error al procesar la solicitud.';
        const isMaxRefundsError = error.error?.reason === 'max_refunds_reached' || error.error?.show_toast;
        
        if (isMaxRefundsError) {
          // 🎨 TOAST de advertencia (no error) para límite alcanzado
          this.toast.warning(
            'Límite Alcanzado',
            errorMessage,
            8000
          );
        } else {
          // 🎨 TOAST de error para otros casos
          this.toast.error(
            'Error en Solicitud',
            errorMessage,
            7000
          );
        }
      })
      .finally(() => {
        this.isSubmittingRefund.set(false);
      });
  }

  // Computed para el nombre completo del usuario
  userFullName = computed(() => {
    const user = this.authService.user();
    if (!user) return '';
    return `${user.name} ${user.surname || ''}`.trim();
  });

  // Señales para la paginación de compras
  purchasesCurrentPage = signal(1);
  purchasesPerPage = signal(10);

  // Señales para la paginación de proyectos
  projectsCurrentPage = signal(1);
  projectsPerPage = signal(10);

  // Señales para la paginación de cursos
  coursesCurrentPage = signal(1);
  coursesPerPage = signal(10);

  // 🔥 NUEVO: Señales para la paginación de reembolsos
  refundsCurrentPage = signal(1);
  refundsPerPage = signal(10);

  // Computed para las compras paginadas
  paginatedSales = computed(() => {
    const sales = (this.studentProfile() as ProfileData)?.sales || [];
    const page = this.purchasesCurrentPage();
    const perPage = this.purchasesPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return sales.slice(start, end);
  });

  // Computed para los proyectos paginados
  paginatedProjects = computed(() => {
    const projects = (this.studentProfile() as ProfileData)?.projects || [];
    const page = this.projectsCurrentPage();
    const perPage = this.projectsPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return projects.slice(start, end);
  });

  // Computed para los cursos paginados
  paginatedCourses = computed(() => {
    const courses = (this.studentProfile() as ProfileData)?.enrolled_courses || [];
    const page = this.coursesCurrentPage();
    const perPage = this.coursesPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return courses.slice(start, end);
  });

  // Computed para el total de páginas
  totalPurchasesPages = computed(() => {
    const sales = (this.studentProfile() as ProfileData)?.sales || [];
    const perPage = this.purchasesPerPage();
    return Math.ceil(sales.length / perPage);
  });

  totalProjectsPages = computed(() => {
    const projects = (this.studentProfile() as ProfileData)?.projects || [];
    const perPage = this.projectsPerPage();
    return Math.ceil(projects.length / perPage);
  });

  totalCoursesPages = computed(() => {
    const courses = (this.studentProfile() as ProfileData)?.enrolled_courses || [];
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

  // 🔥 NUEVO: Computed para los reembolsos paginados
  paginatedRefunds = computed(() => {
    const refundsList = this.refunds() as any[];
    const page = this.refundsCurrentPage();
    const perPage = this.refundsPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return refundsList.slice(start, end);
  });

  // 🔥 NUEVO: Computed para el total de páginas de reembolsos
  totalRefundsPages = computed(() => {
    const refundsList = this.refunds() as any[];
    const perPage = this.refundsPerPage();
    return Math.ceil(refundsList.length / perPage);
  });

  // 🔥 NUEVO: Computed para el array de números de página de reembolsos
  refundsPageNumbers = computed(() => {
    const total = this.totalRefundsPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  // --- Lógica para el modal de video ---
  showVideoModal = signal(false);
  videoUrl = signal<SafeResourceUrl | null>(null);

  // Señales computadas para obtener los datos del servicio
  studentProfile = computed(() => this.profileStudentService.profileData() as ProfileData | null);
  isLoading = computed(() => this.profileStudentService.isLoading());
  user = computed(() => this.authService.user());

  // Formulario para editar el perfil
  profileForm = new FormGroup({
    name: new FormControl(""),
    surname: new FormControl(""),
    email: new FormControl({ value: "", disabled: true }), // El email no se puede cambiar
    phone: new FormControl(""),
    profession: new FormControl(""),
    description: new FormControl(""),
    // ✅ REDES SOCIALES (OPCIONALES)
    facebook: new FormControl(""),
    instagram: new FormControl(""),
    youtube: new FormControl(""),
    tiktok: new FormControl(""),
    twitch: new FormControl(""),
    website: new FormControl(""),
    discord: new FormControl(""),
    linkedin: new FormControl(""),
    twitter: new FormControl(""),
    github: new FormControl(""),
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
      const studentProfileData = this.studentProfile() as ProfileData | null;
      const authUser = this.user();

      // Priorizamos los datos más completos del endpoint de estudiante
      const dataToUse = studentProfileData?.profile || authUser;

      if (dataToUse?.email) {
        // Buscar el teléfono en ambos lugares (studentProfileData.profile o authUser)
        let phoneNumber = (studentProfileData as ProfileData)?.profile?.phone || authUser?.phone || '';
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
          // ✅ REDES SOCIALES
          facebook: dataToUse.facebook || '',
          instagram: dataToUse.instagram || '',
          youtube: dataToUse.youtube || '',
          tiktok: dataToUse.tiktok || '',
          twitch: dataToUse.twitch || '',
          website: dataToUse.website || '',
          discord: dataToUse.discord || '',
          linkedin: dataToUse.linkedin || '',
          twitter: dataToUse.twitter || '',
          github: dataToUse.github || '',
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
    // 🔥 SIEMPRE recargar el perfil al entrar a la página
    // Esto asegura que después de una compra se muestren los nuevos productos
    console.log('🔄 [ProfileStudent] Recargando perfil al iniciar...');
    
    // 🔥 SOLUCIÓN: Usar setTimeout para dar tiempo al backend de procesar
    // Si venimos desde checkout, el backend puede tardar hasta 1s en procesar
    setTimeout(() => {
      console.log('🔄 [ProfileStudent] Disparando recarga del perfil...');
      this.profileStudentService.reloadProfile();
    }, 500); // 500ms es suficiente para sincronizar

    // 💼 Cargar billetera siempre que el usuario esté logueado
    if (this.authService.isLoggedIn()) {
      this.walletService.loadWallet();
    }

    // Verificar si hay un fragment en la URL para cambiar de sección
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'purchases') {
        this.setActiveSection('purchases');
      } else if (fragment === 'projects') {
        this.setActiveSection('projects');
      } else if (fragment === 'courses') {
        this.setActiveSection('courses');
      }
    });
  }

  // 🗑️ Método legacy - ya no es necesario con rxResource
  loadRefunds(): void {
    // Ya no hace nada - los reembolsos se cargan automáticamente
    console.log('⚠️ [ProfileStudent] loadRefunds() es legacy - usando rxResource');
  }

  ngOnDestroy(): void {
    // 🔥 Asegurar que el scroll se restaure al salir del componente
    document.body.style.overflow = '';
  }

  // Cambia la sección activa y la guarda en localStorage
  setActiveSection(section: ProfileSection | 'refunds') {
    // Validar que la sección sea válida
    if (!['courses', 'projects', 'purchases', 'edit', 'refunds', 'wallet'].includes(section)) {
      return;
    }

    this.activeSection.set(section as ProfileSection);

    // 💎 Si se selecciona la billetera, cargar los datos
    if (section === 'wallet') {
      console.log('💼 [ProfileStudent] Cargando billetera...');
      this.walletService.loadWallet();
    }

    // 🔥 Guardar en localStorage para persistir entre recargas
    try {
      localStorage.setItem('profile-active-section', section);
    } catch (error) {
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

    // 🔥 ENVIAR CAMPOS PLANOS - El backend hace la transformación a socialMedia
    const updateData = {
      ...formData,
      phone: fullPhoneNumber,
      // ✅ Enviar redes sociales como campos planos (el backend los agrupa)
      facebook: formData.facebook || '',
      instagram: formData.instagram || '',
      youtube: formData.youtube || '',
      tiktok: formData.tiktok || '',
      twitch: formData.twitch || '',
      website: formData.website || '',
      discord: formData.discord || '',
      linkedin: formData.linkedin || '',
      twitter: formData.twitter || '',
      github: formData.github || '',
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
          alert('Ocurrió un error al subir tu avatar.');
        }
      });
    }
  }

  // 🔧 SVG de placeholder (no requiere HTTP) - 150x100
  private readonly placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzFlMjkzYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NDc0OGIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TaW4gSW1hZ2VuPC90ZXh0Pjwvc3ZnPg==';

  buildImageUrl(imageName?: string): string {
    if (!imageName) return 'https://i.pravatar.cc/300?u=placeholder';
    return `${environment.images.course}${imageName}`;
  }

  buildProjectImageUrl(imageName?: string): string {
    if (!imageName) return this.placeholderSvg;
    // ✅ CORREGIDO: Usamos environment.images.project que ya tiene la URL completa correcta
    return `${environment.images.project}${imageName}`;
  }

  // 🔧 Método para manejar errores de carga de imagen
  onImageError(event: any): void {
    event.target.src = this.placeholderSvg;
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
      // Podrías agregar una notificación toast aquí
      let message = '';
      if (type === 'cuenta') message = 'Número de cuenta copiado';
      else if (type === 'clabe') message = 'CLABE copiada';
      else if (type === 'transaccion') message = 'Número de transacción copiado';
      else message = `${type} copiado`;
      alert(`✅ ${message} al portapapeles`);
    }).catch(err => {
      alert('❌ No se pudo copiar. Por favor, copia manualmente.');
    });
  }

  // 🆕 MÉTODOS PARA EL MODAL DE REEMBOLSO

  /**
   * Abrir el modal de reembolso
   */
  // 🔥 NUEVO: Abrir modal con selección de productos
  openRefundModal(sale: any): void {
    // Verificar que la venta tenga productos
    if (!sale.detail || sale.detail.length === 0) {
      alert('⚠️ Esta venta no tiene productos');
      return;
    }

    // 🔥 Verificar que esté dentro del período de reembolso
    if (!this.isWithinRefundPeriod(sale.createdAt)) {
      alert('⏰ El período de reembolso ha expirado. Solo puedes solicitar reembolsos dentro de los primeros 7 días de tu compra.');
      return;
    }

    // 🔥 Verificar que haya productos reembolsables
    const refundableProducts = this.getRefundableProducts(sale);
    if (refundableProducts.length === 0) {
      alert('⚠️ Todos los productos de esta compra ya tienen un reembolso solicitado o aprobado.');
      return;
    }

    // Guardar la venta actual para el modal
    this.selectedSale.set(sale);

    // 🔥 NUEVO: Si solo hay un producto reembolsable, seleccionarlo automáticamente
    if (refundableProducts.length === 1) {
      const product = refundableProducts[0].product;
      const productId = typeof product === 'object' && product._id ? product._id : product;
      this.selectedProductsForRefund.set(new Set([productId]));
      console.log('⚡ [ProfileStudent] Producto único autoseleccionado:', productId);
    } else {
      this.selectedProductsForRefund.set(new Set());
    }

    this.refundReason.set('');
    this.refundReasonType.set('not_expected');
    this.showRefundProductSelector.set(true);

    console.log('📦 [ProfileStudent] Modal de reembolso abierto:', {
      saleId: sale._id,
      totalProducts: sale.detail.length,
      refundableProducts: refundableProducts.length,
      withinPeriod: this.isWithinRefundPeriod(sale.createdAt)
    });
  }

  /**
   * Cerrar el modal de reembolso
   */
  closeRefundModal(): void {
    console.log('🚪 [ProfileStudent] Cerrando modal de reembolso');
    this.showRefundModal.set(false);
    this.selectedSaleForRefund.set(null);
  }

  /**
   * Manejar el envío de la solicitud de reembolso
   */
  handleRefundSubmit(refundData: any): void {
    console.log('📤 [ProfileStudent] Enviando solicitud de reembolso:', refundData);

    this.profileStudentService.requestRefund(refundData.sale_id, refundData).subscribe({
      next: (response) => {
        console.log('✅ [ProfileStudent] Solicitud exitosa:', response);

        // Cerrar modal
        this.closeRefundModal();

        // 🎨 Toast de éxito profesional
        this.toast.success(
          '¡Solicitud Enviada!',
          'Tu reembolso será procesado pronto. Te notificaremos.',
          7000
        );

        // Recargar perfil
        this.profileStudentService.loadProfile().subscribe({
          next: () => {
            console.log('🔄 [ProfileStudent] Perfil recargado');
          },
          error: (err) => {
            console.error('❌ [ProfileStudent] Error al recargar perfil:', err);
          }
        });
      },
      error: (err) => {
        console.error('❌ [ProfileStudent] Error en solicitud:', err);
        const errorMessage = err.error?.message || 'Ocurrió un error al procesar tu solicitud.';
        
        // 🎨 Toast de error profesional
        this.toast.error(
          'Error en Solicitud',
          errorMessage,
          7000
        );
      }
    });
  }

  /**
   * Verifica si ya existe una solicitud de reembolso ACTIVA para una venta específica
   */
  hasRefundRequest(saleId: string): boolean {
    const refundList = this.refunds() as any[];
    if (!refundList || refundList.length === 0) return false;

    return refundList.some((refund: any) => {
      // Verificar si sale es un objeto con _id o directamente el ID
      // 🔥 FIX: Validar que refund.sale no sea null antes de acceder a _id
      const refundSaleId = (refund.sale && typeof refund.sale === 'object') ? refund.sale._id : refund.sale;

      // 🔥 CRÍTICO: Solo considerar reembolsos activos
      const isActive = ['pending', 'approved', 'processing', 'completed'].includes(refund.status);

      return refundSaleId === saleId && isActive;
    });
  }

  /**
   * 🆕 NUEVO: Obtener el estado del reembolso para una venta
   * Retorna el status del reembolso si existe, o null si no hay reembolso
   */
  getRefundStatus(saleId: string): { status: string; statusText: string; color: string } | null {
    const refundList = this.refunds() as any[];
    if (!refundList || refundList.length === 0) return null;

    const refund = refundList.find((r: any) => {
      const refundSaleId = (r.sale && typeof r.sale === 'object') ? r.sale._id : r.sale;
      return refundSaleId === saleId && r.status && r.status !== 'rejected' && r.status !== 'cancelled';
    });

    if (!refund) return null;

    // Mapear status a texto y color
    const statusMap: Record<string, { text: string; color: string }> = {
      'pending': { text: 'Reembolso Solicitado', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
      'approved': { text: 'Reembolso Aprobado', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
      'processing': { text: 'Reembolso en Proceso', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
      'completed': { text: 'Reembolso Completado', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
      'rejected': { text: 'Reembolso Rechazado', color: 'bg-red-500/10 text-red-400 border-red-500/30' }
    };

    const statusInfo = statusMap[refund.status] || { text: 'Estado Desconocido', color: 'bg-slate-700 text-slate-400 border-slate-600' };

    return {
      status: refund.status,
      statusText: statusInfo.text,
      color: statusInfo.color
    };
  }

  /**
   * 🆕 Construir URL del comprobante de reembolso
   */
  buildRefundReceiptUrl(imageName?: string): string {
    if (!imageName) return '';
    const cleanImageName = imageName.trim();
    return `${environment.url}refunds/receipt-image/${cleanImageName}`;
  }

}
