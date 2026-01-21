import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToastService } from '../../core/services/toast.service';
import { HomeService, ProjectDetailResponse } from '../../core/services/home';
import { AuthService } from '../../core/services/auth';
import { MxnCurrencyPipe } from '../../shared/pipes/mxn-currency.pipe';
import { CourseReviewsComponent } from '../../shared/course-reviews/course-reviews.component';
import { Review } from '../../core/services/review.service';

import { HeaderComponent } from '../../layout/header/header';
import { RouterLink } from '@angular/router';

@Component({
    standalone: true,
    selector: 'app-project-detail',
    imports: [CommonModule, MxnCurrencyPipe, CourseReviewsComponent, HeaderComponent, RouterLink],
    templateUrl: './project-detail.html',
})
export class ProjectDetailComponent {
    private route = inject(ActivatedRoute);
    public api = inject(HomeService);
    public authService = inject(AuthService);
    private router = inject(Router);
    private sanitizer = inject(DomSanitizer);
    private toast = inject(ToastService);

    private params = toSignal(this.route.paramMap, { initialValue: null });
    private errorToastShown = false;

    // ID del proyecto desde la URL
    projectId = computed(() => this.params()?.get('id') || '');

    // Resource para cargar detalles
    detailRes = this.api.projectPublicResource(() => this.projectId());
    isLoading = this.detailRes.isLoading;
    hasError = this.detailRes.hasError;
    error = this.detailRes.error;

    // Estado para video preview
    showVideoPreview = signal(false);

    // Computeds para acceder a los datos de forma segura
    project = computed(() => this.detailRes.value().project);
    reviews = computed(() => this.detailRes.value().reviews);
    relatedProjects = computed(() => this.detailRes.value().project_relateds);
    studentHasProject = computed(() => this.detailRes.value().student_have_project);

    // Video URL segura
    videoUrl = computed<SafeResourceUrl | null>(() => {
        const p = this.project();
        if (!p?.url_video) return null;

        let url = p.url_video;

        // Convertir YouTube watch a embed
        if (url.includes('youtube.com/watch?v=')) {
            const videoId = url.split('v=')[1].split('&')[0];
            url = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        } else if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1].split('?')[0];
            url = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }
        // Convertir Vimeo
        else if (url.includes('vimeo.com/')) {
            const videoId = url.split('vimeo.com/')[1].split('?')[0];
            url = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
        }

        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    });

    // Query Params para detectar cupón
    private queryParams = toSignal(this.route.queryParamMap, { initialValue: null });

    constructor() {
        effect(() => {
            const error = this.error();
            if (error && !this.errorToastShown) {
                this.errorToastShown = true;
                this.toast.error('Error al cargar', 'No se pudo cargar el proyecto.');
            }
        });

        // 🔥 EFECTO para capturar cupón de la URL
        effect(() => {
            const params = this.queryParams();
            if (params) {
                const couponCode = params.get('coupon');
                if (couponCode) {
                    console.log('🎟️ Cupón detectado en URL:', couponCode);
                    localStorage.setItem('pending_coupon', couponCode);
                    this.toast.success('Cupón detectado', 'Se aplicará al finalizar la compra');
                }
            }
        });
    }

    // Helpers
    get imageUrl() {
        const p = this.project();
        return p ? this.api.buildProjectImageUrl(p.imagen) : '';
    }

    toggleVideo() {
        this.showVideoPreview.set(true);
    }

    buyNow() {
        if (!this.authService.isLoggedIn()) {
            this.router.navigate(['/login']);
            return;
        }

        const p = this.project();
        if (!p || !p._id) return;

        this.router.navigate(['/checkout'], {
            state: {
                product: p,
                productType: 'project'
            }
        });
    }

    // Navegar a otro proyecto relacionado
    navigateToProject(id: string) {
        if (id) {
            // Scroll top manual si es necesario, o dejar que el router lo maneje
            window.scrollTo(0, 0);
            this.router.navigate(['/project-detail', id]);
        }
    }

    onReviewAdded(review: Review) {
        this.toast.success('Reseña agregada', 'Gracias por tu opinión');
        this.detailRes.reload();
    }

    onReviewUpdated(review: Review) {
        this.toast.success('Reseña actualizada', 'Tu opinión ha sido actualizada');
        this.detailRes.reload();
    }

    // Estado para spinners de descarga
    downloadingFiles = signal<Set<string>>(new Set());

    downloadFile(file: any) {
        const projectId = this.projectId();
        if (!projectId || !file || !file.filename) return;

        // Evitar dobles clics
        if (this.downloadingFiles().has(file._id)) return;

        // Actualizar estado para mostrar spinner
        this.downloadingFiles.update(set => {
            const newSet = new Set(set);
            newSet.add(file._id);
            return newSet;
        });

        this.api.downloadProjectFile(projectId, file.filename).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = file.name || file.filename;
                link.click();
                window.URL.revokeObjectURL(url);

                // Remover loading
                this.downloadingFiles.update(set => {
                    const newSet = new Set(set);
                    newSet.delete(file._id);
                    return newSet;
                });
            },
            error: (err) => {
                console.error('Download error', err);
                this.toast.error('Error de descarga', 'No se pudo descargar el archivo');

                // Remover loading
                this.downloadingFiles.update(set => {
                    const newSet = new Set(set);
                    newSet.delete(file._id);
                    return newSet;
                });
            }
        });
    }
}
