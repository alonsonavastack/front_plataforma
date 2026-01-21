import { Component, inject, signal, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AnimateService } from './core/animate.service';
import { initFlowbite } from 'flowbite';
import { ToastContainerComponent } from './shared/toast-container/toast-container.component';
import { ModalComponent } from './shared/components/modal/modal.component';

import { SystemConfigService } from './core/services/system-config.service';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, ModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  systemConfigService = inject(SystemConfigService);
  private document = inject(DOCUMENT);

  constructor() {
    // 🔥 Efecto para actualizar el Favicon dinámicamente
    effect(() => {
      const config = this.systemConfigService.config();

      // 🔥 Lógica mejorada: Usar favicon específico O el logo del header
      if (config) {
        let iconUrl = '';

        if (config.favicon) {
          iconUrl = this.systemConfigService.buildFaviconUrl(config.favicon);
          console.log('🖼️ [App] Usando Favicon específico:', iconUrl);
        } else if (config.logo) {
          iconUrl = this.systemConfigService.buildLogoUrl(config.logo);
          console.log('🖼️ [App] Usando Logo como Favicon (Fallback):', iconUrl);
        }

        if (iconUrl) {
          // Buscar el link del favicon existente por ID para mayor precisión
          let link: HTMLLinkElement | null = this.document.getElementById('appFavicon') as HTMLLinkElement;

          // Si no existe (fallback), buscar por rel
          if (!link) {
            link = this.document.querySelector("link[rel*='icon']");
          }

          // Si sigue sin existir, crearlo
          if (!link) {
            link = this.document.createElement('link');
            link.id = 'appFavicon';
            link.rel = 'icon';
            this.document.head.appendChild(link);
          }

          // Actualizar href
          link.href = iconUrl;

          // Forzar actualización en algunos navegadores cambiando type o rel
          link.type = 'image/x-icon';
          console.log('✅ [App] Favicon actualizado exitosamente');
        } else {
          console.log('⚠️ [App] No se encontró ni favicon ni logo para usar.');
        }
      }
    });
  }

  ngOnInit(): void {
    initFlowbite();

    // 🔥 Cargar configuración una sola vez al inicio de la app
    this.systemConfigService.getConfig();
  }
}
