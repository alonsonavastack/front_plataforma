import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { AdminPaymentService, CommissionSettings } from '../../core/services/admin-payment.service';

@Component({
  selector: 'app-admin-commission-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-commission-settings.html',
})
export class AdminCommissionSettingsComponent implements OnInit {
  private adminPaymentService = inject(AdminPaymentService);

  settings = signal<CommissionSettings | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  settingsForm = new FormGroup({
    default_commission_rate: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(100)]),
    days_until_available: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    minimum_payment_threshold: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    exchange_rate_usd_to_mxn: new FormControl<number | null>(null, [Validators.min(0)]),
  });

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.isLoading.set(true);
    this.error.set(null);
    
    this.adminPaymentService.getCommissionSettings().subscribe({
      next: (response) => {
        this.settings.set(response.settings);
        this.settingsForm.patchValue({
          default_commission_rate: response.settings.default_commission_rate,
          days_until_available: response.settings.days_until_available,
          minimum_payment_threshold: response.settings.minimum_payment_threshold,
          exchange_rate_usd_to_mxn: response.settings.exchange_rate_usd_to_mxn,
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'An error occurred while loading settings.');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit() {
    if (this.settingsForm.invalid) {
      return;
    }

    this.isSaving.set(true);
    this.successMessage.set(null);
    this.error.set(null);

    // Clean the form value to remove null/undefined properties before sending
    const formValue = this.settingsForm.value;
    const cleanedData: Partial<CommissionSettings> = {};

    Object.keys(formValue).forEach(key => {
      const typedKey = key as keyof typeof formValue;
      if (formValue[typedKey] !== null && formValue[typedKey] !== undefined) {
        (cleanedData as any)[typedKey] = formValue[typedKey];
      }
    });

    this.adminPaymentService.updateCommissionSettings(cleanedData).subscribe({
      next: (response) => {
        this.settings.set(response.settings);
        this.successMessage.set(response.message || 'Settings updated successfully!');
        this.isSaving.set(false);
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'An error occurred while updating settings.');
        this.isSaving.set(false);
      }
    });
  }

  // Placeholder for custom commission logic
  openCustomCommissionModal(instructorId?: string) {
    console.log('Open modal for:', instructorId || 'new custom commission');
  }

  removeCustomCommission(instructorId: string) {
    console.log('Remove custom commission for:', instructorId);
  }
}
