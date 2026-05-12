import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, input, output, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { AnimateService } from '../../core/animate.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { ReviewNotificationsService } from '../../core/services/review-notifications.service';
import { RefundNotificationsService } from '../../core/services/refund-notifications.service';
import { SystemConfigService } from '../../core/services/system-config.service';
import { TaxNotificationsService } from '../../core/services/tax-notifications.service'; // Added Import
import { ClickOutsideDirective } from '../../shared/directives/click-outside.directive';
import { initFlowbite } from 'flowbite';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-topbar',
  imports: [CommonModule, RouterLink, ClickOutsideDirective],
  templateUrl: './topbar.html',
})
export class TopbarComponent implements OnInit, OnDestroy, AfterViewInit {
  authService = inject(AuthService);
  private toast = inject(ToastService);
  router = inject(Router);
  animate = inject(AnimateService);
  notificationsService = inject(NotificationsService);
  reviewNotificationsService = inject(ReviewNotificationsService);
  refundNotificationsService = inject(RefundNotificationsService);
  systemConfigService = inject(SystemConfigService);
  // Servicio de notificaciones fiscales
  taxNotificationsService = inject(TaxNotificationsService);

  isSidebarCollapsed = input.required<boolean>();
  toggleSidebar = output<void>();

  // Lógica para el menú de perfil
  isProfileMenuOpen = signal(false);

  // Lógica para el menú de notificaciones de ventas
  isNotificationsMenuOpen = signal(false);

  // Lógica para el menú de notificaciones de reviews (instructores)
  isReviewNotificationsMenuOpen = signal(false);

  // Lógica para el menú de notificaciones de reembolsos (admin/instructor)
  isRefundNotificationsMenuOpen = signal(false);

  toggleProfileMenu() {
    this.isProfileMenuOpen.update(v => !v);
    // Cerrar notificaciones si están abiertas
    if (this.isNotificationsMenuOpen()) {
      this.isNotificationsMenuOpen.set(false);
    }
  }

  toggleNotificationsMenu() {
    this.isNotificationsMenuOpen.update(v => !v);
    // Cerrar otros menús
    if (this.isProfileMenuOpen()) this.isProfileMenuOpen.set(false);

    // Cargar notificaciones cuando se abre el menú
    if (this.isNotificationsMenuOpen()) {
      this.notificationsService.loadNotifications().subscribe({
        error: (err) => this.toast.error('❌ Error al cargar notificaciones:', err)
      });
      this.notificationsService.markAllAsRead();
    }
  }

  toggleReviewNotificationsMenu() {
    this.isReviewNotificationsMenuOpen.update(v => !v);
    // Cerrar otros menús
    if (this.isProfileMenuOpen()) this.isProfileMenuOpen.set(false);
    if (this.isNotificationsMenuOpen()) this.isNotificationsMenuOpen.set(false);
    if (this.isRefundNotificationsMenuOpen()) this.isRefundNotificationsMenuOpen.set(false);

    // Cargar notificaciones de reviews cuando se abre el menú
    if (this.isReviewNotificationsMenuOpen()) {
      this.reviewNotificationsService.loadNotifications();
    }
  }

  toggleRefundNotificationsMenu() {
    this.isRefundNotificationsMenuOpen.update(v => !v);
    // Cerrar otros menús
    if (this.isProfileMenuOpen()) this.isProfileMenuOpen.set(false);
    if (this.isNotificationsMenuOpen()) this.isNotificationsMenuOpen.set(false);
    if (this.isReviewNotificationsMenuOpen()) this.isReviewNotificationsMenuOpen.set(false);

    // Cargar notificaciones de reembolsos cuando se abre el menú
    if (this.isRefundNotificationsMenuOpen()) {
      this.refundNotificationsService.loadNotifications();
    }
  }

  /**
   * 🆕 Navegar a reembolsos con filtro
   */
  goToRefunds(refundId?: string) {


    // Cerrar el menú
    this.isRefundNotificationsMenuOpen.set(false);

    // Navegar a dashboard con query params
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'refunds',
        ...(refundId && { refundId })
      }
    });
  }

  reloadNotifications() {
    this.notificationsService.loadNotifications().subscribe({

    });
  }

  /**
   * 🔥 NUEVO: Marcar todas las notificaciones de reviews como leídas
   */
  markAllReviewsAsRead() {

    if (confirm('¿Estás seguro de marcar todas las reviews como leídas? Esta acción no se puede deshacer.')) {
      this.reviewNotificationsService.markAllAsRead();

    }
  }

  /**
   * Navega a la sección de ventas con el filtro de estado aplicado
   */
  goToSalesWithStatus(status: string, saleId?: string) {

    // Cerrar el menú de notificaciones
    this.isNotificationsMenuOpen.set(false);

    // Navegar a dashboard con query params
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'sales',
        status: status,
        saleId: saleId
      }
    });
  }

  /**
   * 🖼️ Construye la URL correcta para el avatar del usuario
   */
  buildAvatarUrl(avatar?: string, name?: string, surname?: string, email?: string): string {
    const buildInitials = () => {
      const fullName = `${name || ''} ${surname || ''}`.trim();
      if (fullName) {
        const parts = fullName.split(/\s+/);
        const initials = parts.length === 1
          ? parts[0].charAt(0)
          : `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`;
        return initials.toUpperCase();
      }

      if (email) {
        const local = email.split('@')[0];
        const parts = local.split(/[._\-]/).filter(Boolean);
        const initials = parts.length
          ? parts.map(part => part.charAt(0)).join('').slice(0, 2)
          : local.charAt(0);
        return initials.toUpperCase();
      }

      return 'U';
    };

    if (!avatar) {
      const initials = buildInitials();
      return `https://ui-avatars.com/api/?name=${initials}&background=random&color=fff`;
    }

    // Si el avatar ya es una URL completa, devolverla tal cual
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }

    // Construir URL completa desde el backend
    return `${environment.images.user}${avatar}`;
  }

  ngOnInit(): void {
    const user = this.authService.user();

    // Admin: WebSocket ventas
    if (user?.rol === 'admin') {
      // Iniciar notificaciones de ventas (WebSocket)
      this.notificationsService.startWebSocket(user._id, user.rol);
      this.notificationsService.loadNotifications().subscribe();
    }

    // Instructor: Polling de reviews sin respuesta
    if (user?.rol === 'instructor') {
      this.reviewNotificationsService.startPolling();
      this.refundNotificationsService.startPolling();
    }

    // Admin: Polling de reembolsos
    if (user?.rol === 'admin') {
      this.refundNotificationsService.startPolling();
      this.taxNotificationsService.startPolling();
    }
  }

  ngOnDestroy(): void {
    // Desconectar WebSocket y limpiar notificaciones al destruir el componente
    this.notificationsService.stopWebSocket();
    this.notificationsService.clearNotifications();
    this.reviewNotificationsService.stopPolling();
    this.refundNotificationsService.stopPolling();
  }

  logout() {
    this.authService.logout(); // El servicio ya se encarga de la redirección.
  }

  // Devuelve el enlace de perfil correcto según el rol del usuario.
  getProfileLink(): string {
    const role = this.authService.user()?.rol;
    if (role === 'admin') {
      return '/profile-admin';
    } else if (role === 'instructor') {
      return '/profile-instructor';
    }
    return '/profile-student';
  }

  ngAfterViewInit(): void { }
}
