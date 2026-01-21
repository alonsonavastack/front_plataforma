import { Injectable, signal } from '@angular/core';

export interface ModalOptions {
    title: string;
    message: string;
    icon?: 'success' | 'warning' | 'error' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    // 🔥 New fields for prompt
    isPrompt?: boolean;
    inputType?: string; // 'text', 'password', etc.
    placeholder?: string;
    // Internal use for prompt value
    inputValue?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    isOpen = signal(false);
    options = signal<ModalOptions | null>(null);

    private resolveConfirm?: (value: boolean | string) => void;
    private cleanupTimeout: any; // Reference to the cleanup timer

    confirm(options: ModalOptions): Promise<boolean> {
        return this.openModal(options) as Promise<boolean>;
    }

    alert(options: Omit<ModalOptions, 'cancelText' | 'onCancel'>): Promise<void> {
        return this.confirm({
            ...options,
            cancelText: undefined
        }).then(() => { });
    }

    prompt(options: ModalOptions): Promise<string | false> {
        return this.openModal({
            ...options,
            isPrompt: true,
            inputType: options.inputType || 'text'
        }) as Promise<string | false>;
    }

    private openModal(options: ModalOptions): Promise<boolean | string> {
        // 🔥 Fix: Cancel any pending cleanup from a previous modal
        if (this.cleanupTimeout) {
            clearTimeout(this.cleanupTimeout);
            this.cleanupTimeout = null;
        }

        this.options.set(options);
        this.isOpen.set(true);

        return new Promise<boolean | string>((resolve) => {
            this.resolveConfirm = resolve;
        });
    }

    close(confirmed: boolean, value?: string) {
        this.isOpen.set(false);

        if (this.resolveConfirm) {
            if (confirmed && this.options()?.isPrompt) {
                this.resolveConfirm(value || '');
            } else {
                this.resolveConfirm(confirmed);
            }
            this.resolveConfirm = undefined;
        }

        const currentOptions = this.options();
        if (confirmed && currentOptions?.onConfirm) {
            currentOptions.onConfirm();
        } else if (!confirmed && currentOptions?.onCancel) {
            currentOptions.onCancel();
        }

        // Clear options after animation might finish
        if (this.cleanupTimeout) {
            clearTimeout(this.cleanupTimeout);
        }

        this.cleanupTimeout = setTimeout(() => {
            if (!this.isOpen()) {
                this.options.set(null);
            }
        }, 300);
    }
}
