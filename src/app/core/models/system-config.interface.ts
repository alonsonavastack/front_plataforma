// Interface para la configuración del sistema
export interface SystemConfig {
  _id?: string;

  // Información Básica
  siteName: string;
  siteDescription: string;
  logo: string | null;
  favicon: string | null;

  // Contacto
  email: string;
  phone: string;
  supportEmail: string;

  // Redes Sociales
  socialMedia: {
    facebook: string;
    instagram: string;
    youtube: string;
    tiktok: string;
    twitch: string;
    twitter: string;
    linkedin: string;
    website: string;
  };

  // Configuración SEO
  metaKeywords: string;
  metaDescription: string;

  // Configuración de Sistema
  maintenanceMode: boolean;
  allowRegistrations: boolean;

  // Módulos
  modules?: {
    courses: boolean;
  };

  // Auditoría
  updatedBy?: any;
  createdAt?: Date;
  updatedAt?: Date;
}
