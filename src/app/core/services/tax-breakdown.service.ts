import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TaxBreakdownService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.url}admin/tax-breakdown`;

    getSalesBreakdown(
        month?: number, year?: number, instructorSearch?: string,
        page = 1, limit = 20, status?: string,
        startDate?: string, endDate?: string
    ): Observable<any> {
        let p = new HttpParams();
        if (month) p = p.set('month', month);
        if (year) p = p.set('year', year);
        if (instructorSearch) p = p.set('instructor_search', instructorSearch);
        p = p.set('page', page).set('limit', limit);
        if (status && status !== 'all') p = p.set('status', status);
        if (startDate) p = p.set('start_date', startDate);
        if (endDate) p = p.set('end_date', endDate);
        return this.http.get(`${this.apiUrl}/sales`, { params: p });
    }

    getSummary(): Observable<any> {
        return this.http.get(`${this.apiUrl}/summary`);
    }

    exportRetentions(
        month: number, year: number, instructorSearch?: string,
        status?: string, startDate?: string, endDate?: string
    ): Observable<Blob> {
        let p = new HttpParams().set('month', month).set('year', year);
        if (instructorSearch) p = p.set('instructor_search', instructorSearch);
        if (status && status !== 'all') p = p.set('status', status);
        if (startDate) p = p.set('start_date', startDate);
        if (endDate) p = p.set('end_date', endDate);
        return this.http.get(`${this.apiUrl}/export`, { params: p, responseType: 'blob' });
    }

    generateCFDI(retentionId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/generate-cfdi`, { retention_id: retentionId });
    }

    resendCFDIToTelegram(retentionId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/resend-cfdi`, { retention_id: retentionId });
    }

    getPendingCount(): Observable<any> {
        return this.http.get(`${this.apiUrl}/pending-count`);
    }
}
