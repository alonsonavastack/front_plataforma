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

    // Remueve el hash de la URL para que los bots (Facebook, X) puedan leer la ruta correcta en el backend
    // AHORA: Apuntamos DIRECTO al endpoint de nuestra API que devuelve los meta tags y luego redirige.
    cleanUrl = computed(() => {
        let current = this.url(); // Ej: https://devhubsharks.com/#/project-detail/699...

        // Extraemos solo el ID del proyecto de la URL final
        const parts = current.split('/project-detail/');
        if (parts.length > 1) {
            const id = parts[1].split('?')[0].split('#')[0]; // Limpiar cualquier query param o sub-hash
            // Devolvemos la URL directa a la API para que Facebook la lea
            return `https://api.devhubsharks.com/api/seo/project/${id}`;
        }

        // Fallback si no tiene formato esperado
        return current;
    });

    // URLs Computadas con codificación segura
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
        // LinkedIn ahora solo recomienda pasar la URL en su endpoint offsite
        // Ellos extraerán el OpenGraph (og:title, og:image) de tu página.
        // Aún así, podemos enviarlo por compatibilidad
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
