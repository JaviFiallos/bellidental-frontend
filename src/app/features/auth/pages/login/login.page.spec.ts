import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { LoginPage } from './login.page';
import { SESSION_KEY } from '../../../../core/auth/session.store';

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

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let httpMock: HttpTestingController;
  let router: Router;
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
      imports: [LoginPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'recepcion', component: DummyComponent },
          { path: 'consultorio', component: DummyComponent },
        ]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock?.verify();
    storage.clear();
  });

  it('odontóloga ingresa → guarda sesión en localStorage y navega a /consultorio', async () => {
    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('#email');
    const passwordInput: HTMLInputElement = fixture.nativeElement.querySelector('#password');
    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');

    emailInput.value = 'odontologa@bellidental.local';
    emailInput.dispatchEvent(new Event('input'));

    passwordInput.value = 'password123';
    passwordInput.dispatchEvent(new Event('input'));

    fixture.detectChanges();

    submitBtn.click();
    fixture.detectChanges();

    const loginReq = httpMock.expectOne('/api/v1/auth/login');
    expect(loginReq.request.method).toBe('POST');
    expect(loginReq.request.body).toEqual({
      email: 'odontologa@bellidental.local',
      password: 'password123',
    });

    loginReq.flush({
      success: true,
      message: 'Inicio de sesión exitoso.',
      data: {
        accessToken: 'jwt-token-odontologa',
        expiresIn: 86400000,
        roles: ['ODONTOLOGO'],
      },
    });

    const meReq = httpMock.expectOne('/api/v1/auth/me');
    expect(meReq.request.method).toBe('GET');

    meReq.flush({
      success: true,
      message: 'Usuario obtenido.',
      data: {
        userId: 'u-1',
        email: 'odontologa@bellidental.local',
        roles: ['ODONTOLOGO'],
        permissions: ['APPOINTMENT_READ'],
        professionalId: 'p-1',
      },
    });

    await fixture.whenStable();

    expect(router.url).toBe('/consultorio');

    const sessionRaw = storage.getItem(SESSION_KEY);
    expect(sessionRaw).toBeTruthy();
    const session = JSON.parse(sessionRaw!);
    expect(session.accessToken).toBe('jwt-token-odontologa');
  });

  it('login responde 401 → muestra error de credenciales y no navega', async () => {
    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('#email');
    const passwordInput: HTMLInputElement = fixture.nativeElement.querySelector('#password');
    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');

    emailInput.value = 'odontologa@bellidental.local';
    emailInput.dispatchEvent(new Event('input'));

    passwordInput.value = 'clave_incorrecta';
    passwordInput.dispatchEvent(new Event('input'));

    fixture.detectChanges();

    submitBtn.click();
    fixture.detectChanges();

    const loginReq = httpMock.expectOne('/api/v1/auth/login');
    expect(loginReq.request.method).toBe('POST');

    loginReq.flush(
      {
        success: false,
        message: 'Credenciales inválidas.',
        data: null,
      },
      { status: 401, statusText: 'Unauthorized' }
    );

    fixture.detectChanges();
    await fixture.whenStable();

    const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alertEl).toBeTruthy();
    expect(alertEl.textContent).toContain('Correo o contraseña incorrectos.');
    expect(router.url).not.toBe('/consultorio');
  });
});
