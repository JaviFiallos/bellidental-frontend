import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionStore } from '../../../../core/auth/session.store';
import { Appointment } from '../../../appointments';
import { MyEncountersPage } from './my-encounters.page';

describe('MyEncountersPage', () => {
  let fixture: ComponentFixture<MyEncountersPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-21T10:00:00-05:00'));

    await TestBed.configureTestingModule({
      imports: [MyEncountersPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    const sessionStore = TestBed.inject(SessionStore);
    sessionStore.setSession('test-token', 86400000);
    sessionStore.setCurrentUser({
      userId: 'user-prof-1',
      email: 'odontologa@bellidental.local',
      roles: ['ODONTOLOGO'],
      permissions: ['APPOINTMENT_READ', 'RECORD_CREATE'],
      professionalId: 'prof-1',
    });
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('abrir Mis atenciones → pide la semana actual y lista solo atenciones, de la más reciente', async () => {
    fixture = TestBed.createComponent(MyEncountersPage);
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/v1/appointments' &&
        r.params.get('professionalId') === 'prof-1' &&
        r.params.get('from') === '2026-10-19T00:00:00-05:00' &&
        r.params.get('to') === '2026-10-25T23:59:59-05:00'
    );
    expect(req.request.method).toBe('GET');

    const appointmentBase = {
      professionalId: 'prof-1',
      professionalName: 'Dra. Sofía Mendoza',
      specialtyId: 1,
      specialtyName: 'General',
      endAt: '2026-10-19T23:59:00-05:00',
      source: 'RECEPTION' as const,
      checkedInAt: null,
    };
    const mockAppointments: Appointment[] = [
      {
        ...appointmentBase,
        id: 'appt-open',
        patientId: 'pat-1',
        patientName: 'Bruno Abierto',
        startAt: '2026-10-19T09:00:00-05:00',
        status: 'CONFIRMED',
        checkedInAt: '2026-10-19T08:55:00-05:00',
        encounterId: 'enc-1',
        encounterStatus: 'OPEN',
        encounterVoided: false,
      },
      {
        ...appointmentBase,
        id: 'appt-closed',
        patientId: 'pat-2',
        patientName: 'Carla Cerrada',
        startAt: '2026-10-20T15:00:00-05:00',
        status: 'ATTENDED',
        checkedInAt: '2026-10-20T14:50:00-05:00',
        encounterId: 'enc-2',
        encounterStatus: 'COMPLETED',
        encounterVoided: false,
      },
      {
        ...appointmentBase,
        id: 'appt-none',
        patientId: 'pat-3',
        patientName: 'Diego Sin Atención',
        startAt: '2026-10-21T11:00:00-05:00',
        status: 'PENDING',
        encounterId: null,
      },
    ];

    req.flush({ success: true, message: 'OK', data: mockAppointments });

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);

    expect(rows[0].textContent).toContain('Carla Cerrada');
    expect(rows[0].textContent).toContain('20/10/2026');
    expect(rows[0].textContent).toContain('Corregir');
    expect(rows[1].textContent).toContain('Bruno Abierto');
    expect(rows[1].textContent).toContain('Continuar');

    expect(compiled.textContent).not.toContain('Diego Sin Atención');
    expect(compiled.querySelector('.page-header__subtitle')?.textContent?.trim()).toBe(
      '2 atenciones · 1 abierta'
    );
  });

  it('error del backend → muestra el mensaje y el botón Reintentar', async () => {
    fixture = TestBed.createComponent(MyEncountersPage);
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === '/api/v1/appointments');
    req.flush(
      { success: false, message: 'No se pudo consultar las atenciones', data: null },
      { status: 500, statusText: 'Internal Server Error' }
    );

    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.body.textContent).toContain('No se pudo consultar las atenciones');
    const retryButton = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Reintentar'
    );
    expect(retryButton).toBeTruthy();
    expect(document.querySelector('tbody tr')).toBeNull();
  });
});
