import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SalesReportComponent } from './tabs/sales-report.component';
import { RefundsReportComponent } from './tabs/refunds-report.component';
import { StudentsReportComponent } from './tabs/students-report.component';
import { ProductsReportComponent } from './tabs/products-report.component';
import { CommissionsReportComponent } from './tabs/commissions-report.component';
import { AuthService } from '../../core/services/auth';

type TabType = 'sales' | 'students' | 'products' | 'commissions' | 'refunds';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    SalesReportComponent,
    RefundsReportComponent,
    StudentsReportComponent,
    ProductsReportComponent,
    CommissionsReportComponent
  ],
  templateUrl: './reports.component.html',
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out;
    }
  `]
})
export class ReportsComponent {
  authService = inject(AuthService);
  
  activeTab = signal<TabType>('sales');

  currentDate = signal(new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));

  // 🔒 Verificar si el usuario es admin
  isAdmin(): boolean {
    return this.authService.user()?.rol === 'admin';
  }
}
