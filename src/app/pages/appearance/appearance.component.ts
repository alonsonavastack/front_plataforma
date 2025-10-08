import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppearanceService, Setting } from '../../core/services/appearance.service';
import { HomeService } from '../../core/services/home';

@Component({
  selector: 'app-appearance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appearance.component.html',
})
export class AppearanceComponent implements OnInit {
  appearanceService = inject(AppearanceService);
  homeService = inject(HomeService); // Para recargar el home

  settings = this.appearanceService.settings;
  isLoading = this.appearanceService.isLoading;

  // Señales computadas para acceder fácilmente a los valores
  showFeaturedCourses = computed(() => this.getSettingValue('home_show_featured_courses', true));
  showFeaturedProjects = computed(() => this.getSettingValue('home_show_featured_projects', true));

  ngOnInit(): void {
    this.appearanceService.loadSettings().subscribe();
  }

  getSettingValue(key: string, defaultValue: any = null) {
    const setting = this.settings().find(s => s.key === key);
    return setting ? setting.value : defaultValue;
  }

  onToggleChange(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.checked;

    this.appearanceService.updateSettings([{ key, value }]).subscribe({
      next: () => {
        console.log(`Ajuste ${key} actualizado a ${value}`);
        // Recargamos los datos del home para que se reflejen los cambios
        this.homeService.reloadHome();
        this.appearanceService.loadSettings().subscribe(); // Recargamos para mantener el estado sincronizado
      },
      error: (err) => console.error(`Error al actualizar el ajuste ${key}:`, err),
    });
  }
}
