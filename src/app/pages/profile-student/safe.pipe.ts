import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Pipe({
  name: 'safe',
  standalone: true,
})
export class SafePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(url: string | undefined | null): SafeResourceUrl {
    if (!url) {
      return ''; // Devuelve una cadena vacía si la URL es nula o indefinida
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
