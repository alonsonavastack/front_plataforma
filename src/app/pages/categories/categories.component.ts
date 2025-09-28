import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { Category } from '../../core/models/home.models';
import { CategoriesService } from '../../core/services/categories';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './categories.component.html',
})
export class Categories implements OnInit {
  categoriesService = inject(CategoriesService);

  isModalOpen = signal(false);
  isEditing = signal(false);
  currentCategoryId = signal<string | null>(null);
  imagePreview = signal<string | null>(null);

  categoryForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    imagen: new FormControl<File | null>(null),
  });

  ngOnInit(): void {
    this.categoriesService.reload();
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.categoryForm.reset();
    this.imagePreview.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(category: Category): void {
    this.isEditing.set(true);
    this.currentCategoryId.set(category._id);
    this.categoryForm.patchValue({ title: category.title });
    this.imagePreview.set(category.imagen ? `${environment.images.cat}${category.imagen}` : null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.categoryForm.patchValue({ imagen: file });
      const reader = new FileReader();
      reader.onload = () => this.imagePreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) return;

    const formData = new FormData();
    const formValue = this.categoryForm.getRawValue();

    formData.append('title', formValue.title!);
    if (formValue.imagen) {
      formData.append('imagen', formValue.imagen);
    }

    if (this.isEditing()) {
      formData.append('_id', this.currentCategoryId()!);
      this.categoriesService.update(formData).subscribe(() => {
        this.categoriesService.reload();
        this.closeModal();
      });
    } else {
      this.categoriesService.register(formData).subscribe(() => {
        this.categoriesService.reload();
        this.closeModal();
      });
    }
  }

  deleteCategory(id: string): void {
    if (confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      this.categoriesService.remove(id).subscribe(() => {
        this.categoriesService.reload();
      });
    }
  }

  buildImageUrl(imageName?: string): string {
    if (!imageName) return 'https://i.pravatar.cc/80?u=placeholder';
    return `${environment.images.cat}${imageName}`;
  }
}
