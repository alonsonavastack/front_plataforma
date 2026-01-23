import { Component, Output, EventEmitter, computed, inject, output, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Project } from '../../core/models/home.models';
import { environment } from '../../../environments/environment';
import { PurchasesService } from '../../core/services/purchases.service';
import { AuthService } from '../../core/services/auth';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyService } from '../../services/currency.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MxnCurrencyPipe } from '../pipes/mxn-currency.pipe';

@Component({
  selector: 'app-projects-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MxnCurrencyPipe, FormsModule],
  templateUrl: './projects-card.html',
  styleUrls: ['./projects-card.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectsCardComponent {
  // ✅ Modern input API
  project = input.required<Project>();

  @Output() openVideo = new EventEmitter<string>();

  // 🔥 Output para compra directa
  buyNowClick = output<Project>();

  // 🔥 Output para ver detalles
  openDetail = output<Project>();

  private purchasesService = inject(PurchasesService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  public currencyService = inject(CurrencyService);
  private http = inject(HttpClient);

  // 🔥 States para el modal de notas
  showNotesModal = signal(false);
  noteText = signal('');
  isSavingNote = signal(false);

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

  // 🔥 Verificar si el proyecto está en borrador
  isDraft = computed(() => this.project()?.state === 1);

  // 🔥 Verificar si el usuario actual es admin
  isAdmin = computed(() => this.authService.user()?.rol === 'admin');

  // 🔥 Verificar si el usuario es el propietario del proyecto
  isOwner = computed(() => {
    const p = this.project();
    const user = this.authService.user();
    if (!p?.user || !user) return false;
    // Manejar caso donde user puede ser string (ID) u objeto User
    const projectUserId = typeof p.user === 'string' ? p.user : (p.user as any)?._id;
    return projectUserId === user._id;
  });

  // 🔥 Puede ver/agregar notas si es admin o propietario
  canManageNotes = computed(() => (this.isAdmin() || this.isOwner()) && this.isDraft());

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

  // Emite evento para ver detalles
  onOpenDetail(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const p = this.project();
    if (p) {
      this.openDetail.emit(p);
    }
  }

  // 🔥 Abrir modal de notas
  openNotesModal(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Cargar nota existente si la hay
    if (this.project()?.admin_notes) {
      this.noteText.set(this.project().admin_notes || '');
    } else {
      this.noteText.set('');
    }

    this.showNotesModal.set(true);
  }

  // 🔥 Cerrar modal de notas
  closeNotesModal(): void {
    this.showNotesModal.set(false);
    this.noteText.set('');
  }

  // 🔥 Guardar nota
  saveNote(): void {
    const p = this.project();
    if (!p?._id) return;

    this.isSavingNote.set(true);

    this.http.put(`${environment.url}projects/${p._id}/note`, {
      admin_notes: this.noteText()
    }).subscribe({
      next: () => {
        this.toast.success('Nota guardada', 'La nota se actualizó correctamente');
        this.closeNotesModal();
        this.isSavingNote.set(false);
        // Actualizar el proyecto con la nueva nota
        if (this.project()) {
          (this.project() as any).admin_notes = this.noteText();
        }
      },
      error: (err) => {
        this.toast.error('Error', 'No se pudo guardar la nota');
        this.isSavingNote.set(false);
      }
    });
  }
}

