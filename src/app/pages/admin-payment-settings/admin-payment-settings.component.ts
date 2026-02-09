import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaymentSettingsService, PaymentSettings } from '../../core/services/payment-settings.service';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'app-admin-payment-settings',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './admin-payment-settings.component.html',
})
export class AdminPaymentSettingsComponent implements OnInit {
    private paymentSettingsService = inject(PaymentSettingsService);
    private fb = inject(FormBuilder);

    settingsForm: FormGroup;
    isLoading = signal(false);
    isSaving = signal(false);
    successMessage = signal('');
    errorMessage = signal('');



    constructor() {
        this.settingsForm = this.fb.group({
            paypal: this.fb.group({
                mode: ['sandbox'],
                active: [false],
                instructorPayoutsActive: [false],
                sandbox: this.fb.group({
                    clientId: [''],
                    clientSecret: ['']
                }),
                live: this.fb.group({
                    clientId: [''],
                    clientSecret: ['']
                })
            }),
        });
    }

    ngOnInit(): void {
        this.loadSettings();
    }

    loadSettings() {
        this.isLoading.set(true);
        this.paymentSettingsService.getSettings()
            .pipe(finalize(() => this.isLoading.set(false)))
            .subscribe({
                next: (response) => {
                    if (response.settings) {
                        const settings = response.settings;

                        // Patch valores principales
                        this.settingsForm.patchValue({
                            paypal: {
                                mode: settings.paypal.mode || 'sandbox',
                                active: settings.paypal.active || false,
                                instructorPayoutsActive: settings.paypal.instructorPayoutsActive || false
                            }
                        });

                        // Patch Sandbox
                        if (settings.paypal.sandbox) {
                            this.settingsForm.get('paypal.sandbox')?.patchValue(settings.paypal.sandbox);
                        } else {
                            // Migración visual: si no hay sandbox object, usar los viejos values si existen
                            // (Solo si estamos en transición, opcional)
                            if (settings.paypal.clientId && settings.paypal.mode === 'sandbox') {
                                this.settingsForm.get('paypal.sandbox')?.patchValue({
                                    clientId: settings.paypal.clientId,
                                    clientSecret: settings.paypal.clientSecret
                                });
                            }
                        }

                        // Patch Live
                        if (settings.paypal.live) {
                            this.settingsForm.get('paypal.live')?.patchValue(settings.paypal.live);
                        }
                    }
                },
                error: (error) => {
                    console.error('Error loading settings', error);
                    this.errorMessage.set('Error al cargar la configuración');
                }
            });
    }

    saveSettings() {
        if (this.settingsForm.invalid) return;

        this.isSaving.set(true);
        this.successMessage.set('');
        this.errorMessage.set('');

        this.paymentSettingsService.updateSettings(this.settingsForm.value)
            .pipe(finalize(() => this.isSaving.set(false)))
            .subscribe({
                next: (response) => {
                    this.successMessage.set('Configuración guardada correctamente');
                    setTimeout(() => this.successMessage.set(''), 3000);
                },
                error: (error) => {
                    console.error('Error saving settings', error);
                    this.errorMessage.set('Error al guardar la configuración');
                }
            });
    }


}
