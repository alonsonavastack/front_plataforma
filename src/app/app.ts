import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnimateService } from './core/animate.service';
import { initFlowbite } from 'flowbite';
import { ToastContainerComponent } from './shared/toast-container/toast-container.component';
import { ModalComponent } from './shared/components/modal/modal.component';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, ModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  animate = inject(AnimateService);
  year = signal(new Date().getFullYear());

  ngOnInit(): void {
    initFlowbite();
  }
}
