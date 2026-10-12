import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionStore } from '../../../../core/auth/session.store';
import { ApiResponse } from '../../../../core/api/api.models';
import { EffectiveDay, Schedule } from '../../models/schedule.models';
import { mockProfessionalsApiResponse } from '../../testing/fixtures';
import { SchedulesPage } from './schedules.page';

const SCHEDULES_PROF_1 = '/api/v1/professionals/prof-1/schedules';
const EFFECTIVE_OCTOBER = '/api/v1/professionals/prof-1/schedules/effective?from=2026-10-01&to=2026-10-31';

const emptyEffectiveApiResponse: ApiResponse<EffectiveDay[]> = {
  success: true,
  message: 'Horario efectivo obtenido',
  data: [],
};

const mondayRule: Schedule = {
  id: 11,
  weekday: 1,
  specificDate: null,
  startTime: '08:00',
  endTime: '12:00',
  available: true,
};

const mondayRuleApiResponse: ApiResponse<Schedule[]> = {
  success: true,
  message: 'Horarios obtenidos',
  data: [{ ...mondayRule, startTime: '08:00:00', endTime: '12:00:00' }],
};

describe('SchedulesPage', () => {
  let fixture: ComponentFixture<SchedulesPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T12:00:00-05:00'));

    await TestBed.configureTestingModule({
      imports: [SchedulesPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'recepcion/horarios', component: SchedulesPage }]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionStore).setCurrentUser({
      userId: 'user-sec',
      email: 'secretaria@bellidental.com',
      roles: ['SECRETARIA'],
      permissions: ['SCHEDULE_MANAGE'],
    });

    fixture = TestBed.createComponent(SchedulesPage);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  /** Carga inicial: profesionales y la semana tipo de prof-1 (lunes 08:00–12:00). */
  function loadInitialWeek(): void {
    fixture.detectChanges();

    httpMock.expectOne('/api/v1/professionals').flush(mockProfessionalsApiResponse);
    httpMock.expectOne(SCHEDULES_PROF_1).flush(mondayRuleApiResponse);
    httpMock.expectOne(EFFECTIVE_OCTOBER).flush(emptyEffectiveApiResponse);

    fixture.detectChanges();
  }

  /** Responde el recálculo del calendario que sigue a un cambio de reglas. */
  function flushPendingCalendar(): void {
    httpMock
      .match((req) => req.url.endsWith('/schedules/effective'))
      .forEach((req) => req.flush(emptyEffectiveApiResponse));
  }

  function buttonByText(text: string, scope = ''): HTMLButtonElement {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll(`${scope} button`)
    ) as HTMLButtonElement[];
    const button = buttons.find((candidate) => candidate.textContent?.trim() === text);
    expect(button).toBeTruthy();
    return button as HTMLButtonElement;
  }

  function clickButton(label: string): void {
    const button = fixture.nativeElement.querySelector(
      `button[aria-label="${label}"]`
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    fixture.detectChanges();
  }

  function setEditorTime(selector: string, value: string): void {
    const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function clickGuardar(): void {
    const save = fixture.nativeElement.querySelector(
      '.shift-editor button[type="submit"]'
    ) as HTMLButtonElement;
    save.click();
    fixture.detectChanges();
  }

  it('añadir turno → GET semana tipo → "Añadir turno el martes" → valores 08:00–12:00 → Guardar → POST exacto → 201 → el chip aparece en Martes', () => {
    loadInitialWeek();

    const monday = fixture.nativeElement.querySelector('[data-weekday="1"]') as HTMLElement;
    expect(monday.textContent).toContain('08:00 – 12:00');

    clickButton('Añadir turno el martes');

    expect(
      (fixture.nativeElement.querySelector('input[formcontrolname="startTime"]') as HTMLInputElement).value
    ).toBe('08:00');
    expect(
      (fixture.nativeElement.querySelector('input[formcontrolname="endTime"]') as HTMLInputElement).value
    ).toBe('12:00');

    clickGuardar();

    const req = httpMock.expectOne(SCHEDULES_PROF_1);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      weekday: 2,
      specificDate: null,
      startTime: '08:00',
      endTime: '12:00',
      available: true,
    });
    req.flush(
      {
        success: true,
        message: 'Horario registrado.',
        data: { id: 12, weekday: 2, specificDate: null, startTime: '08:00:00', endTime: '12:00:00', available: true },
      },
      { status: 201, statusText: 'Created' }
    );
    fixture.detectChanges();

    const tuesday = fixture.nativeElement.querySelector('[data-weekday="2"]') as HTMLElement;
    expect(tuesday.textContent).toContain('08:00 – 12:00');
    expect(fixture.nativeElement.querySelector('.shift-editor')).toBeNull();

    flushPendingCalendar();
  });

  it('turno cruzado → POST responde 409 → el mensaje se ve dentro del editor, que sigue abierto', () => {
    loadInitialWeek();

    // Lunes ya tiene turno: el editor abre con 14:00–20:00; se cambia a 10:00–13:00 (cruza con 08:00–12:00)
    clickButton('Añadir turno el lunes');
    setEditorTime('input[formcontrolname="startTime"]', '10:00');
    setEditorTime('input[formcontrolname="endTime"]', '13:00');

    clickGuardar();

    const req = httpMock.expectOne(SCHEDULES_PROF_1);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      weekday: 1,
      specificDate: null,
      startTime: '10:00',
      endTime: '13:00',
      available: true,
    });
    req.flush(
      {
        success: false,
        message: 'El turno se solapa con otro horario existente.',
        data: null,
      },
      { status: 409, statusText: 'Conflict' }
    );
    fixture.detectChanges();

    const editor = fixture.nativeElement.querySelector('.shift-editor') as HTMLElement;
    expect(editor).toBeTruthy();
    expect(editor.textContent).toContain('El turno se solapa con otro horario existente.');
  });

  it('excepción "No atiende" → POST con available false → 201 → se recarga y el 20 dice "No atiende"', () => {
    loadInitialWeek();

    buttonByText('Añadir excepción').click();
    fixture.detectChanges();

    const dateInput = fixture.nativeElement.querySelector(
      'input[formcontrolname="date"]'
    ) as HTMLInputElement;
    dateInput.value = '2026-10-20';
    dateInput.dispatchEvent(new Event('input'));
    (fixture.nativeElement.querySelector('input[value="closed"]') as HTMLInputElement).click();
    fixture.detectChanges();

    buttonByText('Guardar', '.exception-form').click();
    fixture.detectChanges();

    const req = httpMock.expectOne(SCHEDULES_PROF_1);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      weekday: null,
      specificDate: '2026-10-20',
      startTime: null,
      endTime: null,
      available: false,
    });
    req.flush(
      {
        success: true,
        message: 'Horario registrado.',
        data: { id: 13, weekday: null, specificDate: '2026-10-20', startTime: null, endTime: null, available: false },
      },
      { status: 201, statusText: 'Created' }
    );

    const reloadedRules: ApiResponse<Schedule[]> = {
      success: true,
      message: 'Horarios obtenidos',
      data: [
        { ...mondayRule, startTime: '08:00:00', endTime: '12:00:00' },
        { id: 13, weekday: null, specificDate: '2026-10-20', startTime: null, endTime: null, available: false },
      ],
    };
    httpMock.expectOne(SCHEDULES_PROF_1).flush(reloadedRules);
    httpMock.expectOne(EFFECTIVE_OCTOBER).flush({
      success: true,
      message: 'Horario efectivo obtenido',
      data: [{ date: '2026-10-20', shifts: [] }],
    });
    fixture.detectChanges();

    const exceptions = fixture.nativeElement.querySelector('.schedule-exceptions') as HTMLElement;
    expect(exceptions.textContent).toContain('No atiende');

    const day20 = fixture.nativeElement.querySelector('[data-date="2026-10-20"]') as HTMLElement;
    expect(day20.textContent).toContain('No atiende');
  });
});
