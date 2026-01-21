import { Component, OnInit, inject, computed } from '@angular/core';

import { AppearanceService, Setting } from '../../core/services/appearance.service';
import { HomeService } from '../../core/services/home';
import { SystemConfigService } from '../../core/services/system-config.service'; // 🔥 NUEVO
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
  systemConfigService = inject(SystemConfigService); // 🔥 NUEVO
  private toast = inject(ToastService);
  settings = this.appearanceService.settings;
  isLoading = this.appearanceService.isLoading;

  // Señales computadas para acceder fácilmente a los valores
  showFeaturedCourses = computed(() => this.getSettingValue('home_show_featured_courses', true));
  showFeaturedProjects = computed(() => this.getSettingValue('home_show_featured_projects', true));

  // 🔥 NUEVO: Estado del módulo de cursos (Desde SystemConfig)
  coursesModuleEnabled = computed(() => {
    return this.systemConfigService.config()?.modules?.courses ?? true;
  });

  ngOnInit(): void {
    this.appearanceService.loadSettings().subscribe();
    this.systemConfigService.getConfig(); // 🔥 Cargar config global
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

  // 🔥 NUEVO: Toggle para módulo global de cursos
  onModuleToggle(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.checked;

    const formData = new FormData();
    // Enviamos como objeto anidado o plano según soporta el backend
    // Backend soporta req.body.modules_courses
    formData.append('modules_courses', String(value));

    this.systemConfigService.updateConfig(formData).subscribe({
      next: () => {
        this.toast.success(`Módulo de cursos ${value ? 'activado' : 'desactivado'}`);
        // Recargar config para asegurar estado
        this.systemConfigService.getConfig();
        // Recargar navegador para aplicar cambios en sidebar/rutas inmediatamente
        setTimeout(() => window.location.reload(), 1000);
      },
      error: (err) => {
        this.toast.error('Error al actualizar módulo de cursos', err);
        // Revertir estado visual si falla
        input.checked = !value;
      }
    });
  }
}
