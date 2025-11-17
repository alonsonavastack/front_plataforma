import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { DiscountService } from '../../core/services/discount.service';
import { Discount } from '../../core/models/discount.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-discounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './discounts.component.html',
})
export class DiscountsComponent implements OnInit {
  discountService = inject(DiscountService);

  discounts = this.discountService.discounts;
  config = this.discountService.config;
  isLoading = this.discountService.isLoading;
  stats = this.discountService.stats;

  searchTerm = signal('');
  campaignFilter = signal('');
  statusFilter = signal('');

  filteredDiscounts = computed(() => {
    let discountsData = this.discounts();
    const search = this.searchTerm().toLowerCase();
    const campaign = this.campaignFilter();
    const status = this.statusFilter();
    const now = Date.now();

    if (search) {
      discountsData = discountsData.filter(d =>
        d.discount.toString().includes(search)
      );
    }

    if (campaign) {
      discountsData = discountsData.filter(d => d.type_campaign.toString() === campaign);
    }

    if (status === 'active') {
      discountsData = discountsData.filter(d => d.state && d.end_date_num >= now && d.start_date_num <= now);
    } else if (status === 'expired') {
      discountsData = discountsData.filter(d => d.end_date_num < now);
    } else if (status === 'upcoming') {
      discountsData = discountsData.filter(d => d.start_date_num > now);
    } else if (status === 'inactive') {
      discountsData = discountsData.filter(d => !d.state);
    }

    return discountsData;
  });

  isCreateModalOpen = signal(false);
  isEditModalOpen = signal(false);
  currentDiscount = signal<Discount | null>(null);

  selectedCourses = signal<string[]>([]);
  selectedProjects = signal<string[]>([]);
  selectedCategories = signal<string[]>([]);

  itemSearchTerm = signal('');

  // Computed signals para filtrado eficiente
  filteredCourses = computed(() => {
    const courses = this.config()?.courses;
    if (!courses) return [];

    const search = this.itemSearchTerm().toLowerCase();
    if (!search) return courses;

    return courses.filter(course =>
      course.title.toLowerCase().includes(search) ||
      course.categorie.title.toLowerCase().includes(search)
    );
  });

  filteredProjects = computed(() => {
    const projects = this.config()?.projects;
    if (!projects) return [];

    const search = this.itemSearchTerm().toLowerCase();
    if (!search) return projects;

    return projects.filter(project =>
      project.title.toLowerCase().includes(search) ||
      project.categorie.title.toLowerCase().includes(search)
    );
  });

  filteredCategories = computed(() => {
    const categories = this.config()?.categories;
    if (!categories) return [];

    const search = this.itemSearchTerm().toLowerCase();
    if (!search) return categories;

    return categories.filter(category =>
      category.title.toLowerCase().includes(search)
    );
  });

  discountForm = new FormGroup({
    type_campaign: new FormControl(1, [Validators.required]),
    type_discount: new FormControl(1, [Validators.required]),
    discount: new FormControl(0, [Validators.required, Validators.min(0)]),
    start_date: new FormControl('', [Validators.required]),
    end_date: new FormControl('', [Validators.required]),
    type_segment: new FormControl(1, [Validators.required]),
    state: new FormControl(true),
  });

  ngOnInit(): void {
    this.discountService.loadConfig().subscribe();
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onCampaignFilter(event: Event): void {
    this.campaignFilter.set((event.target as HTMLSelectElement).value);
  }

  onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }

