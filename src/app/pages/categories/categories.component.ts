import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { Category } from '../../core/models/home.models';
import { CategoriesService } from '../../core/services/categories';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './categories.component.html',
})
export class Categories implements OnInit {
  categoriesService = inject(CategoriesService);
  authService = inject(AuthService);

  // Exponer Math para usarlo en el template
  Math = Math;

  isModalOpen = signal(false);
  isEditing = signal(false);
  currentCategoryId = signal<string | null>(null);
  imagePreview = signal<string | null>(null);
  isSaving = signal(false);

  categoryForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    imagen: new FormControl<File | null>(null),
  });

  // --- INICIO: Lógica de Filtros ---
  searchTerm = signal('');

  // Helper para normalizar texto (quitar tildes y a minúsculas)
  private normalizeText(text: string): string {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  filteredCategories = computed(() => {
    const allCategories = this.categoriesService.categories();
    const term = this.normalizeText(this.searchTerm());

    if (!term) return allCategories;

    return allCategories.filter(category => {
      const titleMatch = this.normalizeText(category.title).includes(term);
      return titleMatch;
    });
  });

  // Método para manejar búsqueda
  onSearch(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  // Método para limpiar búsqueda
  clearSearch() {
    this.searchTerm.set('');
    this.currentPage.set(1);
  }

  // --- FIN: Lógica de Filtros ---

  // --- INICIO: Lógica de paginación ---
  currentPage = signal(1);
  itemsPerPage = signal(10);

  paginatedCategories = computed(() => {
    const categories = this.filteredCategories() || [];
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return categories.slice(start, end);
  });

  totalPages = computed(() => {
    const total = this.filteredCategories()?.length || 0;
    return Math.ceil(total / this.itemsPerPage());
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const current = this.currentPage();
    const pages: (number | string)[] = [1];

    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');

    pages.push(total);
    return pages;
  });

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  previousPage(): void {
    this.changePage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.changePage(this.currentPage() + 1);
  }

  changePerPage(perPage: number): void {
    this.itemsPerPage.set(perPage);
    this.currentPage.set(1);
  }

  // --- FIN: Lógica de paginación ---

  ngOnInit(): void {
    this.categoriesService.reload();
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.currentCategoryId.set(null);
    this.categoryForm.reset();
    this.imagePreview.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(category: Category): void {
    this.isEditing.set(true);
    this.currentCategoryId.set(category._id);
    this.categoryForm.patchValue({ 
      title: category.title,
      imagen: null
    });
    
    if (category.imagen) {
      const imageUrl = this.buildImageUrl(category.imagen);
      this.imagePreview.set(imageUrl);
    } else {
      this.imagePreview.set(null);
    }
    
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.categoryForm.reset();
    this.imagePreview.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe superar los 5MB');
        return;
      }
      
      this.categoryForm.patchValue({ imagen: file });
      
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview.set(reader.result as string);
      };
      reader.onerror = () => {
        console.error('❌ Error al leer el archivo');
        alert('Error al cargar la imagen');
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) {
      return;
    }

    this.isSaving.set(true);
    const formData = new FormData();
    const formValue = this.categoryForm.getRawValue();

    if (formValue.title) {
      formData.append('title', formValue.title);
    }

    if (this.isEditing() && this.currentCategoryId()) {
      formData.append('_id', this.currentCategoryId()!);
    }

    if (formValue.imagen instanceof File) {
      formData.append('imagen', formValue.imagen);
    }

    const operation$ = this.isEditing()
      ? this.categoriesService.update(formData)
      : this.categoriesService.register(formData);

    operation$.subscribe({
      next: () => {
        this.categoriesService.reload();
        this.closeModal();
        this.isSaving.set(false);
      },
      error: (error) => {
        console.error('❌ Error en la operación:', error);
        alert(`Error: ${error.error?.message || 'No se pudo guardar la categoría'}`);
        this.isSaving.set(false);
      }
    });
  }

  deleteCategory(id: string): void {
    if (confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      this.categoriesService.remove(id).subscribe({
        next: () => {
          this.categoriesService.reload();
        },
        error: (error) => {
          console.error('❌ Error al eliminar:', error);
          alert(`Error: ${error.error?.message || 'No se pudo eliminar la categoría'}`);
        }
      });
    }
  }

  buildImageUrl(imageName?: string): string {
    if (!imageName) {
      return 'https://i.pravatar.cc/80?u=placeholder';
    }
    
    const cleanImageName = imageName.trim();
    const baseUrl = environment.images.cat;
    const fullUrl = `${baseUrl}${cleanImageName}`;
    
    return fullUrl;
  }
}
