import { Component, Output, EventEmitter, computed, OnInit, inject, output, ChangeDetectionStrategy, Input, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Project } from '../../core/models/home.models';
import { environment } from '../../../environments/environment';
import { PurchasesService } from '../../core/services/purchases.service';
import { AuthService } from '../../core/services/auth';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyService } from '../../services/currency.service';

import { MxnCurrencyPipe } from '../pipes/mxn-currency.pipe';

@Component({
  selector: 'app-projects-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MxnCurrencyPipe],
  templateUrl: './projects-card.html',
  styleUrls: ['./projects-card.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectsCardComponent implements OnInit {
  // ✅ Modern input API
  project = input.required<Project>();

  @Output() openVideo = new EventEmitter<string>();

  // 🔥 Output para compra directa
  buyNowClick = output<Project>();

  private purchasesService = inject(PurchasesService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  public currencyService = inject(CurrencyService);

  ngOnInit(): void {
    // Componente inicializado
  }

  // Construye la URL de la imagen del proyecto
  imageUrl = computed(() => {
    const p = this.project();
    if (!p?.imagen) {
      return 'https://via.placeholder.com/400x250.png?text=Proyecto';
    }
    return `${environment.images.project}${p.imagen}`;
  });

  // Obtener nombre del instructor
  instructor = computed(() => {
    const u = this.project()?.user;
    const name = (u && typeof u === 'object')
      ? [u['name'], u['surname']].filter(Boolean).join(' ')
      : '';
    return name || undefined;
  });

  // Verificar si ya fue comprado
  isPurchased = computed(() => {
    const p = this.project();
    return p?._id ? this.purchasesService.isPurchased(p._id) : false;
  });

  // 🔥 Precio del proyecto
  price = computed(() => {
    const p = this.project();
    if (p?.discount_active && p?.final_price_mxn !== undefined) {
      return p.final_price_mxn;
    }
    return p?.price_mxn || 0;
  });

  // 🔥 Método actualizado para emitir evento de compra
  buyNow(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    const p = this.project();
    if (!p?._id || this.isPurchased()) return;

    if (!this.authService.isLoggedIn()) {
      this.toast.error('Debes iniciar sesión para comprar');
      return;
    }

    this.buyNowClick.emit(p);
  }

  // Emite el evento para abrir el modal de video
  onOpenVideo(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation(); // 🔥 Stop bubbling to host
    const p = this.project();
    if (p?.url_video) {
      this.openVideo.emit(p.url_video);
    }
  }
}

// 🔥 Export alternativo para compatibilidad
export { ProjectsCardComponent as ProjectsCard };
