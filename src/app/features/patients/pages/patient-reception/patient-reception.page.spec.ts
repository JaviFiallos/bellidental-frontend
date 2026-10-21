import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrentUser } from '../../../../core/auth/auth.models';
import { SessionStore } from '../../../../core/auth/session.store';
import { ApiResponse } from '../../../../core/api/api.models';
import { Appointment } from '../../../appointments';
import { CreatePaymentRequest, PatientAccount, Payment } from '../../../billing';
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

const secretaria: CurrentUser = {
  userId: 'user-sec',
  email: 'secretaria@bellidental.com',
  roles: ['SECRETARIA'],
  permissions: [
    'PATIENT_READ',
    'PATIENT_UPDATE',
    'APPOINTMENT_READ',
    'APPOINTMENT_UPDATE',
    'APPOINTMENT_CANCEL',
    'BILLING_READ',
    'BILLING_CREATE',
  ],
};

const accountResponse: PatientAccount = {
  patientId: 'pat-1',
  patientName: 'David Pérez',
  totalCharges: 65,
  totalPayments: 40,
  balance: 25,
  sessions: [
    {
      encounterId: 'enc-1',
      date: '2026-10-03T09:10:00-05:00',
      professionalName: 'Daniel Vargas',
      treatments: ['Profilaxis x1'],
      charge: 25,
      payment: 25,
      runningBalance: 0,
    },
    {
      encounterId: 'enc-2',
      date: '2026-10-08T10:40:00-05:00',
      professionalName: 'Daniel Vargas',
      treatments: ['Resina compuesta 2 caras x1'],
      charge: 40,
      payment: 15,
      runningBalance: 25,
    },
  ],
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
  });

  async function openAs(user: CurrentUser): Promise<void> {
    TestBed.inject(SessionStore).setCurrentUser(user);
    harness = await RouterTestingHarness.create('/pacientes/pat-1');
    fixture = harness.fixture;
  }

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

    const accountRequest = httpMock.expectOne('/api/v1/patients/pat-1/account');
    expect(accountRequest.request.method).toBe('GET');
    const accountBody: ApiResponse<PatientAccount> = { success: true, message: 'Cuenta obtenida', data: accountResponse };
    accountRequest.flush(accountBody);

    harness.detectChanges();
  }

  function findButton(text: string): HTMLButtonElement | undefined {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (button) => button.textContent?.trim() === text
    );
  }

  it('abrir /pacientes/pat-1 → GET paciente y citas → identificación, observaciones, próxima y anteriores', async () => {
    await openAs(secretaria);
    flushInitialLoad();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('David Pérez');
    expect(element.textContent).toContain('CI 1710034065');
    expect(element.textContent).toContain('Presupuesto ortodoncia $1.200');

    const next = element.querySelector('article') as HTMLElement;
    expect(next.textContent).toContain('10:30');
    expect(next.textContent).toContain('Confirmada');

    const previousTable = element.querySelector('table[aria-label="Citas anteriores del paciente"]') as HTMLElement;
    expect(previousTable.textContent).toContain('Atendida');
    expect(previousTable.textContent).toContain('Cancelada');
  });

  it('"Editar observaciones" → escribir → salir del campo → PUT { adminNotes } → se ve el texto nuevo sin textarea', async () => {
    await openAs(secretaria);
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
  it('Registrar abono con el saldo → POST /payments → la cuenta se recarga sin saldo pendiente', async () => {
    await openAs(secretaria);
    flushInitialLoad();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Saldo pendiente');
    expect(element.textContent).toContain('$ 25,00');

    findButton('Registrar abono')!.click();
    harness.detectChanges();
    const amountInput = element.querySelector('#payment-amount') as HTMLInputElement;
    expect(amountInput.value).toBe('25,00');

    findButton('Guardar abono')!.click();

    const paymentRequest = httpMock.expectOne('/api/v1/patients/pat-1/payments');
    expect(paymentRequest.request.method).toBe('POST');
    const expectedBody: CreatePaymentRequest = { amount: 25, method: 'EFECTIVO' };
    expect(paymentRequest.request.body).toEqual(expectedBody);

    const payment: ApiResponse<Payment> = {
      success: true,
      message: 'Abono registrado',
      data: {
        id: 'pay-1',
        patientId: 'pat-1',
        encounterId: null,
        amount: 25,
        method: 'EFECTIVO',
        receiptNumber: 'C-000045',
        paidAt: '2026-10-10T12:00:00-05:00',
        receivedBy: 'user-sec',
        voided: false,
        voidReason: null,
      },
    };
    paymentRequest.flush(payment);

    const reloadRequest = httpMock.expectOne('/api/v1/patients/pat-1/account');
    expect(reloadRequest.request.method).toBe('GET');
    const reloaded: ApiResponse<PatientAccount> = {
      success: true,
      message: 'Cuenta obtenida',
      data: {
        ...accountResponse,
        totalPayments: 65,
        balance: 0,
        sessions: [
          accountResponse.sessions[0],
          { ...accountResponse.sessions[1], payment: 40, runningBalance: 0 },
        ],
      },
    };
    reloadRequest.flush(reloaded);
    harness.detectChanges();

    expect(element.textContent).toContain('Sin saldo pendiente');
    expect(findButton('Guardar abono')).toBeUndefined();
  });

  it('Abono a una sesión que no corresponde → 409 → mensaje en el formulario', async () => {
    await openAs(secretaria);
    flushInitialLoad();

    const element = fixture.nativeElement as HTMLElement;
    findButton('Registrar abono')!.click();
    harness.detectChanges();

    const sessionSelect = element.querySelector('#payment-session') as HTMLSelectElement;
    sessionSelect.value = 'enc-2';
    sessionSelect.dispatchEvent(new Event('change'));

    findButton('Guardar abono')!.click();

    const paymentRequest = httpMock.expectOne('/api/v1/patients/pat-1/payments');
    const expectedBody: CreatePaymentRequest = { amount: 25, method: 'EFECTIVO', encounterId: 'enc-2' };
    expect(paymentRequest.request.body).toEqual(expectedBody);
    paymentRequest.flush(
      { success: false, message: 'La atención no pertenece a este paciente.', data: null },
      { status: 409, statusText: 'Conflict' }
    );
    harness.detectChanges();

    expect(element.textContent).toContain('La atención no pertenece a este paciente.');
    expect(findButton('Guardar abono')).toBeDefined();
  });
});
