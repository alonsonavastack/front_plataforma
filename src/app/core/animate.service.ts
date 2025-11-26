import { AnimationCallbackEvent, Injectable } from "@angular/core";
// animación
import { animate } from "animejs";

@Injectable({ providedIn: "root" })
export class AnimateService {
  // login
  animateFadeInLogin(element: AnimationCallbackEvent) {
    animate(element, {
      translateX: [30, 0],
      opacity: [0, 1],
      duration: 600,
      easing: "easeOutCubic",
      delay: 100, // Pequeño delay para asegurar que el elemento es visible
    });
  }


  // dashboard / secciones
  animateFadeInDashboard(element: AnimationCallbackEvent) {
    animate(element, {
      translateY: [30, 0],
      opacity: [0, 1],
      duration: 600,
      easing: "easeOutCubic",
      delay: 100, // Pequeño delay para asegurar que el elemento es visible
    });
  }
  // Modal Animations
  animateModalEnter(backdrop: HTMLElement, modal: HTMLElement) {
    // Backdrop fade in
    animate(backdrop, {
      opacity: [0, 1],
      duration: 300,
      easing: 'easeOutQuad'
    });

    // Modal scale and fade in
    animate(modal, {
      opacity: [0, 1],
      scale: [0.95, 1],
      translateY: [10, 0],
      duration: 300,
      easing: 'easeOutCubic',
      delay: 50
    });
  }

  animateModalLeave(backdrop: HTMLElement, modal: HTMLElement): Promise<void> {
    const p1 = new Promise<void>(resolve => {
      animate(backdrop, {
        opacity: [1, 0],
        duration: 200,
        easing: 'easeInQuad',
        complete: () => resolve()
      });
    });

    const p2 = new Promise<void>(resolve => {
      animate(modal, {
        opacity: [1, 0],
        scale: [1, 0.95],
        translateY: [0, 10],
        duration: 200,
        easing: 'easeInCubic',
        complete: () => resolve()
      });
    });

    return Promise.all([p1, p2]).then(() => { });
  }
}