  openCreateModal(): void {
    // Obtener la fecha y hora actual
    const now = new Date();
    const startDateLocal = this.toDatetimeLocalString(now);

    // Fecha de fin: 7 días después
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endDateLocal = this.toDatetimeLocalString(endDate);

    this.discountForm.reset({
      type_campaign: 1,
      type_discount: 1,
      discount: 0,
      type_segment: 1,
      state: true,
      start_date: startDateLocal,
      end_date: endDateLocal
    });
    this.selectedCourses.set([]);
    this.selectedProjects.set([]);
    this.selectedCategories.set([]);
    this.itemSearchTerm.set('');
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  saveCreate(): void {
    if (this.discountForm.invalid) {
      Object.keys(this.discountForm.controls).forEach(key => {
        this.discountForm.get(key)?.markAsTouched();
      });
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const formValue = this.discountForm.getRawValue();
    const typeSegment = Number(formValue.type_segment);

    // Validar selección de items
    if (typeSegment === 1 && this.selectedCourses().length === 0) {
      alert('Debes seleccionar al menos un curso');
      return;
    }
    if (typeSegment === 2 && this.selectedCategories().length === 0) {
      alert('Debes seleccionar al menos una categoría');
      return;
    }
    if (typeSegment === 3 && this.selectedProjects().length === 0) {
      alert('Debes seleccionar al menos un proyecto');
      return;
    }

    // ✅ FIX: Crear objetos Date desde las cadenas datetime-local
    const startDate = new Date(formValue.start_date!);
    const endDate = new Date(formValue.end_date!);

    // Validar fechas
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      alert('Las fechas proporcionadas no son válidas');
      return;
    }

    if (endDate <= startDate) {
      alert('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    // ✅ FIX: Preparar los datos correctamente
    const selectedItems = typeSegment === 1
      ? this.selectedCourses()
      : typeSegment === 2
        ? this.selectedCategories()
        : this.selectedProjects();

    const data = {
      type_campaign: Number(formValue.type_campaign),
      type_discount: Number(formValue.type_discount),
      discount: Number(formValue.discount),
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      start_date_num: startDate.getTime(),
      end_date_num: endDate.getTime(),
      type_segment: typeSegment,
      state: Boolean(formValue.state),
      // ✅ FIX: Enviar los arrays correctamente según el tipo de segmento
      courses: typeSegment === 1 ? selectedItems : [],
      projects: typeSegment === 3 ? selectedItems : [],
      categories: typeSegment === 2 ? selectedItems : [],
      courses_s: typeSegment === 1 ? selectedItems : [],
      projects_s: typeSegment === 3 ? selectedItems : [],
      categories_s: typeSegment === 2 ? selectedItems : [],
    };


    this.discountService.createDiscount(data).subscribe({
      next: () => {
        alert('✅ Descuento creado exitosamente');
        this.closeCreateModal();
      },
      error: (err) => {
        alert(err.error?.message_text || 'Error al crear descuento');
      }
    });
  }

  openEditModal(discount: Discount): void {
    this.currentDiscount.set(discount);

    // Convertir fechas ISO a formato datetime-local (YYYY-MM-DDTHH:mm)
    const startDate = new Date(discount.start_date);
    const endDate = new Date(discount.end_date);

    const startDateLocal = this.toDatetimeLocalString(startDate);
    const endDateLocal = this.toDatetimeLocalString(endDate);

    this.discountForm.patchValue({
      type_campaign: discount.type_campaign,
      type_discount: discount.type_discount,
      discount: discount.discount,
      start_date: startDateLocal,
      end_date: endDateLocal,
      type_segment: discount.type_segment,
      state: discount.state,
    });

    this.selectedCourses.set(discount.courses || []);
    this.selectedProjects.set(discount.projects || []);
    this.selectedCategories.set(discount.categories || []);
    this.itemSearchTerm.set('');

    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.currentDiscount.set(null);
  }

  saveEdit(): void {
    if (this.discountForm.invalid) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const discount = this.currentDiscount();
    if (!discount) return;

    const formValue = this.discountForm.getRawValue();
    const typeSegment = Number(formValue.type_segment);

    const startDate = new Date(formValue.start_date!);
    const endDate = new Date(formValue.end_date!);

    const selectedItems = typeSegment === 1
      ? this.selectedCourses()
      : typeSegment === 2
        ? this.selectedCategories()
        : this.selectedProjects();

    const data = {
      _id: discount._id,
      type_campaign: Number(formValue.type_campaign),
      type_discount: Number(formValue.type_discount),
      discount: Number(formValue.discount),
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      start_date_num: startDate.getTime(),
      end_date_num: endDate.getTime(),
      type_segment: typeSegment,
      state: Boolean(formValue.state),
      courses: typeSegment === 1 ? selectedItems : [],
      projects: typeSegment === 3 ? selectedItems : [],
      categories: typeSegment === 2 ? selectedItems : [],
      courses_s: typeSegment === 1 ? selectedItems : [],
      projects_s: typeSegment === 3 ? selectedItems : [],
      categories_s: typeSegment === 2 ? selectedItems : [],
    };

    this.discountService.updateDiscount(data).subscribe({
      next: () => {
        alert('✅ Descuento actualizado exitosamente');
        this.closeEditModal();
      },
      error: (err) => {
        alert(err.error?.message_text || 'Error al actualizar descuento');
      }
    });
  }

  confirmDelete(discount: Discount): void {
    if (!window.confirm(`¿Estás seguro de eliminar este descuento de ${discount.discount}${discount.type_discount === 1 ? '%' : ' USD'}?`)) return;

    this.discountService.deleteDiscount(discount._id!).subscribe({
      next: () => {
        alert('✅ Descuento eliminado exitosamente');
      },
      error: () => {
        alert('❌ Error al eliminar descuento');
      }
    });
  }

  toggleCourse(courseId: string): void {
    const current = this.selectedCourses();
    if (current.includes(courseId)) {
      this.selectedCourses.set(current.filter(id => id !== courseId));
    } else {
      this.selectedCourses.set([...current, courseId]);
    }
  }

  toggleProject(projectId: string): void {
    const current = this.selectedProjects();
    if (current.includes(projectId)) {
      this.selectedProjects.set(current.filter(id => id !== projectId));
    } else {
      this.selectedProjects.set([...current, projectId]);
    }
  }

  toggleCategory(categoryId: string): void {
    const current = this.selectedCategories();
    if (current.includes(categoryId)) {
      this.selectedCategories.set(current.filter(id => id !== categoryId));
    } else {
      this.selectedCategories.set([...current, categoryId]);
    }
  }

  getCampaignLabel(type: number): string {
    const labels: Record<number, string> = {
      1: 'Normal',
      2: 'Flash',
      3: 'Banner',
    };
    return labels[type] || 'Desconocido';
  }

  getDiscountTypeLabel(type: number): string {
    return type === 1 ? 'Porcentaje' : 'Monto Fijo';
  }

  getSegmentLabel(type: number): string {
    const labels: Record<number, string> = {
      1: 'Cursos',
      2: 'Categorías',
      3: 'Proyectos',
    };
    return labels[type] || 'Desconocido';
  }

  getDiscountStatus(discount: Discount): 'active' | 'expired' | 'upcoming' | 'inactive' {
    const now = Date.now();
    if (!discount.state) return 'inactive';
    if (discount.start_date_num > now) return 'upcoming';
    if (discount.end_date_num < now) return 'expired';
    return 'active';
  }

  getStatusBadge(discount: Discount): string {
    const status = this.getDiscountStatus(discount);
    const badges: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400 border border-green-500/30',
      expired: 'bg-red-500/20 text-red-400 border border-red-500/30',
      upcoming: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      inactive: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    };
    return badges[status];
  }

  getStatusText(discount: Discount): string {
    const status = this.getDiscountStatus(discount);
    const texts: Record<string, string> = {
      active: 'Activo',
      expired: 'Expirado',
      upcoming: 'Próximo',
      inactive: 'Inactivo',
    };
    return texts[status];
  }

  getCampaignBadge(type: number): string {
    const badges: Record<number, string> = {
      1: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      2: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      3: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    };
    return badges[type] || 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
  }

  getImageUrl(imagen: string, type: 'course' | 'project' | 'category'): string {
    if (!imagen) {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFhMjMzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5NGEzYjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TaW4gSW1hZ2VuPC90ZXh0Pjwvc3ZnPg==';
    }
    const paths: Record<string, string> = {
      course: 'courses/imagen-course',
      project: 'project/imagen-project',
      category: 'categories/imagen-categorie',
    };
    return `${environment.url}${paths[type]}/${imagen}`;
  }

  // Función auxiliar para convertir Date a formato datetime-local
  private toDatetimeLocalString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  onSegmentChange(): void {
    this.itemSearchTerm.set('');
    // Limpiar selecciones cuando cambie el segmento
    this.selectedCourses.set([]);
    this.selectedProjects.set([]);
    this.selectedCategories.set([]);
  }

  selectAllItems(): void {
    const typeSegment = this.discountForm.value.type_segment;

    if (typeSegment === 1 && this.config()?.courses) {
      const filtered = this.filteredCourses();
      const allIds = filtered.map(c => c._id);
      this.selectedCourses.set([...new Set([...this.selectedCourses(), ...allIds])]);
    } else if (typeSegment === 2 && this.config()?.categories) {
      const filtered = this.filteredCategories();
      const allIds = filtered.map(c => c._id);
      this.selectedCategories.set([...new Set([...this.selectedCategories(), ...allIds])]);
    } else if (typeSegment === 3 && this.config()?.projects) {
      const filtered = this.filteredProjects();
      const allIds = filtered.map(p => p._id);
      this.selectedProjects.set([...new Set([...this.selectedProjects(), ...allIds])]);
    }
  }

  clearAllItems(): void {
    const typeSegment = this.discountForm.value.type_segment;

    if (typeSegment === 1) {
      this.selectedCourses.set([]);
    } else if (typeSegment === 2) {
      this.selectedCategories.set([]);
    } else if (typeSegment === 3) {
      this.selectedProjects.set([]);
    }
  }
}
