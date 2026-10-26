import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApiResponse } from '../../../../core/api/api.models';
import { Professional } from '../../../professionals';
import { User } from '../../models/user.models';

const USERS: User[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'director',
    email: 'director@bellidental.local',
    active: true,
    lastLoginAt: '2026-10-21T08:02:11-05:00',
    createdAt: '2026-09-01T10:00:00-05:00',
    roles: ['ADMIN', 'ODONTOLOGO'],
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'odontologa',
    email: 'odontologa@bellidental.local',
    active: true,
    lastLoginAt: '2026-10-20T07:55:00-05:00',
    createdAt: '2026-09-01T10:00:00-05:00',
    roles: ['ODONTOLOGO'],
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'secretaria',
    email: 'secretaria@bellidental.local',
    active: true,
    lastLoginAt: null,
    createdAt: '2026-09-01T10:00:00-05:00',
    roles: ['SECRETARIA'],
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    username: 'bot_whatsapp',
    email: 'bot@bellidental.local',
    active: true,
    lastLoginAt: null,
    createdAt: '2026-09-01T10:00:00-05:00',
    roles: [],
  },
];

const ANA: User = {
  id: '55555555-5555-5555-5555-555555555555',
  username: 'ana.perez',
  email: 'ana.perez@bellidental.local',
  active: true,
  lastLoginAt: null,
  createdAt: '2026-10-21T09:00:00-05:00',
  roles: ['SECRETARIA'],
};

const PROFESSIONALS: Professional[] = [
  {
    id: '88888888-8888-8888-8888-888888888888',
    userId: '11111111-1111-1111-1111-111111111111',
    fullName: 'Director Clínico',
    licenseNumber: 'MSP-1000',
    colorTag: '#1d4ed8',
    specialties: [],
    active: true,
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    userId: '22222222-2222-2222-2222-222222222222',
    fullName: 'Odontóloga Principal',
    licenseNumber: 'MSP-1001',
    colorTag: '#0f766e',
    specialties: [],
    active: true,
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    userId: null,
    fullName: 'Hugo Soria',
    licenseNumber: 'MSP-1002',
    colorTag: '#b45309',
    specialties: [],
    active: true,
  },
];

function settle(harness: RouterTestingHarness): Promise<void> {
  harness.fixture.detectChanges();
  return harness.fixture.whenStable().then(() => harness.fixture.detectChanges());
}

function findButton(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === text
  );
}

function typeInto(selector: string, value: string): void {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input) {
    throw new Error(`No existe ${selector}`);
  }
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

async function loadList(harness: RouterTestingHarness, httpMock: HttpTestingController) {
  await settle(harness);
  httpMock.expectOne('/api/v1/users').flush({ success: true, message: 'OK', data: USERS });
  const professionalsBody: ApiResponse<Professional[]> = {
    success: true,
    message: 'OK',
    data: PROFESSIONALS,
  };
  httpMock.expectOne('/api/v1/professionals').flush(professionalsBody);
  await settle(harness);
}

async function openCreatePanelWithForm(harness: RouterTestingHarness) {
  findButton('Nueva secretaria')?.click();
  await settle(harness);

  typeInto('#user-email', 'ana.perez@bellidental.local');
  typeInto('#user-temporary-password', 'Temporal.2026');
  await settle(harness);
}

