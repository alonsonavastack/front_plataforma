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
}
