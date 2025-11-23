import { Component, OnInit, inject, computed } from '@angular/core';

import { AppearanceService, Setting } from '../../core/services/appearance.service';
import { HomeService } from '../../core/services/home';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-appearance',
  standalone: true,
  imports: [],
  templateUrl: './appearance.component.html',
})
export class AppearanceComponent implements OnInit {
  appearanceService = inject(AppearanceService);
  homeService = inject(HomeService); // Para recargar el home
  private toast = inject(ToastService);
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

        // Recargamos los datos del home para que se reflejen los cambios
        this.homeService.reloadHome();
        this.appearanceService.loadSettings().subscribe(); // Recargamos para mantener el estado sincronizado
      },
      error: (err) => this.toast.error(`Error al actualizar el ajuste ${key}:`, err),
    });
  }
}
