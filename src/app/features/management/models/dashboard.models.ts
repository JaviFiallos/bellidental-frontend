export interface PatientStats {
  totalActive: number;
  newInRange: number;
}

export interface AppointmentStats {
  total: number;
  byStatus: Record<string, number>;
  noShowRate: number;
  completedEncounters: number;
}

export interface BillingStats {
  collected: number;
  byMethod: Record<string, number>;
  outstandingBalance: number;
}

export interface TopTreatment {
  code: string;
  name: string;
  quantity: number;
  amount: number;
}

export interface TopDiagnosis {
  code: string;
  description: string;
  occurrences: number;
  patients: number;
}

export interface DailyStat {
  date: string;
  appointments: number;
  completedEncounters: number;
  newPatients: number;
  collected: number;
}

export interface ProfessionalStats {
  professionalId: string;
  name: string;
  encounters: number;
  revenue: number;
}

export interface ChannelStat {
  source: string;
  appointments: number;
}

export interface DashboardSummary {
  from: string;
  to: string;
  patients: PatientStats;
  appointments: AppointmentStats;
  billing: BillingStats;
  topTreatments: TopTreatment[];
  topDiagnoses: TopDiagnosis[];
  byDay: DailyStat[];
  byProfessional: ProfessionalStats[];
  byChannel: ChannelStat[];
}

export type AppointmentStatusKey =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ATTENDED'
  | 'NO_SHOW'
  | 'CANCELLED'
  | 'RESCHEDULED';

export type ChannelKey = 'RECEPTION' | 'PROFESSIONAL' | 'BOT' | 'WALK_IN';
