import { Component, inject, computed, effect, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarouselService } from '../../core/services/carousel';
import { environment } from '../../../environments/environment';

// Declaramos la función global de Flowbite para que TypeScript no se queje.
declare var initFlowbite: () => void;

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carousel.component.html',
})
export class CarouselComponent implements AfterViewInit, OnDestroy {
  carouselService = inject(CarouselService);

  // Obtener las imágenes y el estado de carga desde el servicio.
  images = this.carouselService.publicImages;
  isLoading = this.carouselService.isLoading;

  // Construir la URL base para las imágenes.
  // Esto asegura que la URL sea siempre correcta, incluso si cambia el entorno.
  imagesUrl = computed(() => `${environment.url}carousel/imagen/`);

  private initializationTimeout: any = null;
  private isInitialized = false;

  constructor() {
    // Usamos un 'effect' para reinicializar Flowbite cuando las imágenes cambien
    effect(() => {
      const imagesList = this.images();
      if (imagesList.length > 0 && this.isInitialized) {
        this.safeInitFlowbite();
      }
    });
  }

  ngAfterViewInit(): void {
    // Inicialización inicial después de que la vista esté completamente cargada
    if (this.images().length > 0) {
      this.safeInitFlowbite();
    }
  }

  ngOnDestroy(): void {
    // Limpieza del timeout si el componente se destruye
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
    }
  }

  private safeInitFlowbite(): void {
    // Limpiamos cualquier timeout previo
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
    }

    // Esperamos a que el DOM esté completamente actualizado
    this.initializationTimeout = setTimeout(() => {
      try {
        // Verificamos que el elemento del carousel exista en el DOM
        const carouselElement = document.querySelector('[data-carousel="slide"]');
        
        if (!carouselElement) {
          console.warn('Carousel element not found in DOM');
          return;
        }

        // Verificamos que tenga items
        const carouselItems = carouselElement.querySelectorAll('[data-carousel-item]');
        if (carouselItems.length === 0) {
          console.warn('No carousel items found');
          return;
        }

        // Inicializamos Flowbite solo si todo está correcto
        if (typeof initFlowbite === 'function') {
          initFlowbite();
          this.isInitialized = true;
          console.log('✅ Flowbite carousel initialized successfully');
        }
      } catch (error) {
        console.warn('⚠️ Flowbite carousel initialization warning:', error);
        // No lanzamos el error para no romper la aplicación
      }
    }, 300); // Delay suficiente para asegurar que el DOM esté renderizado
  }
}
