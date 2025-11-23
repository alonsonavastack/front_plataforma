// src/app/shared/header/header.component.ts
import { AfterViewInit, AnimationCallbackEvent, Component, ElementRef, inject, OnDestroy, ViewChild, computed, signal, effect } from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { AnimateService } from '../../core/animate.service';
import { SystemConfigService } from '../../core/services/system-config.service';
import { WalletService } from '../../core/services/wallet.service'; // 🔥 Para billetera
import { initFlowbite } from 'flowbite';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.html',
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  authService = inject(AuthService);
  // CartService removed: purchases are direct
  walletService = inject(WalletService); // 🔥 Para billetera
  router = inject(Router);
  animate = inject(AnimateService);
  systemConfigService = inject(SystemConfigService);

  @ViewChild('headerElement') headerEl!: ElementRef<AnimationCallbackEvent>;

  // 🔥 NUEVO: Computed signals para configuración del sistema
  siteName = computed(() => this.systemConfigService.config()?.siteName || 'Dev-Sharks');
  siteLogo = computed(() => {
    const logo = this.systemConfigService.config()?.logo;
    return logo ? `${environment.url}system-config/logo/${logo}` : null;
  });

  constructor() {
    // 🔥 NUEVO: Cargar configuración al iniciar
    this.systemConfigService.getConfig();

    // 💰 Cargar saldo de billetera si el usuario está logueado
    if (this.authService.isLoggedIn()) {
      this.walletService.loadWallet();
    }
  }

  ngAfterViewInit(): void {
    if (this.headerEl) {
      this.animate.animateFadeInDashboard(this.headerEl.nativeElement);
    }

    // 🔥 SOLUCIÓN MEJORADA: Inicializar Flowbite de forma segura
    if (!this.isOnAuthPage()) {
      this.safeInitFlowbite();
    }

    // Asegurar que el drawer esté oculto al inicio
    const drawer = document.getElementById('drawer-navigation');
    if (drawer && drawer.classList.contains('transform-none')) {
      drawer.classList.remove('transform-none');
      drawer.classList.add('-translate-x-full');
    }
  }

  /**
   * 🔥 Inicialización segura de Flowbite con reintentos
   * Evita errores cuando el DOM no está completamente listo
   */
  private safeInitFlowbite(retryCount = 0): void {
    const maxRetries = 3;
    const retryDelay = 300;

    setTimeout(() => {
      try {
        // Verificar que el drawer exista antes de inicializar
        const drawer = document.getElementById('drawer-navigation');
        if (!drawer) {
          if (retryCount < maxRetries) {
            this.safeInitFlowbite(retryCount + 1);
          }
          return;
        }

        // Inicializar Flowbite solo si el drawer existe
        initFlowbite();
      } catch (error) {
        // Solo reintentar si no hemos alcanzado el máximo
        if (retryCount < maxRetries) {
          this.safeInitFlowbite(retryCount + 1);
        } else {
          // Silenciar el error después de todos los reintentos
        }
      }
    }, retryCount === 0 ? 100 : retryDelay);
  }

  ngOnDestroy(): void {
    // 🔥 Limpiar backdrop y drawer al destruir el componente
    const backdrop = document.querySelector('[drawer-backdrop]');
    backdrop?.remove();

    // Asegurar que el drawer esté cerrado
    const drawer = document.getElementById('drawer-navigation');
    if (drawer) {
      drawer.classList.remove('transform-none');
      drawer.classList.add('-translate-x-full');
    }
  }

  isProfileMenuOpen = signal(false);
  toggleProfileMenu() { this.isProfileMenuOpen.update(v => !v); }
  logout() { this.authService.logout(); this.isProfileMenuOpen.set(false); }

  isOnAuthPage = computed(() => {
    const url = this.router.url;
    return url.includes('/login') || url.includes('/register');
  });

  /**
   * Construye la URL de una imagen del carrito basándose en el item completo
   * Este método simplifica la lógica en el template
   */
  getCartItemImage(item: any): string {
    const productType = item.product_type as 'course' | 'project';
    const imagen = item.product?.imagen;

    if (!imagen) {
      return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800';
    }

    const img = String(imagen).trim();

    // Si ya es una URL completa, devolverla tal cual
    if (/^https?:\/\//i.test(img)) {
      return img;
    }

    // Construir la URL según el tipo de producto
    if (productType === 'project') {
      return `${environment.images.project}${img}`;
    }

    // Por defecto, cursos
    return `${environment.images.course}${img}`;
  }

  /**
   * Construye la URL de una imagen del carrito
   * Soporta cursos y proyectos
   */
  buildImage(imagen: string | null | undefined, productType?: 'course' | 'project'): string {
    if (!imagen) return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800';

    const img = String(imagen).trim();

    // Si ya es una URL completa, devolverla tal cual
    if (/^https?:\/\//i.test(img)) return img;

    // Si tiene /api/, asumir que es una URL relativa válida
    if (img.startsWith('/api/')) return `${environment.url.replace('/api/', '')}${img}`;

    // Usar la URL correcta según el tipo de producto
    if (productType === 'project') {
      return `${environment.images.project}${img}`;
    }

    // Por defecto, usar la URL de cursos
    return `${environment.images.course}${img}`;
  }

  getProfileLink(): string {
    const role = this.authService.user()?.rol;
    if (role === 'admin') {
      return '/profile-admin';
    } else if (role === 'instructor') {
      return '/profile-instructor';
    }
    return '/profile-student';
  }

  // Ir al checkout (no hay drawer de carrito)
  goToCheckout(): void {
    this.router.navigate(['/checkout']);
  }
}
