import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SessionStore } from '../../../../core/auth/session.store';
import { Appointment } from '../../../appointments';
import { DentistBoardPage } from './dentist-board.page';

@Component({ template: '' })
class DummyComponent {}

class MemoryStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

describe('DentistBoardPage', () => {
  let fixture: ComponentFixture<DentistBoardPage>;
  let httpMock: HttpTestingController;
  let sessionStore: SessionStore;
  let router: Router;
  let storage: Storage;

  beforeAll(() => {
    storage = new MemoryStorage();
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    });
  });

  beforeEach(async () => {
    storage.clear();

    await TestBed.configureTestingModule({
      imports: [DentistBoardPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'consultorio/atencion/:encounterId', component: DummyComponent },
        ]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    sessionStore = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);

    sessionStore.setSession('test-token', 86400);
    sessionStore.setCurrentUser({
      userId: 'user-prof-1',
      email: 'odontologa@bellidental.local',
      roles: ['ODONTOLOGO'],
      permissions: ['APPOINTMENT_UPDATE', 'RECORD_CREATE'],
      professionalId: 'prof-1',
    });
  });

  afterEach(() => {
    httpMock.verify();
    storage.clear();
  });

  it('carga las citas de hoy → cada una en su columna y los contadores', async () => {
    fixture = TestBed.createComponent(DentistBoardPage);
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/v1/appointments' &&
        r.params.get('professionalId') === 'prof-1' &&
        r.params.has('from') &&
        r.params.has('to')
    );
    expect(req.request.method).toBe('GET');

    const mockAppointments: Appointment[] = [
      {
        id: 'appt-1',
        patientId: 'pat-1',
        patientName: 'Ana Agendada',
        professionalId: 'prof-1',
        professionalName: 'Dra. Sofía Mendoza',
        specialtyId: 1,
        specialtyName: 'General',
        startAt: '2026-10-12T08:30:00-05:00',
        endAt: '2026-10-12T09:00:00-05:00',
        status: 'PENDING',
        source: 'RECEPTION',
        checkedInAt: null,
      },
      {
        id: 'appt-2',
        patientId: 'pat-2',
        patientName: 'Bruno En Espera',
        professionalId: 'prof-1',
        professionalName: 'Dra. Sofía Mendoza',
        specialtyId: 1,
        specialtyName: 'General',
        startAt: '2026-10-12T09:30:00-05:00',
        endAt: '2026-10-12T10:00:00-05:00',
        status: 'CONFIRMED',
        source: 'RECEPTION',
        checkedInAt: '2026-10-12T09:20:00-05:00',
      },
      {
        id: 'appt-3',
        patientId: 'pat-3',
        patientName: 'Carlos En Atención',
        professionalId: 'prof-1',
        professionalName: 'Dra. Sofía Mendoza',
        specialtyId: 1,
        specialtyName: 'General',
        startAt: '2026-10-12T10:30:00-05:00',
        endAt: '2026-10-12T11:00:00-05:00',
        status: 'CONFIRMED',
        source: 'RECEPTION',
        checkedInAt: '2026-10-12T10:15:00-05:00',
        encounterId: 'enc-3',
        encounterStatus: 'OPEN',
        encounterVoided: false,
      },
      {
        id: 'appt-4',
        patientId: 'pat-4',
        patientName: 'Diana Atendida',
        professionalId: 'prof-1',
        professionalName: 'Dra. Sofía Mendoza',
        specialtyId: 1,
        specialtyName: 'General',
        startAt: '2026-10-12T11:30:00-05:00',
        endAt: '2026-10-12T12:00:00-05:00',
        status: 'ATTENDED',
        source: 'RECEPTION',
        checkedInAt: '2026-10-12T11:15:00-05:00',
        encounterId: 'enc-4',
        encounterStatus: 'COMPLETED',
        encounterVoided: false,
      },
      {
        id: 'appt-5',
        patientId: 'pat-5',
        patientName: 'Esteban Cancelado',
        professionalId: 'prof-1',
        professionalName: 'Dra. Sofía Mendoza',
        specialtyId: 1,
        specialtyName: 'General',
        startAt: '2026-10-12T12:30:00-05:00',
        endAt: '2026-10-12T13:00:00-05:00',
        status: 'CANCELLED',
        source: 'RECEPTION',
        checkedInAt: null,
      },
    ];

    req.flush({
      success: true,
      message: 'OK',
      data: mockAppointments,
    });

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const gridColumns = compiled.querySelectorAll('.dentist-board__grid bd-board-column');
    expect(gridColumns.length).toBe(4);

    expect(gridColumns[0].textContent).toContain('Ana Agendada');
    expect(gridColumns[1].textContent).toContain('Bruno En Espera');
    expect(gridColumns[2].textContent).toContain('Carlos En Atención');
    expect(gridColumns[3].textContent).toContain('Diana Atendida');

    expect(compiled.textContent).not.toContain('Esteban Cancelado');

    const countersEl = compiled.querySelector('.dentist-board__counters');
    expect(countersEl?.textContent?.trim()).toBe(
      '4 hoy · 1 en espera · 1 en atención · 1 atendidas'
    );
  });

  it('Atender una cita sin check-in → check-in, abre la atención y navega', async () => {
    fixture = TestBed.createComponent(DentistBoardPage);
    fixture.detectChanges();

    const initialReq = httpMock.expectOne((r) => r.url === '/api/v1/appointments');
    initialReq.flush({
      success: true,
      message: 'OK',
      data: [
        {
          id: 'appt-david',
          patientId: 'pat-david',
          patientName: 'David Pérez',
          professionalId: 'prof-1',
          professionalName: 'Dra. Sofía Mendoza',
          specialtyId: 1,
          specialtyName: 'General',
          startAt: '2026-10-12T09:00:00-05:00',
          endAt: '2026-10-12T09:30:00-05:00',
          status: 'PENDING',
          source: 'RECEPTION',
          checkedInAt: null,
        },
      ],
    });

    fixture.detectChanges();
    await fixture.whenStable();

    const attendBtn = fixture.nativeElement.querySelector(
      'button[aria-label="Atender a David Pérez"]'
    ) as HTMLButtonElement;
    expect(attendBtn).toBeTruthy();
    attendBtn.click();

    fixture.detectChanges();
    await fixture.whenStable();

    const inputEl = document.querySelector('#chief-complaint-input') as HTMLTextAreaElement;
    expect(inputEl).toBeTruthy();
    inputEl.value = 'Paciente refiere dolor';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const formEl = document.querySelector('.open-encounter-dialog__body') as HTMLFormElement;
    formEl.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const checkInReq = httpMock.expectOne('/api/v1/appointments/appt-david/check-in');
    expect(checkInReq.request.method).toBe('POST');
    checkInReq.flush({
      success: true,
      message: 'Llegada registrada',
      data: 'OK',
    });

    const encounterReq = httpMock.expectOne('/api/v1/appointments/appt-david/encounter');
    expect(encounterReq.request.method).toBe('POST');
    expect(encounterReq.request.body).toEqual({
      chiefComplaint: 'Paciente refiere dolor',
    });

    encounterReq.flush({
      success: true,
      message: 'Atención creada',
      data: {
        id: 'enc-101',
        appointmentId: 'appt-david',
        patientId: 'pat-david',
        professionalId: 'prof-1',
        status: 'OPEN',
        startAt: '2026-10-12T09:00:00-05:00',
      },
    });

    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.url).toBe('/consultorio/atencion/enc-101');

    const reloadReq = httpMock.expectOne((r) => r.url === '/api/v1/appointments');
    expect(reloadReq.request.method).toBe('GET');
    reloadReq.flush({
      success: true,
      message: 'OK',
      data: [],
    });

    fixture.detectChanges();
  });

  it('Atender con error del backend → el mensaje se ve en el diálogo', async () => {
    fixture = TestBed.createComponent(DentistBoardPage);
    fixture.detectChanges();

    const initialReq = httpMock.expectOne((r) => r.url === '/api/v1/appointments');
    initialReq.flush({
      success: true,
      message: 'OK',
      data: [
        {
          id: 'appt-checked',
          patientId: 'pat-david',
          patientName: 'David Pérez',
          professionalId: 'prof-1',
          professionalName: 'Dra. Sofía Mendoza',
          specialtyId: 1,
          specialtyName: 'General',
          startAt: '2026-10-12T09:00:00-05:00',
          endAt: '2026-10-12T09:30:00-05:00',
          status: 'CONFIRMED',
          source: 'RECEPTION',
          checkedInAt: '2026-10-12T08:50:00-05:00',
        },
      ],
    });

    fixture.detectChanges();
    await fixture.whenStable();

    const attendBtn = fixture.nativeElement.querySelector(
      'button[aria-label="Atender a David Pérez"]'
    ) as HTMLButtonElement;
    expect(attendBtn).toBeTruthy();
    attendBtn.click();

    fixture.detectChanges();
    await fixture.whenStable();

    const inputEl = document.querySelector('#chief-complaint-input') as HTMLTextAreaElement;
    expect(inputEl).toBeTruthy();
    inputEl.value = 'Paciente refiere dolor';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const formEl = document.querySelector('.open-encounter-dialog__body') as HTMLFormElement;
    formEl.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    httpMock.expectNone('/api/v1/appointments/appt-checked/check-in');

    const encounterReq = httpMock.expectOne('/api/v1/appointments/appt-checked/encounter');
    expect(encounterReq.request.method).toBe('POST');
    encounterReq.flush(
      {
        success: false,
        message: 'La cita ya tiene una atención registrada',
        data: null,
      },
      { status: 409, statusText: 'Conflict' }
    );

    // Se atiende la recarga tras fallo
    const reloadReq = httpMock.expectOne((r) => r.url === '/api/v1/appointments');
    reloadReq.flush({
      success: true,
      message: 'OK',
      data: [],
    });

    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.body.textContent).toContain('La cita ya tiene una atención registrada');
    expect(document.querySelector('#chief-complaint-input')).toBeTruthy();
    expect(router.url).not.toContain('/consultorio/atencion');
  });
});
