import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth';

// ==================== INTERFACES DE RESPUESTA DE LA API ====================

export interface IncomeData {
  _id: string;
  period: string;
  total: number;
  count: number;
}

export interface TopProduct {
  product_id: string;
  product_type: 'course' | 'project';
  title: string;
  total_sales: number;
  total_revenue: number;
}

export interface SalesByCategory {
  category_id: string;
  category_title: string;
  total_sales: number;
  total_revenue: number;
}

export interface PaymentMethodReport {
  method: string;
  total_transactions: number;
  total_revenue: number;
}

export interface PeriodComparison {
  period: string;
  current: { total_sales: number; total_revenue: number; };
  previous: { total_sales: number; total_revenue: number; };
  growth: { sales: number; revenue: number; };
}

export interface StudentGrowth {
  growth: { _id: string; new_students: number; }[];
  totalStudents: number;
}

export interface ActiveStudents {
  active: number;
  inactive: number;
  total: number;
  active_percentage: string;
}

export interface StudentsByCourse {
  course_id: string;
  course_title: string;
  student_count: number;
}

export interface TopStudent {
  user_id: string;
  name: string;
  surname: string;
  email: string;
  total_purchases: number;
  total_spent: number;
}

export interface ProductsAnalysis {
  product_id: string;
  product_type: 'course' | 'project';
  title: string;
  category: string;
  instructor: string;
  total_sales: number;
  total_revenue: number;
  avg_rating: number;
  total_reviews: number;
  created_at: string;
}

// ==================== INTERFACES DE COMISIONES ====================

export interface CommissionsSummary {
  success: boolean;
  period: string;
  date_range: {
    start: Date | string;
    end: Date | string;
  };
  summary: {
    total_ventas_bruto: number;
    total_ventas_count: number;
    total_comisiones_plataforma: number;
    porcentaje_comision: string;
    total_pago_instructores: number;
    porcentaje_instructores: string;
    total_impuestos: number;
    neto_plataforma: number;
    comisiones_disponibles: number;
    comisiones_pendientes: number;
    comisiones_pagadas: number;
  };
  fiscal: {
    iva: number;
    retencion_iva: number;
    isr: number;
    otros_impuestos: number;
    total: number;
  };
  sales_count: number;
  earnings_count: number;
}

export interface CommissionByPeriod {
  period: string;
  total_ventas_bruto: number;
  ventas_count: number;
  comisiones_plataforma: number;
  pago_instructores: number;
  impuestos: number;
  neto_plataforma: number;
}

export interface CommissionByInstructor {
  instructor_id: string;
  instructor_name: string;
  instructor_email: string;
  total_comisiones_plataforma: number;
  total_pago_instructor: number;
  total_ventas_bruto: number;
  total_impuestos: number;
  neto_plataforma: number;
  ventas_count: number;
  disponibles: number;
  pendientes: number;
  pagadas: number;
}

export interface CommissionByProduct {
  product_id: string;
  product_title: string;
  product_type: 'course' | 'project';
  total_comisiones_plataforma: number;
  total_pago_instructor: number;
  total_ventas_bruto: number;
  total_impuestos: number;
  neto_plataforma: number;
  ventas_count: number;
}

// ==================== INTERFACES DE VENTAS DETALLADAS ====================

export interface SaleDetail {
  product: string;
  product_type: 'course' | 'project';
  title: string;
  price_unit: number;
  productDetails?: {
    title: string;
    category: string;
    instructor: string;
  };
}

export interface SaleItem {
  _id: string;
  user: {
    _id: string;
    name: string;
    surname: string;
    email: string;
  };
  detail: SaleDetail[];
  total: number;
  instructorTotal?: number; // Solo para instructores
  method_payment: string;
  currency_payment: string;
  n_transaccion: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private apiUrl = `${environment.url}reports`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.token();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ==================== REPORTES DE VENTAS ====================

  getIncomeByPeriod(period: 'day' | 'week' | 'month' | 'year' = 'month'): Observable<{ incomeData: IncomeData[] }> {
    const params = new HttpParams().set('period', period);
    return this.http.get(`${this.apiUrl}/sales/income-by-period`, {
      headers: this.getHeaders(),
      params
    }) as Observable<{ incomeData: IncomeData[] }>;
  }

