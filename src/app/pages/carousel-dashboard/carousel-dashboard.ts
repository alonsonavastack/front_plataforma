import { Component, inject, signal, OnInit } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag } from '@angular/cdk/drag-drop';
import { CarouselService, CarouselImage } from '../../core/services/carousel';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-carousel-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, CdkDropList, CdkDrag],
  templateUrl: './carousel-dashboard.html',
})
export class CarouselDashboard implements OnInit {
  private carouselService = inject(CarouselService);
  private fb = inject(FormBuilder);
private toast = inject(ToastService);
  // --- State Signals ---
  images = this.carouselService.allImages;
  isLoading = this.carouselService.isLoading;
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  currentImage = signal<CarouselImage | null>(null);
  imagePreview = signal<string | ArrayBuffer | null>(null);
  isSaving = signal(false);

  // --- Form ---
  imageForm!: FormGroup;

  // --- Image URL ---
  readonly imagesUrl = `${environment.url}carousel/imagen/`;

  ngOnInit(): void {
    this.carouselService.loadAllImages().subscribe();
    this.initForm();
  }

  private initForm(image?: CarouselImage | null): void {
    this.imageForm = this.fb.group({
      _id: [image?._id || null],
      title: [image?.title || '', Validators.required],
      subtitle: [image?.subtitle || ''],
      linkUrl: [image?.linkUrl || ''],
      order: [image?.order || 0],
      isActive: [image?.isActive ?? true],
      imageFile: [null],
    });
  }

  // --- Modal Handling ---
  openCreateModal(): void {
    this.currentImage.set(null);
    this.initForm();
    this.imagePreview.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(image: CarouselImage): void {
    this.currentImage.set(image);
    this.initForm(image);
    this.imagePreview.set(this.imagesUrl + image.imageUrl);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  openDeleteModal(image: CarouselImage): void {
    this.currentImage.set(image);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
  }

  // --- File Handling ---
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.imageForm.patchValue({ imageFile: file });
      this.imageForm.get('imageFile')?.updateValueAndValidity();

      const reader = new FileReader();
      reader.onload = () => this.imagePreview.set(reader.result);
      reader.readAsDataURL(file);
    }
  }

  // --- CRUD Operations ---
  saveImage(): void {
    if (this.imageForm.invalid) return;
    this.isSaving.set(true);

    const formData = new FormData();
    const formValue = this.imageForm.value;

    Object.keys(formValue).forEach(key => {
      if (key !== 'imageFile' && formValue[key] !== null) {
        formData.append(key, formValue[key]);
      }
    });

    if (formValue.imageFile) {
      formData.append('image', formValue.imageFile);
    }

    const action$ = formValue._id
      ? this.carouselService.update(formValue._id, formData)
      : this.carouselService.register(formData);

    action$.pipe(
      tap(() => this.carouselService.loadAllImages().subscribe())
    ).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeModal();
      },
      error: (err) => {

        this.isSaving.set(false);
      }
    });
  }

  deleteImage(): void {
    const imageId = this.currentImage()?._id;
    if (!imageId) return;

    this.carouselService.remove(imageId).pipe(
      tap(() => this.carouselService.loadAllImages().subscribe())
    ).subscribe(() => this.closeDeleteModal());
  }

  // --- Drag and Drop ---
  drop(event: CdkDragDrop<CarouselImage[]>) {
    const imagesArray = [...this.images()]; // Copia del array actual
    moveItemInArray(imagesArray, event.previousIndex, event.currentIndex);

    // Actualizar el orden de cada imagen
    const orderUpdates = imagesArray.map((image, index) => {
      image.order = index; // Actualiza el objeto en el array
      return { _id: image._id, order: index };
    });

    // Actualizar el estado local inmediatamente para una UI fluida
    this.carouselService.updateLocalOrder(imagesArray);

    // Enviar los cambios al backend
    this.carouselService.updateOrder(orderUpdates).subscribe({
      next: () => this.toast.success('Orden actualizado en el backend.'),
      error: (err) => {

        this.carouselService.loadAllImages().subscribe(); // Recargar para revertir si hay error
      }
    });
  }
}
