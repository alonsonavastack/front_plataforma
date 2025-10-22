import { Pipe, PipeTransform } from '@angular/core';

interface SearchItem {
  item_type: string;
  // Puedes añadir otras propiedades que esperes en tus elementos de búsqueda
  // _id: string;
  // title: string;
  // ...
}

@Pipe({
  name: 'filterByType',
  standalone: true
})
export class FilterByTypePipe implements PipeTransform {
  transform(items: SearchItem[] | null | undefined, type: string): SearchItem[] {
    if (!items || !type) {
      return [];
    }
    return items.filter(item => item.item_type === type);
  }
}
