import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockAppointmentsApiResponse,
  mockEffectiveDaysApiResponseProf1,
  mockEffectiveDaysApiResponseProf2,
  mockProfessionalsApiResponse,
} from '../../testing/fixtures';
import { ReceptionAgendaPage } from './reception-agenda.page';

describe('ReceptionAgendaPage', () => {
  let fixture: ComponentFixture<ReceptionAgendaPage>;
  let httpMock: HttpTestingController;
  let router: Router;

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
        ]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);

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
});
