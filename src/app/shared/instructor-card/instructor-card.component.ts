import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface Instructor {
  _id: string;
  name: string;
  surname: string;
  email: string;
  slug?: string; // 🆕 SLUG PARA URL AMIGABLE
  avatar?: string;
  profession?: string;
  description?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  twitch?: string;
  website?: string;
}

@Component({
  selector: 'app-instructor-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instructor-card.component.html'
})
export class InstructorCardComponent {
  @Input() instructor!: Instructor;

  constructor(private router: Router) {}

  getAvatarUrl(): string {


    if (this.instructor?.avatar) {
      const url = `${environment.url}users/imagen-usuario/${this.instructor.avatar}`;

      return url;
    }

    // Avatar por defecto con las iniciales
    const defaultUrl = `https://ui-avatars.com/api/?name=${this.instructor?.name}+${this.instructor?.surname}&background=84cc16&color=fff&size=128&bold=true`;

    return defaultUrl;
  }

  navigateToInstructorProfile(): void {

    // 🔥 PRIORIDAD: Usar SLUG si existe, sino usar ID
    const identifier = this.instructor.slug || this.instructor._id;

    if (!identifier) {
      return;
    }


    // Navegar al perfil del instructor usando SLUG o ID
    this.router.navigate(['/instructor', identifier])
      .then(success => {
        if (success) {
        } else {
        }
      })
      .catch(error => {
      });
  }
}
