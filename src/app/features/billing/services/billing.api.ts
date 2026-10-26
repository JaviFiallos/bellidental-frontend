import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { CreatePaymentRequest, PatientAccount, Payment, PaymentListItem } from '../models/billing.models';
import { DocumentLink } from '../../../shared/utils/pdf-window';

@Injectable({
  providedIn: 'root',
})
export class BillingApi {
  private readonly api = inject(ApiClient);

  getAccount(patientId: string): Observable<PatientAccount> {
    return this.api.get<PatientAccount>(`/api/v1/patients/${patientId}/account`);
  }

  listPayments(patientId: string): Observable<PaymentListItem[]> {
    return this.api.get<PaymentListItem[]>(`/api/v1/patients/${patientId}/payments`);
  }

  registerPayment(patientId: string, request: CreatePaymentRequest): Observable<Payment> {
    return this.api.post<Payment>(`/api/v1/patients/${patientId}/payments`, request);
  }

  /** Enlace temporal al comprobante A5 en PDF. */
  receiptLink(paymentId: string): Observable<DocumentLink> {
    return this.api.post<DocumentLink>(`/api/v1/payments/${paymentId}/receipt-link`);
  }

  voidPayment(paymentId: string, voidReason: string): Observable<Payment> {
    return this.api.post<Payment>(`/api/v1/payments/${paymentId}/void`, { voidReason });
  }
}
