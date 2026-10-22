import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { authInterceptor } from '../../../../core/interceptors/auth.interceptor';
import { errorInterceptor } from '../../../../core/interceptors/error.interceptor';
import { SessionStore } from '../../../../core/auth/session.store';
import { CurrentUser } from '../../../../core/auth/auth.models';
import { ChangePasswordPage } from './change-password.page';

@Component({ template: '' })
class EmptyLoginComponent {}

const SECRETARY_USER: CurrentUser = {
  userId: '7d9f2a3e-1b4c-4e8a-9f0d-2c6b8a1e5f10',
  email: 'secretaria@bellidental.ec',
  roles: ['SECRETARIA'],
  permissions: [],
  professionalId: null,
};

describe('ChangePasswordPage', () => {
  let harness: RouterTestingHarness;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'cuenta/contrasena', component: ChangePasswordPage },
          { path: 'auth/login', component: EmptyLoginComponent },
        ]),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    const sessionStore = TestBed.inject(SessionStore);
    sessionStore.setSession('token-1', 86400);
    sessionStore.setCurrentUser(SECRETARY_USER);

    harness = await RouterTestingHarness.create('/cuenta/contrasena');
  });

  afterEach(() => {
    httpMock.verify();
  });

  function fillAndSubmit(currentPassword: string, newPassword: string): void {
    const root = harness.routeNativeElement as HTMLElement;
    const setValue = (id: string, value: string) => {
      const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    setValue('current-password', currentPassword);
    setValue('new-password', newPassword);
    setValue('confirm-password', newPassword);
    (root.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    harness.detectChanges();
  }

  it('cambiar la contraseña → PUT /auth/password → mensaje de éxito y formulario vacío', async () => {
    fillAndSubmit('Cambiar.2026!', 'NuevaClave.2026');

    const request = httpMock.expectOne('/api/v1/auth/password');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      currentPassword: 'Cambiar.2026!',
      newPassword: 'NuevaClave.2026',
    });
    request.flush({ success: true, message: 'Contraseña actualizada.', data: null });
    await harness.fixture.whenStable();
    harness.detectChanges();

    const root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('Contraseña actualizada.');
    expect(root.querySelector<HTMLInputElement>('#current-password')!.value).toBe('');
    expect(root.querySelector<HTMLInputElement>('#new-password')!.value).toBe('');
    expect(root.querySelector<HTMLInputElement>('#confirm-password')!.value).toBe('');
  });

  it('contraseña actual incorrecta → 400 → mensaje y la sesión sigue', async () => {
    fillAndSubmit('Incorrecta.2026!', 'NuevaClave.2026');

    httpMock
      .expectOne('/api/v1/auth/password')
      .flush(
        { success: false, message: 'La contraseña actual no es correcta.', data: null },
        { status: 400, statusText: 'Bad Request' }
      );
    await harness.fixture.whenStable();
    harness.detectChanges();

    const root = harness.routeNativeElement as HTMLElement;
    expect(root.textContent).toContain('La contraseña actual no es correcta.');
    expect(TestBed.inject(SessionStore).token()).toBe('token-1');
    expect(TestBed.inject(Router).url).toBe('/cuenta/contrasena');
  });
});
