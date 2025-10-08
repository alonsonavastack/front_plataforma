export interface SaleDetailItem {
  product: {
    _id: string;
    title: string;
    imagen: string;
  };
  product_type: 'course' | 'project';
  price_unit: number;
  title?: string; // Opcional, para compatibilidad si a veces no viene el producto poblado
}

export interface Sale {
  _id: string;
  user: {
    _id: string;
    name: string;
    surname: string;
    email: string;
  };
  method_payment: string;
  n_transaccion: string;
  total: number;
  status: 'Pendiente' | 'Pagado' | 'Anulado';
  createdAt: string;
  currency_total?: string;
  detail: SaleDetailItem[];
}
