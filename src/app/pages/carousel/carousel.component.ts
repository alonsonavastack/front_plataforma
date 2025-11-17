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
    // Usamos un 'effect' para inicializar Flowbite cuando lleguen las imágenes
    effect(() => {
      const imagesList = this.images();
      const imageCount = imagesList.length;



      // ✅ Inicializar solo cuando:
      // 1. Hay imágenes disponibles
      // 2. NO se ha inicializado antes (evita reinicializaciones innecesarias)
      if (imageCount > 0 && !this.isInitialized) {

        this.safeInitFlowbite();
      }
    });
  }

  ngAfterViewInit(): void {
    // ✅ IMPORTANTE: Solo inicializar si hay imágenes
    // Esto previene el error "Cannot read properties of undefined (reading 'position')"
    const imageCount = this.images().length;


    if (imageCount > 0) {

      this.safeInitFlowbite();
    } else {

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

    // 🔧 FIX SAFARI: Usamos requestAnimationFrame para evitar parpadeo
    // Safari necesita que las transiciones CSS se apliquen después del paint
    requestAnimationFrame(() => {
      // Esperamos un frame adicional para asegurar que Safari ha renderizado
      requestAnimationFrame(() => {
        this.initializationTimeout = setTimeout(() => {
          try {
            // Verificamos que el elemento del carousel exista en el DOM
            const carouselElement = document.querySelector('[data-carousel="slide"]');

            if (!carouselElement) {

              return;
            }

            // 🔧 FIX SAFARI: Ocultamos temporalmente para evitar parpadeo
            const carouselContainer = carouselElement as HTMLElement;
            carouselContainer.style.opacity = '0';

            // Verificamos que tenga items
            const carouselItems = carouselElement.querySelectorAll('[data-carousel-item]');
            if (carouselItems.length === 0) {

              carouselContainer.style.opacity = '1';
              return;
            }

            // ✅ DOBLE VERIFICACIÓN: Asegurarnos que hay items antes de inicializar
            const finalCheck = carouselElement.querySelectorAll('[data-carousel-item]');
            if (finalCheck.length === 0) {

              carouselContainer.style.opacity = '1';
              return;
            }

            // Inicializamos Flowbite solo si TODO está correcto
            if (typeof initFlowbite === 'function') {

              initFlowbite();
              this.isInitialized = true;

              // 🔧 FIX SAFARI: Mostramos con fade suave después de inicializar
              setTimeout(() => {
                carouselContainer.style.transition = 'opacity 0.3s ease-in-out';
                carouselContainer.style.opacity = '1';

              }, 50);
            } else {

              carouselContainer.style.opacity = '1';
            }
          } catch (error) {

            // Aseguramos que el carousel sea visible incluso si falla
            const carouselElement = document.querySelector('[data-carousel="slide"]') as HTMLElement;
            if (carouselElement) {
              carouselElement.style.opacity = '1';
            }
          }
        }, 100); // Reducido de 300ms a 100ms con requestAnimationFrame
      });
    });
  }
}
