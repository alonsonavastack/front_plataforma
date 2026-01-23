import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';
import { AuthService } from './auth';
import { tap } from 'rxjs/operators';

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
  private authService = inject(AuthService);

  // Señales simples
  private walletData = signal<Wallet | null>(null);
  private isLoading = signal(false);
  private errorState = signal<any>(null);

  // Señales públicas
  balance = computed(() => this.walletData()?.balance ?? 0);
  currency = computed(() => this.walletData()?.currency ?? 'USD');
  transactions = computed(() => this.walletData()?.transactions ?? []);
  loading = computed(() => this.isLoading());
  error = computed(() => this.errorState());
  hasError = computed(() => this.errorState() !== null && !this.isLoading());

  // Compatibilidad legacy
  currentBalance = this.balance;

  constructor() {
    // 🔥 Effect que carga la billetera cuando el token cambia
    effect(() => {
      const token = this.authService.token();
      if (token) {
        this.loadWallet();
      } else {
        // Si no hay token, limpiar la billetera
        this.walletData.set(null);
        this.errorState.set(null);
      }
    });
  }

  // Recargar billetera manualmente
  loadWallet(): void {
    if (!this.authService.token()) {
      this.walletData.set(null);
      return;
    }

    this.isLoading.set(true);
    this.errorState.set(null);

    this.http.get<Wallet>(`${this.baseUrl}/my-wallet`).subscribe({
      next: (wallet) => {
        this.walletData.set(wallet);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorState.set(err);
        this.isLoading.set(false);
      }
    });
  }

  reloadWallet(): void {
    this.loadWallet();
  }

  // Métodos imperativos (para casos donde se necesita Observable)
  getMyWallet() {
    return this.http.get<Wallet>(`${this.baseUrl}/my-wallet`);
  }

  getBalance() {
    return this.http.get<{ balance: number; currency: string }>(`${this.baseUrl}/balance`);
  }

  addCredit(userId: string, amount: number, description: string) {
    return this.http.post(`${this.baseUrl}/add-credit`, { userId, amount, description }).pipe(
      tap(() => this.loadWallet())
    );
  }

  // Métodos administrativos
  getAllWallets() {
    return this.http.get<any[]>(`${this.baseUrl}/admin/all-wallets`);
  }

  getUserWallet(userId: string) {
    return this.http.get<Wallet>(`${this.baseUrl}/admin/user-wallet/${userId}`);
  }
}
