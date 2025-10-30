import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, input, output, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { AnimateService } from '../../core/animate.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { BankNotificationsService } from '../../core/services/bank-notifications.service';
import { ReviewNotificationsService } from '../../core/services/review-notifications.service';
import { SystemConfigService } from '../../core/services/system-config.service'; // 🔥 NUEVO
import { ClickOutsideDirective } from '../../shared/directives/click-outside.directive';
import { initFlowbite } from 'flowbite';

@Component({
  standalone: true,
  selector: 'app-topbar',
  imports: [CommonModule, RouterLink, ClickOutsideDirective],
  templateUrl: './topbar.html',
})
export class TopbarComponent implements OnInit, OnDestroy, AfterViewInit {
  authService = inject(AuthService);
  router = inject(Router);
  animate = inject(AnimateService);
  notificationsService = inject(NotificationsService);
  bankNotificationsService = inject(BankNotificationsService);
  reviewNotificationsService = inject(ReviewNotificationsService);
  systemConfigService = inject(SystemConfigService); // 🔥 NUEVO
  
  isSidebarCollapsed = input.required<boolean>();
  toggleSidebar = output(); // Making this optional

  // Lógica para el menú de perfil
  isProfileMenuOpen = signal(false);
  
  // Lógica para el menú de notificaciones de ventas
  isNotificationsMenuOpen = signal(false);
  
  // Lógica para el menú de notificaciones bancarias
  isBankNotificationsMenuOpen = signal(false);
  
  // Lógica para el menú de notificaciones de reviews (instructores)
  isReviewNotificationsMenuOpen = signal(false);
  
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
    if (this.isBankNotificationsMenuOpen()) this.isBankNotificationsMenuOpen.set(false);
    
    // Cargar notificaciones cuando se abre el menú
    if (this.isNotificationsMenuOpen()) {
      console.log('🔔 Abriendo menú de notificaciones de ventas');
      this.notificationsService.loadNotifications().subscribe({
        next: () => console.log('✅ Notificaciones cargadas al abrir menú'),
        error: (err) => console.error('❌ Error al cargar notificaciones:', err)
      });
      this.notificationsService.markAllAsRead();
    }
  }
  
  toggleBankNotificationsMenu() {
    this.isBankNotificationsMenuOpen.update(v => !v);
    // Cerrar otros menús
    if (this.isProfileMenuOpen()) this.isProfileMenuOpen.set(false);
    if (this.isNotificationsMenuOpen()) this.isNotificationsMenuOpen.set(false);
    if (this.isReviewNotificationsMenuOpen()) this.isReviewNotificationsMenuOpen.set(false);
    
    // Cargar notificaciones bancarias cuando se abre el menú
    if (this.isBankNotificationsMenuOpen()) {
      console.log('🏦 Abriendo menú de notificaciones bancarias');
      this.bankNotificationsService.loadNotifications();
    }
  }
  
  toggleReviewNotificationsMenu() {
    this.isReviewNotificationsMenuOpen.update(v => !v);
    // Cerrar otros menús
    if (this.isProfileMenuOpen()) this.isProfileMenuOpen.set(false);
    if (this.isNotificationsMenuOpen()) this.isNotificationsMenuOpen.set(false);
    if (this.isBankNotificationsMenuOpen()) this.isBankNotificationsMenuOpen.set(false);
    
    // Cargar notificaciones de reviews cuando se abre el menú
    if (this.isReviewNotificationsMenuOpen()) {
      console.log('💬 Abriendo menú de notificaciones de reviews');
      this.reviewNotificationsService.loadNotifications();
    }
  }
  
  reloadNotifications() {
    console.log('🔄 Recargando notificaciones manualmente...');
    this.notificationsService.loadNotifications().subscribe({
      next: () => console.log('✅ Notificaciones recargadas exitosamente'),
      error: (err) => console.error('❌ Error al recargar notificaciones:', err)
    });
  }
  
  /**
   * 🔥 NUEVO: Marcar todas las notificaciones de reviews como leídas
   */
  markAllReviewsAsRead() {
    console.log('🧹 Marcando todas las notificaciones de reviews como leídas...');
    
    if (confirm('¿Estás seguro de marcar todas las reviews como leídas? Esta acción no se puede deshacer.')) {
      this.reviewNotificationsService.markAllAsRead();
      
      // Mostrar feedback al usuario
      console.log('✅ Todas las notificaciones marcadas como leídas');
      
      // Opcional: Cerrar el menú
      // this.isReviewNotificationsMenuOpen.set(false);
    }
  }

  /**
   * Navega a la sección de ventas con el filtro de estado aplicado
   */
  goToSalesWithStatus(status: string, saleId?: string) {
    console.log('📍 Navegando a ventas con filtro:', status, 'ID:', saleId);
    
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

  ngOnInit(): void {
    // 🔥 Cargar configuración del sistema
    this.systemConfigService.getConfig();
    
    const user = this.authService.user();
    
    // Admin: WebSocket ventas + Polling bancario
    if (user?.rol === 'admin') {
      console.log('👨‍💼 Usuario admin detectado, iniciando servicios...');
      
      // Iniciar notificaciones de ventas (WebSocket)
      this.notificationsService.startWebSocket(user._id, user.rol);
      this.notificationsService.loadNotifications().subscribe({
        next: () => console.log('✅ Notificaciones de ventas cargadas'),
        error: (err) => console.error('❌ Error al cargar notificaciones de ventas:', err)
      });
      
      // Iniciar notificaciones bancarias (Polling)
      this.bankNotificationsService.startPolling();
    }
    
    // Instructor: Polling de reviews sin respuesta
    if (user?.rol === 'instructor') {
      console.log('👨‍🏫 Usuario instructor detectado, iniciando notificaciones de reviews...');
      this.reviewNotificationsService.startPolling();
    }
  }
  
  ngOnDestroy(): void {
    // Desconectar WebSocket y limpiar notificaciones al destruir el componente
    console.log('🛑 Componente destruido, deteniendo servicios...');
    this.notificationsService.stopWebSocket();
    this.notificationsService.clearNotifications();
    this.bankNotificationsService.stopPolling();
    this.reviewNotificationsService.stopPolling();
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

  ngAfterViewInit(): void {}
}
