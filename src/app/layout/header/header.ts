// src/app/shared/header/header.component.ts
import { AfterViewInit, AnimationCallbackEvent, Component, ElementRef, inject, OnDestroy, ViewChild, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { AnimateService } from '../../core/animate.service';
import { CartService } from '../../core/services/cart.service';
import { initFlowbite } from 'flowbite';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  // La línea de styleUrls se ha eliminado
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  authService = inject(AuthService);
  cartService = inject(CartService);
  router = inject(Router); // Inyectamos el Router
  animate = inject(AnimateService);

  @ViewChild('headerElement') headerEl!: ElementRef<AnimationCallbackEvent>;

  constructor() {
    // Este efecto asegura que el componente reaccione a los cambios en la sesión del usuario.
    effect(() => {
      const user = this.authService.currentUser();
    });
  }

  ngAfterViewInit(): void {
    if (this.headerEl) {
      this.animate.animateFadeInDashboard(this.headerEl.nativeElement);
    }

    // Solo inicializamos Flowbite si no estamos en una página de autenticación,
    // ya que los componentes de Flowbite (como el drawer) no se renderizan allí.
    if (!this.isOnAuthPage()) {
      setTimeout(() => {
        initFlowbite();
      }, 0);
    }

    // Workaround para asegurar que el drawer de Flowbite se cierre al navegar
    // o al inicializar el componente en una SPA.
    const drawer = document.getElementById('drawer-navigation');
    if (drawer && drawer.classList.contains('transform-none')) {
      drawer.classList.remove('transform-none');
      drawer.classList.add('-translate-x-full');
    }
  }

  ngOnDestroy(): void {
    // Elimina el backdrop del drawer cuando el componente se destruye
    const backdrop = document.querySelector('[drawer-backdrop]');
    backdrop?.remove();
  }

  isProfileMenuOpen = signal(false); // Convertido a signal
  toggleProfileMenu() { this.isProfileMenuOpen.update(v => !v); } // Usando método de signal
  logout() { this.authService.logoutClient(); this.isProfileMenuOpen.set(false); } // Usando método de signal

  // Computed signal para saber si estamos en una página de autenticación
  isOnAuthPage = computed(() => {
    const url = this.router.url;
    return url.includes('/login') || url.includes('/register');
  });

  // Helper para construir la URL de la imagen del producto en el carrito
  buildImage(part: string | null | undefined): string {
    if (!part) return 'https://picsum.photos/seed/fallback-cart/200/200';
    const p = String(part).trim();
    // Si ya es una URL absoluta (comienza con http o /api), la devuelve directamente.
    if (/^https?:\/\//i.test(p) || p.startsWith('/api/')) return p;
    // Si no, construye la URL completa usando la base del entorno.
    return `${environment.url}${p}`;
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
}
