import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, input, output, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { AnimateService } from '../../core/animate.service';
import { NotificationsService } from '../../core/services/notifications.service';
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
  
  isSidebarCollapsed = input.required<boolean>();
  toggleSidebar = output(); // Making this optional

  // Lógica para el menú de perfil
  isProfileMenuOpen = signal(false);
  
  // Lógica para el menú de notificaciones
  isNotificationsMenuOpen = signal(false);
  
  toggleProfileMenu() {
    this.isProfileMenuOpen.update(v => !v);
    // Cerrar notificaciones si están abiertas
    if (this.isNotificationsMenuOpen()) {
      this.isNotificationsMenuOpen.set(false);
    }
  }
  
  toggleNotificationsMenu() {
    this.isNotificationsMenuOpen.update(v => !v);
    // Cerrar perfil si está abierto
    if (this.isProfileMenuOpen()) {
      this.isProfileMenuOpen.set(false);
    }
    // Cargar notificaciones cuando se abre el menú
    if (this.isNotificationsMenuOpen()) {
      console.log('🔔 Abriendo menú de notificaciones');
      this.notificationsService.loadNotifications().subscribe({
        next: () => console.log('✅ Notificaciones cargadas al abrir menú'),
        error: (err) => console.error('❌ Error al cargar notificaciones:', err)
      });
      this.notificationsService.markAllAsRead();
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
    const user = this.authService.user();
    
    // Solo conectar WebSocket si es admin
    if (user?.rol === 'admin') {
      console.log('👨‍💼 Usuario admin detectado, iniciando WebSocket...');
      this.notificationsService.startWebSocket(user._id, user.rol);
      
      // Cargar notificaciones iniciales via HTTP
      this.notificationsService.loadNotifications().subscribe({
        next: () => console.log('✅ Notificaciones iniciales cargadas'),
        error: (err) => console.error('❌ Error al cargar notificaciones iniciales:', err)
      });
    }
  }
  
  ngOnDestroy(): void {
    // Desconectar WebSocket y limpiar notificaciones al destruir el componente
    console.log('🛑 Componente destruido, deteniendo WebSocket...');
    this.notificationsService.stopWebSocket();
    this.notificationsService.clearNotifications();
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
