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
            stripe: this.fb.group({
                mode: ['test'],
                active: [true],
                secretKey: [''],
                publishableKey: [''],
                webhookSecret: ['']
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
                    const settings = response.settings as any;

                    if (settings?.stripe) {
                        this.settingsForm.get('stripe')?.patchValue({
                            mode: settings.stripe.mode || 'test',
                            active: settings.stripe.active ?? true,
                            secretKey: settings.stripe.secretKey || '',
                            publishableKey: settings.stripe.publishableKey || '',
                            webhookSecret: settings.stripe.webhookSecret || ''
                        });

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
