import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SystemConfigService } from '../../../../core/services/system-config.service';
import { WebsocketService } from '../../../../core/services/websocket.service';
import { AuthService } from '../../../../core/services/auth';
import { Subscription } from 'rxjs';
import { HttpEventType, HttpEvent, HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
    selector: 'app-backup-config',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './backup-config.component.html'
})
export class BackupConfigComponent implements OnInit, OnDestroy {
    private systemConfigService = inject(SystemConfigService);
    private websocketService = inject(WebsocketService);
    private authService = inject(AuthService);
    private http = inject(HttpClient);
    private toast = inject(ToastService);
    private wsSubscription?: Subscription;

    isDownloading = signal(false);
    isRestoring = signal(false);

    // Progreso en tiempo real
    restorePercentage = signal(0);
    restoreMessage = signal('');

    // Progreso de descarga
    downloadPercentage = signal(0);

    // --- NOTES State ---
    showNotesModal = signal(false);
    backupNotes = signal('');
    isSavingNote = signal(false);
    isLoadingNotes = signal(false);
    isUserAdmin = signal(false);

    ngOnInit() {
        // Escuchar eventos de progreso del socket
        this.wsSubscription = this.websocketService.restoreProgress$.subscribe(data => {
            console.log('📡 Progreso recibido:', data);
            this.restorePercentage.set(data.percentage);
            this.restoreMessage.set(data.message);

            // Si llega al 100%, esperar un poco y recargar
            if (data.percentage === 100) {
                setTimeout(() => window.location.reload(), 2000);
            }
        });

        // Verificar si es admin
        this.isUserAdmin.set(this.authService.hasRole('admin'));
    }

    ngOnDestroy() {
        this.wsSubscription?.unsubscribe();
    }

    downloadBackup() {
        if (this.isDownloading()) return;

        this.isDownloading.set(true);
        this.downloadPercentage.set(0);

        // Simulamos progreso mientras el servidor genera el archivo (hasta 90%)
        let progress = 0;
        const interval = setInterval(() => {
            if (progress < 90) {
                // Incremento variable para que parezca natural
                progress += Math.floor(Math.random() * 3) + 1;
                if (progress > 90) progress = 90;
                this.downloadPercentage.set(progress);
            }
        }, 800);

        this.systemConfigService.downloadBackup().subscribe({
            next: (event: HttpEvent<any>) => {
                switch (event.type) {
                    case HttpEventType.DownloadProgress:
                        clearInterval(interval); // Detener simulación
                        if (event.total) {
                            const realProgress = Math.round((100 * event.loaded) / event.total);
                            this.downloadPercentage.set(Math.max(realProgress, progress)); // No retroceder
                        }
                        break;
                    case HttpEventType.Response:
                        clearInterval(interval); // Detener simulación
                        this.downloadPercentage.set(100); // Forzar 100% al finalizar

                        setTimeout(() => {
                            const blob = event.body;
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                            link.download = `backup-${timestamp}.zip`;
                            link.click();
                            window.URL.revokeObjectURL(url);

                            this.isDownloading.set(false);
                            this.downloadPercentage.set(0);
                        }, 1000); // Esperar 1s para que el usuario vea el 100%
                        break;
                }
            },
            error: () => {
                clearInterval(interval); // Detener simulación
                alert('❌ Error al descargar el respaldo');
                this.isDownloading.set(false);
                this.downloadPercentage.set(0);
            }
        });
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.zip')) {
            alert('❌ Por favor selecciona un archivo .zip válido');
            return;
        }

        if (confirm('⚠️ ¿Estás seguro de que quieres restaurar este respaldo?\n\nESTA ACCIÓN ES DESTRUCTIVA: Se borrarán todos los datos actuales y se reemplazarán con los del respaldo.\n\nEsta acción no se puede deshacer.')) {
            this.restoreBackup(file);
        } else {
            // Reset input
            event.target.value = '';
        }
    }

    restoreBackup(file: File) {
        if (this.isRestoring()) return;

        this.isRestoring.set(true);
        this.restorePercentage.set(0);
        this.restoreMessage.set('Iniciando carga...');

        this.systemConfigService.restoreBackup(file).subscribe({
            next: (event: HttpEvent<any>) => {
                switch (event.type) {
                    case HttpEventType.UploadProgress:
                        if (event.total) {
                            const progress = Math.round((100 * event.loaded) / event.total);
                            this.restorePercentage.set(progress);
                            this.restoreMessage.set('Subiendo archivo...');
                        }
                        break;
                    case HttpEventType.Response:
                        this.restorePercentage.set(100);
                        this.restoreMessage.set('Completado');

                        setTimeout(() => {
                            alert('✅ Base de datos restaurada correctamente.\n\n' + event.body.message);
                            this.isRestoring.set(false);
                            this.restorePercentage.set(0);
                        }, 1000);
                        break;
                }
            },
            error: (err) => {
                console.error(err);
                const errorMsg = err.error?.message || 'Error desconocido';
                alert('❌ Error al restaurar la base de datos:\n' + errorMsg);
                this.isRestoring.set(false);
                this.restorePercentage.set(0);
            }
        });
    }

    // 🔥 Métodos de notas
    openNotesModal() {
        this.showNotesModal.set(true);
        this.loadBackupNotes();
    }

    closeNotesModal() {
        this.showNotesModal.set(false);
        this.backupNotes.set('');
    }

    loadBackupNotes() {
        this.isLoadingNotes.set(true);
        this.http.get<{ success: boolean; notes: string }>(`${environment.url}system-config/backup-notes`)
            .subscribe({
                next: (response) => {
                    this.backupNotes.set(response.notes || '');
                    this.isLoadingNotes.set(false);
                },
                error: (err) => {
                    console.error('Error cargando notas:', err);
                    this.backupNotes.set('');
                    this.isLoadingNotes.set(false);
                    this.toast.error('Error al cargar las notas');
                }
            });
    }

    saveBackupNotes() {
        if (!this.isUserAdmin()) return;

        this.isSavingNote.set(true);
        this.http.put<{ success: boolean; message: string }>(
            `${environment.url}system-config/backup-notes`,
            { backup_notes: this.backupNotes() }
        ).subscribe({
            next: () => {
                this.toast.success('Notas guardadas correctamente');
                this.closeNotesModal();
                this.isSavingNote.set(false);
            },
            error: (err) => {
                console.error('Error guardando notas:', err);
                this.toast.error('Error al guardar las notas');
                this.isSavingNote.set(false);
            }
        });
    }
}
