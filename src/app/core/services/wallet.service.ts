import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';

export interface WalletTransaction {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  description: string;
  metadata?: {
    refundId?: string;
    orderId?: string;
    reason?: string;
  };
  createdAt: string;
}

export interface Wallet {
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  private baseUrl = environment.url + 'wallet';
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  // ✅ Signals simples
  private walletData = signal<Wallet | null>(null);
  private walletLoading = signal(false);

  // 📊 Computed values
  balance = computed(() => this.walletData()?.balance ?? 0);
  currency = computed(() => this.walletData()?.currency ?? 'USD');
  transactions = computed(() => this.walletData()?.transactions ?? []);
  loading = this.walletLoading.asReadonly();
  error = signal<string | null>(null);

  // Legacy compatibility
  currentBalance = this.balance;

  // 🔄 Cargar billetera
  loadWallet(): void {
    this.walletLoading.set(true);

    this.http.get<Wallet>(`${this.baseUrl}/my-wallet`).subscribe({
      next: (wallet) => {
        this.walletData.set(wallet);
        this.walletLoading.set(false);
      },
      error: (error) => {
        this.toastService.error('Error', 'No se pudo cargar la billetera');
        this.error.set('No se pudo cargar la billetera');
        this.walletLoading.set(false);
      }
    });
  }

  reloadWallet(): void {
    this.loadWallet();
  }

  getMyWallet(): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.baseUrl}/my-wallet`);
  }

  getBalance(): Observable<{ balance: number; currency: string }> {
    return this.http.get<{ balance: number; currency: string }>(`${this.baseUrl}/balance`);
  }

  addCredit(userId: string, amount: number, description: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/add-credit`, { userId, amount, description }).pipe(
      tap(() => this.loadWallet())
    );
  }

  getAllWallets(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/all-wallets`);
  }

  getUserWallet(userId: string): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.baseUrl}/admin/user-wallet/${userId}`);
  }
}
