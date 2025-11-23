import { Component, input, output } from '@angular/core';

import { NavId, NavItem } from "./nav.types";

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.html',
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }
  `]
})
export class SidebarComponent {
  selected = input<NavId>('sales');
  isCollapsed = input.required<boolean>();
  navigate = output<NavId>();
  items = input.required<NavItem[]>();
}
