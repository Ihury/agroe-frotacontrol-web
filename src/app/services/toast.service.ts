import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string;
  duration?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  showSuccess(title: string, message: string, details?: string, duration = 5000): void {
    this.showToast('success', title, message, details, duration);
  }

  showError(title: string, message: string, details?: string, duration = 8000): void {
    this.showToast('error', title, message, details, duration);
  }

  showWarning(title: string, message: string, details?: string, duration = 6000): void {
    this.showToast('warning', title, message, details, duration);
  }

  showInfo(title: string, message: string, details?: string, duration = 5000): void {
    this.showToast('info', title, message, details, duration);
  }

  removeToast(id: string): void {
    const currentToasts = this.toastsSubject.value;
    const updatedToasts = currentToasts.filter((toast) => toast.id !== id);
    this.toastsSubject.next(updatedToasts);
  }

  private showToast(
    type: Toast['type'],
    title: string,
    message: string,
    details?: string,
    duration = 5000
  ): void {
    const toast: Toast = {
      id: this.generateId(),
      type,
      title,
      message,
      details,
      duration,
      timestamp: new Date(),
    };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toast.id);
      }, duration);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
