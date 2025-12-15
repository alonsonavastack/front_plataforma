import { Injectable } from '@angular/core';

/**
 * Bank notifications feature removed — service kept as a noop stub to
 * avoid runtime errors in older builds that may still reference it.
 */
@Injectable({ providedIn: 'root' })
export class BankNotificationsService {
  // Count of pending bank verifications (always 0)
  count(): number { return 0; }

  // Computed-like placeholder for pending verifications
  pendingVerifications(): any[] { return []; }

  // No-op: start/stop/reload/markAsVerified are intentionally empty
  startPolling(): void { /* deprecated */ }
  stopPolling(): void { /* deprecated */ }
  loadNotifications(): void { /* deprecated */ }
  reload(): void { /* deprecated */ }
  markAsVerified(_instructorId: string): void { /* deprecated */ }
  ngOnDestroy(): void { /* deprecated */ }
}
