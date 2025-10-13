import { Component, Input, Output, EventEmitter, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Project } from '../../core/models/home.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-projects-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './projects-card.html',
  styleUrl: './projects-card.css'
})
export class ProjectsCard implements OnInit {
  @Input({ required: true }) project!: Project;
  @Input() isPurchased: boolean = false;
  @Input() isInCart: boolean = false;

  @Output() addToCart = new EventEmitter<Project>();
  @Output() openVideo = new EventEmitter<string>();

  ngOnInit(): void {
    // Imprime los datos del proyecto en la consola cuando el componente se inicializa.

  }

  // Construye la URL de la imagen del proyecto
  imageUrl = computed(() => {
    if (!this.project?.imagen) {
      return 'https://via.placeholder.com/400x250.png?text=Proyecto';
    }
    return `${environment.url}project/imagen-project/${this.project.imagen}`;
  });

  // Emite el evento para añadir al carrito
  onAddToCart(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.addToCart.emit(this.project);
  }

  // Emite el evento para abrir el modal de video
  onOpenVideo(event: MouseEvent): void {
    event.preventDefault();
    if (this.project.url_video) {
      this.openVideo.emit(this.project.url_video);
    }
  }
}
