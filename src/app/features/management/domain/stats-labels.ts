import { PAYMENT_METHOD_LABELS, PaymentMethod } from '../../billing';
import type { BarRow } from '../components/bar-list/bar-list.component';
import { AppointmentStatusKey, ChannelKey } from '../models/dashboard.models';

const APPOINTMENT_STATUS_ROWS: { key: AppointmentStatusKey; label: string; tone: BarRow['tone'] }[] = [
  { key: 'PENDING', label: 'Agendadas', tone: 'scheduled' },
  { key: 'CONFIRMED', label: 'Confirmadas', tone: 'scheduled' },
  { key: 'ATTENDED', label: 'Atendidas', tone: 'attended' },
  { key: 'NO_SHOW', label: 'No asistió', tone: 'no-show' },
  { key: 'CANCELLED', label: 'Canceladas', tone: 'cancelled' },
  { key: 'RESCHEDULED', label: 'Reprogramadas', tone: 'cancelled' },
];

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  RECEPTION: 'Recepción',
  PROFESSIONAL: 'Profesional',
  BOT: 'Bot de WhatsApp',
  WALK_IN: 'Sin cita',
};

export function appointmentStatusRows(byStatus: Record<string, number>): BarRow[] {
  return APPOINTMENT_STATUS_ROWS.map((status) => {
    const value = byStatus[status.key] ?? 0;
    return { key: status.key, label: status.label, value, valueText: String(value), tone: status.tone };
  });
}

export function channelRows(byChannel: { source: string; appointments: number }[]): BarRow[] {
  return byChannel.map((channel) => {
    const label = CHANNEL_LABELS[channel.source as ChannelKey] ?? channel.source;
    return {
      key: channel.source,
      label,
      value: channel.appointments,
      valueText: String(channel.appointments),
    };
  });
}

export function paymentMethodRows(
  byMethod: Record<string, number>,
  formatMoney: (value: number) => string
): BarRow[] {
  return (Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => {
    const value = byMethod[method] ?? 0;
    return { key: method, label: PAYMENT_METHOD_LABELS[method], value, valueText: formatMoney(value) };
  });
}
