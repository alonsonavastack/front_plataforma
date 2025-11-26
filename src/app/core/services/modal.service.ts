import { Injectable, signal } from '@angular/core';

export interface ModalOptions {
    title: string;
    message: string;
    icon?: 'success' | 'warning' | 'error' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
}

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    isOpen = signal(false);
    options = signal<ModalOptions | null>(null);

    private resolveConfirm?: (value: boolean) => void;

    confirm(options: ModalOptions): Promise<boolean> {
        this.options.set(options);
        this.isOpen.set(true);

        return new Promise<boolean>((resolve) => {
            this.resolveConfirm = resolve;
        });
    }

    alert(options: Omit<ModalOptions, 'cancelText' | 'onCancel'>): Promise<void> {
        return this.confirm({
            ...options,
            cancelText: undefined
        }).then(() => { });
    }

    close(confirmed: boolean) {
        this.isOpen.set(false);

        if (this.resolveConfirm) {
            this.resolveConfirm(confirmed);
            this.resolveConfirm = undefined;
        }

        const currentOptions = this.options();
        if (confirmed && currentOptions?.onConfirm) {
            currentOptions.onConfirm();
        } else if (!confirmed && currentOptions?.onCancel) {
            currentOptions.onCancel();
        }

        // Clear options after animation might finish, or immediately
        setTimeout(() => this.options.set(null), 300);
    }
}
