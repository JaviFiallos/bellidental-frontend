import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SessionStore } from '../../../../core/auth/session.store';
import { PatientListPage } from './patient-list.page';

async function settle(harness: RouterTestingHarness): Promise<void> {
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();
}

describe('PatientListPage', () => {
  let httpMock: HttpTestingController;
  let sessionStore: SessionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'pacientes',
            component: PatientListPage,
          },
        ]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    sessionStore = TestBed.inject(SessionStore);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('abrir Pacientes → lista de últimos atendidos', async () => {
    sessionStore.setSession('token-dir', 86400);
    sessionStore.setCurrentUser({
      userId: 'u-dir',
      email: 'director@bellidental.local',
      roles: ['ADMIN'],
      professionalId: 'prof-dir',
      permissions: ['PATIENT_READ', 'BILLING_READ'],
    });

    const harness = await RouterTestingHarness.create('/pacientes');
    await settle(harness);

    const req = httpMock.expectOne((r) => r.url === '/api/v1/patients/list');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('view')).toBe('ATTENDED');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.has('from')).toBe(false);
    expect(req.request.params.has('to')).toBe(false);

    req.flush({
      success: true,
      message: 'OK',
      data: {
        content: [
          {
            id: 'pat-1',
            firstName: 'Carlos',
            lastName: 'Mendoza',
            fullName: 'Carlos Mendoza',
            documentType: 'CI',
            documentNumber: '1801234567',
            age: 34,
            lastEncounterAt: '2026-10-20T10:00:00-05:00',
            createdAt: '2026-01-15T09:00:00-05:00',
            pendingBalance: 30,
          },
          {
            id: 'pat-2',
            firstName: 'Ana',
            lastName: 'Pérez',
            fullName: 'Ana Pérez',
            documentType: 'PASAPORTE',
            documentNumber: 'A1234567',
            age: 28,
            lastEncounterAt: null,
            createdAt: '2026-02-10T11:00:00-05:00',
            pendingBalance: 0,
          },
        ],
        totalElements: 2,
        totalPages: 1,
        number: 0,
        size: 20,
      },
    });
    await settle(harness);

    const text = harness.fixture.nativeElement.textContent as string;
    expect(text).toContain('Carlos');
    expect(text).toContain('Mendoza');
    expect(text).toContain('Ana');
    expect(text).toContain('Pérez');
    expect(text).toContain('Debe');
    expect(text).toContain('30,00');
    expect(text).toContain('Al día');

    const links = Array.from(
      harness.fixture.nativeElement.querySelectorAll('a')
    ) as HTMLAnchorElement[];

    const link033 = links.find((a) => a.textContent?.includes('Ver 033'));
    expect(link033).toBeTruthy();
    expect(link033?.getAttribute('href')).toBe('/pacientes/pat-1/033');

    const linkVerMas = links.find(
      (a) => a.textContent?.includes('Ver más') && a.getAttribute('href') === '/pacientes/pat-1'
    );
    expect(linkVerMas).toBeTruthy();
  });

  it('últimos registrados + solo con saldo → petición con los filtros', async () => {
    sessionStore.setSession('token-dir', 86400);
    sessionStore.setCurrentUser({
      userId: 'u-dir',
      email: 'director@bellidental.local',
      roles: ['ADMIN'],
      professionalId: 'prof-dir',
      permissions: ['PATIENT_READ', 'BILLING_READ'],
    });

    const harness = await RouterTestingHarness.create('/pacientes');
    await settle(harness);

    const initialReq = httpMock.expectOne((r) => r.url === '/api/v1/patients/list');
    initialReq.flush({
      success: true,
      message: 'OK',
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 },
    });
    await settle(harness);

    // Elegir «Últimos registrados»
    const buttons = Array.from(
      harness.fixture.nativeElement.querySelectorAll('button.bd-segmented__item')
    ) as HTMLButtonElement[];
    const registradosBtn = buttons.find((b) => b.textContent?.includes('Últimos registrados'));
    expect(registradosBtn).toBeTruthy();
    registradosBtn!.click();
    await settle(harness);

    const viewReq = httpMock.expectOne((r) => r.url === '/api/v1/patients/list');
    expect(viewReq.request.params.get('view')).toBe('CREATED');
    viewReq.flush({
      success: true,
      message: 'OK',
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 },
    });
    await settle(harness);

    // Marcar «Solo con saldo pendiente»
    const balanceCheckbox = harness.fixture.nativeElement.querySelector(
      '.patient-list-filters__check input[type="checkbox"]'
    ) as HTMLInputElement;
    expect(balanceCheckbox).toBeTruthy();
    balanceCheckbox.click();
    await settle(harness);

    const balanceReq = httpMock.expectOne((r) => r.url === '/api/v1/patients/list');
    expect(balanceReq.request.params.get('view')).toBe('CREATED');
    expect(balanceReq.request.params.get('withBalance')).toBe('true');
    expect(balanceReq.request.params.get('page')).toBe('0');

    balanceReq.flush({
      success: true,
      message: 'OK',
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 },
    });
    await settle(harness);

    expect(harness.fixture.nativeElement.textContent).toContain(
      'Ningún paciente registrado en este período.'
    );
  });

  it('secretaria sin columna 033', async () => {
    sessionStore.setSession('token-sec', 86400);
    sessionStore.setCurrentUser({
      userId: 'u-sec',
      email: 'secretaria@bellidental.local',
      roles: ['SECRETARIA'],
      permissions: ['PATIENT_READ', 'BILLING_READ'],
    });

    const harness = await RouterTestingHarness.create('/pacientes');
    await settle(harness);

    const req = httpMock.expectOne((r) => r.url === '/api/v1/patients/list');
    req.flush({
      success: true,
      message: 'OK',
      data: {
        content: [
          {
            id: 'pat-1',
            firstName: 'Carlos',
            lastName: 'Mendoza',
            fullName: 'Carlos Mendoza',
            documentType: 'CI',
            documentNumber: '1801234567',
            age: 34,
            lastEncounterAt: '2026-10-20T10:00:00-05:00',
            createdAt: '2026-01-15T09:00:00-05:00',
            pendingBalance: 25,
          },
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      },
    });
    await settle(harness);

    const text = harness.fixture.nativeElement.textContent as string;
    expect(text).toContain('Saldo pendiente');
    expect(text).toContain('Debe');
    expect(text).toContain('25,00');

    expect(text).not.toContain('Formulario 033');
    expect(text).not.toContain('Ver 033');
  });
});
