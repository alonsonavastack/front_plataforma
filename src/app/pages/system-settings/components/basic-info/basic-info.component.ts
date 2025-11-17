import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SystemConfigService } from '../../../../core/services/system-config.service';

@Component({
  selector: 'app-basic-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './basic-info.component.html'
})
export class BasicInfoComponent {
  @Input() form!: FormGroup;
  @Input() systemConfigService!: SystemConfigService;

  @Output() logoSelected = new EventEmitter<Event>();
  @Output() logoRemoved = new EventEmitter<void>();

  // Signals
  logoPreview = signal<string | null>(null);
  logoFile = signal<File | null>(null);
  logoInfo = signal<{ width: number; height: number; size: string } | null>(null); // 🔥 Info de la imagen

  // Computed
  currentLogoUrl = computed(() => {
    const preview = this.logoPreview();
    if (preview) return preview;

    const config = this.systemConfigService.config();
    if (config?.logo) {
      return this.systemConfigService.buildLogoUrl(config.logo);
    }
    // 🔥 Corregido: Usar placehold.co en lugar de via.placeholder.com
    return 'https://placehold.co/200x80?text=Sin+Logo';
  });

  /**
   * Manejar selección de logo
   */
  onLogoSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('❌ Por favor selecciona una imagen válida (JPG, PNG, SVG, WEBP)');
      return;
    }

    // 🔥 Validar tamaño (máx 10MB - aumentado de 2MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`❌ La imagen es demasiado grande (${sizeMB}MB). El tamaño máximo es 10MB`);
      return;
    }

    console.log('🖼️ [BasicInfoComponent] Logo seleccionado:', {
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      type: file.type
    });

    this.logoFile.set(file);

    // Generar preview y obtener dimensiones
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const previewUrl = e.target.result;
      this.logoPreview.set(previewUrl);

      // 🔥 Obtener dimensiones de la imagen
      const img = new Image();
      img.onload = () => {
        const sizeInfo = {
          width: img.width,
          height: img.height,
          size: `${(file.size / (1024 * 1024)).toFixed(2)}MB`
        };
        this.logoInfo.set(sizeInfo);

        console.log('📊 Dimensiones del logo:', `${img.width}x${img.height}`, sizeInfo.size);
      };
      img.src = previewUrl;
    };
    reader.readAsDataURL(file);

    // Emitir evento al padre
    this.logoSelected.emit(event);
  }

  /**
   * Eliminar logo
   */
  removeLogo(): void {
    this.logoFile.set(null);
    this.logoPreview.set(null);
    this.logoInfo.set(null); // 🔥 Limpiar info
    this.logoRemoved.emit();
  }

  /**
   * Obtener archivo de logo para el padre
   */
  getLogoFile(): File | null {
    return this.logoFile();
  }

  /**
   * Limpiar preview
   */
  clearPreview(): void {
    this.logoFile.set(null);
    this.logoPreview.set(null);
    this.logoInfo.set(null); // 🔥 Limpiar info
  }
}
