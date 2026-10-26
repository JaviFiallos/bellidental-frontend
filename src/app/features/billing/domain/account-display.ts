import { PatientAccount, PaymentMethod } from '../models/billing.models';

export type BalanceTone = 'due' | 'credit' | 'settled';

export interface BalanceStatus {
  label: string;
  amount: number | null;
  tone: BalanceTone;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
};

const AMOUNT_PATTERN = /^\d{1,8}([.,]\d{1,2})?$/;

export function balanceStatus(balance: number): BalanceStatus {
  if (balance > 0) return { label: 'Saldo pendiente', amount: balance, tone: 'due' };
  if (balance < 0) return { label: 'Saldo a favor', amount: -balance, tone: 'credit' };
  return { label: 'Sin saldo pendiente', amount: null, tone: 'settled' };
}

/** Acepta "25", "25,5", "25.50". Devuelve null si el texto no es un monto mayor que 0. */
export function parseAmount(text: string): number | null {
  const normalized = text.trim();
  if (!AMOUNT_PATTERN.test(normalized)) return null;
  const amount = Number(normalized.replace(',', '.'));
  return amount > 0 ? amount : null;
}

export function formatAmountInput(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function sessionDue(account: PatientAccount, encounterId: string): number | null {
  const session = account.sessions.find((s) => s.encounterId === encounterId);
  if (!session) return null;
  return Number((session.charge - session.payment).toFixed(2));
}
