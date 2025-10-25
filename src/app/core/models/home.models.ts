// src/app/core/models/home.models.ts

export interface Category {
  _id: string;
  title: string;
  imagen?: string;
  state?: number;
  count_courses?: number; // Para la lista de categorías con conteo de cursos
}

export interface User {
  _id: string;
  name: string;
  surname: string;
  email?: string;
  rol?: string;
  profession?: string;
  description?: string;
  avatar?: string;
}

// Modelo para la administración de cursos (con categorías y usuarios poblados)
export interface CourseAdmin {
  _id: string;
  title: string;
  subtitle: string;
  description?: string;
  price_usd: number;
  price_mxn: number;
  categorie: Category; // Objeto Category poblado
  user: User; // Objeto User poblado
  level: 'Basico' | 'Intermedio' | 'Avanzado';
  idioma: 'Español' | 'Inglés';
  imagen?: string;
  slug?: string;
  state?: number;
  requirements?: string[];
  who_is_it_for?: string[];
}

// Modelo para las secciones de un curso
export interface CourseSection {
  _id: string;
  title: string;
  course: string; // ID del curso al que pertenece
  num_clases?: number; // Número de clases en la sección (asumiendo que el backend lo proporciona)
  // Puedes añadir más propiedades como `order` o un array de `CourseClase` si es necesario
}

// Modelo para las clases de un curso
export interface CourseClase {
  _id: string;
  title: string;
  description?: string;
  section: string; // ID de la sección
  state?: boolean;
  time?: number; // Duración en segundos
  
  // 🎬 NUEVOS CAMPOS para soporte de múltiples plataformas
  video_platform?: 'vimeo' | 'youtube'; // Plataforma del video
  video_id?: string; // ID genérico del video
  
  // CAMPO LEGACY (compatibilidad con datos antiguos)
  vimeo_id?: string; // ID del video de Vimeo (deprecado)
  
  order?: number;
}

// Respuestas de la API para el servicio de cursos
export interface CourseListResponse {
  courses: CourseAdmin[];
}

export interface CourseConfigResponse {
  categories: Category[];
  users: User[]; // El backend devuelve 'users' para instructores
}

export interface CourseShowResponse {
  course: CourseAdmin;
}

// Modelos para el servicio Home (público)
export interface CoursePublic {
  _id: string;
  title: string;
  subtitle: string;
  slug: string;
  imagen?: string;
  price_usd: number; // Precio original USD
  price_mxn: number; // Precio original MXN
  final_price_usd?: number; // Precio con descuento aplicado USD
  final_price_mxn?: number; // Precio con descuento aplicado MXN
  level: string;
  idioma: string;
  categorie: Category;
  user: User;
  // Campos de descuento
  discount_active?: {
    _id: string;
    discount: number;
    type_discount: number; // 1: porcentaje, 2: monto fijo
    type_campaign: number; // 1: normal, 2: flash, 3: banner
    end_date: string;
  };
  // Metadatos
  N_CLASES?: number;
  N_STUDENTS?: number;
  N_REVIEWS?: number;
  AVG_RATING?: string | number;
  // Añadir otras propiedades públicas del curso si son necesarias
}

export interface SearchCourseBody {
  q?: string;
  categorie?: string;
  selected_categories?: string[];
  selected_instructors?: string[];
  selected_levels?: string[];
  selected_idiomas?: string[];
  min_price?: number;
  max_price?: number;
  rating_selected?: number;
}

export interface HomeApiResponse {
  categories: Category[];
  courses_top: CoursePublic[];
  categories_sections: Array<{
    _id: string;
    title: string;
    count_courses?: number;
    courses?: CoursePublic[];
  }>;
  courses_banners: CoursePublic[];
  campaing_banner: any; // Define una interfaz más específica si es necesario
  courses_flash: CoursePublic[];
  projects_featured?: Project[]; // Añadido para proyectos destacados
  campaing_flash: any; // Define una interfaz más específica si es necesario
}

// Modelo para una inscripción a un curso
export interface Enrollment {
  _id: string;
  user: string; // o User si está poblado
  course: CoursePublic;
  clases_checked: any[];
  state: number; // 1: activo, 2: terminado
  percentage?: number;
}

// Modelo para la respuesta del perfil de usuario (cliente, instructor, admin)
export interface ProfileResponse {
  profile: User;
  enrolled_courses?: Enrollment[];
  actived_course_count?: number;
  termined_course_count?: number;
  enrolled_course_news: any[]; // Puedes crear una interfaz más específica para esto
  actived_course_news?: any[];
  termined_course_news?: any[];
  sales: any[]; // Puedes crear una interfaz más específica para las ventas
  projects?: any[];
}

// Modelo para archivos de proyecto
export interface ProjectFile {
  _id: string;
  name: string;
  filename: string;
  size: number;
  uploadDate: string;
}

// Modelo para Proyectos
export interface Project {
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  imagen: string;
  url_video?: string;
  categorie: Category;
  price_mxn: number;
  price_usd: number;
  final_price_mxn?: number; // Precio con descuento aplicado
  final_price_usd?: number; // Precio con descuento aplicado
  state?: number; // 1: borrador, 2: publico, 3: anulado
  user?: User; // Opcional porque puede no estar poblado
  files?: ProjectFile[]; // Archivos ZIP adjuntos al proyecto
  featured?: boolean; // Añadido para saber si es destacado
  // Campos de descuento
  discount_active?: {
    _id: string;
    discount: number;
    type_discount: number; // 1: porcentaje, 2: monto fijo
    type_campaign: number; // 1: normal, 2: flash, 3: banner
    end_date: string;
  };
}

export interface ProjectListResponse {
  projects: Project[];
}

export interface ProjectSingleResponse {
  project: Project;
}
