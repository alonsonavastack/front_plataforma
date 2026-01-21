import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TaxBreakdownService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.url}admin/tax-breakdown`;

    // Obtener reporte de retenciones
    getSalesBreakdown(month?: number, year?: number, instructorSearch?: string, page: number = 1, limit: number = 20, status?: string): Observable<any> {
        let params = new HttpParams();
        if (month) params = params.set('month', month);
        if (year) params = params.set('year', year);
        // ✅ Cambio: enviar como instructor_search (texto) en lugar de instructor_id (ObjectId)
        if (instructorSearch) params = params.set('instructor_search', instructorSearch);
        params = params.set('page', page);
        params = params.set('limit', limit);
        if (status && status !== 'all') params = params.set('status', status);

        return this.http.get(`${this.apiUrl}/sales`, { params });
    }

    // Generar CFDI (Mock)
    generateCFDI(retentionId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/generate-cfdi`, { retention_id: retentionId });
    }

    // Reenviar CFDI a Telegram
    resendCFDIToTelegram(retentionId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/resend-cfdi`, { retention_id: retentionId });
    }

    // Exportar a Excel/CSV
    exportRetentions(month: number, year: number, instructorSearch?: string, status?: string): Observable<Blob> {
        let params = new HttpParams()
            .set('month', month)
            .set('year', year);

        if (instructorSearch) params = params.set('instructor_search', instructorSearch);
        if (status && status !== 'all') params = params.set('status', status);

        return this.http.get(`${this.apiUrl}/export`, { params, responseType: 'blob' });
    }

    // Obtener conteo de declaraciones pendientes
    getPendingCount(): Observable<any> {
        return this.http.get(`${this.apiUrl}/pending-count`);
    }
}
