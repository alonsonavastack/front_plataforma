import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class CouponService {
    private apiUrl = `${environment.url}coupons`;

    constructor(private http: HttpClient) { }

    createCoupon(data: { project_id: string; product_type: string; days_duration: number }): Observable<any> {
        return this.http.post(`${this.apiUrl}/create`, data);
    }

    getCoupons(): Observable<any> {
        return this.http.get(`${this.apiUrl}/list`);
    }

    validateCoupon(code: string, productId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/validate`, { code, product_id: productId });
    }
}
