import { ApiResponse } from '../../../core/api/api.models';
import { Professional, Specialty } from '../../professionals';
import { Appointment, AvailableSlot } from '../models/appointment.models';
import { EffectiveDay } from '../models/schedule.models';

export const mockProfessionals: Professional[] = [
  {
    id: 'prof-1',
    userId: 'user-1',
    fullName: 'Dr. Daniel Vargas',
    licenseNumber: 'MED-1001',
    colorTag: '#2C5F8A',
    specialties: [
      { id: 1, name: 'Profilaxis', defaultDurationMinutes: 30 },
    ],
    active: true,
  },
  {
    id: 'prof-2',
    userId: 'user-2',
    fullName: 'Dra. Sofía Mendoza',
    licenseNumber: 'MED-1002',
    colorTag: '#9A5B1C',
    specialties: [
      { id: 2, name: 'Endodoncia', defaultDurationMinutes: 60 },
    ],
    active: true,
  },
];

export const mockProfessionalsApiResponse: ApiResponse<Professional[]> = {
  success: true,
  message: 'Profesionales obtenidos',
  data: mockProfessionals,
};

export const mockEffectiveDaysProf1: EffectiveDay[] = [
  {
    date: '2026-10-10',
    shifts: [{ startTime: '08:00', endTime: '13:00' }],
  },
];

export const mockEffectiveDaysProf2: EffectiveDay[] = [
  {
    date: '2026-10-10',
    shifts: [{ startTime: '09:00', endTime: '17:00' }],
  },
];

export const mockEffectiveDaysApiResponseProf1: ApiResponse<EffectiveDay[]> = {
  success: true,
  message: 'Horario efectivo obtenido',
  data: mockEffectiveDaysProf1,
};

export const mockEffectiveDaysApiResponseProf2: ApiResponse<EffectiveDay[]> = {
  success: true,
  message: 'Horario efectivo obtenido',
  data: mockEffectiveDaysProf2,
};

export const mockAppointmentsDay: Appointment[] = [
  {
    id: 'appt-1',
    patientId: 'pat-1',
    patientName: 'David Pérez',
    professionalId: 'prof-1',
    professionalName: 'Dr. Daniel Vargas',
    colorTag: '#2C5F8A',
    specialtyId: 1,
    specialtyName: 'Profilaxis',
    startAt: '2026-10-10T08:30:00-05:00',
    endAt: '2026-10-10T09:00:00-05:00',
    status: 'PENDING',
    source: 'RECEPTION',
    checkedInAt: null,
  },
  {
    id: 'appt-2',
    patientId: 'pat-2',
    patientName: 'María Gómez',
    professionalId: 'prof-2',
    professionalName: 'Dra. Sofía Mendoza',
    colorTag: '#9A5B1C',
    specialtyId: 2,
    specialtyName: 'Endodoncia',
    startAt: '2026-10-10T10:00:00-05:00',
    endAt: '2026-10-10T11:00:00-05:00',
    status: 'CONFIRMED',
    source: 'RECEPTION',
    checkedInAt: '2026-10-10T09:50:00-05:00',
  },
  {
    id: 'appt-3',
    patientId: 'pat-3',
    patientName: 'Carlos Ruiz',
    professionalId: 'prof-1',
    professionalName: 'Dr. Daniel Vargas',
    colorTag: '#2C5F8A',
    specialtyId: 1,
    specialtyName: 'Profilaxis',
    startAt: '2026-10-10T11:30:00-05:00',
    endAt: '2026-10-10T12:00:00-05:00',
    status: 'CANCELLED',
    source: 'BOT',
    checkedInAt: null,
  },
];

export const mockAppointmentsApiResponse: ApiResponse<Appointment[]> = {
  success: true,
  message: 'Citas obtenidas',
  data: mockAppointmentsDay,
};

export const mockSpecialties: Specialty[] = [
  { id: 1, name: 'Profilaxis', defaultDurationMinutes: 30 },
  { id: 2, name: 'Endodoncia', defaultDurationMinutes: 60 },
];

export const mockSpecialtiesApiResponse: ApiResponse<Specialty[]> = {
  success: true,
  message: 'Especialidades obtenidas',
  data: mockSpecialties,
};

export const mockAvailableSlots: AvailableSlot[] = [
  { startAt: '2026-10-10T10:30:00-05:00', endAt: '2026-10-10T11:00:00-05:00' },
  { startAt: '2026-10-10T11:00:00-05:00', endAt: '2026-10-10T11:30:00-05:00' },
  { startAt: '2026-10-10T15:00:00-05:00', endAt: '2026-10-10T15:30:00-05:00' },
];

export const mockAvailableSlotsApiResponse: ApiResponse<AvailableSlot[]> = {
  success: true,
  message: 'Huecos obtenidos',
  data: mockAvailableSlots,
};
