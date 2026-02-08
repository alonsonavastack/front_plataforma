import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SystemConfigService } from '../../../core/services/system-config.service';

@Component({
    selector: 'app-cookie-banner',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './cookie-banner.component.html'
})
export class CookieBannerComponent implements OnInit {
    private configService = inject(SystemConfigService);

    showBanner = signal<boolean>(false);

    ngOnInit() {
        // Verificar si ya existe una decisión
        const consent = localStorage.getItem('cookie_consent');

        // Solo mostrar si no hay decisión guardada ('true' o 'false')
        if (consent === null) {
            // Pequeño delay para no tapar contenido inmediatamente
            setTimeout(() => {
                this.showBanner.set(true);
            }, 1000);
        }
    }

    accept() {
        // Guardar consentimiento
        localStorage.setItem('cookie_consent', 'true');
        this.showBanner.set(false);

        // Notificar al servicio para que inicie el caché
        this.configService.enableCache();
    }

    decline() {
        // Guardar rechazo (para no volver a preguntar)
        localStorage.setItem('cookie_consent', 'false');
        this.showBanner.set(false);

        // Limpiar cualquier caché existente por seguridad
        this.configService.clearCache();
    }
}
