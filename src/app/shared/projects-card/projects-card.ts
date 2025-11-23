import { Component, Input, Output, EventEmitter, computed, OnInit, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Project } from '../../core/models/home.models';
import { environment } from '../../../environments/environment';
import { PurchasesService } from '../../core/services/purchases.service';
import { AuthService } from '../../core/services/auth';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-projects-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './projects-card.html',
  styleUrl: './projects-card.css'
})
export class ProjectsCard implements OnInit {
  @Input({ required: true }) project!: Project;
  @Output() openVideo = new EventEmitter<string>();
  
  // 🔥 Output para compra directa
  buyNowClick = output<Project>();

  private purchasesService = inject(PurchasesService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  ngOnInit(): void {
    // Componente inicializado
  }

  // Construye la URL de la imagen del proyecto
  imageUrl = computed(() => {
    if (!this.project?.imagen) {
      return 'https://via.placeholder.com/400x250.png?text=Proyecto';
    }
    return `${environment.images.project}${this.project.imagen}`; // ✅ Usar environment.images.project
  });

  // Obtener nombre del instructor
  instructor = computed(() => {
    const u = this.project?.user;
    const name = (u && typeof u === 'object')
      ? [u['name'], u['surname']].filter(Boolean).join(' ')
      : '';
    return name || undefined;
  });

  // Verificar si ya fue comprado
  isPurchased = computed(() => {
    return this.project?._id ? this.purchasesService.isPurchased(this.project._id) : false;
  });

  // 🔥 Precio del proyecto
  price = computed(() => {
    if (this.project.discount_active && this.project.final_price_usd !== undefined) {
      return this.project.final_price_usd;
    }
    return this.project.price_usd || 0;
  });

  // 🔥 Método actualizado para emitir evento de compra
  buyNow(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    if (!this.project._id || this.isPurchased()) return;

    if (!this.authService.isLoggedIn()) {
      this.toast.error('Debes iniciar sesión para comprar');
      return;
    }

    this.buyNowClick.emit(this.project);
  }

  // Emite el evento para abrir el modal de video
  onOpenVideo(event: MouseEvent): void {
    event.preventDefault();
    if (this.project.url_video) {
      this.openVideo.emit(this.project.url_video);
    }
  }
}
