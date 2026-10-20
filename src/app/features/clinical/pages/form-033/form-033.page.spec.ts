import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Form033Page } from './form-033.page';
import {
  mockClinicalRecordApiResponse,
  mockClinicalSummary2Sessions,
  mockConditionsApiResponse,
  mockEncounterSession1,
  mockEncounterSession2,
  mockOdontogramCatalog,
  mockPatientApiResponse,
  mockPatientOdontogramEmpty,
} from '../../testing/fixtures';

describe('Form033Page', () => {
  let fixture: ComponentFixture<Form033Page>;
  let component: Form033Page;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Form033Page],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'pacientes/:id/033', component: Form033Page },
          { path: 'pacientes/:id', children: [] },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'pat-1' : null),
              },
              queryParamMap: {
                get: (key: string) => null,
              },
            },
            paramMap: {
              pipe: () => ({
                subscribe: (fn: (params: Map<string, string>) => void) => {
                  const map = new Map<string, string>();
                  map.set('id', 'pat-1');
                  fn(map);
                  return { unsubscribe: () => {} };
                },
              }),
            },
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Form033Page);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushInitialForm033Data(patientId = 'pat-1') {
    fixture.detectChanges();

    const patReq = httpMock.expectOne(`/api/v1/patients/${patientId}`);
    expect(patReq.request.method).toBe('GET');
    patReq.flush(mockPatientApiResponse);

    const recReq = httpMock.expectOne(`/api/v1/patients/${patientId}/clinical-record`);
    expect(recReq.request.method).toBe('GET');
    recReq.flush(mockClinicalRecordApiResponse);

    const condReq = httpMock.expectOne('/api/v1/medical-history-conditions');
    expect(condReq.request.method).toBe('GET');
    condReq.flush(mockConditionsApiResponse);

    const catReq = httpMock.expectOne('/api/v1/odontogram/catalog');
    expect(catReq.request.method).toBe('GET');
    catReq.flush({ success: true, message: 'OK', data: mockOdontogramCatalog });

    const odoReq = httpMock.expectOne(`/api/v1/patients/${patientId}/odontogram`);
    expect(odoReq.request.method).toBe('GET');
    odoReq.flush({ success: true, message: 'OK', data: mockPatientOdontogramEmpty });

    const sumReq = httpMock.expectOne(`/api/v1/patients/${patientId}/clinical-summary`);
    expect(sumReq.request.method).toBe('GET');
    sumReq.flush({ success: true, message: 'OK', data: mockClinicalSummary2Sessions });

    // Carga de la sesión 1 por defecto (apertura)
    const enc1Req = httpMock.expectOne('/api/v1/encounters/enc-1');
    expect(enc1Req.request.method).toBe('GET');
    enc1Req.flush({ success: true, message: 'OK', data: mockEncounterSession1 });

    fixture.detectChanges();
  }

  it('Abrir el 033 → se ve la hoja con la atención de apertura', () => {
    flushInitialForm033Data();

    const compiled = fixture.nativeElement as HTMLElement;

    // Se ve el N.º de historia clínica y nombre del paciente
    expect(compiled.textContent).toContain('HC-00123');
    expect(compiled.textContent).toContain('Juan');
    expect(compiled.textContent).toContain('Pérez');

    // Motivo de consulta de la sesión 1
    expect(compiled.textContent).toContain('Dolor en pieza 16');

    // La "X" de un antecedente activo (condición 1 de mockClinicalRecordPat1)
    const marks = compiled.querySelectorAll('.cell-mark');
    const hasActiveMark = Array.from(marks).some((el) => el.textContent?.trim() === 'X');
    expect(hasActiveMark).toBe(true);

    // El CIE del diagnóstico en la sección 11
    expect(compiled.textContent).toContain('K02.1');
  });

  it('Elegir la sesión 2 en el selector → cambian motivo y diagnósticos', () => {
    flushInitialForm033Data();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Dolor en pieza 16');
    expect(compiled.textContent).toContain('K02.1');

    // Cambiar al selector de sesión 2
    const select = compiled.querySelector('#form033-session-select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    // Se debe pedir GET de la sesión 2
    const enc2Req = httpMock.expectOne('/api/v1/encounters/enc-2');
    expect(enc2Req.request.method).toBe('GET');
    enc2Req.flush({ success: true, message: 'OK', data: mockEncounterSession2 });

    fixture.detectChanges();

    // Ahora se deben ver el motivo y el CIE de la sesión 2
    expect(compiled.textContent).toContain('Sangrado en encías');
    expect(compiled.textContent).toContain('K05.0');
  });
});
