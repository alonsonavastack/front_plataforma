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
import { SeoService } from './core/services/seo.service'; // 🆕

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, ModalComponent, CookieBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  systemConfigService = inject(SystemConfigService);
  private document = inject(DOCUMENT);
  private seoService = inject(SeoService); // 🆕
  // private meta = inject(Meta); // Usado internamente por SeoService
  // private title = inject(Title); // Usado internamente por SeoService

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
        // 🔥 Usar SeoService para configurar defaults
        const siteName = config.siteName || 'Dev Hub Sharks'; // Singular para SEO

        // Si hay logo urls, usarlas
        if (config.logo) {
          logoUrl = this.systemConfigService.buildLogoUrl(config.logo);
        }

        this.seoService.setSeo({
          title: siteName,
          image: logoUrl // Si es vacío, el servicio usará el default
        });
      }
    });
  }

  ngOnInit(): void {
    // initFlowbite handled in HeaderComponent/Layout

    // 🔥 Cargar configuración una sola vez al inicio de la app
    this.systemConfigService.getConfig();

    // 🆕 Detectar callback de PayPal (si la URL tiene ?code=... redirigir al dashboard)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      // Estamos volviendo de PayPal, redirigir al componente que procesa el pago
      // Manteniendo los query params
      // Usamos window.location.hash para redirigir correctamente si usamos HashLocationStrategy
      // O router.navigate si ya estamos en contexto angular
      // Dado que HashStrategy ignora search params fuera del hash, los movemos ADENTRO
      console.log('🔄 PayPal Callback detectado, redirigiendo al dashboard...');

      // Construir nueva URL: /#/dashboard?section=instructor-payment-config&code=...&state=...
      const newUrl = `#/dashboard?section=instructor-payment-config&code=${code}&state=${state}`;

      // Forzar redirección limpia
      window.location.href = newUrl;
    }
  }
}
