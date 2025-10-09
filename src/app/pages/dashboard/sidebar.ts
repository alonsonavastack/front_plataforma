import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavId, NavItem } from "./nav.types";

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  selected = input<NavId>('overview');
  isCollapsed = input.required<boolean>();
  navigate = output<NavId>();
  items = input.required<NavItem[]>();
}
