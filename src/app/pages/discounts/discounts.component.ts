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
    this.discountForm.reset({
      type_campaign: 1,
      type_discount: 1,
      discount: 0,
      type_segment: 1,
      state: true,
    });
    this.selectedCourses.set([]);
    this.selectedProjects.set([]);
    this.selectedCategories.set([]);
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
      return;
    }

    const formValue = this.discountForm.value;
    const typeSegment = formValue.type_segment!;

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

    const startDate = new Date(formValue.start_date!);
    const endDate = new Date(formValue.end_date!);

    const data = {
      type_campaign: formValue.type_campaign!,
      type_discount: formValue.type_discount!,
      discount: formValue.discount!,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      start_date_num: startDate.getTime(),
      end_date_num: endDate.getTime(),
      type_segment: typeSegment,
      state: formValue.state!,
      courses: typeSegment === 1 ? this.selectedCourses() : [],
      projects: typeSegment === 3 ? this.selectedProjects() : [],
      categories: typeSegment === 2 ? this.selectedCategories() : [],
      courses_s: typeSegment === 1 ? this.selectedCourses() : [],
      projects_s: typeSegment === 3 ? this.selectedProjects() : [],
      categories_s: typeSegment === 2 ? this.selectedCategories() : [],
    };

    this.discountService.createDiscount(data).subscribe({
      next: () => {
        alert('Descuento creado exitosamente');
        this.closeCreateModal();
      },
      error: (err) => {
        console.error('Error:', err);
        alert(err.error?.message_text || 'Error al crear descuento');
      }
    });
  }

  openEditModal(discount: Discount): void {
    this.currentDiscount.set(discount);
    
    this.discountForm.patchValue({
      type_campaign: discount.type_campaign,
      type_discount: discount.type_discount,
      discount: discount.discount,
      start_date: new Date(discount.start_date).toISOString().slice(0, 16),
      end_date: new Date(discount.end_date).toISOString().slice(0, 16),
      type_segment: discount.type_segment,
      state: discount.state,
    });

    this.selectedCourses.set(discount.courses || []);
    this.selectedProjects.set(discount.projects || []);
    this.selectedCategories.set(discount.categories || []);

    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.currentDiscount.set(null);
  }

  saveEdit(): void {
    if (this.discountForm.invalid) return;

    const discount = this.currentDiscount();
    if (!discount) return;

    const formValue = this.discountForm.value;
    const typeSegment = formValue.type_segment!;

    const startDate = new Date(formValue.start_date!);
    const endDate = new Date(formValue.end_date!);

    const data = {
      _id: discount._id,
      type_campaign: formValue.type_campaign!,
      type_discount: formValue.type_discount!,
      discount: formValue.discount!,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      start_date_num: startDate.getTime(),
      end_date_num: endDate.getTime(),
      type_segment: typeSegment,
      state: formValue.state!,
      courses: typeSegment === 1 ? this.selectedCourses() : [],
      projects: typeSegment === 3 ? this.selectedProjects() : [],
      categories: typeSegment === 2 ? this.selectedCategories() : [],
      courses_s: typeSegment === 1 ? this.selectedCourses() : [],
      projects_s: typeSegment === 3 ? this.selectedProjects() : [],
      categories_s: typeSegment === 2 ? this.selectedCategories() : [],
    };

    this.discountService.updateDiscount(data).subscribe({
      next: () => {
        alert('Descuento actualizado exitosamente');
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
        alert('Descuento eliminado exitosamente');
      },
      error: () => {
        alert('Error al eliminar descuento');
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
      // Imagen placeholder en base64 (1x1 pixel gris)
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFhMjMzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5NGEzYjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TaW4gSW1hZ2VuPC90ZXh0Pjwvc3ZnPg==';
    }
    const paths: Record<string, string> = {
      course: 'courses/imagen-course',
      project: 'project/imagen-project',
      category: 'categorie/imagen-categorie',
    };
    return `${environment.url}${paths[type]}/${imagen}`;
  }

  // Nuevas funciones para mejorar la UI
  onSegmentChange(): void {
    // Resetear búsqueda al cambiar de segmento
    this.itemSearchTerm.set('');
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
