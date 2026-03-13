import { Component, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-share-buttons',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './share-buttons.component.html',
})
export class ShareButtonsComponent {
    // Inputs requeridos y opcionales usando Signals (Angular 17+)
    url = input.required<string>();
    title = input.required<string>();
    description = input<string>('');
    image = input<string>('');

    // Modal State
    isModalOpen = signal<boolean>(false);

    openModal() {
        this.isModalOpen.set(true);
    }

    closeModal() {
        this.isModalOpen.set(false);
    }

    /**
     * Transforma la URL del frontend (con #) en la URL del backend que sirve las meta OG tags.
     * Facebook/WhatsApp leen esa URL y obtienen imagen, título y descripción.
     * El usuario humano es redirigido automáticamente al frontend Angular.
     *
     * Ejemplos:
     *   https://devhubsharks.com/#/project-detail/ABC  →  https://api.devhubsharks.com/api/share/project/ABC
     *   https://devhubsharks.com/#/course-detail/XYZ   →  https://api.devhubsharks.com/api/share/course/XYZ
     */
    cleanUrl = computed(() => {
        const current = this.url();

        // Proyecto
        const projectMatch = current.match(/project-detail\/([a-f0-9]{24})/i);
        if (projectMatch) {
            return `https://api.devhubsharks.com/api/share/project/${projectMatch[1]}`;
        }

        // Curso
        const courseMatch = current.match(/course-detail\/([a-f0-9]{24})/i);
        if (courseMatch) {
            return `https://api.devhubsharks.com/api/share/course/${courseMatch[1]}`;
        }

        // Fallback: devolver URL original
        return current;
    });

    // URLs computadas para cada red social
    whatsappUrl = computed(() => {
        const text = `¡Mira este proyecto: ${this.title()}! 🚀\n${this.description() ? this.description() + '\n' : ''}`;
        return `https://api.whatsapp.com/send?text=${encodeURIComponent(text + this.cleanUrl())}`;
    });

    facebookUrl = computed(() => {
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.cleanUrl())}`;
    });

    twitterUrl = computed(() => {
        const text = `¡Mira este proyecto: ${this.title()}! 🚀\n${this.description() ? this.description() + '\n' : ''}`;
        return `https://twitter.com/intent/tweet?url=${encodeURIComponent(this.cleanUrl())}&text=${encodeURIComponent(text)}`;
    });

    linkedinUrl = computed(() => {
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.cleanUrl())}`;
    });

    telegramUrl = computed(() => {
        const text = `¡Mira este proyecto: ${this.title()}! 🚀`;
        return `https://t.me/share/url?url=${encodeURIComponent(this.cleanUrl())}&text=${encodeURIComponent(text)}`;
    });

    redditUrl = computed(() => {
        return `https://reddit.com/submit?url=${encodeURIComponent(this.cleanUrl())}&title=${encodeURIComponent(this.title())}`;
    });

    emailUrl = computed(() => {
        const subject = `Te recomiendo este proyecto: ${this.title()}`;
        const body = `Hola,\n\nTe comparto este proyecto que me pareció interesante:\n\n${this.title()}\n${this.description()}\n\nPuedes verlo aquí: ${this.cleanUrl()}\n\nSaludos!`;
        return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
}
