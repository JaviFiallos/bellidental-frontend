import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionStore } from '../../../../core/auth/session.store';
import {
  mockClinicalRecordApiResponse,
  mockDiagnosisApiResponse,
  mockEncounterApiResponse,
  mockEncounterCompletedApiResponse,
  mockIcd10SearchApiResponse,
  mockPatientApiResponse,
} from '../../testing/fixtures';
import { EncounterPage } from './encounter.page';

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

describe('EncounterPage', () => {
  let fixture: ComponentFixture<EncounterPage>;
  let httpMock: HttpTestingController;
  let sessionStore: SessionStore;
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
      imports: [EncounterPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'consultorio', component: DummyComponent }]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'encounterId' ? 'enc-1' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    sessionStore = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);

    sessionStore.setSession('test-token', 86400000);
    sessionStore.setCurrentUser({
      userId: 'user-prof-1',
      email: 'odontologa@bellidental.local',
      roles: ['ODONTOLOGO'],
      permissions: ['RECORD_READ', 'RECORD_UPDATE', 'RECORD_CREATE'],
      professionalId: 'prof-1',
    });
  });

  afterEach(() => {
    httpMock.verify();
    storage.clear();
    vi.useRealTimers();
  });

  it('carga la atención → cabecera con antecedentes y motivo', async () => {
    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();

    // 1. GET /api/v1/encounters/enc-1
    const encReq = httpMock.expectOne('/api/v1/encounters/enc-1');
    expect(encReq.request.method).toBe('GET');
    encReq.flush(mockEncounterApiResponse);

    // 2. GET /api/v1/patients/pat-1 y GET /api/v1/patients/pat-1/clinical-record
    const patReq = httpMock.expectOne('/api/v1/patients/pat-1');
    expect(patReq.request.method).toBe('GET');
    patReq.flush(mockPatientApiResponse);

    const recordReq = httpMock.expectOne('/api/v1/patients/pat-1/clinical-record');
    expect(recordReq.request.method).toBe('GET');
    recordReq.flush(mockClinicalRecordApiResponse);

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    // Se ve el nombre del paciente
    expect(compiled.textContent).toContain('Juan Pérez');

    // Se ve el chip "Diabetes"
    expect(compiled.textContent).toContain('Diabetes');

    // Se ve el motivo en su campo
    const inputEl = compiled.querySelector('#chief-complaint-input') as HTMLInputElement;
    expect(inputEl).toBeTruthy();
    expect(inputEl.value).toBe('Paciente refiere dolor en molar');
  });

  it('agrega un diagnóstico → POST y aparece en la lista', async () => {
    vi.useFakeTimers();

    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();

    // Carga inicial
    const encReq = httpMock.expectOne('/api/v1/encounters/enc-1');
    encReq.flush(mockEncounterApiResponse);

    const patReq = httpMock.expectOne('/api/v1/patients/pat-1');
    patReq.flush(mockPatientApiResponse);

    const recordReq = httpMock.expectOne('/api/v1/patients/pat-1/clinical-record');
    recordReq.flush(mockClinicalRecordApiResponse);

    fixture.detectChanges();

    // Escribir "K02" en el buscador de diagnósticos
    const inputEl = fixture.nativeElement.querySelector('.combobox-input') as HTMLInputElement;
    expect(inputEl).toBeTruthy();
    inputEl.value = 'K02';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Avanzar debounce de 300 ms
    vi.advanceTimersByTime(300);

    // GET /api/v1/icd10?query=K02
    const icdReq = httpMock.expectOne((r) => r.url === '/api/v1/icd10' && r.params.get('query') === 'K02');
    expect(icdReq.request.method).toBe('GET');
    icdReq.flush(mockIcd10SearchApiResponse);

    fixture.detectChanges();

    // Elegir el resultado en el combobox
    const option = document.querySelector('.combobox-option') as HTMLElement;
    expect(option).toBeTruthy();
    option.click();

    // POST /api/v1/encounters/enc-1/diagnoses con body { icd10Id, certainty: 'DEFINITIVE' }
    const addReq = httpMock.expectOne('/api/v1/encounters/enc-1/diagnoses');
    expect(addReq.request.method).toBe('POST');
    expect(addReq.request.body).toEqual({
      icd10Id: 101,
      certainty: 'DEFINITIVE',
    });
    addReq.flush(mockDiagnosisApiResponse);

    fixture.detectChanges();
    await fixture.whenStable();

    // Aparece K02.1 en la lista
    expect(fixture.nativeElement.textContent).toContain('K02.1');

    // "Completar atención" queda habilitado
    const completeBtn = fixture.nativeElement.querySelector('.complete-bar__btn') as HTMLButtonElement;
    expect(completeBtn).toBeTruthy();
    expect(completeBtn.disabled).toBe(false);
  });

  it('completa la atención → POST y navega a /consultorio', async () => {
    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();

    // Carga inicial con atención que ya tiene motivo y diagnóstico
    const encounterWithDiag = {
      ...mockEncounterApiResponse.data,
      diagnoses: [mockDiagnosisApiResponse.data],
    };

    const encReq = httpMock.expectOne('/api/v1/encounters/enc-1');
    encReq.flush({
      success: true,
      message: 'OK',
      data: encounterWithDiag,
    });

    const patReq = httpMock.expectOne('/api/v1/patients/pat-1');
    patReq.flush(mockPatientApiResponse);

    const recordReq = httpMock.expectOne('/api/v1/patients/pat-1/clinical-record');
    recordReq.flush(mockClinicalRecordApiResponse);

    fixture.detectChanges();
    await fixture.whenStable();

    // Botón Completar atención debe estar habilitado
    const completeBtn = fixture.nativeElement.querySelector('.complete-bar__btn') as HTMLButtonElement;
    expect(completeBtn).toBeTruthy();
    expect(completeBtn.disabled).toBe(false);

    // Pulsar "Completar atención"
    completeBtn.click();
    fixture.detectChanges();

    // POST /api/v1/encounters/enc-1/complete
    const compReq = httpMock.expectOne('/api/v1/encounters/enc-1/complete');
    expect(compReq.request.method).toBe('POST');
    compReq.flush(mockEncounterCompletedApiResponse);

    fixture.detectChanges();
    await fixture.whenStable();

    // La URL del router es /consultorio
    expect(router.url).toBe('/consultorio');
  });
});