describe('UsersPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'direccion/usuarios',
            loadComponent: () => import('./users.page').then((module) => module.UsersPage),
          },
        ]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('abrir Usuarios → lista con roles y profesional; Nueva secretaria → POST /users → la lista se recarga', async () => {
    const harness = await RouterTestingHarness.create('/direccion/usuarios');
    await loadList(harness, httpMock);

    const listText = harness.fixture.nativeElement.textContent as string;
    expect(listText).toContain('odontologa');
    expect(listText).toContain('Odontóloga Principal');
    expect(listText).toContain('Cuenta del sistema');
    expect(listText).toContain('4 cuentas · 4 activas');

    await openCreatePanelWithForm(harness);
    findButton('Crear secretaria')?.click();
    await settle(harness);

    const createRequest = httpMock.expectOne({ method: 'POST', url: '/api/v1/users' });
    expect(createRequest.request.body).toEqual({
      email: 'ana.perez@bellidental.local',
      temporaryPassword: 'Temporal.2026',
      roles: ['SECRETARIA'],
    });
    createRequest.flush(
      { success: true, message: 'Usuario creado.', data: ANA },
      { status: 201, statusText: 'Created' }
    );
    await settle(harness);

    const reloadRequest = httpMock.expectOne('/api/v1/users');
    reloadRequest.flush({ success: true, message: 'OK', data: [ANA, ...USERS] });
    await settle(harness);

    const text = harness.fixture.nativeElement.textContent as string;
    expect(text).toContain('ana.perez');
    expect(text).toContain('Temporal.2026');
  });

  it('correo repetido → 409 → mensaje en el formulario', async () => {
    const harness = await RouterTestingHarness.create('/direccion/usuarios');
    await loadList(harness, httpMock);
    await openCreatePanelWithForm(harness);

    findButton('Crear secretaria')?.click();
    await settle(harness);

    const createRequest = httpMock.expectOne({ method: 'POST', url: '/api/v1/users' });
    createRequest.flush(
      {
        success: false,
        message: "El email 'ana.perez@bellidental.local' ya está en uso.",
        data: null,
      },
      { status: 409, statusText: 'Conflict' }
    );
    await settle(harness);

    expect(harness.fixture.nativeElement.textContent).toContain(
      "El email 'ana.perez@bellidental.local' ya está en uso."
    );
    expect(document.querySelector('#user-email')).not.toBeNull();
  });

  it('Dar acceso a un profesional sin cuenta → POST /professionals/{id}/access → aparece vinculado', async () => {
    const harness = await RouterTestingHarness.create('/direccion/usuarios');
    await loadList(harness, httpMock);

    const withoutAccess = harness.fixture.nativeElement.textContent as string;
    expect(withoutAccess).toContain('Profesionales sin cuenta');
    expect(withoutAccess).toContain('Hugo Soria');

    findButton('Dar acceso')?.click();
    await settle(harness);
    typeInto('#grant-email', 'hugo.soria@bellidental.local');
    typeInto('#grant-temporary-password', 'Temporal.2026');
    await settle(harness);
    findButton('Crear acceso')?.click();
    await settle(harness);

    const grantRequest = httpMock.expectOne({
      method: 'POST',
      url: '/api/v1/professionals/77777777-7777-7777-7777-777777777777/access',
    });
    expect(grantRequest.request.body).toEqual({
      email: 'hugo.soria@bellidental.local',
      temporaryPassword: 'Temporal.2026',
    });
    grantRequest.flush(
      {
        success: true,
        message: 'Cuenta de acceso creada.',
        data: {
          id: '99999999-9999-9999-9999-999999999999',
          username: 'hugo.soria',
          email: 'hugo.soria@bellidental.local',
          active: true,
          lastLoginAt: null,
          createdAt: '2026-10-21T10:00:00-05:00',
          roles: ['ODONTOLOGO'],
        },
      },
      { status: 201, statusText: 'Created' }
    );
    await settle(harness);

    httpMock.expectOne('/api/v1/users').flush({
      success: true,
      message: 'OK',
      data: [
        ...USERS,
        {
          id: '99999999-9999-9999-9999-999999999999',
          username: 'hugo.soria',
          email: 'hugo.soria@bellidental.local',
          active: true,
          lastLoginAt: null,
          createdAt: '2026-10-21T10:00:00-05:00',
          roles: ['ODONTOLOGO'],
        },
      ],
    });
    httpMock.expectOne('/api/v1/professionals').flush({
      success: true,
      message: 'OK',
      data: PROFESSIONALS.map((professional) =>
        professional.id === '77777777-7777-7777-7777-777777777777'
          ? { ...professional, userId: '99999999-9999-9999-9999-999999999999' }
          : professional
      ),
    });
    await settle(harness);

    const text = harness.fixture.nativeElement.textContent as string;
    expect(text).toContain('hugo.soria');
    expect(text).not.toContain('Profesionales sin cuenta');
  });

  it('Restablecer contraseña rechazada por el backend → 409 → mensaje en el panel', async () => {
    const harness = await RouterTestingHarness.create('/direccion/usuarios');
    await loadList(harness, httpMock);

    document
      .querySelector<HTMLButtonElement>('button[aria-label="Restablecer contraseña de secretaria"]')
      ?.click();
    await settle(harness);
    typeInto('#reset-temporary-password', 'Temporal.2026');
    await settle(harness);
    findButton('Restablecer')?.click();
    await settle(harness);

    const resetRequest = httpMock.expectOne({
      method: 'POST',
      url: '/api/v1/users/33333333-3333-3333-3333-333333333333/reset-password',
    });
    expect(resetRequest.request.body).toEqual({ temporaryPassword: 'Temporal.2026' });
    resetRequest.flush(
      {
        success: false,
        message: 'Los usuarios del sistema no se pueden modificar.',
        data: null,
      },
      { status: 409, statusText: 'Conflict' }
    );
    await settle(harness);

    expect(harness.fixture.nativeElement.textContent).toContain(
      'Los usuarios del sistema no se pueden modificar.'
    );
    expect(document.querySelector('#reset-temporary-password')).not.toBeNull();
  });
});
