export interface Discount {
  _id?: string;
  type_campaign: number; // 1: normal, 2: flash, 3: banner
  type_discount: number; // 1: porcentaje, 2: monto fijo
  discount: number;
  start_date: string;
  end_date: string;
  start_date_num: number;
  end_date_num: number;
  type_segment: number; // 1: curso, 2: categoria, 3: proyecto
  state: boolean;
  courses?: string[];
  projects?: string[];
  categories?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseItem {
  _id: string;
  title: string;
  price_mxn: number;
  imagen: string;
  categorie: {
    _id: string;
    title: string;
  };
}

export interface ProjectItem {
  _id: string;
  title: string;
  price_mxn: number;
  imagen: string;
  categorie: {
    _id: string;
    title: string;
  };
}

export interface CategoryItem {
  _id: string;
  title: string;
  imagen: string;
}

export interface DiscountConfig {
  courses: CourseItem[];
  categories: CategoryItem[];
  projects: ProjectItem[];
}
