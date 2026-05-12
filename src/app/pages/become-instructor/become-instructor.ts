import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HeaderComponent } from '../../layout/header/header';
import { AuthService } from '../../core/services/auth';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-become-instructor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent],
  templateUrl: './become-instructor.html'
})
export class BecomeInstructorComponent {
  authService = inject(AuthService);
  private toast = inject(ToastService);

  isLoading = signal(false);

  instructorForm = new FormGroup({
    profession: new FormControl('', [Validators.required, Validators.minLength(3)]),
    description: new FormControl('', [Validators.required, Validators.minLength(20)]),
    facebook: new FormControl(''),
    instagram: new FormControl(''),
    youtube: new FormControl(''),
    tiktok: new FormControl(''),
    linkedin: new FormControl(''),
    website: new FormControl(''),
    twitter: new FormControl(''),
    github: new FormControl(''),
    discord: new FormControl(''),
    twitch: new FormControl('')
  });

  onSubmit() {
    if (this.instructorForm.invalid) {
      this.toast.validationError('Por favor completa todos los campos requeridos correctamente.');
      return;
    }

    this.isLoading.set(true);

    this.authService.becomeInstructor(this.instructorForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }
}
