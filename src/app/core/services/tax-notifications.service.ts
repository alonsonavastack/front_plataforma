import { inject, Injectable, signal } from '@angular/core';
import { TaxBreakdownService } from './tax-breakdown.service';
import { interval, Subscription, switchMap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class TaxNotificationsService {
    private taxService = inject(TaxBreakdownService);

    // Signals
    pendingCount = signal<number>(0);
    pollingSubscription: Subscription | null = null;

    loadNotifications() {
        this.taxService.getPendingCount().subscribe({
            next: (resp: any) => {
                if (resp.success) {
                    this.pendingCount.set(resp.count);
                }
            },
            error: (err) => console.error('Error loading tax notifications', err)
        });
    }

    startPolling() {
        // Poll every 5 minutes (300000ms) or on demand.
        // Given the nature of this data (monthly), aggressive polling isn't needed.
        // Maybe just load once on init and every 10 mins.
        this.loadNotifications();

        this.pollingSubscription = interval(600000).subscribe(() => {
            this.loadNotifications();
        });
    }

    stopPolling() {
        if (this.pollingSubscription) {
            this.pollingSubscription.unsubscribe();
            this.pollingSubscription = null;
        }
    }
}
