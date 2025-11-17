import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private baseUrl = environment.url + 'wallet';

  // Signals para el estado de la billetera
  balance = signal<number>(0);
  currency = signal<string>('USD');
  transactions = signal<WalletTransaction[]>([]);
  loading = signal<boolean>(false);
  error = signal<string>('');

  // Signal legacy para compatibilidad
  currentBalance = signal<number>(0);

  constructor(private http: HttpClient) {}

  /**
   * Cargar billetera usando signals
   */
  loadWallet(): void {
    this.loading.set(true);
    this.error.set('');

    this.getMyWallet().subscribe({
      next: (wallet) => {
        console.log('💰 [WalletService] Wallet loaded:', wallet);
        this.balance.set(wallet.balance);
        this.currency.set(wallet.currency);
        this.transactions.set(wallet.transactions || []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ [WalletService] Error loading wallet:', error);
        this.error.set('Error al cargar la billetera');
        this.loading.set(false);
      }
    });
  }

  /**
   * Obtener billetera completa del usuario actual
   */
  getMyWallet(): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.baseUrl}/my-wallet`).pipe(
      tap(wallet => {
        this.currentBalance.set(wallet.balance);
      })
    );
  }

  /**
   * Obtener solo el balance actual
   */
  getBalance(): Observable<{ balance: number; currency: string }> {
    return this.http.get<{ balance: number; currency: string }>(`${this.baseUrl}/balance`).pipe(
      tap(data => {
        this.currentBalance.set(data.balance);
      })
    );
  }

  /**
   * Agregar crédito manualmente (Solo Admin)
   */
  addCredit(userId: string, amount: number, description: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/add-credit`, {
      userId,
      amount,
      description
    });
  }

  /**
   * Obtener todas las billeteras (Solo Admin)
   */
  getAllWallets(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/all-wallets`);
  }

  /**
   * Obtener billetera de un usuario específico (Solo Admin)
   */
  getUserWallet(userId: string): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.baseUrl}/admin/user-wallet/${userId}`);
  }
}
