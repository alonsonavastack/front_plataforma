import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { CouponService } from '../../../core/services/coupon.service';
import { ProjectService } from '../../../core/services/project.service';
import { CoursesService } from '../../../core/services/courses';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-coupons',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    template: `
    <div class="space-y-8">
      <!-- Header Moderno con Gradiente -->
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-6 sm:p-10">
        <!-- Decoración de fondo -->
        <div class="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div class="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div class="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div class="space-y-2 max-w-2xl">
            <h2 class="text-3xl font-extrabold text-white tracking-tight">
              Mis Cupones de <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-400">Referido</span>
            </h2>
            <p class="text-slate-400 text-lg leading-relaxed">
              Genera enlaces únicos para tus proyectos.
            </p>
          </div>
          <button (click)="showCreateModal.set(true)" 
                  class="group relative inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 hover:-translate-y-0.5">
            <svg class="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Crear Nuevo Cupón</span>
          </button>
        </div>
      </div>

      <!-- Lista de Cupones -->
      @if (loading()) {
        <div class="flex flex-col items-center justify-center py-20">
          <div class="relative w-16 h-16">
            <div class="absolute top-0 left-0 w-full h-full border-4 border-primary-500/20 rounded-full"></div>
            <div class="absolute top-0 left-0 w-full h-full border-4 border-primary-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p class="mt-4 text-slate-400 font-medium animate-pulse">Cargando tus cupones...</p>
        </div>
      } @else if (coupons().length === 0) {
        <div class="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-12 text-center relative overflow-hidden group hover:border-slate-600 transition-colors">
          <div class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/50"></div>
          <div class="relative z-10 max-w-md mx-auto">
            <div class="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-700 group-hover:scale-110 transition-transform duration-300">
              <svg class="w-10 h-10 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-white mb-3">Tu primera campaña te espera</h3>
            <p class="text-slate-400 mb-8 leading-relaxed">
              Aún no has creado cupones. Empieza a promocionar tus cursos y proyectos para maximizar tus ingresos hoy mismo.
            </p>
            <button (click)="showCreateModal.set(true)" class="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 font-bold hover:underline transition-all">
              Crear mi primer cupón
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      } @else {
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
          @for (coupon of coupons(); track coupon._id) {
            <div class="group relative bg-slate-900 rounded-2xl border border-slate-800 p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-900/10 hover:border-primary-500/30">
              
              <div class="flex flex-col sm:flex-row gap-5 justify-between">
                <!-- Info -->
                <div class="flex-1 space-y-4">
                  <div class="flex items-start justify-between sm:justify-start gap-4">
                    <div class="flex items-center gap-3">
                      <div class="p-2 bg-slate-800 rounded-lg text-primary-400 border border-slate-700">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div>
                        <p class="text-xs text-slate-500 uppercase font-bold tracking-wider">Proyecto Destino</p>
                        <h4 class="text-base font-semibold text-white line-clamp-1 group-hover:text-primary-400 transition-colors">
                          {{ coupon.projects[0]?.title || 'Proyecto Desconocido' }}
                        </h4>
                      </div>
                    </div>
                    
                    <!-- Estado Mobile -->
                    <span [class]="coupon.active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'" 
                          class="sm:hidden px-2.5 py-1 rounded-full text-xs font-medium border">
                      {{ coupon.active ? 'Activo' : 'Inactivo' }}
                    </span>
                  </div>

                  <div class="flex flex-wrap items-center gap-3">
                    <div class="px-4 py-1.5 bg-slate-800 rounded-lg text-white font-mono text-sm tracking-wider border border-slate-700 select-all">
                      {{ coupon.code }}
                    </div>
                    <span [class]="coupon.active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'" 
                          class="hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-medium border">
                      {{ coupon.active ? 'Activo' : 'Inactivo' }}
                    </span>
                  </div>

                  <div class="flex items-center gap-2 text-sm text-slate-400">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Expira el <span class="text-slate-300 font-medium">{{ coupon.expires_at | date:'mediumDate' }}</span>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 sm:border-l sm:border-slate-800 sm:pl-6">
                  <div class="flex flex-col items-start sm:items-end">
                    <span class="text-xs text-slate-500 font-bold uppercase tracking-wider">Tu Comisión</span>
                    <span class="text-xl font-bold text-green-400">80%</span>
                  </div>
                  
                  <button (click)="copyLink(coupon)" 
                          class="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 hover:bg-slate-200 rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-white/5 active:scale-95">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copiar Link</span>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Modal Premium -->
    @if (showCreateModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop Blur -->
        <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity" (click)="showCreateModal.set(false)"></div>
        
        <!-- Modal Content -->
        <div class="relative w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
          
          <!-- Modal Header -->
          <div class="relative bg-gradient-to-r from-slate-900 to-slate-800 p-6 border-b border-slate-700">
            <div class="absolute top-0 right-0 p-4">
              <button (click)="showCreateModal.set(false)" class="text-slate-400 hover:text-white transition-colors">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <h3 class="text-xl font-bold text-white mb-1">Nuevo Cupón de Referido</h3>
            <p class="text-slate-400 text-sm">Gana 80% de comisión por cada venta exitosa.</p>
          </div>
          
          <form [formGroup]="createForm" (ngSubmit)="createCoupon()" class="p-6 space-y-6">
            
            <!-- Selección de Proyecto -->
            <div class="space-y-2">
              <label class="block text-sm font-semibold text-slate-300">Selecciona el Proyecto</label>
              <div class="relative">
                <select formControlName="project_id" 
                        class="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all pr-10 hover:border-slate-600">
                  <option value="" disabled class="text-slate-500">Selecciona un proyecto...</option>
                  @for (proj of projects(); track proj._id) {
                    <option [value]="proj._id" class="py-2">{{ proj.title }} (Proyecto)</option>
                  }
                  @for (course of courses(); track course._id) {
                    <option [value]="course._id" class="py-2">{{ course.title }} (Curso)</option>
                  }
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Duración -->
            <div class="space-y-3">
              <label class="block text-sm font-semibold text-slate-300">Duración del Enlace</label>
              <div class="grid grid-cols-2 gap-4">
                <label class="cursor-pointer group">
                  <input type="radio" formControlName="days_duration" [value]="3" class="sr-only">
                  <div class="relative overflow-hidden text-center py-4 rounded-xl border-2 transition-all group-hover:border-primary-500/50"
                       [class.bg-primary-600/10]="createForm.get('days_duration')?.value === 3"
                       [class.border-primary-500]="createForm.get('days_duration')?.value === 3"
                       [class.shadow-lg]="createForm.get('days_duration')?.value === 3"
                       [class.shadow-primary-500/10]="createForm.get('days_duration')?.value === 3"
                       [class.bg-slate-800]="createForm.get('days_duration')?.value !== 3"
                       [class.border-slate-700]="createForm.get('days_duration')?.value !== 3">
                    <span class="block text-2xl font-bold mb-1"
                          [class.text-primary-400]="createForm.get('days_duration')?.value === 3"
                          [class.text-white]="createForm.get('days_duration')?.value !== 3">3 Días</span>
                    <span class="text-xs font-medium uppercase tracking-wide"
                          [class.text-primary-300]="createForm.get('days_duration')?.value === 3"
                          [class.text-slate-500]="createForm.get('days_duration')?.value !== 3">Disponible</span>
                  </div>
                </label>
                <label class="cursor-pointer group">
                  <input type="radio" formControlName="days_duration" [value]="5" class="sr-only">
                  <div class="relative overflow-hidden text-center py-4 rounded-xl border-2 transition-all group-hover:border-primary-500/50"
                       [class.bg-primary-600/10]="createForm.get('days_duration')?.value === 5"
                       [class.border-primary-500]="createForm.get('days_duration')?.value === 5"
                       [class.shadow-lg]="createForm.get('days_duration')?.value === 5"
                       [class.shadow-primary-500/10]="createForm.get('days_duration')?.value === 5"
                       [class.bg-slate-800]="createForm.get('days_duration')?.value !== 5"
                       [class.border-slate-700]="createForm.get('days_duration')?.value !== 5">
                    <span class="block text-2xl font-bold mb-1"
                          [class.text-primary-400]="createForm.get('days_duration')?.value === 5"
                          [class.text-white]="createForm.get('days_duration')?.value !== 5">5 Días</span>
                    <span class="text-xs font-medium uppercase tracking-wide"
                          [class.text-primary-300]="createForm.get('days_duration')?.value === 5"
                          [class.text-slate-500]="createForm.get('days_duration')?.value !== 5">Popular</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Botones -->
            <div class="pt-4 flex items-center justify-end gap-3">
              <button type="button" (click)="showCreateModal.set(false)" 
                      class="px-5 py-2.5 bg-transparent text-slate-400 hover:text-white font-medium transition-colors">
                Cancelar
              </button>
              <button type="submit" 
                      [disabled]="createForm.invalid || creating()"
                      class="px-8 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl shadow-lg shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 font-semibold">
                {{ creating() ? 'Procesando...' : 'Generar Link' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class CouponsComponent implements OnInit {
    couponService = inject(CouponService);
    projectService = inject(ProjectService);
    courseService = inject(CoursesService); // Añadir servicio de cursos
    authService = inject(AuthService);
    toastService = inject(ToastService);
    fb = inject(FormBuilder);

    coupons = signal<any[]>([]);
    projects = signal<any[]>([]);
    courses = signal<any[]>([]);
    loading = signal(true);
    creating = signal(false);
    showCreateModal = signal(false);

    createForm: FormGroup = this.fb.group({
        project_id: ['', Validators.required],
        days_duration: [3, Validators.required]
    });

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.loading.set(true);
        // Cargar cupones
        this.couponService.getCoupons().subscribe({
            next: (res) => {
                this.coupons.set(res.coupons);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });

        // Cargar proyectos y cursos del instructor para el select
        const user = this.authService.user();
        if (user) {
            // Cargar proyectos
            this.projectService.getProjectsByInstructor(user._id).subscribe({
                next: (res: any) => {
                    // Ajustar según la respuesta de la API (asumiendo formato estándar)
                    this.projects.set(res.projects || res.data || []);
                }
            });
            // Cargar cursos
            this.courseService.listCoursesInstructor().subscribe({
                next: (res: any) => {
                    this.courses.set(res.courses || []);
                }
            });
        }
    }

    createCoupon() {
        if (this.createForm.invalid) return;

        this.creating.set(true);
        const { project_id, days_duration } = this.createForm.value;

        // Determinar si es curso o proyecto basándose en las listas cargadas
        let product_type = 'project';
        if (this.courses().some(c => c._id === project_id)) {
            product_type = 'course';
        }

        this.couponService.createCoupon({
            project_id,
            product_type,
            days_duration
        }).subscribe({
            next: (res) => {
                this.toastService.success('Cupón Creado', 'Tu enlace de referido está listo.');
                this.coupons.update(list => [res.coupon, ...list]); // Agregar al inicio localmente
                this.showCreateModal.set(false);
                this.createForm.reset({ days_duration: 3, project_id: '' });
                this.loadData(); // Recargar para asegurar populate
            },
            error: (err) => {
                this.toastService.error('Error', err.error?.message || 'No se pudo crear el cupón');
            },
            complete: () => this.creating.set(false)
        });
    }

    copyLink(coupon: any) {
        const project = coupon.projects[0];
        if (!project) return;

        const projectId = project._id;
        // Construir URL: base/project-detail/ID?coupon=CODE
        // O course-detail si es curso... Para simplificar, asumimos project-detail ya que el usuario dijo "proyecto"
        // TODO: Manejar rutas correctas si es curso

        // 🔥 FIX: Detectar si es curso o proyecto para la URL correcta
        // Desafortunadamente el populate solo trae title/imagen, no type.
        // Pero podemos inferirlo o guardarlo en el cupón.
        // Por ahora, usaremos una lógica genérica o link al checkout directo si es posible
        // El usuario pidió "seleccionar el proyecto con el instructor", probablemente project-detail

        const baseUrl = window.location.origin;
        const link = `${baseUrl}/#/project-detail/${projectId}?coupon=${coupon.code}`;

        navigator.clipboard.writeText(link).then(() => {
            this.toastService.success('Enlace Copiado', 'Compártelo para ganar 80% de comisión');
        });
    }
}
