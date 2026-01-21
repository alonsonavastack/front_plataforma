import { Component, OnInit, signal, computed, inject, ViewChild } from '@angular/core';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SystemConfigService } from '../../core/services/system-config.service';
import { Router } from '@angular/router';

// Importar sub-componentes
import { BasicInfoComponent } from './components/basic-info/basic-info.component';
import { ContactInfoComponent } from './components/contact-info/contact-info.component';
import { SocialMediaComponent } from './components/social-media/social-media.component';
import { AuthService } from '../../core/services/auth';
import { AdminPaymentSettingsComponent } from '../admin-payment-settings/admin-payment-settings.component'; // 🆕
import { BackupConfigComponent } from './components/backup-config/backup-config.component';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BasicInfoComponent,
    ContactInfoComponent,
    SocialMediaComponent,
    AdminPaymentSettingsComponent, // 🆕
    BackupConfigComponent
  ],
  templateUrl: './system-settings.component.html'
})
export class SystemSettingsComponent implements OnInit {
  @ViewChild(BasicInfoComponent) basicInfoComponent!: BasicInfoComponent;

  private fb = inject(FormBuilder);
  private router = inject(Router);

  systemConfigService = inject(SystemConfigService);
  authService = inject(AuthService);

  // Formulario
  configForm!: FormGroup;

  // Signals para UI
  isSaving = signal(false);
  activeTab = signal<'basic' | 'contact' | 'social' | 'payment' | 'backup'>('basic');
  showSuccess = signal(false);
  formIsValid = signal(false); // 🔥 Signal reactivo para estado del formulario

  // Computed signals
  config = computed(() => this.systemConfigService.config());
  isLoading = computed(() => this.systemConfigService.isLoading());
  // 🔥 Usar signal reactivo en lugar de computed
  isFormValid = computed(() => this.formIsValid());

