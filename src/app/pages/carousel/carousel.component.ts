import { Component, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarouselService } from '../../core/services/carousel';
import { environment } from '../../../environments/environment';

// Declaramos la función global de Flowbite para que TypeScript no se queje.
declare var initFlowbite: () => void;

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [CommonModule, ],
  templateUrl: './carousel.component.html',
})
export class CarouselComponent {
  carouselService = inject(CarouselService);

  // Obtener las imágenes y el estado de carga desde el servicio.
  images = this.carouselService.publicImages;
  isLoading = this.carouselService.isLoading;

  // Construir la URL base para las imágenes.
  // Esto asegura que la URL sea siempre correcta, incluso si cambia el entorno.
  imagesUrl = computed(() => `${environment.url}carousel/imagen/`);

  constructor() {
    // Usamos un 'effect' para asegurarnos de que Flowbite se inicialice
    // cada vez que las imágenes del carrusel cambien.
    effect(() => {
      if (this.images().length > 0) {
        setTimeout(() => {
          try {
            initFlowbite();
          } catch (error) {
            console.warn('Flowbite carousel initialization warning:', error);
          }
        }, 200); // Delay más largo para asegurar que el DOM esté listo
      }
    });
  }
}
