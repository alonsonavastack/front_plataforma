import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../core/services/wallet.service';

interface Wallet {
  _id: string;
  user: {
    _id: string;
    name: string;
    surname: string;
    email: string;
  };
  balance: number;
  currency: string;
  transactions: any[];
}

interface WalletDisplay {
  userId: string;
  userName: string;
  userEmail: string;
  balance: number;
  currency: string;
  transactionsCount: number;
  lastTransaction?: Date;
}

@Component({
  selector: 'app-admin-wallets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-wallets.component.html'
})
export class AdminWalletsComponent implements OnInit {
  // Estados principales
  wallets = signal<WalletDisplay[]>([]);
  loading = signal<boolean>(true);
  searchTerm = signal<string>('');

  // Computed para filtrado
  filteredWallets = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.wallets();

    return this.wallets().filter(wallet =>
      wallet.userName.toLowerCase().includes(term) ||
      wallet.userEmail.toLowerCase().includes(term)
    );
  });

  // Computed para estadísticas
  totalBalance = computed(() => 
    this.wallets().reduce((sum, wallet) => sum + wallet.balance, 0)
  );

  walletsWithBalance = computed(() => 
    this.wallets().filter(wallet => wallet.balance > 0).length
  );

  totalCustomers = computed(() => this.wallets().length);

  // Modal agregar crédito
  showAddCreditModal = signal<boolean>(false);
  selectedUserId = signal<string>('');
  selectedUserName = signal<string>('');
  creditAmount = signal<number>(0);
  creditDescription = signal<string>('');
  addingCredit = signal<boolean>(false);

  // Modal detalles
  showDetailsModal = signal<boolean>(false);
  selectedWalletDetails = signal<any>(null);
  loadingDetails = signal<boolean>(false);

  constructor(private walletService: WalletService) {}

  ngOnInit() {
    this.loadAllWallets();
  }

  /**
   * 🔄 Cargar todas las billeteras de CLIENTES desde el backend
   * ✅ El backend YA filtra solo usuarios con rol 'customer'
   */
  loadAllWallets() {
    console.log('💰 [AdminWallets] Cargando billeteras de clientes...');
    this.loading.set(true);

    this.walletService.getAllWallets().subscribe({
      next: (wallets: Wallet[]) => {
        console.log(`✅ [AdminWallets] Billeteras cargadas: ${wallets.length}`);
        console.log('📊 [AdminWallets] Datos:', wallets);

        const walletsDisplay: WalletDisplay[] = wallets.map(wallet => {
          const lastTx = wallet.transactions && wallet.transactions.length > 0
            ? new Date(wallet.transactions[0].createdAt)
            : undefined;

          return {
            userId: wallet.user._id,
            userName: `${wallet.user.name} ${wallet.user.surname || ''}`.trim(),
            userEmail: wallet.user.email,
            balance: wallet.balance,
            currency: wallet.currency,
            transactionsCount: wallet.transactions?.length || 0,
            lastTransaction: lastTx
          };
        });

        // Ordenar por balance descendente
        walletsDisplay.sort((a, b) => b.balance - a.balance);

        this.wallets.set(walletsDisplay);
        this.loading.set(false);

        console.log('📈 [AdminWallets] Estadísticas:', {
          total: walletsDisplay.length,
          conSaldo: this.walletsWithBalance(),
          balanceTotal: `$${this.totalBalance().toFixed(2)}`
        });
      },
      error: (error) => {
        console.error('❌ [AdminWallets] Error:', error);
        alert('Error al cargar billeteras: ' + (error.error?.message || error.message));
        this.loading.set(false);
      }
    });
  }

  /**
   * ➕ Abrir modal para agregar crédito
   */
  openAddCreditModal(wallet: WalletDisplay) {
    this.selectedUserId.set(wallet.userId);
    this.selectedUserName.set(wallet.userName);
    this.creditAmount.set(0);
    this.creditDescription.set('');
    this.showAddCreditModal.set(true);
  }

  closeAddCreditModal() {
    this.showAddCreditModal.set(false);
    this.selectedUserId.set('');
    this.selectedUserName.set('');
    this.creditAmount.set(0);
    this.creditDescription.set('');
  }

  /**
   * 💰 Agregar crédito a la billetera
   */
  addCredit() {
    if (this.creditAmount() <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    if (!this.creditDescription().trim()) {
      alert('La descripción es requerida');
      return;
    }

    console.log('➕ [AdminWallets] Agregando crédito:', {
      userId: this.selectedUserId(),
      amount: this.creditAmount(),
      description: this.creditDescription()
    });

    this.addingCredit.set(true);

    this.walletService.addCredit(
      this.selectedUserId(),
      this.creditAmount(),
      this.creditDescription()
    ).subscribe({
      next: (response) => {
        console.log('✅ [AdminWallets] Crédito agregado:', response);
        alert(`Crédito de $${this.creditAmount()} agregado exitosamente`);
        this.closeAddCreditModal();
        this.loadAllWallets(); // Recargar lista
      },
      error: (error) => {
        console.error('❌ [AdminWallets] Error al agregar crédito:', error);
        alert('Error al agregar crédito: ' + (error.error?.message || error.message));
        this.addingCredit.set(false);
      }
    });
  }

  /**
   * 📋 Ver detalles y transacciones de una billetera
   */
  openDetailsModal(wallet: WalletDisplay) {
    this.selectedWalletDetails.set(null);
    this.showDetailsModal.set(true);
    this.loadingDetails.set(true);

    console.log('📋 [AdminWallets] Cargando detalles de:', wallet.userName);

    this.walletService.getUserWallet(wallet.userId).subscribe({
      next: (walletData) => {
        this.selectedWalletDetails.set({
          ...wallet,
          transactions: walletData.transactions
        });
        this.loadingDetails.set(false);
        console.log('✅ [AdminWallets] Detalles cargados:', walletData);
      },
      error: (error) => {
        console.error('❌ [AdminWallets] Error al cargar detalles:', error);
        alert('Error al cargar detalles');
        this.showDetailsModal.set(false);
        this.loadingDetails.set(false);
      }
    });
  }

  closeDetailsModal() {
    this.showDetailsModal.set(false);
    this.selectedWalletDetails.set(null);
  }

  /**
   * 📅 Formatear fecha
   */
  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
