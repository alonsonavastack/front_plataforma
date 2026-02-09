import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../environments/environment';

@Component({
    selector: 'app-developer-config',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="bg-slate-800 rounded-lg p-6 border border-amber-500/30 relative overflow-hidden">
      <!-- Background Pattern -->
      <div class="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>
      
      <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
        <span>👨‍💻</span>
        <span>Modo Desarrollador</span>
      </h2>

      <div class="space-y-6 relative z-10">
        
        <!-- Estado Actual -->
        <div class="bg-slate-900 rounded-lg p-4 border border-white/5">
          <p class="text-slate-400 text-sm mb-1 uppercase tracking-wider font-bold">API URL Activa</p>
          <div class="flex items-center gap-2">
            <code class="text-lime-400 font-mono text-sm break-all">{{ currentUrl() }}</code>
            <span *ngIf="isOverridden()" class="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              CUSTOM
            </span>
          </div>
        </div>

        <!-- Acciones -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <!-- Botón Producción -->
          <button (click)="setProduction()"
            class="p-4 rounded-lg border transition-all duration-200 flex flex-col items-center gap-3 group"
            [class.bg-slate-700]="!isOverridden()"
            [class.border-lime-500]="!isOverridden()"
            [class.bg-slate-800]="isOverridden()"
            [class.border-white/10]="isOverridden()"
            [class.hover:bg-slate-700]="isOverridden()">
            
            <span class="text-3xl grayscale group-hover:grayscale-0 transition-all">🚀</span>
            <div class="text-center">
              <h3 class="font-bold text-white">Modo Producción</h3>
              <p class="text-slate-400 text-xs mt-1">api.devhubsharks.com</p>
            </div>
            
            <div *ngIf="!isOverridden()" class="mt-2 text-lime-400 text-sm flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></span>
              Activo
            </div>
          </button>

          <!-- Botón Local -->
          <button (click)="setLocal()"
            class="p-4 rounded-lg border transition-all duration-200 flex flex-col items-center gap-3 group"
            [class.bg-slate-700]="isOverridden()"
            [class.border-amber-500]="isOverridden()"
            [class.bg-slate-800]="!isOverridden()"
            [class.border-white/10]="!isOverridden()"
            [class.hover:bg-slate-700]="!isOverridden()">
            
            <span class="text-3xl grayscale group-hover:grayscale-0 transition-all">💻</span>
            <div class="text-center">
              <h3 class="font-bold text-white">Modo Local</h3>
              <p class="text-slate-400 text-xs mt-1">localhost:3000</p>
            </div>

            <div *ngIf="isOverridden()" class="mt-2 text-amber-400 text-sm flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Activo
            </div>
          </button>

        </div>

        <div class="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3">
          <span class="text-xl">ℹ️</span>
          <p class="text-sm text-blue-200">
            Al cambiar el entorno, la página se recargará automáticamente para aplicar la nueva configuración de conexión.
          </p>
        </div>

      </div>
    </div>
  `
})
export class DeveloperConfigComponent {

    // Obtenemos la URL directamente del environment (que ya tiene el getter dinámico)
    currentUrl = signal(environment.url);

    // Detectamos si hay override mirando localStorage
    isOverridden = signal(!!localStorage.getItem('API_URL_OVERRIDE'));

    setProduction() {
        localStorage.removeItem('API_URL_OVERRIDE');
        this.reload();
    }

    setLocal() {
        localStorage.setItem('API_URL_OVERRIDE', 'http://localhost:3000/api/');
        this.reload();
    }

    private reload() {
        // Recargar la página para que los getters de environment.ts tomen el nuevo valor
        window.location.reload();
    }
}
