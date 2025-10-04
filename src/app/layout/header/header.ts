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
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  authService = inject(AuthService);
  cartService = inject(CartService);
  router = inject(Router);
  animate = inject(AnimateService);

  @ViewChild('headerElement') headerEl!: ElementRef<AnimationCallbackEvent>;

  constructor() {}

  ngAfterViewInit(): void {
    if (this.headerEl) {
      this.animate.animateFadeInDashboard(this.headerEl.nativeElement);
    }

    if (!this.isOnAuthPage()) {
      setTimeout(() => {
        initFlowbite();
      }, 0);
    }

    const drawer = document.getElementById('drawer-navigation');
    if (drawer && drawer.classList.contains('transform-none')) {
      drawer.classList.remove('transform-none');
      drawer.classList.add('-translate-x-full');
    }
  }

  ngOnDestroy(): void {
    const backdrop = document.querySelector('[drawer-backdrop]');
    backdrop?.remove();
  }

  isProfileMenuOpen = signal(false);
  toggleProfileMenu() { this.isProfileMenuOpen.update(v => !v); }
  logout() { this.authService.logout(); this.isProfileMenuOpen.set(false); }

  isOnAuthPage = computed(() => {
    const url = this.router.url;
    return url.includes('/login') || url.includes('/register');
  });

  buildImage(part: string | null | undefined): string {
    if (!part) return 'https://picsum.photos/seed/fallback-cart/200/200';
    const p = String(part).trim();
    if (/^https?:\/\//i.test(p) || p.startsWith('/api/')) return p;
    return `${environment.url}${p}`;
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

  // Nuevo método para ir al checkout y cerrar el drawer del carrito
  goToCheckout(): void {
    this.cartService.toggleDrawer(); // Cierra el drawer
    this.router.navigate(['/checkout']);
  }
}
