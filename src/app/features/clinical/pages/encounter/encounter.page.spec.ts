import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionStore } from '../../../../core/auth/session.store';
import {
  flushOdontogram,
  flushPrescriptions,
  flushTreatments,
  mockEncounterWithDiagnosisApiResponse,
  mockMedicationSearchApiResponse,
  mockPrescriptionDraft,
  mockPrescriptionDraftApiResponse,
  mockClinicalRecordApiResponse,
  mockClinicalRecordPat1,
  mockConditionsApiResponse,
  mockDiagnosisApiResponse,
  mockDiagnosisK02,
  mockEncounterApiResponse,
  mockEncounterOpen,
  mockEncounterCompletedApiResponse,
  mockIcd10SearchApiResponse,
  mockOdontogramCatalog,
  mockPatientApiResponse,
  mockPatientOdontogramEmpty,
  mockPatientOdontogramWithFindings,
  mockPerformedResina,
  mockTreatmentCatalogApiResponse,
  mockTreatmentResina,
} from '../../testing/fixtures';
import { Finding, PatientOdontogram } from '../../../odontogram';
import { ApplicationRef } from '@angular/core';
import type { Encounter } from '../../models/encounter.models';

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
    vi.restoreAllMocks();
    storage.clear();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('carga la atención → cabecera con antecedentes y motivo', async () => {
    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();
    flushTreatments(httpMock);
    flushPrescriptions(httpMock);

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
    flushTreatments(httpMock);
    flushPrescriptions(httpMock);

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
    flushTreatments(httpMock);
    flushPrescriptions(httpMock);

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
    flushTreatments(httpMock);
    flushPrescriptions(httpMock);

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
    flushTreatments(httpMock);
    flushPrescriptions(httpMock);

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
    flushTreatments(httpMock);
    flushPrescriptions(httpMock);

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
    flushTreatments(httpMock);
    flushPrescriptions(httpMock);

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

  it('Tratar una caries pendiente → la cara pasa a obturación realizada', async () => {
    const pendingCaries: Finding = {
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

    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();
    flushTreatments(httpMock);
    flushPrescriptions(httpMock);

    httpMock.expectOne('/api/v1/encounters/enc-1').flush(mockEncounterApiResponse);
    httpMock.expectOne('/api/v1/patients/pat-1').flush(mockPatientApiResponse);
    httpMock
      .expectOne('/api/v1/patients/pat-1/clinical-record')
      .flush(mockClinicalRecordApiResponse);
    fixture.detectChanges();
    flushOdontogram(httpMock, 'pat-1', { ...mockPatientOdontogramEmpty, findings: [pendingCaries] }, 'enc-1', []);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    // 1. Clic en la cara O de la pieza 36 y "Tratar" sobre la caries pendiente del panel
    const surface36O = compiled.querySelector('[data-tooth="36"][data-surface="O"]') as SVGPathElement;
    surface36O.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    const panel = compiled.querySelector('bd-tooth-panel') as HTMLElement;
    const treatButton = (Array.from(panel.querySelectorAll('button')) as HTMLButtonElement[]).find(
      (btn) => btn.textContent?.trim() === 'Tratar'
    );
    expect(treatButton).toBeTruthy();
    treatButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // 2. El panel "Registrar tratamiento" abre con el buscador enfocado → GET /api/v1/treatments, y se elige D2330
    const catalogReq = httpMock.expectOne('/api/v1/treatments');
    catalogReq.flush(mockTreatmentCatalogApiResponse);
    fixture.detectChanges();
    const searchInput = compiled.querySelector('.treatment-editor .combobox-input') as HTMLInputElement;
    searchInput.value = 'resina';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (document.querySelector('.combobox-option') as HTMLElement).click();
    fixture.detectChanges();

    // 3. Registrar → POST con dentalFindingId y sin pieza ni cara
    const registerButton = (Array.from(compiled.querySelectorAll('button')) as HTMLButtonElement[]).find(
      (btn) => btn.textContent?.trim() === 'Registrar'
    );
    registerButton!.click();

    const postReq = httpMock.expectOne('/api/v1/encounters/enc-1/treatments');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      treatmentId: 1,
      quantity: 1,
      price: 30,
      dentalFindingId: 'f-caries-36',
    });
    postReq.flush(
      {
        success: true,
        message: 'Tratamiento registrado',
        data: {
          ...mockPerformedResina,
          quantity: 1,
          total: 30,
          dentalFindingId: 'f-caries-36',
          toothCode: 36,
          surfaceCode: 'O',
        },
      },
      { status: 201, statusText: 'Created' }
    );
    fixture.detectChanges();

    // 4. Recarga del odontograma: la cara queda realizada (obturación, azul)
    const doneFilling: Finding = {
      ...pendingCaries,
      id: 'f-filling-36',
      conditionId: 4,
      status: 'DONE',
      symbol: { ...pendingCaries.symbol, id: 4, status: 'DONE', color: '#1E88E5' },
    };
    flushOdontogram(
      httpMock,
      'pat-1',
      { ...mockPatientOdontogramEmpty, findings: [pendingCaries, doneFilling] },
      'enc-1',
      []
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const region = compiled.querySelector('[data-tooth="36"][data-surface="O"]') as SVGPathElement;
    expect(region.getAttribute('fill')).toBe('#1E88E5');
    expect(region.querySelector('title')?.textContent).toContain('Obturación (Realizado)');
  });

  it('prótesis fija de 15 a 13 → POST con endToothCode y aparece la banda', async () => {
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
    flushTreatments(httpMock);
    flushPrescriptions(httpMock);

    // Carga inicial de la atención
    httpMock.expectOne('/api/v1/encounters/enc-1').flush(mockEncounterApiResponse);
    httpMock.expectOne('/api/v1/patients/pat-1').flush(mockPatientApiResponse);
    httpMock
      .expectOne('/api/v1/patients/pat-1/clinical-record')
      .flush(mockClinicalRecordApiResponse);

    fixture.detectChanges();

    flushOdontogram(httpMock, 'pat-1', mockPatientOdontogramEmpty, 'enc-1', []);

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    // 1. Clic en el número 15 y después en "Prótesis fija" del panel
    const numberOf = (code: string): SVGTextElement | undefined =>
      Array.from(compiled.querySelectorAll('text')).find(
        (text) => text.textContent?.trim() === code
      ) as SVGTextElement | undefined;

    numberOf('15')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    const panel = compiled.querySelector('bd-tooth-panel') as HTMLElement;
    const splintBtn = (Array.from(panel.querySelectorAll('button')) as HTMLButtonElement[]).find(
      (btn) => btn.textContent?.includes('Prótesis fija')
    );
    expect(splintBtn).toBeTruthy();
    splintBtn!.click();
    fixture.detectChanges();

    // 2. El aviso "toca la pieza final" es visible
    const notice = compiled.querySelector('bd-span-notice') as HTMLElement;
    expect(notice.textContent).toContain('toca la pieza final');

    // 3. Clic en el número 13 → POST con endToothCode
    numberOf('13')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    const postReq = httpMock.expectOne('/api/v1/encounters/enc-1/findings');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      toothCode: 15,
      endToothCode: 13,
      conditionId: 11,
      status: 'DONE',
    });

    const newFinding: Finding = {
      id: 'f-span-15-13',
      toothCode: 15,
      endToothCode: 13,
      surfaceCode: null,
      surfaceLabel: null,
      conditionId: 11,
      status: 'DONE',
      grade: null,
      notes: null,
      createdAt: '2026-10-12T10:00:00Z',
      symbol: {
        id: 12,
        status: 'DONE',
        shape: 'SQUARES_LINE',
        color: '#000000',
        secondaryColor: null,
        filled: true,
        lineStyle: 'DOTTED',
      },
    };

    postReq.flush(
      { success: true, message: 'Hallazgo registrado', data: newFinding },
      { status: 201, statusText: 'Created' }
    );
    fixture.detectChanges();

    // 4. Recarga del odontograma con el hallazgo SPAN y GET de hallazgos de la atención
    const updatedOdontogram: PatientOdontogram = {
      ...mockPatientOdontogramEmpty,
      findings: [newFinding],
    };
    flushOdontogram(httpMock, 'pat-1', updatedOdontogram, 'enc-1', [newFinding]);

    fixture.detectChanges();
    await fixture.whenStable();

    // 5. La banda aparece y el aviso desaparece
    expect(
      compiled.querySelector('[role="img"][aria-label="Prótesis fija de 15 a 13 (Realizado)"]')
    ).toBeTruthy();
    expect(compiled.querySelector('bd-span-notice')).toBeNull();
  });

  it('registra un tratamiento → aparece con su total', async () => {
    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();
    flushTreatments(httpMock);
    flushPrescriptions(httpMock);

    // Atención con un diagnóstico activo (K02.1) para ligar el tratamiento
    httpMock.expectOne('/api/v1/encounters/enc-1').flush({
      ...mockEncounterApiResponse,
      data: { ...mockEncounterOpen, diagnoses: [mockDiagnosisK02] },
    });
    httpMock.expectOne('/api/v1/patients/pat-1').flush(mockPatientApiResponse);
    httpMock
      .expectOne('/api/v1/patients/pat-1/clinical-record')
      .flush(mockClinicalRecordApiResponse);
    fixture.detectChanges();
    flushOdontogram(httpMock);

    // Clic en «Registrar tratamiento» → se abre el panel; foco en el buscador → GET /api/v1/treatments (catálogo completo, sin query)
    const openButton = Array.from(
      fixture.nativeElement.querySelectorAll('.treatments-section button') as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Registrar tratamiento') as HTMLButtonElement;
    openButton.click();
    fixture.detectChanges();
    const searchInput = fixture.nativeElement.querySelector(
      '.treatment-editor .combobox-input'
    ) as HTMLInputElement;
    searchInput.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    const catalogReq = httpMock.expectOne('/api/v1/treatments');
    expect(catalogReq.request.method).toBe('GET');
    catalogReq.flush(mockTreatmentCatalogApiResponse);
    fixture.detectChanges();

    // Escribir "resina" y elegir D2330
    searchInput.value = 'resina';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const option = document.querySelector('.combobox-option') as HTMLElement;
    expect(option.textContent).toContain('D2330');
    option.click();
    fixture.detectChanges();

    // Cantidad 2 (precio y diagnóstico ya vienen puestos)
    const quantityInput = fixture.nativeElement.querySelector('#treatment-quantity') as HTMLInputElement;
    quantityInput.value = '2';
    quantityInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Registrar → POST con el body exacto
    const registerButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Registrar') as HTMLButtonElement;
    registerButton.click();

    const recordReq = httpMock.expectOne('/api/v1/encounters/enc-1/treatments');
    expect(recordReq.request.method).toBe('POST');
    expect(recordReq.request.body).toEqual({
      treatmentId: 1,
      quantity: 2,
      price: 30,
      encounterDiagnosisId: 'diag-1',
    });
    recordReq.flush({ success: true, message: 'Tratamiento registrado', data: mockPerformedResina });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.treatment-editor')).toBeNull();
    expect(compiled.textContent).toContain('D2330');
    expect(compiled.textContent).toContain('Total de la sesión');
    expect(compiled.textContent).toContain('$ 60,00');
  });

  it('anula tratamiento con motivo → se quita de la lista y el total es $ 0,00', async () => {
    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();
    flushTreatments(httpMock, 'enc-1', [mockPerformedResina]);
    flushPrescriptions(httpMock);

    httpMock.expectOne('/api/v1/encounters/enc-1').flush(mockEncounterApiResponse);
    httpMock.expectOne('/api/v1/patients/pat-1').flush(mockPatientApiResponse);
    httpMock
      .expectOne('/api/v1/patients/pat-1/clinical-record')
      .flush(mockClinicalRecordApiResponse);
    fixture.detectChanges();
    flushOdontogram(httpMock);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('$ 60,00');

    // Anular → diálogo con motivo obligatorio
    const voidButton = compiled.querySelector('.treatment-list__void') as HTMLButtonElement;
    voidButton.click();
    fixture.detectChanges();

    const reasonInput = document.querySelector('.confirm-dialog__textarea') as HTMLTextAreaElement;
    reasonInput.value = 'Error de digitación';
    reasonInput.dispatchEvent(new Event('input'));
    TestBed.inject(ApplicationRef).tick();

    const confirmButton = document.querySelector('.confirm-dialog .btn-danger') as HTMLButtonElement;
    confirmButton.click();

    // POST /api/v1/performed-treatments/{id}/void con { voidReason }
    const voidReq = httpMock.expectOne('/api/v1/performed-treatments/pt-1/void');
    expect(voidReq.request.method).toBe('POST');
    expect(voidReq.request.body).toEqual({ voidReason: 'Error de digitación' });
    voidReq.flush({ success: true, message: 'Tratamiento anulado', data: null });
    fixture.detectChanges();

    expect(compiled.querySelector('.treatment-list__void')).toBeNull();
    expect(compiled.textContent).toContain('$ 0,00');
  });

  /** Abre "Nueva receta", busca "amo", elige amoxicilina (preset ya elegido), cantidad y "Agregar"; deja el editor listo para guardar. */
  async function armAmoxicilinaPrescription(): Promise<void> {
    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();
    flushTreatments(httpMock);
    flushPrescriptions(httpMock);

    httpMock.expectOne('/api/v1/encounters/enc-1').flush(mockEncounterWithDiagnosisApiResponse);
    httpMock.expectOne('/api/v1/patients/pat-1').flush(mockPatientApiResponse);
    httpMock
      .expectOne('/api/v1/patients/pat-1/clinical-record')
      .flush(mockClinicalRecordApiResponse);
    fixture.detectChanges();
    flushOdontogram(httpMock);
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Nueva receta').click();
    fixture.detectChanges();

    const medicationInput = fixture.nativeElement.querySelector(
      '.prescription-item-form .combobox-input'
    ) as HTMLInputElement;
    medicationInput.value = 'amo';
    medicationInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    vi.advanceTimersByTime(250);

    const searchReq = httpMock.expectOne('/api/v1/medications?query=amo');
    expect(searchReq.request.method).toBe('GET');
    searchReq.flush(mockMedicationSearchApiResponse);
    fixture.detectChanges();

    const amoxicilinaOption = Array.from(
      document.querySelectorAll<HTMLElement>('.combobox-option')
    ).find((option) => option.textContent?.includes('Amoxicilina'));
    expect(amoxicilinaOption, 'opción Amoxicilina').toBeTruthy();
    amoxicilinaOption!.click();
    fixture.detectChanges();

    // Con un solo preset, viene elegido (botón con aria-pressed)
    const presetButton = fixture.nativeElement.querySelector(
      '.prescription-item-form [aria-pressed="true"]'
    ) as HTMLElement;
    expect(presetButton.textContent).toContain('Cada 8 h × 7 días');

    typeInto(fixture.nativeElement, '#prescription-quantity', '21 cápsulas');
    findButton(fixture.nativeElement, 'Agregar').click();
    fixture.detectChanges();
  }

  function findButton(root: HTMLElement, text: string): HTMLButtonElement {
    const button = Array.from(root.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text
    );
    expect(button, `botón "${text}"`).toBeTruthy();
    return button as HTMLButtonElement;
  }

  function typeInto(root: HTMLElement, selector: string, value: string): void {
    const input = root.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('Nueva receta con preset → queda en borrador', async () => {
    vi.useFakeTimers();
    await armAmoxicilinaPrescription();

    findButton(fixture.nativeElement, 'Guardar borrador').click();

    // POST /api/v1/encounters/enc-1/prescriptions con el preset copiado y la cantidad escrita
    const postReq = httpMock.expectOne('/api/v1/encounters/enc-1/prescriptions');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      encounterDiagnosisId: 'diag-1',
      items: [
        {
          medicationId: 5,
          medicationPresetId: 1,
          dose: '1 cápsula',
          frequency: 'cada 8 horas',
          duration: '7 días',
          quantity: '21 cápsulas',
        },
      ],
    });
    postReq.flush(mockPrescriptionDraftApiResponse, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.prescription-editor')).toBeNull();
    expect(compiled.querySelector('.prescriptions-section')?.textContent).toContain('Borrador');
    expect(compiled.querySelector('.prescriptions-section')?.textContent).toContain('Amoxicilina');
  });

  it('Guardar con un diagnóstico que ya no vale → mensaje visible y el ítem se conserva', async () => {
    vi.useFakeTimers();
    await armAmoxicilinaPrescription();

    findButton(fixture.nativeElement, 'Guardar borrador').click();
    httpMock.expectOne('/api/v1/encounters/enc-1/prescriptions').flush(
      { success: false, message: 'El diagnóstico no pertenece a esta atención.', data: null },
      { status: 409, statusText: 'Conflict' }
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const editor = fixture.nativeElement.querySelector('.prescription-editor') as HTMLElement;
    expect(editor).toBeTruthy();
    expect(editor.textContent).toContain('El diagnóstico no pertenece a esta atención.');
    expect(editor.querySelector('.prescription-item-list')?.textContent).toContain('Amoxicilina');
  });

  /** jsdom no tiene la pestaña del PDF: se sustituye solo `window.open`. */
  function stubPdfBrowserApis(): { pdfWindow: { location: { href: string }; close: ReturnType<typeof vi.fn> } } {
    const pdfWindow = { location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(pdfWindow as unknown as Window);
    return { pdfWindow };
  }

  /** Atención con una receta en borrador en la lista, lista para usar sus acciones. */
  async function openEncounterWithDraftPrescription(): Promise<void> {
    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();
    flushTreatments(httpMock);
    flushPrescriptions(httpMock, 'enc-1', [mockPrescriptionDraft]);

    httpMock.expectOne('/api/v1/encounters/enc-1').flush(mockEncounterWithDiagnosisApiResponse);
    httpMock.expectOne('/api/v1/patients/pat-1').flush(mockPatientApiResponse);
    httpMock
      .expectOne('/api/v1/patients/pat-1/clinical-record')
      .flush(mockClinicalRecordApiResponse);
    fixture.detectChanges();
    flushOdontogram(httpMock);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('Emitir e imprimir un borrador → queda Emitida y abre el PDF', async () => {
    vi.useFakeTimers();
    const { pdfWindow } = stubPdfBrowserApis();
    await openEncounterWithDraftPrescription();

    findButton(fixture.nativeElement, 'Emitir e imprimir').click();
    fixture.detectChanges();

    // POST /api/v1/prescriptions/rx-1/issue
    const issueReq = httpMock.expectOne('/api/v1/prescriptions/rx-1/issue');
    expect(issueReq.request.method).toBe('POST');
    issueReq.flush({
      success: true,
      message: 'Receta emitida',
      data: { ...mockPrescriptionDraft, status: 'ISSUED', prescribedAt: '2026-10-19T10:42:00-05:00' },
    });
    fixture.detectChanges();

    // POST /api/v1/prescriptions/rx-1/pdf-link → enlace temporal al PDF
    const pdfReq = httpMock.expectOne('/api/v1/prescriptions/rx-1/pdf-link');
    expect(pdfReq.request.method).toBe('POST');
    pdfReq.flush({
      success: true,
      message: 'Enlace generado',
      data: { url: '/api/v1/prescriptions/rx-1/receta.pdf?t=abc', expiresAt: '2026-10-19T10:47:00-05:00' },
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const section = fixture.nativeElement.querySelector('.prescriptions-section') as HTMLElement;
    expect(section.textContent).toContain('Emitida');
    expect(pdfWindow.location.href).toBe('/api/v1/prescriptions/rx-1/receta.pdf?t=abc');
  });

  it('Emitir con la atención bloqueada → mensaje y sigue en borrador', async () => {
    vi.useFakeTimers();
    const { pdfWindow } = stubPdfBrowserApis();
    await openEncounterWithDraftPrescription();

    findButton(fixture.nativeElement, 'Emitir e imprimir').click();
    fixture.detectChanges();

    httpMock.expectOne('/api/v1/prescriptions/rx-1/issue').flush(
      { success: false, message: 'La atención está completada: ya no se pueden emitir recetas.', data: null },
      { status: 409, statusText: 'Conflict' }
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const section = fixture.nativeElement.querySelector('.prescriptions-section') as HTMLElement;
    expect(section.textContent).toContain('La atención está completada: ya no se pueden emitir recetas.');
    expect(section.textContent).toContain('Borrador');
    // La pestaña vacía se cerró y no se pidió el PDF
    expect(pdfWindow.close).toHaveBeenCalled();
    expect(httpMock.match('/api/v1/prescriptions/rx-1/pdf-link')).toHaveLength(0);
  });

  async function openExamPanelWithEncounter(encounterData: Encounter): Promise<void> {
    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();
    flushTreatments(httpMock);
    flushPrescriptions(httpMock);

    httpMock.expectOne('/api/v1/encounters/enc-1').flush({
      success: true,
      message: 'Atención obtenida',
      data: encounterData,
    });
    httpMock.expectOne('/api/v1/patients/pat-1').flush(mockPatientApiResponse);
    httpMock
      .expectOne('/api/v1/patients/pat-1/clinical-record')
      .flush(mockClinicalRecordApiResponse);

    fixture.detectChanges();
    flushOdontogram(httpMock);
    fixture.detectChanges();

    const toggleBtn = fixture.nativeElement.querySelector('.encounter-extra__toggle') as HTMLButtonElement;
    expect(toggleBtn).toBeTruthy();
    toggleBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function regionButton(label: string): HTMLButtonElement {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const button = buttons.find((b) => b.textContent?.includes(label));
    expect(button, `botón "${label}"`).toBeTruthy();
    return button!;
  }

  function regionTextarea(label: string): HTMLTextAreaElement {
    const labels = Array.from(fixture.nativeElement.querySelectorAll('label')) as HTMLLabelElement[];
    const regionLabel = labels.find((l) => l.textContent?.trim() === label);
    expect(regionLabel, `etiqueta "${label}"`).toBeTruthy();
    const textarea = fixture.nativeElement.querySelector(
      `#${regionLabel!.htmlFor}`
    ) as HTMLTextAreaElement;
    expect(textarea, `textarea de "${label}"`).toBeTruthy();
    return textarea;
  }

  it('marca la región 5 y Rayos X → PUT con stomatognathicRegions [5] y diagnosticExams ["RAYOS_X"]', async () => {
    vi.useFakeTimers();
    await openExamPanelWithEncounter(mockEncounterOpen);

    // Pulsa "5 Lengua" y "Rayos X"; al marcar 5 aparece su campo
    regionButton('5 Lengua').click();
    fixture.detectChanges();
    regionButton('Rayos X').click();
    fixture.detectChanges();

    // Escribe en el campo "5 · Lengua"
    const lenguaField = regionTextarea('5 · Lengua');
    lenguaField.value = 'saburra';
    lenguaField.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Avanza el autosave (800 ms)
    vi.advanceTimersByTime(800);

    const putReq = httpMock.expectOne('/api/v1/encounters/enc-1');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body.stomatognathicRegions).toEqual([5]);
    expect(putReq.request.body.diagnosticExams).toEqual(['RAYOS_X']);
    expect(putReq.request.body.stomatognathicExam).toBe('5. Lengua: saburra');

    putReq.flush({
      success: true,
      message: 'Atención actualizada',
      data: {
        ...mockEncounterOpen,
        stomatognathicRegions: [5],
        diagnosticExams: ['RAYOS_X'],
        stomatognathicExam: '5. Lengua: saburra',
      },
    });
    fixture.detectChanges();

    expect(regionButton('5 Lengua').getAttribute('aria-pressed')).toBe('true');
    expect(regionButton('Rayos X').getAttribute('aria-pressed')).toBe('true');
    expect(regionTextarea('5 · Lengua').value).toBe('saburra');
  });

  it('desmarcar una región con texto → confirma → PUT sin la región ni su renglón', async () => {
    vi.useFakeTimers();
    await openExamPanelWithEncounter({
      ...mockEncounterOpen,
      stomatognathicRegions: [5, 8],
      stomatognathicExam: '5. Lengua: saburra\n8. Carrillos: línea alba',
    });

    await fixture.whenStable();
    fixture.detectChanges();
    expect(regionTextarea('5 · Lengua').value).toBe('saburra');
    expect(regionTextarea('8 · Carrillos').value).toBe('línea alba');

    // Pulsa "5 Lengua" → pide confirmación porque tiene texto
    regionButton('5 Lengua').click();
    fixture.detectChanges();

    const dialog = (document.querySelector('.confirm-dialog') ||
      document.querySelector('[role="alertdialog"]')) as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Se borrará la descripción de esta región');

    const confirmBtn = dialog.querySelector('.btn-danger') as HTMLButtonElement;
    confirmBtn.click();
    fixture.detectChanges();
    vi.advanceTimersByTime(800);

    const putReq = httpMock.expectOne('/api/v1/encounters/enc-1');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body.stomatognathicRegions).toEqual([8]);
    expect(putReq.request.body.stomatognathicExam).toBe('8. Carrillos: línea alba');

    putReq.flush({
      success: true,
      message: 'Atención actualizada',
      data: {
        ...mockEncounterOpen,
        stomatognathicRegions: [8],
        stomatognathicExam: '8. Carrillos: línea alba',
      },
    });
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();
    expect(regionButton('5 Lengua').getAttribute('aria-pressed')).toBe('false');
    expect(regionTextarea('8 · Carrillos').value).toBe('línea alba');
    expect(fixture.nativeElement.querySelector('#stomatognathic-region-5')).toBeNull();
  });

  it('completar con total > 0 → "Cobrar ahora" → GET account → guardar → POST /patients/{id}/payments con { amount, method: "EFECTIVO", encounterId } → se ve "Abono registrado C-000001"', async () => {
    sessionStore.setCurrentUser({
      userId: 'user-prof-1',
      email: 'odontologa@bellidental.local',
      roles: ['ODONTOLOGO'],
      permissions: ['RECORD_READ', 'RECORD_UPDATE', 'RECORD_CREATE', 'BILLING_CREATE'],
      professionalId: 'prof-1',
    });

    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();
    flushTreatments(httpMock, 'enc-1', [mockPerformedResina]);
    flushPrescriptions(httpMock);

    const encounterWithDiag = {
      ...mockEncounterApiResponse.data,
      diagnoses: [mockDiagnosisApiResponse.data],
    };

    httpMock.expectOne('/api/v1/encounters/enc-1').flush({
      success: true,
      message: 'OK',
      data: encounterWithDiag,
    });
    httpMock.expectOne('/api/v1/patients/pat-1').flush(mockPatientApiResponse);
    httpMock.expectOne('/api/v1/patients/pat-1/clinical-record').flush(mockClinicalRecordApiResponse);

    fixture.detectChanges();
    flushOdontogram(httpMock);
    await fixture.whenStable();

    const completeBtn = fixture.nativeElement.querySelector('.complete-bar__btn') as HTMLButtonElement;
    completeBtn.click();
    fixture.detectChanges();

    const compReq = httpMock.expectOne('/api/v1/encounters/enc-1/complete');
    compReq.flush(mockEncounterCompletedApiResponse);
    fixture.detectChanges();
    await fixture.whenStable();

    const chargeNotice = fixture.nativeElement.querySelector('.encounter-page__charge-notice');
    expect(chargeNotice).not.toBeNull();
    expect(chargeNotice.textContent).toContain('Total de la sesión');

    const cobrarBtn = Array.from(
      fixture.nativeElement.querySelectorAll('button')
    ).find((b: any) => b.textContent?.includes('Cobrar ahora')) as HTMLButtonElement;
    expect(cobrarBtn).not.toBeNull();
    cobrarBtn.click();
    fixture.detectChanges();

    const accountReq = httpMock.expectOne('/api/v1/patients/pat-1/account');
    accountReq.flush({
      success: true,
      message: 'Cuenta obtenida',
      data: {
        patientId: 'pat-1',
        patientName: 'David Bellido',
        totalCharges: 40,
        totalPayments: 0,
        balance: 40,
        sessions: [
          {
            encounterId: 'enc-1',
            date: '2026-10-22',
            professionalName: 'Odontóloga Principal',
            treatments: ['Resina simple'],
            charge: 40,
            payment: 0,
            runningBalance: 40,
          },
        ],
      },
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const dialog = document.querySelector('.payment-dialog') as HTMLElement;
    expect(dialog).not.toBeNull();

    const submitBtn = dialog.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn).not.toBeNull();
    submitBtn.click();
    fixture.detectChanges();

    const payReq = httpMock.expectOne('/api/v1/patients/pat-1/payments');
    expect(payReq.request.method).toBe('POST');
    expect(payReq.request.body).toEqual({
      amount: 40,
      method: 'EFECTIVO',
      encounterId: 'enc-1',
    });
    payReq.flush({
      success: true,
      message: 'Abono registrado',
      data: {
        id: 'pay-1',
        patientId: 'pat-1',
        encounterId: 'enc-1',
        amount: 40,
        method: 'EFECTIVO',
        receiptNumber: 'C-000001',
        paidAt: '2026-10-22T10:00:00Z',
        receivedBy: 'user-prof-1',
        voided: false,
        voidReason: null,
      },
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialog.textContent).toContain('Abono registrado');
    expect(dialog.textContent).toContain('C-000001');

    const closeBtn = dialog.querySelector('.payment-dialog__btn-done') as HTMLButtonElement;
    closeBtn?.click();
    fixture.detectChanges();
  });

  it('guardar el cobro con 403 → se ve "No tienes permiso"', async () => {
    sessionStore.setCurrentUser({
      userId: 'user-prof-1',
      email: 'odontologa@bellidental.local',
      roles: ['ODONTOLOGO'],
      permissions: ['RECORD_READ', 'RECORD_UPDATE', 'RECORD_CREATE', 'BILLING_CREATE'],
      professionalId: 'prof-1',
    });

    fixture = TestBed.createComponent(EncounterPage);
    fixture.detectChanges();
    flushTreatments(httpMock, 'enc-1', [mockPerformedResina]);
    flushPrescriptions(httpMock);

    const encounterWithDiag = {
      ...mockEncounterApiResponse.data,
      diagnoses: [mockDiagnosisApiResponse.data],
    };

    httpMock.expectOne('/api/v1/encounters/enc-1').flush({
      success: true,
      message: 'OK',
      data: encounterWithDiag,
    });
    httpMock.expectOne('/api/v1/patients/pat-1').flush(mockPatientApiResponse);
    httpMock.expectOne('/api/v1/patients/pat-1/clinical-record').flush(mockClinicalRecordApiResponse);

    fixture.detectChanges();
    flushOdontogram(httpMock);
    await fixture.whenStable();

    const completeBtn = fixture.nativeElement.querySelector('.complete-bar__btn') as HTMLButtonElement;
    completeBtn.click();
    fixture.detectChanges();

    const compReq = httpMock.expectOne('/api/v1/encounters/enc-1/complete');
    compReq.flush(mockEncounterCompletedApiResponse);
    fixture.detectChanges();
    await fixture.whenStable();

    const cobrarBtn = Array.from(
      fixture.nativeElement.querySelectorAll('button')
    ).find((b: any) => b.textContent?.includes('Cobrar ahora')) as HTMLButtonElement;
    cobrarBtn.click();
    fixture.detectChanges();

    const accountReq = httpMock.expectOne('/api/v1/patients/pat-1/account');
    accountReq.flush({
      success: true,
      message: 'Cuenta obtenida',
      data: {
        patientId: 'pat-1',
        patientName: 'David Bellido',
        totalCharges: 40,
        totalPayments: 0,
        balance: 40,
        sessions: [
          {
            encounterId: 'enc-1',
            date: '2026-10-22',
            professionalName: 'Odontóloga Principal',
            treatments: ['Resina simple'],
            charge: 40,
            payment: 0,
            runningBalance: 40,
          },
        ],
      },
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const dialog = document.querySelector('.payment-dialog') as HTMLElement;
    expect(dialog).not.toBeNull();

    const submitBtn = dialog.querySelector('button[type="submit"]') as HTMLButtonElement;
    submitBtn.click();
    fixture.detectChanges();

    const payReq = httpMock.expectOne('/api/v1/patients/pat-1/payments');
    expect(payReq.request.method).toBe('POST');
    payReq.flush(
      { success: false, message: 'Forbidden', data: null },
      { status: 403, statusText: 'Forbidden' }
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialog.textContent).toContain('No tienes permiso');

    const closeBtn = dialog.querySelector('.payment-dialog__close-btn') as HTMLButtonElement;
    closeBtn?.click();
    fixture.detectChanges();
  });
});
