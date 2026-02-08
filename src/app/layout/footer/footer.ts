import { Component, computed, inject, OnInit, output } from '@angular/core';

import { RouterLink } from '@angular/router';
import { SystemConfigService } from '../../core/services/system-config.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html'
})
export class FooterComponent implements OnInit {
  systemConfigService = inject(SystemConfigService);
  currentYear = new Date().getFullYear();

  // 🆕 Output para emitir eventos al componente padre
  openLegalModalEvent = output<'privacy' | 'terms'>();

  // Computed signals para datos del sistema
  siteName = computed(() => this.systemConfigService.config()?.siteName || 'Dev Hub Sharks');
  siteDescription = computed(() => this.systemConfigService.config()?.siteDescription || 'Plataforma de cursos online');
  siteLogo = computed(() => {
    const logo = this.systemConfigService.config()?.logo;
    return logo ? `${environment.url}system-config/logo/${logo}` : null;
  });

  // Información de contacto
  email = computed(() => this.systemConfigService.config()?.email || '');
  phone = computed(() => this.systemConfigService.config()?.phone || '');
  supportEmail = computed(() => this.systemConfigService.config()?.supportEmail || '');

  // Redes sociales con tipo correcto
  socialMedia = computed(() => this.systemConfigService.config()?.socialMedia || {
    facebook: '',
    instagram: '',
    youtube: '',
    tiktok: '',
    twitch: '',
    twitter: '',
    linkedin: '',
    website: ''
  });

  // Computed para verificar si hay redes sociales
  hasSocialMedia = computed(() => {
    const social = this.socialMedia();
    return !!(
      social.facebook ||
      social.instagram ||
      social.youtube ||
      social.tiktok ||
      social.twitch ||
      social.twitter ||
      social.linkedin ||
      social.website
    );
  });

  ngOnInit(): void {
    // Cargar configuración al iniciar

  }

  // 🆕 Método para abrir modal desde footer
  openLegalModal(type: 'privacy' | 'terms'): void {
    this.openLegalModalEvent.emit(type);
  }
}
