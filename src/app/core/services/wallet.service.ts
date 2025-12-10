import { Injectable, inject, signal, computed, resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
// rxResource removed
import { firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';
import { AuthService } from './auth'; // 🔥 Import AuthService

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
  private authService = inject(AuthService); // 🔥 Inject Auth Service

  // 🔥 Signal para disparar recarga
  private reloadTrigger = signal(0);

  // 🔥 rxResource reemplazado por resource standard
  private walletResource = resource({
    loader: () => {
      this.reloadTrigger();
      // 🔥 Prevent fetch if no token (avoid 401 on logout)
      if (!this.authService.token()) return Promise.resolve(null);
      return firstValueFrom(this.http.get<Wallet>(`${this.baseUrl}/my-wallet`));
    }
  });

  // 🔥 Señales públicas derivadas del resource
  balance = computed(() => (this.walletResource.value() as Wallet | undefined)?.balance ?? 0);
  currency = computed(() => (this.walletResource.value() as Wallet | undefined)?.currency ?? 'USD');
  transactions = computed(() => (this.walletResource.value() as Wallet | undefined)?.transactions ?? []);
  loading = computed(() => this.walletResource.isLoading());
  error = computed(() => this.walletResource.error());
  hasError = computed(() => this.walletResource.hasValue() === false && !this.walletResource.isLoading());

  // Legacy compatibility
  currentBalance = this.balance;

  // 🔥 Recargar billetera manualmente
  loadWallet(): void {
    this.reloadTrigger.update(v => v + 1);
  }

  reloadWallet(): void {
    this.loadWallet();
  }

  // 🔥 Métodos imperativos (para casos donde se necesita Observable)
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

  // 🔥 Métodos administrativos
  getAllWallets() {
    return this.http.get<any[]>(`${this.baseUrl}/admin/all-wallets`);
  }

  getUserWallet(userId: string) {
    return this.http.get<Wallet>(`${this.baseUrl}/admin/user-wallet/${userId}`);
  }
}