  ngOnInit(): void {

    // Verificar que sea admin
    const user: any = this.authService.user();
    if (!user || user.rol !== 'admin') {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.initForm();
    this.loadConfig();

    // 🔥 Suscribirse a cambios del formulario para actualizar signal
    this.configForm.statusChanges.subscribe(() => {
      const siteName = this.configForm.get('siteName');
      const isValid = !!(siteName?.valid && siteName.value?.trim().length >= 3); // 🔥 !! fuerza boolean
      this.formIsValid.set(isValid);
    });

    // 🔥 También al cambiar valores
    this.configForm.valueChanges.subscribe(() => {
      const siteName = this.configForm.get('siteName');
      const isValid = !!(siteName?.valid && siteName.value?.trim().length >= 3); // 🔥 !! fuerza boolean
      this.formIsValid.set(isValid);
    });

    // 🔥 Evaluar estado inicial después de cargar
    setTimeout(() => {
      const siteName = this.configForm.get('siteName');
      const isValid = !!(siteName?.valid && siteName.value?.trim().length >= 3); // 🔥 !! fuerza boolean
      this.formIsValid.set(isValid);
    }, 1000);
  }

  /**
   * Inicializar formulario
   */
  private initForm(): void {
    this.configForm = this.fb.group({
      // Básico
      siteName: ['', [Validators.required, Validators.minLength(3)]],
      siteDescription: [''],

      // Contacto - 🔥 Email NO requerido para permitir guardar
      email: [''], // Sin validaciones estrictas
      phone: [''],
      supportEmail: [''], // Sin validaciones estrictas

      // Redes Sociales
      facebook: [''],
      instagram: [''],
      youtube: [''],
      tiktok: [''],
      twitch: [''],
      twitter: [''],
      linkedin: [''],
      website: [''],

      // Backup
      backup_enabled: [false]
    });
  }

  /**
   * Cargar configuración desde el servicio
   */
  loadConfig(): void { // 🔥 Cambiado de private a public
    this.systemConfigService.getConfig();

    // Esperar a que cargue y llenar el formulario
    setTimeout(() => {
      const config = this.config();
      if (config) {
        this.fillForm(config);
      }
    }, 500);
  }

  /**
   * Llenar formulario con datos existentes
   */
  private fillForm(config: any): void {

    this.configForm.patchValue({
      siteName: config.siteName || '',
      siteDescription: config.siteDescription || '',
      email: config.email || '',
      phone: config.phone || '',
      supportEmail: config.supportEmail || '',

      facebook: config.socialMedia?.facebook || '',
      instagram: config.socialMedia?.instagram || '',
      youtube: config.socialMedia?.youtube || '',
      tiktok: config.socialMedia?.tiktok || '',
      twitch: config.socialMedia?.twitch || '',
      twitter: config.socialMedia?.twitter || '',
      linkedin: config.socialMedia?.linkedin || '',
      website: config.socialMedia?.website || '',

      backup_enabled: config.backup?.enabled || false
    });

    // ❌ ELIMINADO: No se puede hacer .set() en un computed signal
    // currentLogoUrl es computed (solo lectura), se actualiza automáticamente

    // 🔥 Actualizar estado de validez del formulario
    setTimeout(() => {
      const siteName = this.configForm.get('siteName');
      const isValid = !!(siteName?.valid && siteName.value?.trim().length >= 3); // 🔥 !! fuerza boolean
      this.formIsValid.set(isValid);
    }, 100);
  }

  /**
   * Cambiar tab activo
   */
  setActiveTab(tab: 'basic' | 'contact' | 'social' | 'payment' | 'backup'): void {
    this.activeTab.set(tab);
  }



  /**
   * Enviar formulario
   */
  async onSubmit(): Promise<void> {

    // Verificar cada control del formulario
    Object.keys(this.configForm.controls).forEach(key => {
      const control = this.configForm.get(key);
      if (control?.invalid) {
      }
    });

    if (this.configForm.invalid) {
      alert('❌ Por favor completa todos los campos requeridos');
      return;
    }

    if (this.isSaving()) {
      return;
    }

    await this.submitForm();
  }

  /**
   * Lógica de guardado (compartida entre onSubmit y forceSubmit)
   */
  private async submitForm(): Promise<void> {
    this.isSaving.set(true);

    try {
      const formData = new FormData();
      const formValues = this.configForm.value;

      // Agregar campos básicos
      formData.append('siteName', formValues.siteName);
      formData.append('siteDescription', formValues.siteDescription || '');

      // Agregar contacto
      formData.append('email', formValues.email);
      formData.append('phone', formValues.phone || '');
      formData.append('supportEmail', formValues.supportEmail || '');

      // Agregar redes sociales (campos planos - el backend los agrupa)
      formData.append('facebook', formValues.facebook || '');
      formData.append('instagram', formValues.instagram || '');
      formData.append('youtube', formValues.youtube || '');
      formData.append('tiktok', formValues.tiktok || '');
      formData.append('twitch', formValues.twitch || '');
      formData.append('twitter', formValues.twitter || '');
      formData.append('linkedin', formValues.linkedin || '');
      formData.append('linkedin', formValues.linkedin || '');
      formData.append('website', formValues.website || '');

      // Backup
      formData.append('backup_enabled', String(formValues.backup_enabled));

      // Agregar logo si hay uno nuevo
      const logoFile = this.basicInfoComponent?.getLogoFile();
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      // Enviar al backend
      await this.systemConfigService.updateConfig(formData).toPromise();


      // Mostrar mensaje de éxito
      this.showSuccess.set(true);
      setTimeout(() => this.showSuccess.set(false), 3000);

      // Limpiar preview del logo
      this.basicInfoComponent?.clearPreview();

      // Recargar configuración
      this.systemConfigService.getConfig();

    } catch (error: any) {
      alert(`❌ Error al guardar: ${error.error?.message || 'Error desconocido'}`);
    } finally {
      this.isSaving.set(false);
    }
  }
}
