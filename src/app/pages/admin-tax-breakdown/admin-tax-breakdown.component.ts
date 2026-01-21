import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaxBreakdownService } from '../../core/services/tax-breakdown.service';
import { SaleDetailModalComponent } from './sale-detail-modal/sale-detail-modal.component';

@Component({
    selector: 'app-admin-tax-breakdown',
    standalone: true,
    imports: [CommonModule, FormsModule, SaleDetailModalComponent],
    templateUrl: './admin-tax-breakdown.component.html',
})
export class AdminTaxBreakdownComponent implements OnInit, OnDestroy {
    private taxService = inject(TaxBreakdownService);

    // Signals
    selectedMonth = signal<number>(new Date().getMonth() + 1);
    selectedYear = signal<number>(new Date().getFullYear());
    selectedStatus = signal<string>('all');
    sales = signal<any[]>([]);
    totals = signal<any>(null);
    pagination = signal<any>(null);
    selectedSale = signal<any>(null);

    // Pagination & Search
    searchQuery = signal<string>('');
    currentPage = signal<number>(1);
    itemsPerPage = signal<number>(20);
    searchTimeout: any;

    months = [
        { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
    ];

    ngOnInit() {
        // ✅ Cargar datos iniciales UNA VEZ al inicio
        this.loadData();
    }

    ngOnDestroy() {
        // Limpiar timeout si existe
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
    }

    loadData() {
        console.log('🔄 [TaxBreakdown] Cargando datos...', {
            month: this.selectedMonth(),
            year: this.selectedYear(),
            status: this.selectedStatus(),
            search: this.searchQuery(),
            page: this.currentPage()
        });

        this.taxService.getSalesBreakdown(
            this.selectedMonth(),
            this.selectedYear(),
            this.searchQuery(),
            this.currentPage(),
            this.itemsPerPage(),
            this.selectedStatus()
        )
            .subscribe({
                next: (resp: any) => {
                    if (resp.success) {
                        this.sales.set(resp.data);
                        this.totals.set(resp.totals);
                        this.pagination.set(resp.pagination);
                        console.log('✅ [TaxBreakdown] Datos cargados:', resp.data.length, 'registros');
                    }
                },
                error: (err) => {
                    console.error('❌ [TaxBreakdown] Error:', err);
                }
            });
    }

    // ✅ Método para cambios en filtros (mes, año, estado) - SIN debounce
    onFilterChange() {
        console.log('🔍 [TaxBreakdown] Filtro cambiado');
        this.currentPage.set(1); // Reset a primera página
        this.loadData();
    }

    // ✅ Búsqueda con debounce (ya existía, solo agregamos logs)
    onSearch(event: any) {
        const query = event.target.value;
        
        // Cancelar búsqueda anterior si existe
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Esperar 500ms después de que el usuario deje de escribir
        this.searchTimeout = setTimeout(() => {
            console.log('🔍 [TaxBreakdown] Búsqueda:', query);
            this.searchQuery.set(query);
            this.currentPage.set(1); // Reset a primera página
            this.loadData();
        }, 500);
    }

    changePage(page: number) {
        if (page < 1 || (this.pagination() && page > this.pagination().totalPages)) return;
        console.log('📄 [TaxBreakdown] Cambio de página:', page);
        this.currentPage.set(page);
        this.loadData();
    }

    openDetail(sale: any) {
        console.log('👁️ [TaxBreakdown] Abriendo detalle:', sale);
        this.selectedSale.set(sale);
    }

    exportToExcel() {
        console.log('📊 [TaxBreakdown] Exportando...');
        this.taxService.exportRetentions(
            this.selectedMonth(),
            this.selectedYear(),
            this.searchQuery(),
            this.selectedStatus()
        ).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `reporte_fiscal_${this.selectedMonth()}_${this.selectedYear()}.csv`;
                link.click();
                window.URL.revokeObjectURL(url);
                console.log('✅ [TaxBreakdown] Exportado exitosamente');
            },
            error: (err) => {
                console.error('❌ [TaxBreakdown] Error en exportación:', err);
            }
        });
    }
}
