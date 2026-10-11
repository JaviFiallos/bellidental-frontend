import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(message: string): void {
    const id = this.generateId();
    const toast: Toast = { id, type: 'success', message };
    this._toasts.update((items) => [...items, toast]);

    // Éxito se cierra solo a los 5 s
    setTimeout(() => {
      this.dismiss(id);
    }, 5000);
  }

  error(message: string): void {
    const id = this.generateId();
    const toast: Toast = { id, type: 'error', message };
    // Error queda hasta que el usuario lo cierre manualmente
    this._toasts.update((items) => [...items, toast]);
  }

  dismiss(id: string): void {
    this._toasts.update((items) => items.filter((t) => t.id !== id));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }
}
