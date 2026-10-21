import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApiResponse } from '../../../../core/api/api.models';
import { Page } from '../../../../core/api/page';
import { Patient } from '../../models/patient.models';
import { PatientFormPage } from './patient-form.page';

@Component({
  selector: 'bd-test-patient-detail',
  standalone: true,
  template: '',
})
class PatientDetailStubComponent {}

const CEDULA = '1710034065';

const createdPatient: Patient = {
  id: 'pat-10',
  documentType: 'CI',
  documentNumber: CEDULA,
  firstName: 'David',
  lastName: 'Pérez',
  fullName: 'David Pérez',
  birthDate: '2006-05-10',
  age: 20,
  sex: 'M',
  bloodType: null,
  bloodTypeLabel: null,
  phoneE164: '593987654321',
  email: null,
  emergencyContactName: null,
  emergencyContactPhoneE164: null,
  adminNotes: null,
  active: true,
  createdAt: '2026-10-12T10:00:00Z',
  updatedAt: '2026-10-12T10:00:00Z',
};

describe('PatientFormPage', () => {
  let fixture: ComponentFixture<PatientFormPage>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientFormPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'pacientes/nuevo', component: PatientFormPage },
          { path: 'pacientes/:id', component: PatientDetailStubComponent },
        ]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    await router.navigateByUrl(`/pacientes/nuevo?q=${CEDULA}`);
    fixture = TestBed.createComponent(PatientFormPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  function typeInto(selector: string, value: string): void {
    const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function chooseSex(value: 'M' | 'F'): void {
    const radio = fixture.nativeElement.querySelector(
      `input[type="radio"][value="${value}"]`
    ) as HTMLInputElement;
    radio.checked = true;
    radio.dispatchEvent(new Event('change'));
  }

  function fillValidForm(): void {
    typeInto('#patient-first-name', 'David');
    typeInto('#patient-last-name', 'Pérez');
    typeInto('#patient-birth-date', '2006-05-10');
    chooseSex('M');
    typeInto('#patient-phone', '0987 654 321');
    fixture.detectChanges();
  }

  function submitForm(): void {
    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    submit.click();
    fixture.detectChanges();
  }

  it('alta válida → número precargado, datos → Guardar → POST con el body esperado → 201 → navega a /pacientes/{id}', async () => {
    const documentInput = fixture.nativeElement.querySelector('#patient-document-number') as HTMLInputElement;
    expect(documentInput.value).toBe(CEDULA);

    fillValidForm();
    submitForm();

    const request = httpMock.expectOne('/api/v1/patients');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      documentType: 'CI',
      documentNumber: '1710034065',
      firstName: 'David',
      lastName: 'Pérez',
      birthDate: '2006-05-10',
      sex: 'M',
      phoneE164: '593987654321',
    });

    const response: ApiResponse<Patient> = {
      success: true,
      message: 'Paciente registrado',
      data: createdPatient,
    };
    request.flush(response, { status: 201, statusText: 'Created' });

    await fixture.whenStable();
    expect(router.url).toBe('/pacientes/pat-10');
  });

  it('409 duplicado → se ve el mensaje del backend → búsqueda por documento → enlace "Ver su ficha" a /pacientes/{id}', async () => {
    fillValidForm();
    submitForm();

    const request = httpMock.expectOne('/api/v1/patients');
    request.flush(
      {
        success: false,
        message: "Ya existe un paciente con el documento '1710034065'.",
        data: null,
      },
      { status: 409, statusText: 'Conflict' }
    );

    const search = httpMock.expectOne(`/api/v1/patients?query=${CEDULA}&page=0&size=1`);
    expect(search.request.method).toBe('GET');
    const page: ApiResponse<Page<Patient>> = {
      success: true,
      message: 'OK',
      data: { content: [createdPatient], totalElements: 1, totalPages: 1, number: 0, size: 1 },
    };
    search.flush(page);
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('.bd-alert') as HTMLElement;
    expect(alert.textContent).toContain("Ya existe un paciente con el documento '1710034065'.");

    const link = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>
    ).find((anchor) => anchor.textContent?.trim() === 'Ver su ficha');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('/pacientes/pat-10');
  });
});
