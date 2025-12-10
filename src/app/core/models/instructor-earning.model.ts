// Define las posibles estructuras para un producto, que puede ser un curso o un proyecto.
export interface EarningProduct {
  _id: string;
  title: string;
  imagen?: string; // Para cursos
  image?: string;  // Para proyectos
  // Agrega otras propiedades que puedas necesitar
}

// Define la estructura del objeto de ganancia (earning) que llega desde el backend.
export interface Earning { // Renombrado para coincidir con el uso en el componente
  _id: string;
  instructor: string; // ID del instructor
  sale: {
    _id: string;
    n_transaccion: string;
    created_at: string | Date;
    user: string;
  };

  // Referencias originales
  course?: EarningProduct;
  product_id?: EarningProduct;
  product_type?: 'course' | 'project';

  // Montos
  sale_price: number;
  currency: 'USD' | 'MXN';
  platform_commission_rate: number;
  platform_commission_amount: number;
  instructor_earning: number;
  
  // 🔥 NUEVO: Información de descuentos
  discount_info?: {
    original_price: number;        // Precio sin descuento
    discount_amount: number;       // Monto del descuento
    discount_type: number;         // 1=porcentaje, 2=monto fijo
    discount_percentage: number;   // % de descuento
    campaign_discount?: string;    // ID de campaña de descuento
  };

  // Estado y fechas
  status: 'pending' | 'available' | 'paid' | 'disputed';
  earned_at: string | Date;
  available_at: string | Date;
  paid_at?: string | Date;

  // Referencia de pago
  payment_reference?: string;

  // Notas
  admin_notes?: string;

  // 🔥 SOLUCIÓN: Propiedad unificada y OPCIONAL para el producto.
  // El backend la crea dinámicamente, por lo que puede ser undefined.
  product?: EarningProduct;
}
