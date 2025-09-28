import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { AnimateService } from '../../core/animate.service';
import { initFlowbite } from 'flowbite';

@Component({
  standalone: true,
  selector: 'app-topbar',
  imports: [CommonModule, RouterLink],
  templateUrl: './topbar.html',
})
export class TopbarComponent implements AfterViewInit {
  authService = inject(AuthService);
  router = inject(Router);
  animate = inject(AnimateService);
  isSidebarCollapsed = input.required<boolean>();
  toggleSidebar = output(); // Making this optional

  // Lógica para el menú de perfil
  isProfileMenuOpen = signal(false);
  toggleProfileMenu() {
    this.isProfileMenuOpen.update(v => !v);
  }

  logout() {
    this.authService.logoutClient(); // El servicio ya se encarga de la redirección.
  }

  // Devuelve el enlace de perfil correcto según el rol del usuario.
  getProfileLink(): string {
    const role = this.authService.currentUser()?.rol;
    if (role === 'admin') {
      return '/profile-admin';
    } else if (role === 'instructor') {
      return '/profile-instructor';
    }
    return '/profile-student';
  }

  ngAfterViewInit(): void {}
}
