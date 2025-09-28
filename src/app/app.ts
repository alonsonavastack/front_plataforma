import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnimateService } from './core/animate.service';
import { initFlowbite } from 'flowbite'


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
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
