import { Component, inject, signal, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AnimateService } from './core/animate.service';
import { initFlowbite } from 'flowbite';
import { ToastContainerComponent } from './shared/toast-container/toast-container.component';
import { ModalComponent } from './shared/components/modal/modal.component';

import { SystemConfigService } from './core/services/system-config.service';


import { CookieBannerComponent } from './shared/components/cookie-banner/cookie-banner.component';

import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, ModalComponent, CookieBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  systemConfigService = inject(SystemConfigService);
  private document = inject(DOCUMENT);
  private meta = inject(Meta);
  private title = inject(Title);

  constructor() {
    // 🔥 Efecto para actualizar el Favicon y Meta Tags dinámicamente
    effect(() => {
      const config = this.systemConfigService.config();

      // 🔥 Lógica mejorada: Usar favicon específico O el logo del header
      if (config) {
        let iconUrl = '';
        let logoUrl = '';

        // 1. Configurar Favicon
        if (config.favicon) {
          iconUrl = this.systemConfigService.buildFaviconUrl(config.favicon);
        } else if (config.logo) {
          iconUrl = this.systemConfigService.buildLogoUrl(config.logo);
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
          link.type = 'image/x-icon';
        }

        // 2. Configurar Meta Tags Dinámicos (SEO)
        const siteName = config.siteName || 'Dev-Hub-Sharks - Plataforma de Proyectos Digitales';
        this.title.setTitle(siteName);
        this.meta.updateTag({ property: 'og:title', content: siteName });
        this.meta.updateTag({ property: 'twitter:title', content: siteName });

        if (config.logo) {
          logoUrl = this.systemConfigService.buildLogoUrl(config.logo);
          this.meta.updateTag({ property: 'og:image', content: logoUrl });
          this.meta.updateTag({ property: 'twitter:image', content: logoUrl });
        }
      }
    });
  }

  ngOnInit(): void {
    // initFlowbite handled in HeaderComponent/Layout

    // 🔥 Cargar configuración una sola vez al inicio de la app
    this.systemConfigService.getConfig();
  }
}
