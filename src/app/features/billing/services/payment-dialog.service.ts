import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  PaymentDialogComponent,
  PaymentDialogData,
} from '../components/payment-dialog/payment-dialog.component';
import { Payment } from '../models/billing.models';

export type PaymentDialogRequest = PaymentDialogData;

@Injectable({
  providedIn: 'root',
})
export class PaymentDialogService {
  private readonly dialog = inject(Dialog);

  open(request: PaymentDialogRequest): Observable<Payment | null> {
    const dialogRef = this.dialog.open<Payment | null, PaymentDialogData>(
      PaymentDialogComponent,
      {
        data: request,
        role: 'dialog',
        ariaLabelledBy: 'payment-dialog-title',
        hasBackdrop: true,
        backdropClass: 'cdk-overlay-dark-backdrop',
        width: 'min(36rem, 100vw)',
        maxHeight: '90vh',
      }
    );

    return dialogRef.closed.pipe(map((res) => res ?? null));
  }
}
