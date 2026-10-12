import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionStore } from '../../../../core/auth/session.store';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  mockAppointmentsApiResponse,
  mockAppointmentsDay,
  mockAvailableSlotsApiResponse,
  mockEffectiveDaysApiResponseProf1,
  mockEffectiveDaysApiResponseProf2,
  mockProfessionalsApiResponse,
  mockSpecialtiesApiResponse,
} from '../../testing/fixtures';
import { Appointment } from '../../models/appointment.models';
import { Patient } from '../../../patients';
import { ReceptionAgendaPage } from './reception-agenda.page';

const mockPatient: Patient = {
  id: 'pat-10',
  documentType: 'CI',
  documentNumber: '1712345678',
  firstName: 'David',
  lastName: 'Pérez',
  fullName: 'David Pérez',
  birthDate: '1990-01-01',
  age: 36,
  sex: 'M',
  bloodType: 'O+',
  bloodTypeLabel: 'O positivo',
  phoneE164: '+593987654321',
  email: 'david@example.com',
  emergencyContactName: null,
  emergencyContactPhoneE164: null,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('ReceptionAgendaPage', () => {
  let fixture: ComponentFixture<ReceptionAgendaPage>;
  let httpMock: HttpTestingController;
  let router: Router;
  let sessionStore: SessionStore;
  let notificationService: NotificationService;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T12:00:00-05:00'));

    await TestBed.configureTestingModule({
      imports: [ReceptionAgendaPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'recepcion', component: ReceptionAgendaPage },
          { path: 'pacientes/:id', component: ReceptionAgendaPage },
        ]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
    sessionStore = TestBed.inject(SessionStore);
    notificationService = TestBed.inject(NotificationService);

    sessionStore.setCurrentUser({
      userId: 'user-sec',
      email: 'secretaria@bellidental.com',
      roles: ['SECRETARIA'],
      permissions: ['APPOINTMENT_READ', 'APPOINTMENT_UPDATE', 'APPOINTMENT_CANCEL'],
    });

    await router.navigateByUrl('/recepcion?fecha=2026-10-10');
    fixture = TestBed.createComponent(ReceptionAgendaPage);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('carga del día → profesionales, horarios y citas → tarjetas en su columna con estado correcto, sin canceladas y contadores', async () => {
    fixture.detectChanges();

    // 1. Petición de profesionales
    const reqProfs = httpMock.expectOne('/api/v1/professionals');
    expect(reqProfs.request.method).toBe('GET');
    reqProfs.flush(mockProfessionalsApiResponse);

    // 2. Horarios efectivos por profesional
    const reqSched1 = httpMock.expectOne(
      '/api/v1/professionals/prof-1/schedules/effective?from=2026-10-10&to=2026-10-10'
    );
    expect(reqSched1.request.method).toBe('GET');
    reqSched1.flush(mockEffectiveDaysApiResponseProf1);

    const reqSched2 = httpMock.expectOne(
      '/api/v1/professionals/prof-2/schedules/effective?from=2026-10-10&to=2026-10-10'
    );
    expect(reqSched2.request.method).toBe('GET');
    reqSched2.flush(mockEffectiveDaysApiResponseProf2);

    // 3. Citas del rango del día
    const reqAppts = httpMock.expectOne((req) => {
      return (
        req.url === '/api/v1/appointments' &&
        req.params.get('from') === '2026-10-10T00:00:00-05:00' &&
        req.params.get('to') === '2026-10-10T23:59:59-05:00'
      );
    });
    expect(reqAppts.request.method).toBe('GET');
    reqAppts.flush(mockAppointmentsApiResponse);

    fixture.detectChanges();

    // 4. Verificar que cada paciente está dentro de la columna de su profesional
    const colProf1 = fixture.nativeElement.querySelector('[data-professional-id="prof-1"]');
    expect(colProf1).toBeTruthy();
    expect(colProf1.textContent).toContain('David Pérez');
    expect(colProf1.textContent).toContain('Agendada');
    expect(colProf1.textContent).not.toContain('María Gómez');
    expect(colProf1.textContent).not.toContain('Carlos Ruiz');

    const colProf2 = fixture.nativeElement.querySelector('[data-professional-id="prof-2"]');
    expect(colProf2).toBeTruthy();
    expect(colProf2.textContent).toContain('María Gómez');
    expect(colProf2.textContent).toContain('En espera');
    expect(colProf2.textContent).not.toContain('David Pérez');
    expect(colProf2.textContent).not.toContain('Carlos Ruiz');

    // La cita cancelada no debe verse en toda la grilla
    const allText = fixture.nativeElement.textContent;
    expect(allText).not.toContain('Carlos Ruiz');

    // Contadores del resumen (2 citas sin canceladas, 1 en espera)
    expect(allText).toContain('2 citas');
    expect(allText).toContain('1 en espera');
  });

  it('GET /appointments responde 500 → se ve el mensaje y Reintentar → clic → nuevo GET /appointments → responde bien → se ven las tarjetas', async () => {
    fixture.detectChanges();

    // 1. Profesionales y horarios iniciales
    const reqProfs = httpMock.expectOne('/api/v1/professionals');
    reqProfs.flush(mockProfessionalsApiResponse);

    const reqSched1 = httpMock.expectOne(
      '/api/v1/professionals/prof-1/schedules/effective?from=2026-10-10&to=2026-10-10'
    );
    reqSched1.flush(mockEffectiveDaysApiResponseProf1);

    const reqSched2 = httpMock.expectOne(
      '/api/v1/professionals/prof-2/schedules/effective?from=2026-10-10&to=2026-10-10'
    );
    reqSched2.flush(mockEffectiveDaysApiResponseProf2);

    // 2. Citas responde 500
    const reqAppts = httpMock.expectOne((req) => req.url === '/api/v1/appointments');
    reqAppts.flush(
      { success: false, message: 'Error interno del servidor', data: null },
      { status: 500, statusText: 'Internal Server Error' }
    );

    fixture.detectChanges();

    // Debe mostrarse el error y el botón de reintentar
    const alertEl = fixture.nativeElement.querySelector('.reception-agenda-page__error-container');
    expect(alertEl).toBeTruthy();
    expect(alertEl.textContent).toContain('Error interno del servidor');

    const retryBtn = fixture.nativeElement.querySelector('.reception-agenda-page__retry-btn') as HTMLButtonElement;
    expect(retryBtn).toBeTruthy();
    expect(retryBtn.textContent?.trim()).toBe('Reintentar');

    // Clic en Reintentar
    retryBtn.click();
    fixture.detectChanges();

    // Vuelve a solicitar horarios y citas
    const retrySched1 = httpMock.expectOne(
      '/api/v1/professionals/prof-1/schedules/effective?from=2026-10-10&to=2026-10-10'
    );
    retrySched1.flush(mockEffectiveDaysApiResponseProf1);

    const retrySched2 = httpMock.expectOne(
      '/api/v1/professionals/prof-2/schedules/effective?from=2026-10-10&to=2026-10-10'
    );
    retrySched2.flush(mockEffectiveDaysApiResponseProf2);

    const retryAppts = httpMock.expectOne((req) => req.url === '/api/v1/appointments');
    retryAppts.flush(mockAppointmentsApiResponse);

    fixture.detectChanges();

    // Ahora se ven las tarjetas y no el error
    const updatedText = fixture.nativeElement.textContent;
    expect(updatedText).toContain('David Pérez');
    expect(updatedText).toContain('María Gómez');
    expect(fixture.nativeElement.querySelector('.reception-agenda-page__error-container')).toBeNull();
  });

  it('clic en "Llegó" de la cita PENDING de hoy → POST /api/v1/appointments/{id}/check-in → responde message → nuevo GET /api/v1/appointments → la tarjeta dice "En espera" y se ve el toast con el message', async () => {
    fixture.detectChanges();

    // Carga inicial
    const reqProfs = httpMock.expectOne('/api/v1/professionals');
    reqProfs.flush(mockProfessionalsApiResponse);

    const reqSched1 = httpMock.expectOne(
      '/api/v1/professionals/prof-1/schedules/effective?from=2026-10-10&to=2026-10-10'
    );
    reqSched1.flush(mockEffectiveDaysApiResponseProf1);

    const reqSched2 = httpMock.expectOne(
      '/api/v1/professionals/prof-2/schedules/effective?from=2026-10-10&to=2026-10-10'
    );
    reqSched2.flush(mockEffectiveDaysApiResponseProf2);

    const reqAppts = httpMock.expectOne((req) => req.url === '/api/v1/appointments');
    reqAppts.flush(mockAppointmentsApiResponse);

    fixture.detectChanges();

    // 1. Ubicar el botón "Llegó" de la tarjeta de David Pérez (appt-1, PENDING)
    const checkInBtn = fixture.nativeElement.querySelector('.appointment-card__check-in-btn') as HTMLButtonElement;
    expect(checkInBtn).toBeTruthy();
    expect(checkInBtn.textContent).toContain('Llegó');

    // 2. Clic en "Llegó"
    checkInBtn.click();
    fixture.detectChanges();

    // 3. Verifica POST /api/v1/appointments/appt-1/check-in
    const reqCheckIn = httpMock.expectOne('/api/v1/appointments/appt-1/check-in');
    expect(reqCheckIn.request.method).toBe('POST');
    reqCheckIn.flush({
      success: true,
      message: 'Check-in realizado.',
      data: null,
    });

    // 4. Refresco automático de citas
    const reqRefresh = httpMock.expectOne((req) => req.url === '/api/v1/appointments');
    expect(reqRefresh.request.method).toBe('GET');

    const updatedAppointments = mockAppointmentsDay.map((a) =>
      a.id === 'appt-1' ? { ...a, checkedInAt: '2026-10-10T12:00:00-05:00' } : a
    );
    reqRefresh.flush({
      success: true,
      message: 'Citas obtenidas',
      data: updatedAppointments,
    });

    fixture.detectChanges();

    // 5. La tarjeta ahora dice "En espera"
    const colProf1 = fixture.nativeElement.querySelector('[data-professional-id="prof-1"]');
    expect(colProf1.textContent).toContain('David Pérez');
    expect(colProf1.textContent).toContain('En espera');

    // 6. Toast con el mensaje mostrado
    const toasts = notificationService.toasts();
    expect(toasts.some((t) => t.message === 'Check-in realizado.')).toBe(true);
  });

  it('abrir el panel de una cita → "Cancelar" → confirmar en el diálogo → POST …/cancel responde 409 con message "Solo se pueden cancelar citas en estado PENDING o CONFIRMED." → el mensaje se ve dentro del panel', async () => {
    fixture.detectChanges();

    // Carga inicial
    const reqProfs = httpMock.expectOne('/api/v1/professionals');
    reqProfs.flush(mockProfessionalsApiResponse);

    const reqSched1 = httpMock.expectOne(
      '/api/v1/professionals/prof-1/schedules/effective?from=2026-10-10&to=2026-10-10'
    );
    reqSched1.flush(mockEffectiveDaysApiResponseProf1);

    const reqSched2 = httpMock.expectOne(
      '/api/v1/professionals/prof-2/schedules/effective?from=2026-10-10&to=2026-10-10'
    );
    reqSched2.flush(mockEffectiveDaysApiResponseProf2);

    const reqAppts = httpMock.expectOne((req) => req.url === '/api/v1/appointments');
    reqAppts.flush(mockAppointmentsApiResponse);

    fixture.detectChanges();

    // 1. Abrir panel haciendo clic en la tarjeta de David Pérez
    const cardBtn = fixture.nativeElement.querySelector('.appointment-card__main-btn') as HTMLButtonElement;
    expect(cardBtn).toBeTruthy();
    cardBtn.click();
    fixture.detectChanges();

    // 2. Verificar que el panel está abierto
    const panel = fixture.nativeElement.querySelector('.appointment-panel');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('David Pérez');

    // 3. Clic en "Cancelar cita" dentro del panel
    const cancelBtn = panel.querySelector('.appointment-panel__btn-cancel') as HTMLButtonElement;
    expect(cancelBtn).toBeTruthy();
    cancelBtn.click();
    fixture.detectChanges();

    // 4. Se abre el diálogo de confirmación (CDK Dialog en el DOM)
    const dialog = (document.querySelector('.confirm-dialog') ||
      document.querySelector('[role="alertdialog"]')) as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('¿Cancelar la cita de David Pérez');

    // 5. Confirmar cancelación en el diálogo
    const confirmBtn = dialog.querySelector('.btn-danger') as HTMLButtonElement;
    expect(confirmBtn).toBeTruthy();
    confirmBtn.click();
    fixture.detectChanges();

    // 6. Verifica llamada a POST /api/v1/appointments/appt-1/cancel y responder 409
    const reqCancel = httpMock.expectOne('/api/v1/appointments/appt-1/cancel');
    expect(reqCancel.request.method).toBe('POST');
    reqCancel.flush(
      {
        success: false,
        message: 'Solo se pueden cancelar citas en estado PENDING o CONFIRMED.',
        data: null,
      },
      { status: 409, statusText: 'Conflict' }
    );

    // 7. Error recarga citas
    const reqReload = httpMock.expectOne((req) => req.url === '/api/v1/appointments');
    reqReload.flush(mockAppointmentsApiResponse);

    fixture.detectChanges();

    // 8. El mensaje de error se ve dentro del panel
    const alertEl = panel.querySelector('.appointment-panel__error-container');
    expect(alertEl).toBeTruthy();
    expect(alertEl.textContent).toContain('Solo se pueden cancelar citas en estado PENDING o CONFIRMED.');
  });

  it('clic en "Nueva cita" → buscar y elegir paciente → elegir especialidad y profesional → clic en chip 10:30 → Agendar cita 201 → nuevo GET /appointments → tarjeta en columna y toast', async () => {
    sessionStore.setCurrentUser({
      userId: 'user-sec',
      email: 'secretaria@bellidental.com',
      roles: ['SECRETARIA'],
      permissions: ['APPOINTMENT_READ', 'APPOINTMENT_UPDATE', 'APPOINTMENT_CANCEL', 'APPOINTMENT_CREATE'],
    });

    fixture.detectChanges();

    // 1. Inicialización de la agenda
    httpMock.expectOne('/api/v1/professionals').flush(mockProfessionalsApiResponse);
    httpMock
      .expectOne('/api/v1/professionals/prof-1/schedules/effective?from=2026-10-10&to=2026-10-10')
      .flush(mockEffectiveDaysApiResponseProf1);
    httpMock
      .expectOne('/api/v1/professionals/prof-2/schedules/effective?from=2026-10-10&to=2026-10-10')
      .flush(mockEffectiveDaysApiResponseProf2);
    httpMock
      .expectOne((req) => req.url === '/api/v1/appointments')
      .flush(mockAppointmentsApiResponse);

    fixture.detectChanges();

    // 2. Clic en "Nueva cita"
    const newApptBtn = fixture.nativeElement.querySelector('.agenda-toolbar__create-btn') as HTMLButtonElement;
    expect(newApptBtn).toBeTruthy();
    newApptBtn.click();
    fixture.detectChanges();

    // Carga de especialidades
    const reqSpecs = httpMock.expectOne('/api/v1/specialties');
    expect(reqSpecs.request.method).toBe('GET');
    reqSpecs.flush(mockSpecialtiesApiResponse);
    fixture.detectChanges();

    // 3. Escribir en el buscador de pacientes
    const searchInput = fixture.nativeElement.querySelector('app-patient-search input') as HTMLInputElement;
    expect(searchInput).toBeTruthy();
    searchInput.value = 'David';
    searchInput.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    fixture.detectChanges();

    const reqPatients = httpMock.expectOne(
      (req) => req.url === '/api/v1/patients' && req.params.get('query') === 'David'
    );
    expect(reqPatients.request.method).toBe('GET');
    reqPatients.flush({
      success: true,
      message: 'Pacientes encontrados',
      data: {
        content: [mockPatient],
        totalElements: 1,
        totalPages: 1,
        size: 8,
        number: 0,
      },
    });
    fixture.detectChanges();

    // Elegir el paciente del overlay
    const option = document.querySelector('.combobox-option') as HTMLElement;
    expect(option).toBeTruthy();
    option.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('David Pérez · 1712345678');

    // 4. Elegir especialidad (prof-1 se auto-elige porque es el único con spec 1)
    const specialtySelect = fixture.nativeElement.querySelector('#appt-specialty-select') as HTMLSelectElement;
    expect(specialtySelect).toBeTruthy();
    specialtySelect.value = '1';
    specialtySelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    // Carga de huecos disponibles
    const reqAvail = httpMock.expectOne(
      '/api/v1/availability?professionalId=prof-1&specialtyId=1&date=2026-10-10'
    );
    expect(reqAvail.request.method).toBe('GET');
    reqAvail.flush(mockAvailableSlotsApiResponse);
    fixture.detectChanges();

    // 5. Clic en chip "10:30"
    const slotRadio = fixture.nativeElement.querySelector(
      'input[value="2026-10-10T10:30:00-05:00"]'
    ) as HTMLInputElement;
    expect(slotRadio).toBeTruthy();
    slotRadio.click();
    slotRadio.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    // 6. "Agendar cita"
    const submitBtn = fixture.nativeElement.querySelector('.appt-form__submit-btn') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
    submitBtn.click();
    fixture.detectChanges();

    // Verificar POST sin endAt ni reason
    const reqCreate = httpMock.expectOne('/api/v1/appointments');
    expect(reqCreate.request.method).toBe('POST');
    expect(reqCreate.request.body).toEqual({
      patientId: 'pat-10',
      professionalId: 'prof-1',
      specialtyId: 1,
      startAt: '2026-10-10T10:30:00-05:00',
    });

    const createdAppt: Appointment = {
      id: 'appt-new',
      patientId: 'pat-10',
      patientName: 'David Pérez',
      professionalId: 'prof-1',
      professionalName: 'Dr. Daniel Vargas',
      colorTag: '#2C5F8A',
      specialtyId: 1,
      specialtyName: 'Profilaxis',
      startAt: '2026-10-10T10:30:00-05:00',
      endAt: '2026-10-10T11:00:00-05:00',
      status: 'PENDING',
      source: 'RECEPTION',
      checkedInAt: null,
    };

    reqCreate.flush(
      {
        success: true,
        message: 'Cita creada.',
        data: createdAppt,
      },
      { status: 201, statusText: 'Created' }
    );
    fixture.detectChanges();

    // 7. Recarga de citas
    const reqReload = httpMock.expectOne((req) => req.url === '/api/v1/appointments');
    reqReload.flush({
      success: true,
      message: 'Citas obtenidas',
      data: [...mockAppointmentsDay, createdAppt],
    });
    fixture.detectChanges();

    // 8. La tarjeta del paciente aparece en la columna de prof-1
    const colProf1 = fixture.nativeElement.querySelector('[data-professional-id="prof-1"]');
    expect(colProf1.textContent).toContain('David Pérez');

    // 9. Se ve el toast de éxito
    const toasts = notificationService.toasts();
    expect(toasts.some((t) => t.message.includes('Cita agendada: David Pérez'))).toBe(true);
  });

  it('flujo hasta "Agendar cita" → POST responde 409 "El profesional ya tiene una cita en ese horario." → error visible y se vuelve a pedir GET /availability', async () => {
    sessionStore.setCurrentUser({
      userId: 'user-sec',
      email: 'secretaria@bellidental.com',
      roles: ['SECRETARIA'],
      permissions: ['APPOINTMENT_READ', 'APPOINTMENT_UPDATE', 'APPOINTMENT_CANCEL', 'APPOINTMENT_CREATE'],
    });

    fixture.detectChanges();

    httpMock.expectOne('/api/v1/professionals').flush(mockProfessionalsApiResponse);
    httpMock
      .expectOne('/api/v1/professionals/prof-1/schedules/effective?from=2026-10-10&to=2026-10-10')
      .flush(mockEffectiveDaysApiResponseProf1);
    httpMock
      .expectOne('/api/v1/professionals/prof-2/schedules/effective?from=2026-10-10&to=2026-10-10')
      .flush(mockEffectiveDaysApiResponseProf2);
    httpMock
      .expectOne((req) => req.url === '/api/v1/appointments')
      .flush(mockAppointmentsApiResponse);

    fixture.detectChanges();

    // 1. Abrir formulario
    const newApptBtn = fixture.nativeElement.querySelector('.agenda-toolbar__create-btn') as HTMLButtonElement;
    newApptBtn.click();
    fixture.detectChanges();

    httpMock.expectOne('/api/v1/specialties').flush(mockSpecialtiesApiResponse);
    fixture.detectChanges();

    // 2. Buscar paciente
    const searchInput = fixture.nativeElement.querySelector('app-patient-search input') as HTMLInputElement;
    searchInput.value = 'David';
    searchInput.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    fixture.detectChanges();

    httpMock
      .expectOne((req) => req.url === '/api/v1/patients' && req.params.get('query') === 'David')
      .flush({
        success: true,
        message: 'Pacientes encontrados',
        data: {
          content: [mockPatient],
          totalElements: 1,
          totalPages: 1,
          size: 8,
          number: 0,
        },
      });
    fixture.detectChanges();

    (document.querySelector('.combobox-option') as HTMLElement).click();
    fixture.detectChanges();

    // 3. Elegir especialidad
    const specialtySelect = fixture.nativeElement.querySelector('#appt-specialty-select') as HTMLSelectElement;
    specialtySelect.value = '1';
    specialtySelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    httpMock
      .expectOne('/api/v1/availability?professionalId=prof-1&specialtyId=1&date=2026-10-10')
      .flush(mockAvailableSlotsApiResponse);
    fixture.detectChanges();

    // 4. Elegir chip 10:30
    const slotRadio = fixture.nativeElement.querySelector(
      'input[value="2026-10-10T10:30:00-05:00"]'
    ) as HTMLInputElement;
    slotRadio.click();
    slotRadio.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    // 5. Agendar cita → responde 409
    const submitBtn = fixture.nativeElement.querySelector('.appt-form__submit-btn') as HTMLButtonElement;
    submitBtn.click();
    fixture.detectChanges();

    const reqCreate = httpMock.expectOne('/api/v1/appointments');
    reqCreate.flush(
      {
        success: false,
        message: 'El profesional ya tiene una cita en ese horario.',
        data: null,
      },
      { status: 409, statusText: 'Conflict' }
    );
    fixture.detectChanges();

    // 6. El mensaje se ve en el formulario
    const alertEl = fixture.nativeElement.querySelector('.appt-form__error-box');
    expect(alertEl).toBeTruthy();
    expect(alertEl.textContent).toContain('El profesional ya tiene una cita en ese horario.');

    // 7. Se vuelve a pedir GET /availability
    const reqRetryAvail = httpMock.expectOne(
      '/api/v1/availability?professionalId=prof-1&specialtyId=1&date=2026-10-10'
    );
    expect(reqRetryAvail.request.method).toBe('GET');
    reqRetryAvail.flush(mockAvailableSlotsApiResponse);
    fixture.detectChanges();
  });
});


