import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Page } from '../../../../core/api/page';
import { AuditEntry, AuditLogEntry } from '../../models/audit.models';
import { User } from '../../models/user.models';
import { AuditLogPage } from './audit-log.page';

const USERS_RESPONSE: User[] = [
  {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'secretaria',
    email: 'secretaria@bellidental.local',
    active: true,
    lastLoginAt: null,
    createdAt: '2026-09-01T10:00:00-05:00',
    roles: ['SECRETARIA'],
  },
];

const AUDIT_PAGE_RESPONSE: Page<AuditLogEntry> = {
  content: [
    {
      revision: 101,
      at: '2026-10-22T15:30:00Z',
      userId: '33333333-3333-3333-3333-333333333333',
      username: 'secretaria',
      entity: 'encounters',
      entityId: 'enc-1',
      type: 'MOD',
      patientId: 'P1',
      patientName: 'Juan Pérez',
    },
  ],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 50,
};

const ENCOUNTER_AUDIT_RESPONSE: AuditEntry[] = [
  {
    revision: 101,
    at: '2026-10-22T15:30:00Z',
    userId: '33333333-3333-3333-3333-333333333333',
    username: 'secretaria',
    type: 'MOD',
    changes: [
      { field: 'chiefComplaint', oldValue: 'Dolor leve', newValue: 'Dolor agudo en molar' },
    ],
  },
];

async function settle(harness: RouterTestingHarness): Promise<void> {
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();
}

describe('AuditLogPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'direccion/auditoria',
            component: AuditLogPage,
          },
        ]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('abrir con ?paciente=P1 → GET /api/v1/audit?from&to&patientId=P1&page=0&size=50 → se ven las filas agrupadas por día con "modificó la atención" y el nombre del paciente; "Ver cambios" → GET /audit/encounters/{id} → se ve el cambio de campo', async () => {
    const harness = await RouterTestingHarness.create('/direccion/auditoria?paciente=P1');
    await settle(harness);

    const usersReq = httpMock.match('/api/v1/users');
    if (usersReq.length > 0) {
      usersReq[0].flush({ success: true, message: 'OK', data: USERS_RESPONSE });
    }

    const auditReq = httpMock.expectOne((req) => req.url === '/api/v1/audit');
    expect(auditReq.request.method).toBe('GET');
    expect(auditReq.request.params.get('patientId')).toBe('P1');
    expect(auditReq.request.params.get('page')).toBe('0');
    expect(auditReq.request.params.get('size')).toBe('50');
    expect(auditReq.request.params.has('from')).toBe(true);
    expect(auditReq.request.params.has('to')).toBe(true);
    auditReq.flush({ success: true, message: 'OK', data: AUDIT_PAGE_RESPONSE });
    await settle(harness);

    const text = harness.fixture.nativeElement.textContent as string;
    expect(text).toContain('modificó la atención');
    expect(text).toContain('Juan Pérez');

    const verCambiosBtn = harness.fixture.nativeElement.querySelector(
      '.audit-timeline__btn'
    ) as HTMLButtonElement;
    expect(verCambiosBtn).not.toBeNull();
    verCambiosBtn.click();
    await settle(harness);

    const encounterReq = httpMock.expectOne('/api/v1/audit/encounters/enc-1');
    expect(encounterReq.request.method).toBe('GET');
    encounterReq.flush({ success: true, message: 'OK', data: ENCOUNTER_AUDIT_RESPONSE });
    await settle(harness);

    const dialog = document.querySelector('.audit-history') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Motivo de consulta');
    expect(dialog.textContent).toContain('Dolor agudo en molar');
  });

  it('respuesta 400 del backend (rango inválido) → se ve su message', async () => {
    const harness = await RouterTestingHarness.create('/direccion/auditoria');
    await settle(harness);

    const usersReq = httpMock.match('/api/v1/users');
    if (usersReq.length > 0) {
      usersReq[0].flush({ success: true, message: 'OK', data: USERS_RESPONSE });
    }

    const auditReq = httpMock.expectOne((req) => req.url === '/api/v1/audit');
    expect(auditReq.request.method).toBe('GET');
    auditReq.flush(
      { success: false, message: 'El rango de fechas no puede superar 92 días', data: null },
      { status: 400, statusText: 'Bad Request' }
    );
    await settle(harness);

    const text = harness.fixture.nativeElement.textContent as string;
    expect(text).toContain('El rango de fechas no puede superar 92 días');
  });
});
