// /cursos/src/app/pages/global-settings/global-settings.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { SettingsService, Setting } from '../../core/services/settings.service';

interface GroupInfo {
  key: string;
  title: string;
  icon: string;
}

@Component({
  selector: 'app-global-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './global-settings.component.html',
})
export class GlobalSettingsComponent implements OnInit {
  settingsService = inject(SettingsService);

  // Estado del componente
  isLoading = this.settingsService.isLoadingSettings;
  groupedSettings = this.settingsService.groupedSettings;
  isSaving = signal(false);
  saveSuccess = signal(false);
  saveError = signal<string | null>(null);

  // Tab activo
  activeTab = signal<string>('general');

  // Formulario local (copia de los settings para edición)
  localSettings = signal<{ [key: string]: any }>({});

  // Lista de grupos disponibles
  availableGroups = computed<GroupInfo[]>(() => {
    return this.groupedSettings().map(g => ({
      key: g.group,
      title: g.title,
      icon: this.getGroupIcon(g.group)
    }));
  });

  // Settings del grupo activo
  activeGroupSettings = computed(() => {
    const group = this.groupedSettings().find(g => g.group === this.activeTab());
    return group ? group.settings : [];
  });

  // NUEVO: Computed para el título del grupo activo
  activeGroupTitle = computed(() => {
    const group = this.availableGroups().find(g => g.key === this.activeTab());
    return group?.title || '';
  });

  // NUEVO: Computed para la descripción del grupo activo
  activeGroupDescription = computed(() => {
    const group = this.groupedSettings().find(g => g.group === this.activeTab());
    return group?.description || '';
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.settingsService.loadGlobalSettings().subscribe({
      next: (res: any) => {
        // Inicializar localSettings con los valores actuales
        const settingsMap: { [key: string]: any } = {};
        res.settings.forEach((s: Setting) => {
          settingsMap[s.key] = s.value;
        });
        this.localSettings.set(settingsMap);
      },
      error: (err: any) => {
      }
    });
  }

  setActiveTab(group: string): void {
    this.activeTab.set(group);
    this.saveSuccess.set(false);
    this.saveError.set(null);
  }

  onInputChange(key: string, value: any, type: string): void {
    // Convertir el valor según el tipo
    let convertedValue = value;

    if (type === 'number') {
      convertedValue = parseFloat(value) || 0;
    } else if (type === 'boolean') {
      convertedValue = value === 'true' || value === true;
    } else if (type === 'array') {
      // Si es un array, asumimos que es un textarea con valores separados por comas
      convertedValue = value.split(',').map((v: string) => v.trim()).filter((v: string) => v);
    }

    this.localSettings.update(settings => ({
      ...settings,
      [key]: convertedValue
    }));
  }

  saveSettings(): void {
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);

    // Obtener solo los settings del grupo activo
    const activeSettings = this.activeGroupSettings();
    const settingsToUpdate: Setting[] = activeSettings.map(s => ({
      ...s,
      value: this.localSettings()[s.key]
    }));

    this.settingsService.updateSettings(settingsToUpdate).subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);

        // Ocultar mensaje de éxito después de 3 segundos
        setTimeout(() => {
          this.saveSuccess.set(false);
        }, 3000);
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.saveError.set(err.error?.message || 'Error al guardar los settings');
      }
    });
  }

  initializeDefaults(): void {
    if (!confirm('¿Estás seguro de que quieres inicializar los settings por defecto? Esto creará los settings que no existan.')) {
      return;
    }

    this.settingsService.initializeDefaults().subscribe({
      next: (res: any) => {
        alert(`Settings inicializados: ${res.count} settings creados/actualizados`);
        this.loadSettings();
      },
      error: (err: any) => {
        alert('Error al inicializar settings');
      }
    });
  }

  getInputType(setting: Setting): string {
    if (typeof setting.value === 'boolean') return 'boolean';
    if (typeof setting.value === 'number') return 'number';
    if (Array.isArray(setting.value)) return 'array';
    if (typeof setting.value === 'string' && setting.value.length > 100) return 'textarea';
    return 'text';
  }

  getGroupIcon(group: string): string {
    const icons: { [key: string]: string } = {
      general: '🏠',
      commissions: '💰',
      payments: '💳',
      email: '✉️',
      legal: '⚖️',
      features: '⚙️'
    };
    return icons[group] || '📋';
  }

  formatArrayValue(value: any): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value?.toString() || '';
  }
}