  getTopProducts(limit: number = 10): Observable<{ topProducts: TopProduct[] }> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get(`${this.apiUrl}/sales/top-products`, {
      headers: this.getHeaders(),
      params
    }) as Observable<{ topProducts: TopProduct[] }>;
  }

  getSalesByCategory(): Observable<{ salesByCategory: SalesByCategory[] }> {
    return this.http.get(`${this.apiUrl}/sales/by-category`, {
      headers: this.getHeaders()
    }) as Observable<{ salesByCategory: SalesByCategory[] }>;
  }

  getPaymentMethods(): Observable<{ paymentMethods: PaymentMethodReport[] }> {
    return this.http.get(`${this.apiUrl}/sales/payment-methods`, {
      headers: this.getHeaders()
    }) as Observable<{ paymentMethods: PaymentMethodReport[] }>;
  }

  getPeriodComparison(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Observable<PeriodComparison> {
    const params = new HttpParams().set('period', period);
    return this.http.get<PeriodComparison>(`${this.apiUrl}/sales/period-comparison`, {
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * 📋 Lista detallada de ventas
   * @param startDate Fecha inicio (YYYY-MM-DD)
   * @param endDate Fecha fin (YYYY-MM-DD)
   * @param productType Filtrar por tipo de producto
   */
  getSalesList(
    startDate?: string,
    endDate?: string,
    productType?: 'course' | 'project'
  ): Observable<{ success: boolean; sales: SaleItem[]; total: number }> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (productType) params = params.set('product_type', productType);

    return this.http.get<{ success: boolean; sales: SaleItem[]; total: number }>(
      `${this.apiUrl}/sales/list`,
      { headers: this.getHeaders(), params }
    );
  }

  // ==================== REPORTES DE ESTUDIANTES ====================

  getStudentGrowth(period: 'day' | 'week' | 'month' = 'month'): Observable<StudentGrowth> {
    const params = new HttpParams().set('period', period);
    return this.http.get<StudentGrowth>(`${this.apiUrl}/students/growth`, {
      headers: this.getHeaders(),
      params
    });
  }

  getActiveStudents(): Observable<ActiveStudents> {
    return this.http.get<ActiveStudents>(`${this.apiUrl}/students/active`, {
      headers: this.getHeaders()
    });
  }

  getStudentsByCourse(): Observable<{ courseStats: StudentsByCourse[] }> {
    return this.http.get<{ courseStats: StudentsByCourse[] }>(`${this.apiUrl}/students/by-course`, {
      headers: this.getHeaders()
    });
  }

  getTopStudents(limit: number = 10): Observable<{ topStudents: TopStudent[] }> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<{ topStudents: TopStudent[] }>(`${this.apiUrl}/students/top`, {
      headers: this.getHeaders(),
      params
    });
  }

  // ==================== REPORTES DE PRODUCTOS ====================

  getProductsAnalysis(productType?: 'course' | 'project'): Observable<{ products: ProductsAnalysis[] }> {
    let params = new HttpParams();
    if (productType) {
      params = params.set('product_type', productType);
    }
    return this.http.get<{ products: ProductsAnalysis[] }>(`${this.apiUrl}/products/analysis`, {
      headers: this.getHeaders(),
      params
    });
  }

  getLowPerformingProducts(minSales: number = 5, minRating: number = 3): Observable<any> {
    const params = new HttpParams()
      .set('min_sales', minSales.toString())
      .set('min_rating', minRating.toString());
    return this.http.get(`${this.apiUrl}/products/low-performing`, {
      headers: this.getHeaders(),
      params
    });
  }

  getReviewsAnalysis(productId?: string): Observable<any> {
    let params = new HttpParams();
    if (productId) {
      params = params.set('product_id', productId);
    }
    return this.http.get(`${this.apiUrl}/products/reviews`, {
      headers: this.getHeaders(),
      params
    });
  }

  // ==================== REPORTES DE DESCUENTOS (Solo Admin) ====================

  getCouponEffectiveness(): Observable<any> {
    return this.http.get(`${this.apiUrl}/discounts/coupon-effectiveness`, {
      headers: this.getHeaders()
    });
  }

  getDiscountsImpact(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);

    return this.http.get(`${this.apiUrl}/discounts/impact`, {
      headers: this.getHeaders(),
      params
    });
  }

  getCampaignPerformance(): Observable<any> {
    return this.http.get(`${this.apiUrl}/discounts/campaign-performance`, {
      headers: this.getHeaders()
    });
  }

  // ==================== REPORTES DE INSTRUCTORES ====================

  getInstructorRanking(): Observable<any> {
    return this.http.get(`${this.apiUrl}/instructors/ranking`, {
      headers: this.getHeaders()
    });
  }

  getInstructorDetail(instructorId?: string): Observable<any> {
    let params = new HttpParams();
    if (instructorId) {
      params = params.set('instructor_id', instructorId);
    }
    return this.http.get(`${this.apiUrl}/instructors/detail`, {
      headers: this.getHeaders(),
      params
    });
  }

  getRevenueDistribution(): Observable<any> {
    return this.http.get(`${this.apiUrl}/instructors/revenue-distribution`, {
      headers: this.getHeaders()
    });
  }

  // ==================== REPORTES DE COMISIONES (SOLO ADMIN) ====================

  /**
   * 💰 Resumen general de comisiones
   * @param period 'day' | 'week' | 'month' | 'year'
   * @param startDate Fecha inicio (YYYY-MM-DD)
   * @param endDate Fecha fin (YYYY-MM-DD)
   * @param instructorId Filtrar por instructor
   */
  getCommissionsSummary(
    period?: 'day' | 'week' | 'month' | 'year',
    startDate?: string,
    endDate?: string,
    instructorId?: string
  ): Observable<CommissionsSummary> {
    let params = new HttpParams();
    if (period) params = params.set('period', period);
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (instructorId) params = params.set('instructor_id', instructorId);

    return this.http.get<CommissionsSummary>(`${this.apiUrl}/commissions/summary`, {
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * 📊 Comisiones agrupadas por período (para tabla)
   */
  getCommissionsByPeriod(
    period: 'day' | 'week' | 'month' | 'year' = 'month',
    startDate?: string,
    endDate?: string
  ): Observable<{ success: boolean; period: string; data: CommissionByPeriod[] }> {
    let params = new HttpParams().set('period', period);
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);

    return this.http.get<{ success: boolean; period: string; data: CommissionByPeriod[] }>(
      `${this.apiUrl}/commissions/by-period`,
      { headers: this.getHeaders(), params }
    );
  }

  /**
   * 👨‍🏫 Comisiones por instructor
   */
  getCommissionsByInstructor(
    startDate?: string,
    endDate?: string
  ): Observable<{ success: boolean; instructors: CommissionByInstructor[] }> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);

    return this.http.get<{ success: boolean; instructors: CommissionByInstructor[] }>(
      `${this.apiUrl}/commissions/by-instructor`,
      { headers: this.getHeaders(), params }
    );
  }

  /**
   * 📚 Comisiones por producto (curso/proyecto)
   */
  getCommissionsByProduct(
    startDate?: string,
    endDate?: string,
    productType?: 'course' | 'project'
  ): Observable<{ success: boolean; products: CommissionByProduct[] }> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (productType) params = params.set('product_type', productType);

    return this.http.get<{ success: boolean; products: CommissionByProduct[] }>(
      `${this.apiUrl}/commissions/by-product`,
      { headers: this.getHeaders(), params }
    );
  }

  // ==================== REPORTES DE REEMBOLSOS ====================

  /**
   * 💸 Reporte completo de reembolsos
   */
  getRefundsReport(
    startDate?: string,
    endDate?: string,
    status?: string
  ): Observable<{ success: boolean; refunds: any[] }> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (status) params = params.set('status', status);

    return this.http.get<{ success: boolean; refunds: any[] }>(
      `${this.apiUrl}/refunds`,
      { headers: this.getHeaders(), params }
    );
  }

  /**
   * 📊 Reporte completo de ventas con detalles
   */
  getSalesReport(
    startDate?: string,
    endDate?: string,
    productType?: string
  ): Observable<{ success: boolean; sales: any[] }> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (productType) params = params.set('product_type', productType);

    return this.http.get<{ success: boolean; sales: any[] }>(
      `${this.apiUrl}/sales/report`,
      { headers: this.getHeaders(), params }
    );
  }

  /**
   * 👥 Reporte de estudiantes
   */
  getStudentsReport(
    startDate?: string,
    endDate?: string
  ): Observable<{ success: boolean; students: any[] }> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);

    return this.http.get<{ success: boolean; students: any[] }>(
      `${this.apiUrl}/students/report`,
      { headers: this.getHeaders(), params }
    );
  }

  /**
   * 📦 Reporte de productos
   */
  getProductsReport(
    productType?: string
  ): Observable<{ success: boolean; products: any[] }> {
    let params = new HttpParams();
    if (productType) params = params.set('product_type', productType);

    return this.http.get<{ success: boolean; products: any[] }>(
      `${this.apiUrl}/products/report`,
      { headers: this.getHeaders(), params }
    );
  }
}
