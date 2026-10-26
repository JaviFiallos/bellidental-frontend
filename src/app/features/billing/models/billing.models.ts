export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

export interface AccountSession {
  encounterId: string | null;
  date: string;
  professionalName: string | null;
  treatments: string[];
  charge: number;
  payment: number;
  runningBalance: number;
}

export interface PatientAccount {
  patientId: string;
  patientName: string;
  totalCharges: number;
  totalPayments: number;
  balance: number;
  sessions: AccountSession[];
}

export interface CreatePaymentRequest {
  amount: number;
  method: PaymentMethod;
  encounterId?: string;
}

export interface Payment {
  id: string;
  patientId: string;
  encounterId: string | null;
  amount: number;
  method: PaymentMethod;
  receiptNumber: string;
  paidAt: string;
  receivedBy: string;
  voided: boolean;
  voidReason: string | null;
}

export interface PaymentListItem {
  id: string;
  encounterId: string | null;
  amount: number;
  method: PaymentMethod;
  receiptNumber: string;
  paidAt: string;
  receivedBy: string;
  receivedByName: string | null;
  voided: boolean;
  voidedAt: string | null;
  voidReason: string | null;
}
