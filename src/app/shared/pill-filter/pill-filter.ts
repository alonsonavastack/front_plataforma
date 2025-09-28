import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'pill-filter',
  templateUrl: './pill-filter.html',
})
export class PillFilterComponent {
  active = input<boolean>(false);
}
