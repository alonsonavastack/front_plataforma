import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from "@angular/router";
import { NavId, NavItem } from "./nav.types";

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  selected = input<NavId>('overview');
  isCollapsed = input.required<boolean>();
  navigate = output<NavId>();
  items = input.required<NavItem[]>();
}
