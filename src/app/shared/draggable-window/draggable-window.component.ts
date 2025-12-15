import { Component, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface WindowConfig {
  id: string;
  title: string;
  icon?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
}

@Component({
  selector: 'app-draggable-window',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      #windowElement
      class="draggable-window"
      [class.minimized]="config.minimized"
      [class.maximized]="config.maximized"
      [style.left.px]="config.x"
      [style.top.px]="config.y"
      [style.width.px]="config.maximized ? null : config.width"
      [style.height.px]="config.maximized ? null : config.height"
      [style.z-index]="config.zIndex"
      (mousedown)="bringToFront()">
      
      <!-- HEADER -->
      <div 
        class="window-header"
        (mousedown)="startDrag($event)">
        
        <div class="window-title">
          @if (config.icon) {
            <span class="window-icon">{{ config.icon }}</span>
          }
          <span>{{ config.title }}</span>
        </div>

        <div class="window-controls">
          <button 
            class="window-btn minimize"
            (click)="minimize($event)"
            title="Minimizar">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <line x1="0" y1="6" x2="12" y2="6" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>

          <button 
            class="window-btn maximize"
            (click)="toggleMaximize($event)"
            [title]="config.maximized ? 'Restaurar' : 'Maximizar'">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>

          <button 
            class="window-btn close"
            (click)="close($event)"
            title="Cerrar">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <line x1="0" y1="0" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="0" x2="0" y2="12" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- CONTENT -->
      <div class="window-content">
        <ng-content></ng-content>
      </div>

      <!-- RESIZE HANDLES -->
      @if (!config.maximized) {
        <div class="resize-handle resize-n" (mousedown)="startResize($event, 'n')"></div>
        <div class="resize-handle resize-s" (mousedown)="startResize($event, 's')"></div>
        <div class="resize-handle resize-e" (mousedown)="startResize($event, 'e')"></div>
        <div class="resize-handle resize-w" (mousedown)="startResize($event, 'w')"></div>
        <div class="resize-handle resize-ne" (mousedown)="startResize($event, 'ne')"></div>
        <div class="resize-handle resize-nw" (mousedown)="startResize($event, 'nw')"></div>
        <div class="resize-handle resize-se" (mousedown)="startResize($event, 'se')"></div>
        <div class="resize-handle resize-sw" (mousedown)="startResize($event, 'sw')"></div>
      }
    </div>
  `,
  styles: [`
    .draggable-window {
      position: fixed;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: box-shadow 0.2s;
    }

    .draggable-window:hover {
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }

    .draggable-window.minimized {
      display: none;
    }

    .draggable-window.maximized {
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      height: 100% !important;
      border-radius: 0;
    }

    /* HEADER */
    .window-header {
      background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
      user-select: none;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .window-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #e2e8f0;
      font-size: 14px;
    }

    .window-icon {
      font-size: 18px;
    }

    .window-controls {
      display: flex;
      gap: 8px;
    }

    .window-btn {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: rgba(148, 163, 184, 0.1);
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .window-btn:hover {
      background: rgba(148, 163, 184, 0.2);
      color: #e2e8f0;
    }

    .window-btn.close:hover {
      background: #ef4444;
      color: white;
    }

    .window-btn.maximize:hover {
      background: #10b981;
      color: white;
    }

    .window-btn.minimize:hover {
      background: #f59e0b;
      color: white;
    }

    /* CONTENT */
    .window-content {
      flex: 1;
      overflow: auto;
      background: #0f172a;
    }

    /* RESIZE HANDLES */
    .resize-handle {
      position: absolute;
      background: transparent;
    }

    .resize-n, .resize-s {
      left: 8px;
      right: 8px;
      height: 8px;
      cursor: ns-resize;
    }

    .resize-n { top: 0; }
    .resize-s { bottom: 0; }

    .resize-e, .resize-w {
      top: 8px;
      bottom: 8px;
      width: 8px;
      cursor: ew-resize;
    }

    .resize-e { right: 0; }
    .resize-w { left: 0; }

    .resize-ne, .resize-nw, .resize-se, .resize-sw {
      width: 16px;
      height: 16px;
    }

    .resize-ne {
      top: 0;
      right: 0;
      cursor: nesw-resize;
    }

    .resize-nw {
      top: 0;
      left: 0;
      cursor: nwse-resize;
    }

    .resize-se {
      bottom: 0;
      right: 0;
      cursor: nwse-resize;
    }

    .resize-sw {
      bottom: 0;
      left: 0;
      cursor: nesw-resize;
    }

    /* SCROLLBAR */
    .window-content::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    .window-content::-webkit-scrollbar-track {
      background: #1e293b;
    }

    .window-content::-webkit-scrollbar-thumb {
      background: #475569;
      border-radius: 4px;
    }

    .window-content::-webkit-scrollbar-thumb:hover {
      background: #64748b;
    }
  `]
})
export class DraggableWindowComponent implements AfterViewInit {
  @Input() config!: WindowConfig;
  @Output() configChange = new EventEmitter<WindowConfig>();
  @Output() onClose = new EventEmitter<string>();
  @Output() onMinimize = new EventEmitter<string>();
  @Output() onBringToFront = new EventEmitter<string>();

  @ViewChild('windowElement') windowElement!: ElementRef;

  private isDragging = false;
  private isResizing = false;
  private resizeDirection = '';
  private dragStartX = 0;
  private dragStartY = 0;
  private initialX = 0;
  private initialY = 0;
  private initialWidth = 0;
  private initialHeight = 0;

  ngAfterViewInit() {
    this.constrainToViewport();
  }

  startDrag(event: MouseEvent) {
    if (this.config.maximized) return;

    event.preventDefault();
    event.stopPropagation();

    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.initialX = this.config.x;
    this.initialY = this.config.y;

    document.body.style.cursor = 'move';
  }

  startResize(event: MouseEvent, direction: string) {
    event.preventDefault();
    event.stopPropagation();

    this.isResizing = true;
    this.resizeDirection = direction;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.initialX = this.config.x;
    this.initialY = this.config.y;
    this.initialWidth = this.config.width;
    this.initialHeight = this.config.height;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      const deltaX = event.clientX - this.dragStartX;
      const deltaY = event.clientY - this.dragStartY;

      this.config.x = this.initialX + deltaX;
      this.config.y = this.initialY + deltaY;

      this.constrainToViewport();
      this.configChange.emit(this.config);
    }

    if (this.isResizing) {
      const deltaX = event.clientX - this.dragStartX;
      const deltaY = event.clientY - this.dragStartY;

      this.handleResize(deltaX, deltaY);
      this.configChange.emit(this.config);
    }
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.isDragging = false;
    this.isResizing = false;
    document.body.style.cursor = 'default';
  }

  private handleResize(deltaX: number, deltaY: number) {
    const minWidth = 300;
    const minHeight = 200;

    switch (this.resizeDirection) {
      case 'e':
        this.config.width = Math.max(minWidth, this.initialWidth + deltaX);
        break;
      case 'w':
        const newWidth = Math.max(minWidth, this.initialWidth - deltaX);
        if (newWidth > minWidth) {
          this.config.x = this.initialX + deltaX;
          this.config.width = newWidth;
        }
        break;
      case 's':
        this.config.height = Math.max(minHeight, this.initialHeight + deltaY);
        break;
      case 'n':
        const newHeight = Math.max(minHeight, this.initialHeight - deltaY);
        if (newHeight > minHeight) {
          this.config.y = this.initialY + deltaY;
          this.config.height = newHeight;
        }
        break;
      case 'se':
        this.config.width = Math.max(minWidth, this.initialWidth + deltaX);
        this.config.height = Math.max(minHeight, this.initialHeight + deltaY);
        break;
      case 'sw':
        const newWidthSW = Math.max(minWidth, this.initialWidth - deltaX);
        if (newWidthSW > minWidth) {
          this.config.x = this.initialX + deltaX;
          this.config.width = newWidthSW;
        }
        this.config.height = Math.max(minHeight, this.initialHeight + deltaY);
        break;
      case 'ne':
        this.config.width = Math.max(minWidth, this.initialWidth + deltaX);
        const newHeightNE = Math.max(minHeight, this.initialHeight - deltaY);
        if (newHeightNE > minHeight) {
          this.config.y = this.initialY + deltaY;
          this.config.height = newHeightNE;
        }
        break;
      case 'nw':
        const newWidthNW = Math.max(minWidth, this.initialWidth - deltaX);
        if (newWidthNW > minWidth) {
          this.config.x = this.initialX + deltaX;
          this.config.width = newWidthNW;
        }
        const newHeightNW = Math.max(minHeight, this.initialHeight - deltaY);
        if (newHeightNW > minHeight) {
          this.config.y = this.initialY + deltaY;
          this.config.height = newHeightNW;
        }
        break;
    }

    this.constrainToViewport();
  }

  private constrainToViewport() {
    const maxX = window.innerWidth - this.config.width;
    const maxY = window.innerHeight - this.config.height;

    this.config.x = Math.max(0, Math.min(this.config.x, maxX));
    this.config.y = Math.max(0, Math.min(this.config.y, maxY));
  }

  minimize(event: MouseEvent) {
    event.stopPropagation();
    this.config.minimized = true;
    this.configChange.emit(this.config);
    this.onMinimize.emit(this.config.id);
  }

  toggleMaximize(event: MouseEvent) {
    event.stopPropagation();
    this.config.maximized = !this.config.maximized;
    this.configChange.emit(this.config);
  }

  close(event: MouseEvent) {
    event.stopPropagation();
    this.onClose.emit(this.config.id);
  }

  bringToFront() {
    this.onBringToFront.emit(this.config.id);
  }

  restore() {
    this.config.minimized = false;
    this.bringToFront();
    this.configChange.emit(this.config);
  }
}
