import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionStore } from '../../../../core/auth/session.store';
import { ApiResponse } from '../../../../core/api/api.models';
import { Appointment } from '../../../appointments';
import { Patient } from '../../models/patient.models';
import { PatientReceptionPage } from './patient-reception.page';

@Component({
  selector: 'bd-test-patient-edit-stub',
  standalone: true,
  template: '',
})
class PatientEditStubComponent {}

const patientResponse: Patient = {
  id: 'pat-1',
  documentType: 'CI',
  documentNumber: '1710034065',
  firstName: 'David',
  lastName: 'Pérez',
  fullName: 'David Pérez',
  birthDate: '2007-03-02',
  age: 19,
  sex: 'M',
  bloodType: 'O_POS',
  bloodTypeLabel: 'O positivo',
  phoneE164: '593987654321',
  email: null,
  emergencyContactName: null,
  emergencyContactPhoneE164: null,
  adminNotes: 'Presupuesto ortodoncia $1.200',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const appointmentsResponse: Appointment[] = [
  {
    id: 'appt-next',
    patientId: 'pat-1',
    patientName: 'David Pérez',
    professionalId: 'prof-1',
    professionalName: 'Dr. Daniel Vargas',
    specialtyId: 1,
    specialtyName: 'Profilaxis',
    startAt: '2026-10-14T10:30:00-05:00',
    endAt: '2026-10-14T11:00:00-05:00',
    status: 'CONFIRMED',
    source: 'RECEPTION',
    reason: null,
    notes: null,
    checkedInAt: null,
    rescheduledFromId: null,
  },
  {
    id: 'appt-attended',
    patientId: 'pat-1',
    patientName: 'David Pérez',
    professionalId: 'prof-1',
    professionalName: 'Dr. Daniel Vargas',
    specialtyId: 1,
    specialtyName: 'Profilaxis',
    startAt: '2026-10-03T09:00:00-05:00',
    endAt: '2026-10-03T09:30:00-05:00',
    status: 'ATTENDED',
    source: 'RECEPTION',
    reason: null,
    notes: null,
    checkedInAt: null,
    rescheduledFromId: null,
  },
  {
    id: 'appt-cancelled',
    patientId: 'pat-1',
    patientName: 'David Pérez',
    professionalId: 'prof-1',
    professionalName: 'Dr. Daniel Vargas',
    specialtyId: 1,
    specialtyName: 'Profilaxis',
    startAt: '2026-10-12T11:00:00-05:00',
    endAt: '2026-10-12T11:30:00-05:00',
    status: 'CANCELLED',
    source: 'BOT',
    reason: null,
    notes: null,
    checkedInAt: null,
    rescheduledFromId: null,
  },
];

describe('PatientReceptionPage', () => {
  let harness: RouterTestingHarness;
  let fixture: ComponentFixture<unknown>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T12:00:00-05:00'));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'pacientes/:id', component: PatientReceptionPage },
          { path: 'pacientes/:id/editar', component: PatientEditStubComponent },
          { path: 'recepcion', component: PatientEditStubComponent },
        ]),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionStore).setCurrentUser({
      userId: 'user-sec',
      email: 'secretaria@bellidental.com',
      roles: ['SECRETARIA'],
      permissions: ['PATIENT_READ', 'PATIENT_UPDATE', 'APPOINTMENT_READ', 'APPOINTMENT_UPDATE', 'APPOINTMENT_CANCEL'],
    });

    harness = await RouterTestingHarness.create('/pacientes/pat-1');
    fixture = harness.fixture;
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  function flushInitialLoad(): void {
    const patientRequest = httpMock.expectOne('/api/v1/patients/pat-1');
    expect(patientRequest.request.method).toBe('GET');
    const patientBody: ApiResponse<Patient> = { success: true, message: 'Paciente obtenido', data: patientResponse };
    patientRequest.flush(patientBody);

    const appointmentsRequest = httpMock.expectOne('/api/v1/appointments?patientId=pat-1');
    expect(appointmentsRequest.request.method).toBe('GET');
    const appointmentsBody: ApiResponse<Appointment[]> = {
      success: true,
      message: 'Citas obtenidas',
      data: appointmentsResponse,
    };
    appointmentsRequest.flush(appointmentsBody);

    harness.detectChanges();
  }

  function findButton(text: string): HTMLButtonElement | undefined {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.textContent?.trim() === text
    );
  }

  it('abrir /pacientes/pat-1 → GET paciente y citas → identificación, observaciones, próxima y anteriores', () => {
    flushInitialLoad();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('David Pérez');
    expect(element.textContent).toContain('CI 1710034065');
    expect(element.textContent).toContain('Presupuesto ortodoncia $1.200');

    const next = element.querySelector('article') as HTMLElement;
    expect(next.textContent).toContain('10:30');
    expect(next.textContent).toContain('Confirmada');

    const previousTable = element.querySelector('table') as HTMLElement;
    expect(previousTable.textContent).toContain('Atendida');
    expect(previousTable.textContent).toContain('Cancelada');
  });

  it('"Editar observaciones" → escribir → salir del campo → PUT { adminNotes } → se ve el texto nuevo sin textarea', () => {
    flushInitialLoad();

    findButton('Editar observaciones')!.click();
    harness.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Abona $100 mensuales';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new Event('blur'));

    const request = httpMock.expectOne('/api/v1/patients/pat-1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ adminNotes: 'Abona $100 mensuales' });

    const updated: ApiResponse<Patient> = {
      success: true,
      message: 'Paciente actualizado',
      data: { ...patientResponse, adminNotes: 'Abona $100 mensuales' },
    };
    request.flush(updated);
    harness.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Abona $100 mensuales');
    expect(element.querySelector('textarea')).toBeNull();
  });
});
