import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardSummary } from '../../models/dashboard.models';

const OCTOBER_SUMMARY: DashboardSummary = {
  from: '2026-10-01',
  to: '2026-10-31',
  patients: { totalActive: 312, newInRange: 14 },
  appointments: {
    total: 86,
    byStatus: { PENDING: 20, CONFIRMED: 9, ATTENDED: 48, CANCELLED: 4, NO_SHOW: 3, RESCHEDULED: 2 },
    noShowRate: 5.9,
    completedEncounters: 47,
  },
  billing: {
    collected: 845.5,
    byMethod: { EFECTIVO: 610, TRANSFERENCIA: 180.5, TARJETA: 55 },
    outstandingBalance: 420,
  },
  topTreatments: [{ code: 'PRO', name: 'Profilaxis', quantity: 21, amount: 525 }],
  byProfessional: [
    {
      professionalId: '66666666-6666-6666-6666-666666666666',
      name: 'Odontóloga Principal',
      encounters: 27,
      revenue: 710,
    },
  ],
  byChannel: [{ source: 'RECEPTION', appointments: 51 }],
};

function settle(harness: RouterTestingHarness): Promise<void> {
  harness.fixture.detectChanges();
  return harness.fixture.whenStable().then(() => harness.fixture.detectChanges());
}

function findButton(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === text
  );
}

describe('ClinicStatsPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-10T12:00:00-05:00'));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'direccion/estadisticas',
            loadComponent: () =>
              import('./clinic-stats.page').then((module) => module.ClinicStatsPage),
          },
        ]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('abrir Estadísticas → pide el mes actual y muestra las cifras; Semana → pide lunes a domingo', async () => {
    const harness = await RouterTestingHarness.create('/direccion/estadisticas');
    await settle(harness);

    const monthRequest = httpMock.expectOne((req) => req.url === '/api/v1/dashboard/summary');
    expect(monthRequest.request.method).toBe('GET');
    expect(monthRequest.request.params.get('from')).toBe('2026-10-01');
    expect(monthRequest.request.params.get('to')).toBe('2026-10-31');
    monthRequest.flush({ success: true, message: 'OK', data: OCTOBER_SUMMARY });
    await settle(harness);

    const text = harness.fixture.nativeElement.textContent as string;
    expect(text).toContain('47');
    expect(text).toContain('5,9 %');
    expect(text).toContain('$ 845,50');
    expect(text).toContain('$ 420,00');

    findButton('Semana')?.click();
    await settle(harness);

    const weekRequest = httpMock.expectOne((req) => req.url === '/api/v1/dashboard/summary');
    expect(weekRequest.request.params.get('from')).toBe('2026-10-05');
    expect(weekRequest.request.params.get('to')).toBe('2026-10-11');
    weekRequest.flush({
      success: true,
      message: 'OK',
      data: { ...OCTOBER_SUMMARY, from: '2026-10-05', to: '2026-10-11' },
    });
    await settle(harness);

    expect(harness.fixture.nativeElement.querySelector('h1')?.textContent).toContain('Estadísticas');
  });

  it('error del backend → muestra el mensaje y Reintentar → vuelve a pedir y muestra las cifras', async () => {
    const harness = await RouterTestingHarness.create('/direccion/estadisticas');
    await settle(harness);

    const failedRequest = httpMock.expectOne((req) => req.url === '/api/v1/dashboard/summary');
    failedRequest.flush(
      {
        success: false,
        message: 'Error interno del servidor. Contacte al administrador.',
        data: null,
      },
      { status: 500, statusText: 'Internal Server Error' }
    );
    await settle(harness);

    expect(harness.fixture.nativeElement.textContent).toContain(
      'Error interno del servidor. Contacte al administrador.'
    );

    findButton('Reintentar')?.click();
    await settle(harness);

    const retryRequest = httpMock.expectOne((req) => req.url === '/api/v1/dashboard/summary');
    expect(retryRequest.request.params.get('from')).toBe('2026-10-01');
    expect(retryRequest.request.params.get('to')).toBe('2026-10-31');
    retryRequest.flush({ success: true, message: 'OK', data: OCTOBER_SUMMARY });
    await settle(harness);

    expect(harness.fixture.nativeElement.textContent).toContain('47');
  });
});
