import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[clickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent): void {
    const clickedElement = event.target as HTMLElement;
    const clickedInside = this.elementRef.nativeElement.contains(clickedElement);
    const isExternalInteractive = clickedElement.closest('app-conversion-bar') !== null;
    
    if (!clickedInside && !isExternalInteractive) {
      this.clickOutside.emit();
    }
  }
}
