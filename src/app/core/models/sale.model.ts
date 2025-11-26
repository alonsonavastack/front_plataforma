export interface SaleDetailItem {
  product: {
    _id: string;
    title: string;
    imagen: string;
    user?: {
      _id?: string;
      name?: string;
      surname?: string;
    } | string; // Puede ser un objeto poblado o solo el ID
  };
  product_type: 'course' | 'project';
  price_unit: number;
  title?: string; // Opcional, para compatibilidad si a veces no viene el producto poblado
}

// ✅ NUEVO: Interface para información de reembolso
export interface RefundInfo {
  _id: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  originalAmount: number;
  calculations?: {
    refundAmount: number;
    platformFee: number;
    processingFee: number;
  };
  requestedAt: string;
  completedAt?: string;
  refundDetails?: {
    receiptNumber?: string;
    receiptImage?: string;
  };
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
  isRefundable?: boolean; // Añadido para la lógica de reembolsos

  // ✅ NUEVO: Información de reembolso asociado
  refund?: RefundInfo | null;

  // ✅ NUEVO: Comprobante de pago
  voucher_image?: string;
}
