import { Component, inject, signal } from '@angular/core';
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

  ngOnInit(): void {
    initFlowbite();

    // 🔥 Cargar configuración una sola vez al inicio de la app
    this.systemConfigService.getConfig();
  }
}
