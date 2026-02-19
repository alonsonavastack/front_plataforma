import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';

export interface SeoData {
    title: string;
    description?: string;
    image?: string;
    keywords?: string;
    type?: 'website' | 'article' | 'product' | 'profile';
    slug?: string; // Para canonical URL
}

@Injectable({
    providedIn: 'root'
})
export class SeoService {
    private titleService = inject(Title);
    private metaService = inject(Meta);
    private router = inject(Router);

    private readonly defaultTitle = 'Dev Hub Sharks - Plataforma de Proyectos Digitales';
    private readonly defaultDesc = 'Dev Hub Sharks: La mejor plataforma para adquirir proyectos prácticos. Únete a nuestra comunidad de desarrolladores y mejora tus habilidades.';
    private readonly defaultImage = 'https://devhubsharks.com/assets/logo.png';
    private readonly defaultKeywords = 'dev hub shark, dev hub sharks, cursos programación, proyectos reales, angular, nodejs, desarrollo web, marketplace código';

    constructor() { }

    setSeo(data: SeoData) {
        const title = data.title ? `${data.title} | Dev Hub Sharks` : this.defaultTitle;
        const desc = data.description || this.defaultDesc;
        const image = data.image || this.defaultImage;
        const keywords = data.keywords || this.defaultKeywords;
        const type = data.type || 'website';
        const url = `https://devhubsharks.com${this.router.url}`;

        // 1. Set Title
        this.titleService.setTitle(title);

        // 2. Set Meta Tags
        this.metaService.updateTag({ name: 'description', content: desc });
        this.metaService.updateTag({ name: 'keywords', content: keywords });
        this.metaService.updateTag({ name: 'author', content: 'Dev Hub Sharks' });

        // 3. Open Graph (Facebook/Social)
        this.metaService.updateTag({ property: 'og:title', content: title });
        this.metaService.updateTag({ property: 'og:description', content: desc });
        this.metaService.updateTag({ property: 'og:image', content: image });
        this.metaService.updateTag({ property: 'og:url', content: url });
        this.metaService.updateTag({ property: 'og:type', content: type });
        this.metaService.updateTag({ property: 'og:site_name', content: 'Dev Hub Sharks' });

        // 4. Twitter Card
        this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
        this.metaService.updateTag({ name: 'twitter:title', content: title });
        this.metaService.updateTag({ name: 'twitter:description', content: desc });
        this.metaService.updateTag({ name: 'twitter:image', content: image });
    }

    // Reset to defaults
    resetSeo() {
        this.setSeo({
            title: '',
            description: this.defaultDesc,
            image: this.defaultImage,
            type: 'website'
        });
    }
}
