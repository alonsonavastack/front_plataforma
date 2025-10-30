import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface Instructor {
  _id: string;
  name: string;
  surname: string;
  email: string;
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
    console.log('🖼️ [InstructorCard] getAvatarUrl para:', this.instructor?.name);
    
    if (this.instructor?.avatar) {
      const url = `${environment.url}users/imagen-usuario/${this.instructor.avatar}`;
      console.log('✅ [InstructorCard] Avatar URL:', url);
      return url;
    }
    
    // Avatar por defecto con las iniciales
    const defaultUrl = `https://ui-avatars.com/api/?name=${this.instructor?.name}+${this.instructor?.surname}&background=84cc16&color=fff&size=128&bold=true`;
    console.log('👤 [InstructorCard] Avatar por defecto:', defaultUrl);
    return defaultUrl;
  }

  navigateToInstructorProfile(): void {
    console.log('👉 [InstructorCard] Click en Ver Perfil');
    console.log('🎯 [InstructorCard] Instructor ID:', this.instructor._id);
    console.log('🗺️ [InstructorCard] Navegando a: /instructor/' + this.instructor._id);
    
    // Verificar que tenemos un ID válido
    if (!this.instructor._id) {
      console.error('❌ [InstructorCard] ERROR: No hay ID de instructor');
      return;
    }
    
    // Navegar al perfil del instructor
    this.router.navigate(['/instructor', this.instructor._id])
      .then(success => {
        if (success) {
          console.log('✅ [InstructorCard] Navegación exitosa');
        } else {
          console.error('❌ [InstructorCard] Navegación falló');
        }
      })
      .catch(error => {
        console.error('❌ [InstructorCard] Error en navegación:', error);
      });
  }
}
