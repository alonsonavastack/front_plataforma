import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaxBreakdownService } from '../../core/services/tax-breakdown.service';

@Component({
    selector: 'app-admin-tax-breakdown',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePipe],
    templateUrl: './admin-tax-breakdown.component.html',
})
export class AdminTaxBreakdownComponent implements OnInit, OnDestroy {
    private taxService = inject(TaxBreakdownService);

    // ── Filtros ──
    selectedMonth = signal<number>(new Date().getMonth() + 1);
    selectedYear = signal<number>(new Date().getFullYear());
    selectedStatus = signal<string>('all');
    selectedType = signal<string>('all'); // all | organic | referral
    startDate = signal<string>('');
    endDate = signal<string>('');
    searchQuery = signal<string>('');

    // ── Datos ──
    rows = signal<any[]>([]);
    totals = signal<any>(null);
    summary = signal<any>(null);
    pagination = signal<any>(null);
    loading = signal<boolean>(false);
    expandedRow = signal<string | null>(null);

    // ── Vista ──
    activeTab = signal<'platform' | 'instructor' | 'detail'>('platform');
    currentPage = signal<number>(1);
    itemsPerPage = 20;

    private searchTimeout: any;

    months = [
        { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
    ];

    ngOnInit() {
        this.loadSummary();
        this.loadData();
    }

    ngOnDestroy() {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
    }

    loadSummary() {
        this.taxService.getSummary().subscribe({
            next: (r: any) => { if (r.success) this.summary.set(r.summary); },
            error: () => { }
        });
    }

    loadData() {
        this.loading.set(true);
        this.taxService.getSalesBreakdown(
            this.selectedMonth(),
            this.selectedYear(),
            this.searchQuery(),
            this.currentPage(),
            this.itemsPerPage,
            this.selectedStatus(),
            this.startDate(),
            this.endDate()
        ).subscribe({
            next: (resp: any) => {
                if (resp.success) {
                    let data = resp.data;
                    // Filtro local por tipo (orgánico/referido)
                    if (this.selectedType() !== 'all') {
                        data = data.filter((r: any) =>
                            this.selectedType() === 'referral' ? r.is_referral : !r.is_referral
                        );
                    }
                    this.rows.set(data);
                    this.totals.set(resp.totals);
                    this.pagination.set(resp.pagination);
                }
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    onFilterChange() {
        this.currentPage.set(1);
        this.loadData();
    }

    onSearch(event: any) {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.searchQuery.set(event.target.value);
            this.currentPage.set(1);
            this.loadData();
        }, 500);
    }

    clearFilters() {
        this.selectedMonth.set(new Date().getMonth() + 1);
        this.selectedYear.set(new Date().getFullYear());
        this.selectedStatus.set('all');
        this.selectedType.set('all');
        this.startDate.set('');
        this.endDate.set('');
        this.searchQuery.set('');
        this.currentPage.set(1);
        this.loadData();
    }

    changePage(p: number) {
        if (!this.pagination()) return;
        if (p < 1 || p > this.pagination().totalPages) return;
        this.currentPage.set(p);
        this.loadData();
    }

    toggleRow(id: string) {
        this.expandedRow.set(this.expandedRow() === id ? null : id);
    }

    exportToCSV() {
        this.taxService.exportRetentions(
            this.selectedMonth(), this.selectedYear(),
            this.searchQuery(), this.selectedStatus(),
            this.startDate(), this.endDate()
        ).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const period = `${this.selectedMonth()}_${this.selectedYear()}`;
                a.download = `desglose_fiscal_${period}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
            },
            error: (err) => console.error('Error exportando:', err)
        });
    }

    getMonthLabel(v: number): string {
        return this.months.find(m => m.value === v)?.label || '';
    }

    getStatusBadge(status: string): string {
        const map: any = {
            pending: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
            declared: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
            paid: 'bg-lime-500/20 text-lime-400 border border-lime-500/30',
            cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30'
        };
        return map[status] || 'bg-slate-500/20 text-slate-400';
    }

    getStatusLabel(status: string): string {
        const map: any = { pending: 'Pendiente', declared: 'Declarado', paid: 'Pagado', cancelled: 'Cancelado' };
        return map[status] || status;
    }

    formatCurrency(v: number): string {
        if (!v && v !== 0) return 'MX$0.00';
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
    }

    get monthYearLabel(): string {
        return `${this.getMonthLabel(this.selectedMonth())} ${this.selectedYear()}`;
    }
}
