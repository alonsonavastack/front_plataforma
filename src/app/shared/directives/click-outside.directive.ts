import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

/**
 * Directiva que detecta clics fuera del elemento host
 * y emite un evento para cerrar menús, dropdowns, etc.
 * 
 * Uso:
 * <div (clickOutside)="closeMenu()">
 *   <!-- Contenido del menú -->
 * </div>
 */
@Directive({
  selector: '[clickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    
    if (!clickedInside) {
      this.clickOutside.emit();
    }
  }
}
