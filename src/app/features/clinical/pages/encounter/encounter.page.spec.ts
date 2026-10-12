import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionStore } from '../../../../core/auth/session.store';
import {
  flushOdontogram,
  mockClinicalRecordApiResponse,
  mockClinicalRecordPat1,
  mockConditionsApiResponse,
  mockDiagnosisApiResponse,
  mockEncounterApiResponse,
  mockEncounterCompletedApiResponse,
  mockIcd10SearchApiResponse,
  mockOdontogramCatalog,
  mockPatientApiResponse,
  mockPatientOdontogramEmpty,
  mockPatientOdontogramWithFindings,
} from '../../testing/fixtures';
import { Finding, PatientOdontogram } from '../../../odontogram';

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
    TestBed.resetTestingModule();
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
    flushOdontogram(httpMock);
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
    flushOdontogram(httpMock);

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
    flushOdontogram(httpMock);
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

  it('registra un antecedente familiar → POST y aparece en la cabecera', async () => {
    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();

    // Carga inicial con historia clínica sin antecedentes activos y sin noKnownHistory
    const clinicalRecordEmpty = {
      ...mockClinicalRecordPat1,
      noKnownHistory: false,
      historyEntries: [],
    };

    const encReq = httpMock.expectOne('/api/v1/encounters/enc-1');
    encReq.flush(mockEncounterApiResponse);

    const patReq = httpMock.expectOne('/api/v1/patients/pat-1');
    patReq.flush(mockPatientApiResponse);

    const recordReq = httpMock.expectOne('/api/v1/patients/pat-1/clinical-record');
    recordReq.flush({
      success: true,
      message: 'OK',
      data: clinicalRecordEmpty,
    });

    fixture.detectChanges();
    flushOdontogram(httpMock);
    await fixture.whenStable();

    // Con la atención cargada y la historia sin antecedentes, se pulsa "Registrar antecedentes"
    const registerBtn = fixture.nativeElement.querySelector('.btn-history-warning') as HTMLButtonElement;
    expect(registerBtn).toBeTruthy();
    expect(registerBtn.textContent?.trim()).toContain('Registrar antecedentes');
    registerBtn.click();
    fixture.detectChanges();

    // expectOne GET /api/v1/medical-history-conditions, que se responde con las 10 condiciones
    const condReq = httpMock.expectOne('/api/v1/medical-history-conditions');
    expect(condReq.request.method).toBe('GET');
    condReq.flush(mockConditionsApiResponse);

    fixture.detectChanges();
    await fixture.whenStable();

    // En la fila "Diabetes" se pulsa "+ Familiar"
    const rows = Array.from(fixture.nativeElement.querySelectorAll('.condition-row')) as HTMLElement[];
    const diabetesRow = rows.find((r) => r.textContent?.includes('Diabetes'));
    expect(diabetesRow).toBeTruthy();

    const addFamilyBtn = Array.from(diabetesRow!.querySelectorAll('.btn-row-action')).find((b) =>
      b.textContent?.includes('+ Familiar')
    ) as HTMLButtonElement;
    expect(addFamilyBtn).toBeTruthy();
    addFamilyBtn.click();
    fixture.detectChanges();

    // Se escribe "madre" y se presiona Enter
    const familyInput = diabetesRow!.querySelector('input[name="relative"]') as HTMLInputElement;
    expect(familyInput).toBeTruthy();
    familyInput.value = 'madre';
    familyInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    familyInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    // expectOne POST /api/v1/clinical-records/{id}/history-entries con body { conditionId: 7, scope: 'FAMILY', relative: 'madre' }
    const addEntryReq = httpMock.expectOne('/api/v1/clinical-records/rec-1/history-entries');



    expect(addEntryReq.request.method).toBe('POST');
    expect(addEntryReq.request.body).toEqual({
      conditionId: 7,
      scope: 'FAMILY',
      relative: 'madre',
    });
    addEntryReq.flush({
      success: true,
      message: 'Antecedente registrado',
      data: {
        id: 'hist-fam-1',
        conditionId: 7,
        conditionName: 'Diabetes',
        scope: 'FAMILY',
        relative: 'madre',
        description: null,
        active: true,
      },
    });

    fixture.detectChanges();
    await fixture.whenStable();

    // La cabecera muestra el chip "Diabetes (madre)"
    const headerEl = fixture.nativeElement.querySelector('bd-patient-clinical-header') as HTMLElement;
    expect(headerEl.textContent).toContain('Diabetes (madre)');
  });

  it('marcar "no refiere" cuando otra sesión registró un antecedente → 409, mensaje y recarga', async () => {
    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();

    // Con la historia sin entradas activas y noKnownHistory: false
    const clinicalRecordEmpty = {
      ...mockClinicalRecordPat1,
      noKnownHistory: false,
      historyEntries: [],
    };

    const encReq = httpMock.expectOne('/api/v1/encounters/enc-1');
    encReq.flush(mockEncounterApiResponse);

    const patReq = httpMock.expectOne('/api/v1/patients/pat-1');
    patReq.flush(mockPatientApiResponse);

    const recordReq = httpMock.expectOne('/api/v1/patients/pat-1/clinical-record');
    recordReq.flush({
      success: true,
      message: 'OK',
      data: clinicalRecordEmpty,
    });

    fixture.detectChanges();
    flushOdontogram(httpMock);
    await fixture.whenStable();

    // Abrir el panel
    const registerBtn = fixture.nativeElement.querySelector('.btn-history-warning') as HTMLButtonElement;
    expect(registerBtn).toBeTruthy();
    registerBtn.click();
    fixture.detectChanges();

    // Responder el catálogo
    const condReq = httpMock.expectOne('/api/v1/medical-history-conditions');
    condReq.flush(mockConditionsApiResponse);
    fixture.detectChanges();
    await fixture.whenStable();

    // Pulsar "El paciente no refiere antecedentes"
    const markBtn = fixture.nativeElement.querySelector('.btn-mark-no-history') as HTMLButtonElement;
    expect(markBtn).toBeTruthy();
    markBtn.click();
    fixture.detectChanges();

    // expectOne PUT /api/v1/clinical-records/{id} con body { noKnownHistory: true }, que responde 409
    const putReq = httpMock.expectOne('/api/v1/clinical-records/rec-1');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({ noKnownHistory: true });
    putReq.flush(
      {
        success: false,
        message: 'No se puede marcar como sin antecedentes mientras haya antecedentes activos.',
      },
      {
        status: 409,
        statusText: 'Conflict',
      }
    );

    fixture.detectChanges();

    // El mensaje es visible
    expect(fixture.nativeElement.textContent).toContain(
      'No se puede marcar como sin antecedentes mientras haya antecedentes activos.'
    );

    // expectOne GET /api/v1/patients/{patientId}/clinical-record, que se responde con "Asma" personal activa
    const reloadReq = httpMock.expectOne('/api/v1/patients/pat-1/clinical-record');
    expect(reloadReq.request.method).toBe('GET');
    reloadReq.flush({
      success: true,
      message: 'OK',
      data: {
        ...mockClinicalRecordPat1,
        noKnownHistory: false,
        historyEntries: [
          {
            id: 'hist-asma',
            conditionId: 6,
            conditionName: 'Asma',
            scope: 'PERSONAL',
            active: true,
          },
        ],
      },
    });

    fixture.detectChanges();
    await fixture.whenStable();

    // La cabecera muestra el chip "Asma"
    const headerEl = fixture.nativeElement.querySelector('bd-patient-clinical-header') as HTMLElement;
    expect(headerEl.textContent).toContain('Asma');
  });

  it('carga el odontograma → caras pintadas, grados e índices', async () => {
    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();

    // 1. Carga inicial de la atención
    const encReq = httpMock.expectOne('/api/v1/encounters/enc-1');
    encReq.flush(mockEncounterApiResponse);

    const patReq = httpMock.expectOne('/api/v1/patients/pat-1');
    patReq.flush(mockPatientApiResponse);

    const recordReq = httpMock.expectOne('/api/v1/patients/pat-1/clinical-record');
    recordReq.flush(mockClinicalRecordApiResponse);

    fixture.detectChanges();

    // 2. Odontograma: catálogo y hallazgos del paciente
    const catReq = httpMock.expectOne('/api/v1/odontogram/catalog');
    expect(catReq.request.method).toBe('GET');
    catReq.flush({
      success: true,
      message: 'Catálogo obtenido',
      data: mockOdontogramCatalog,
    });

    const odoReq = httpMock.expectOne('/api/v1/patients/pat-1/odontogram');
    expect(odoReq.request.method).toBe('GET');
    odoReq.flush({
      success: true,
      message: 'Odontograma obtenido',
      data: mockPatientOdontogramWithFindings,
    });

    const encFindingsReq = httpMock.expectOne('/api/v1/encounters/enc-1/findings');
    encFindingsReq.flush({
      success: true,
      message: 'Hallazgos de la atención obtenidos',
      data: [],
    });

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    // la región [data-tooth="16"][data-surface="M"] tiene fill="#D32F2F" y data-condition="CARIES"
    const region16M = compiled.querySelector('[data-tooth="16"][data-surface="M"]') as SVGPathElement;
    expect(region16M).toBeTruthy();
    expect(region16M.getAttribute('fill')).toBe('#D32F2F');
    expect(region16M.getAttribute('data-condition')).toBe('CARIES');

    // el aria-label de la pieza 16 contiene "mesial Caries (Pendiente)"
    const tooth16 = compiled.querySelector('g[role="img"][aria-label*="16"]') as SVGGElement;
    expect(tooth16).toBeTruthy();
    expect(tooth16.getAttribute('aria-label')).toContain('mesial Caries (Pendiente)');

    // la casilla de movilidad de la columna 31 muestra "2" y la de recesión de la 41, "II"
    const movCell31 = compiled.querySelector('[data-row="movL"][data-column="31"]') as SVGGElement;
    expect(movCell31).toBeTruthy();
    expect(movCell31.textContent?.trim()).toBe('2');

    const recCell41 = compiled.querySelector('[data-row="recL"][data-column="41"]') as SVGGElement;
    expect(recCell41).toBeTruthy();
    expect(recCell41.textContent?.trim()).toBe('II');

    // el texto "CPO 2" es visible
    expect(compiled.textContent).toContain('CPO 2');
  });

  it('registrar caries en la cara O de 36 → POST y la cara se pinta', async () => {
    sessionStore.setSession('token-123', 3600000);
    sessionStore.setCurrentUser({
      userId: 'usr-1',
      email: 'odontologo@example.com',
      roles: ['ODONTOLOGO'],
      permissions: ['RECORD_READ', 'RECORD_CREATE', 'RECORD_UPDATE'],
      professionalId: 'prof-1',
    });

    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();

    // Carga inicial de la atención
    const encReq = httpMock.expectOne('/api/v1/encounters/enc-1');
    encReq.flush(mockEncounterApiResponse);

    const patReq = httpMock.expectOne('/api/v1/patients/pat-1');
    patReq.flush(mockPatientApiResponse);

    const recordReq = httpMock.expectOne('/api/v1/patients/pat-1/clinical-record');
    recordReq.flush(mockClinicalRecordApiResponse);

    fixture.detectChanges();

    flushOdontogram(httpMock, 'pat-1', mockPatientOdontogramEmpty, 'enc-1', []);

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    // 1. Clic en [data-tooth="36"][data-surface="O"]
    const surface36O = compiled.querySelector('[data-tooth="36"][data-surface="O"]') as SVGPathElement;
    expect(surface36O).toBeTruthy();
    surface36O.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    // 2. Clic en el botón "Caries" del panel
    const panel = compiled.querySelector('bd-tooth-panel') as HTMLElement;
    expect(panel).toBeTruthy();
    const buttons = Array.from(panel.querySelectorAll('button')) as HTMLButtonElement[];
    const cariesBtn = buttons.find((btn) => btn.textContent?.includes('Caries'));
    expect(cariesBtn).toBeTruthy();
    cariesBtn!.click();
    fixture.detectChanges();

    // 3. expectOne POST /api/v1/encounters/enc-1/findings con el body exacto
    const postReq = httpMock.expectOne('/api/v1/encounters/enc-1/findings');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      toothCode: 36,
      surfaceCode: 'O',
      conditionId: 3,
      status: 'PENDING',
    });

    const newFinding: Finding = {
      id: 'f-caries-36',
      toothCode: 36,
      endToothCode: null,
      surfaceCode: 'O',
      surfaceLabel: 'oclusal',
      conditionId: 3,
      status: 'PENDING',
      grade: null,
      notes: null,
      createdAt: '2026-10-12T10:00:00Z',
      symbol: {
        id: 3,
        status: 'PENDING',
        shape: 'CIRCLE',
        color: '#D32F2F',
        secondaryColor: null,
        filled: true,
        lineStyle: 'SOLID',
      },
    };

    postReq.flush(
      {
        success: true,
        message: 'Hallazgo registrado',
        data: newFinding,
      },
      { status: 201, statusText: 'Created' }
    );

    fixture.detectChanges();

    // 4. Se atienden la recarga del odontograma (con esa caries) y GET …/encounters/enc-1/findings (con su id)
    const updatedOdontogram: PatientOdontogram = {
      ...mockPatientOdontogramEmpty,
      findings: [newFinding],
      indices: {
        ...mockPatientOdontogramEmpty.indices,
        cpoC: 1,
        cpoTotal: 1,
      },
      cariesSurfaces: { '36': 1 },
    };

    flushOdontogram(httpMock, 'pat-1', updatedOdontogram, 'enc-1', [newFinding]);

    fixture.detectChanges();
    await fixture.whenStable();

    // 5. La región [data-tooth="36"][data-surface="O"] tiene fill="#D32F2F"
    const updatedRegion = compiled.querySelector('[data-tooth="36"][data-surface="O"]') as SVGPathElement;
    expect(updatedRegion.getAttribute('fill')).toBe('#D32F2F');

    // 6. El panel muestra "Caries · oclusal · Pendiente" con "Anular"
    expect(panel.textContent).toContain('Caries · oclusal · Pendiente');
    expect(panel.textContent).toContain('Anular');
  });
});

