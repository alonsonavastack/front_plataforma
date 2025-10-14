import { Component, Input, Output, EventEmitter, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Project } from '../../core/models/home.models';
import { environment } from '../../../environments/environment';
import { PurchasesService } from '../../core/services/purchases.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-projects-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './projects-card.html',
  styleUrl: './projects-card.css'
})
export class ProjectsCard implements OnInit {
  @Input({ required: true }) project!: Project;
  @Output() openVideo = new EventEmitter<string>();

  private purchasesService = inject(PurchasesService);
  private cartService = inject(CartService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    // Componente inicializado
  }

  // Construye la URL de la imagen del proyecto
  imageUrl = computed(() => {
    if (!this.project?.imagen) {
      return 'https://via.placeholder.com/400x250.png?text=Proyecto';
    }
    return `${environment.url}project/imagen-project/${this.project.imagen}`;
  });

  // Verificar si ya fue comprado
  isPurchased = computed(() => {
    return this.project?._id ? this.purchasesService.isPurchased(this.project._id) : false;
  });

  // Verificar si está en el carrito
  isInCart = computed(() => {
    if (!this.project?._id) return false;
    return this.cartService.items().some(item =>
      item.product._id === this.project._id && item.product_type === 'project'
    );
  });

  // Agregar al carrito
  addToCart(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    if (!this.project._id || this.isPurchased() || this.isInCart()) return;

    if (!this.authService.isLoggedIn()) {
      alert('Debes iniciar sesión para agregar al carrito');
      return;
    }

    this.cartService.addToCart(this.project, 'project');
  }

  // Emite el evento para abrir el modal de video
  onOpenVideo(event: MouseEvent): void {
    event.preventDefault();
    if (this.project.url_video) {
      this.openVideo.emit(this.project.url_video);
    }
  }
}
