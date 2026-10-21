import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MainLayout } from './main-layout';
import { SessionStore } from '../../core/auth/session.store';

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

describe('MainLayout', () => {
  let fixture: ComponentFixture<MainLayout>;
  let httpMock: HttpTestingController;
  let sessionStore: SessionStore;
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
      imports: [MainLayout],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'recepcion', component: DummyComponent },
          { path: 'recepcion/horarios', component: DummyComponent },
          { path: 'consultorio', component: DummyComponent },
          { path: 'pacientes/:id', component: DummyComponent },
          { path: 'pacientes/nuevo', component: DummyComponent },
        ]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    sessionStore = TestBed.inject(SessionStore);
  });

  afterEach(() => {
    httpMock.verify();
    storage.clear();
    vi.useRealTimers();
  });

  it('odontóloga con professionalId → muestra nombre, Consultorio, Próxima cita de hoy y Mis citas', async () => {
    // Fijar hora del sistema a las 10:00:00 (hora local Ecuador UTC-5: 2026-10-10T10:00:00-05:00 = 15:00:00Z)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T15:00:00.000Z'));

    sessionStore.setSession('token-odontologa', 86400);
    sessionStore.setCurrentUser({
      userId: 'u-odo',
      email: 'odontologa@bellidental.local',
      roles: ['ODONTOLOGO'],
      permissions: ['APPOINTMENT_READ'],
      professionalId: 'p-123',
    });

    fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();

    // 1. Petición de profesional
    const profReq = httpMock.expectOne('/api/v1/professionals/p-123');
    expect(profReq.request.method).toBe('GET');
    profReq.flush({
      success: true,
      message: 'OK',
      data: {
        id: 'p-123',
        userId: 'u-odo',
        fullName: 'Dra. Sofía Mendoza',
        licenseNumber: 'LIC-999',
        colorTag: '#1C3C5C',
        specialties: [],
        active: true,
      },
    });

    // 2. Petición de citas con from, to y professionalId
    const appReq = httpMock.expectOne((req) => req.url === '/api/v1/appointments');
    expect(appReq.request.method).toBe('GET');
    expect(appReq.request.params.get('professionalId')).toBe('p-123');
    expect(appReq.request.params.get('from')).toBe('2026-10-10T00:00:00-05:00');
    expect(appReq.request.params.get('to')).toBe('2026-10-10T23:59:59-05:00');

    appReq.flush({
      success: true,
      message: 'OK',
      data: [
        {
          id: 'app-past',
          patientId: 'pat-1',
          patientName: 'Carlos Gómez',
          professionalId: 'p-123',
          professionalName: 'Dra. Sofía Mendoza',
          specialtyId: 'spec-1',
          specialtyName: 'Odontología General',
          startAt: '2026-10-10T09:00:00-05:00',
          endAt: '2026-10-10T09:45:00-05:00',
          status: 'ATTENDED',
          source: 'RECEPTION',
        },
        {
          id: 'app-next',
          patientId: 'pat-2',
          patientName: 'David Pérez',
          professionalId: 'p-123',
          professionalName: 'Dra. Sofía Mendoza',
          specialtyId: 'spec-1',
          specialtyName: 'Odontología General',
          startAt: '2026-10-10T10:30:00-05:00',
          endAt: '2026-10-10T11:15:00-05:00',
          status: 'CONFIRMED',
          source: 'RECEPTION',
        },
      ],
    });

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    // Verificar pie de sidebar: nombre y "Consultorio"
    const userNameEl = compiled.querySelector('.sidebar__user-name');
    const areaLabelEl = compiled.querySelector('.sidebar__user-area');
    expect(userNameEl?.textContent).toContain('Dra. Sofía Mendoza');
    expect(areaLabelEl?.textContent).toContain('Consultorio');

    // Verificar menú: "Mis citas" presente y NO "Agenda"
    const menuText = compiled.querySelector('.sidebar__menu')?.textContent || '';
    expect(menuText).toContain('Mis citas');
    expect(menuText).not.toContain('Agenda');

    // Verificar header: Próxima cita con hora 10:30 y paciente David Pérez (sin nombre de profesional en consultorio)
    const nextAppEl = compiled.querySelector('.next-app--active');
    expect(nextAppEl).toBeTruthy();
    expect(nextAppEl?.textContent).toContain('Próxima:');
    expect(nextAppEl?.textContent).toContain('10:30');
    expect(nextAppEl?.textContent).toContain('David Pérez');
    expect(nextAppEl?.textContent).not.toContain('Dra. Sofía Mendoza');
  });

  it('secretaria → sin professionalId, error 500 muestra error en próxima cita, menú muestra Agenda y Horarios, pie muestra correo y Recepción', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T15:00:00.000Z'));

    sessionStore.setSession('token-sec', 86400);
    sessionStore.setCurrentUser({
      userId: 'u-sec',
      email: 'secretaria@bellidental.local',
      roles: ['SECRETARIA'],
      permissions: ['APPOINTMENT_READ'],
    });

    fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();

    // Sin professionalId, no debe pedir /professionals/{id}
    httpMock.expectNone((req) => req.url.includes('/api/v1/professionals'));

    // Pide appointments sin professionalId
    const appReq = httpMock.expectOne((req) => req.url === '/api/v1/appointments');
    expect(appReq.request.method).toBe('GET');
    expect(appReq.request.params.has('professionalId')).toBe(false);
    expect(appReq.request.params.get('from')).toBe('2026-10-10T00:00:00-05:00');
    expect(appReq.request.params.get('to')).toBe('2026-10-10T23:59:59-05:00');

    // Falla con error 500
    appReq.flush(
      { success: false, message: 'Server error', data: null },
      { status: 500, statusText: 'Internal Server Error' }
    );

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    // Próxima cita muestra mensaje de error atenuado
    const errorEl = compiled.querySelector('.next-app--error');
    expect(errorEl).toBeTruthy();
    expect(errorEl?.textContent).toContain('No se pudo cargar la próxima cita');

    // Menú contiene Agenda y Horarios
    const menuText = compiled.querySelector('.sidebar__menu')?.textContent || '';
    expect(menuText).toContain('Agenda');
    expect(menuText).toContain('Horarios');

    // Pie muestra el email y "Recepción"
    const userNameEl = compiled.querySelector('.sidebar__user-name');
    const areaLabelEl = compiled.querySelector('.sidebar__user-area');
    expect(userNameEl?.textContent).toContain('secretaria@bellidental.local');
    expect(areaLabelEl?.textContent).toContain('Recepción');
  });

  it('buscador: secretaria escribe "per" → GET /api/v1/patients?query=per&page=0&size=8 → muestra nombres → ↓ + Enter navega a /pacientes/{id}', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T15:00:00.000Z'));

    sessionStore.setSession('token-sec', 86400);
    sessionStore.setCurrentUser({
      userId: 'u-sec',
      email: 'secretaria@bellidental.local',
      roles: ['SECRETARIA'],
      permissions: ['APPOINTMENT_READ'],
    });

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();

    // Atender GET /api/v1/appointments inicial
    const appReq = httpMock.expectOne((req) => req.url === '/api/v1/appointments');
    appReq.flush({
      success: true,
      message: 'OK',
      data: [],
    });
    fixture.detectChanges();

    // Escribir "per" en el buscador
    const inputEl = fixture.nativeElement.querySelector('.combobox-input') as HTMLInputElement;
    expect(inputEl).toBeTruthy();
    inputEl.value = 'per';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Avanzar debounce (250 ms)
    vi.advanceTimersByTime(250);

    // Atender petición de pacientes
    const patReq = httpMock.expectOne(
      (req) =>
        req.url === '/api/v1/patients' &&
        req.params.get('query') === 'per' &&
        req.params.get('page') === '0' &&
        req.params.get('size') === '8'
    );
    expect(patReq.request.method).toBe('GET');

    patReq.flush({
      success: true,
      message: 'OK',
      data: {
        content: [
          {
            id: 'pat-1',
            documentType: 'CI',
            documentNumber: '1712345678',
            firstName: 'Juan',
            lastName: 'Pérez',
            fullName: 'Juan Pérez',
            birthDate: '1995-05-10',
            age: 31,
            sex: 'M',
            bloodType: 'O_POSITIVE',
            bloodTypeLabel: 'O+',
            phoneE164: '593987654321',
            email: 'juan.perez@example.com',
            emergencyContactName: null,
            emergencyContactPhoneE164: null,
            active: true,
            createdAt: '2026-01-01T10:00:00Z',
            updatedAt: '2026-01-01T10:00:00Z',
          },
          {
            id: 'pat-2',
            documentType: 'CI',
            documentNumber: '1787654321',
            firstName: 'María',
            lastName: 'Pérez',
            fullName: 'María Pérez',
            birthDate: '2000-01-15',
            age: 26,
            sex: 'F',
            bloodType: null,
            bloodTypeLabel: null,
            phoneE164: '593991234567',
            email: null,
            emergencyContactName: null,
            emergencyContactPhoneE164: null,
            active: true,
            createdAt: '2026-01-01T10:00:00Z',
            updatedAt: '2026-01-01T10:00:00Z',
          },
        ],
        totalElements: 2,
        totalPages: 1,
        number: 0,
        size: 8,
      },
    });

    fixture.detectChanges();

    // Se ven los dos nombres en la lista
    expect(document.body.textContent).toContain('Juan Pérez');
    expect(document.body.textContent).toContain('María Pérez');

    // ↓ + Enter
    inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();

    inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    // Navega a /pacientes/pat-1
    expect(navigateSpy).toHaveBeenCalledWith(['/pacientes', 'pat-1']);
  });

  it('buscador: secretaria escribe "zzz" → respuesta vacía → se ve "Registrar paciente «zzz»" → Enter navega a /pacientes/nuevo?q=zzz', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T15:00:00.000Z'));

    sessionStore.setSession('token-sec', 86400);
    sessionStore.setCurrentUser({
      userId: 'u-sec',
      email: 'secretaria@bellidental.local',
      roles: ['SECRETARIA'],
      permissions: ['APPOINTMENT_READ'],
    });

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();

    // Atender GET /api/v1/appointments inicial
    const appReq = httpMock.expectOne((req) => req.url === '/api/v1/appointments');
    appReq.flush({
      success: true,
      message: 'OK',
      data: [],
    });
    fixture.detectChanges();

    // Escribir "zzz" en el buscador
    const inputEl = fixture.nativeElement.querySelector('.combobox-input') as HTMLInputElement;
    expect(inputEl).toBeTruthy();
    inputEl.value = 'zzz';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Avanzar debounce (250 ms)
    vi.advanceTimersByTime(250);

    // Atender petición de pacientes con página vacía
    const patReq = httpMock.expectOne(
      (req) =>
        req.url === '/api/v1/patients' &&
        req.params.get('query') === 'zzz' &&
        req.params.get('page') === '0' &&
        req.params.get('size') === '8'
    );
    expect(patReq.request.method).toBe('GET');

    patReq.flush({
      success: true,
      message: 'OK',
      data: {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 8,
      },
    });

    fixture.detectChanges();

    // Se ve la opción "Registrar paciente «zzz»"
    expect(document.body.textContent).toContain('Registrar paciente «zzz»');

    // Enter
    inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    // Navega a /pacientes/nuevo?q=zzz
    expect(navigateSpy).toHaveBeenCalledWith(['/pacientes/nuevo'], {
      queryParams: { q: 'zzz' },
    });
  });

  it('clic en "Pacientes" en el sidebar → ejecuta focusSearch(), enfoca input y aplica resalte visual en el header', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T15:00:00.000Z'));

    sessionStore.setSession('token-sec', 86400);
    sessionStore.setCurrentUser({
      userId: 'u-sec',
      email: 'secretaria@bellidental.local',
      roles: ['SECRETARIA'],
      permissions: ['APPOINTMENT_READ'],
    });

    fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();

    // Atender GET inicial de citas
    const appReq = httpMock.expectOne((req) => req.url === '/api/v1/appointments');
    appReq.flush({ success: true, message: 'OK', data: [] });
    fixture.detectChanges();

    // Buscar el botón "Pacientes" en el sidebar
    const buttons = fixture.nativeElement.querySelectorAll('.sidebar__link--btn') as NodeListOf<HTMLButtonElement>;
    const pacientesBtn = Array.from(buttons).find((btn) => btn.textContent?.includes('Pacientes'));
    expect(pacientesBtn).toBeTruthy();

    // Clic en "Pacientes"
    pacientesBtn!.click();
    fixture.detectChanges();

    // El input del combobox queda enfocado
    const inputEl = fixture.nativeElement.querySelector('.combobox-input') as HTMLInputElement;
    expect(document.activeElement).toBe(inputEl);

    // El componente de búsqueda tiene el resalte activo
    const patientSearchEl = fixture.nativeElement.querySelector('app-patient-search') as HTMLElement;
    expect(patientSearchEl.classList.contains('is-highlighted')).toBe(true);

    // Tras 1200 ms, el resalte concluye
    vi.advanceTimersByTime(1200);
    fixture.detectChanges();

    expect(patientSearchEl.classList.contains('is-highlighted')).toBe(false);
  });

  it('buscador: normaliza término con guiones o espacios (cédula) → envía query limpia a GET /api/v1/patients y muestra resultados', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T15:00:00.000Z'));

    sessionStore.setSession('token-sec', 86400);
    sessionStore.setCurrentUser({
      userId: 'u-sec',
      email: 'secretaria@bellidental.local',
      roles: ['SECRETARIA'],
      permissions: ['APPOINTMENT_READ'],
    });

    fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();

    // Atender GET inicial de citas
    const appReq = httpMock.expectOne((req) => req.url === '/api/v1/appointments');
    appReq.flush({ success: true, message: 'OK', data: [] });
    fixture.detectChanges();

    // Escribir cédula con formato "171003406-5" en el input
    const inputEl = fixture.nativeElement.querySelector('.combobox-input') as HTMLInputElement;
    inputEl.value = '171003406-5';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Avanzar debounce (250 ms)
    vi.advanceTimersByTime(250);

    // Se verifica que la petición a la API envió la cédula normalizada y limpia "1710034065"
    const patReq = httpMock.expectOne(
      (req) =>
        req.url === '/api/v1/patients' &&
        req.params.get('query') === '1710034065' &&
        req.params.get('page') === '0' &&
        req.params.get('size') === '8'
    );
    expect(patReq.request.method).toBe('GET');

    patReq.flush({
      success: true,
      message: 'OK',
      data: {
        content: [
          {
            id: 'pat-10',
            documentType: 'CI',
            documentNumber: '1710034065',
            firstName: 'Ana',
            lastName: 'Torres',
            fullName: 'Ana Torres',
            birthDate: '1990-03-20',
            age: 36,
            sex: 'F',
            bloodType: 'O_POSITIVE',
            bloodTypeLabel: 'O+',
            phoneE164: '593994443322',
            email: 'ana.torres@example.com',
            emergencyContactName: null,
            emergencyContactPhoneE164: null,
            active: true,
            createdAt: '2026-01-01T10:00:00Z',
            updatedAt: '2026-01-01T10:00:00Z',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 8,
      },
    });

    fixture.detectChanges();

    // Se despliegan fullName, documentNumber, edad y teléfono en el combobox
    const bodyText = document.body.textContent || '';
    expect(bodyText).toContain('Ana Torres');
    expect(bodyText).toContain('1710034065');
    expect(bodyText).toContain('36 años');
    expect(bodyText).toContain('0994 443 322');
  });
});
