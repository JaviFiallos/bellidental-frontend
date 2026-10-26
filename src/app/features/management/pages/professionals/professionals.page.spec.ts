import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProfessionalDetail, Specialty } from '../../../professionals';
import { ProfessionalsPage } from './professionals.page';

const SPECIALTIES_FIXTURE: Specialty[] = [
  { id: 1, name: 'Odontología General', defaultDurationMinutes: 30 },
  { id: 2, name: 'Endodoncia', defaultDurationMinutes: 45 },
];

const PROFESSIONALS_FIXTURE: ProfessionalDetail[] = [
  {
    id: 'prof-1',
    userId: 'usr-1',
    fullName: 'Dra. María González',
    firstName: 'María',
    lastName: 'González',
    documentType: 'CI',
    documentNumber: '1710034065',
    licenseNumber: 'LIC-1001',
    phoneE164: '593987654321',
    colorTag: '#2C5F8A',
    active: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    specialties: [
      { id: 1, name: 'Odontología General', defaultDurationMinutes: 30 },
    ],
  },
];

async function settle(harness: RouterTestingHarness): Promise<void> {
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();
}

describe('ProfessionalsPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'direccion/profesionales',
            component: ProfessionalsPage,
          },
        ]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('abrir /direccion/profesionales → GET /api/v1/professionals y GET /api/v1/specialties → se ven las filas; «Nuevo profesional» → llenar datos, una especialidad y elegir una muestra → Guardar → POST /api/v1/professionals con { documentType, documentNumber, firstName, lastName, licenseNumber, colorTag, specialtyIds } → se recarga la lista y aparece el nombre nuevo', async () => {
    const harness = await RouterTestingHarness.create('/direccion/profesionales');
    await settle(harness);

    const profsReq = httpMock.expectOne('/api/v1/professionals');
    expect(profsReq.request.method).toBe('GET');
    profsReq.flush({ success: true, message: 'OK', data: PROFESSIONALS_FIXTURE });

    const specsReq = httpMock.expectOne('/api/v1/specialties');
    expect(specsReq.request.method).toBe('GET');
    specsReq.flush({ success: true, message: 'OK', data: SPECIALTIES_FIXTURE });

    await settle(harness);

    const textBefore = harness.fixture.nativeElement.textContent as string;
    expect(textBefore).toContain('Dra. María González');
    expect(textBefore).toContain('LIC-1001');

    // Click "Nuevo profesional"
    const newBtn = Array.from(
      harness.fixture.nativeElement.querySelectorAll('button')
    ).find((b) => (b as HTMLButtonElement).textContent?.includes('Nuevo profesional')) as HTMLButtonElement;
    expect(newBtn).not.toBeNull();
    newBtn.click();
    await settle(harness);

    // Fill form
    const docNumberInput = document.querySelector('#prof-doc-number') as HTMLInputElement;
    const firstNameInput = document.querySelector('#prof-first-name') as HTMLInputElement;
    const lastNameInput = document.querySelector('#prof-last-name') as HTMLInputElement;
    const licenseInput = document.querySelector('#prof-license') as HTMLInputElement;

    expect(docNumberInput).not.toBeNull();
    docNumberInput.value = '1104622152';
    docNumberInput.dispatchEvent(new Event('input'));

    firstNameInput.value = 'Carlos';
    firstNameInput.dispatchEvent(new Event('input'));

    lastNameInput.value = 'Pérez';
    lastNameInput.dispatchEvent(new Event('input'));

    licenseInput.value = 'LIC-2002';
    licenseInput.dispatchEvent(new Event('input'));

    // Check specialty 1
    const specCheckboxes = Array.from(
      document.querySelectorAll('.professional-form__checkbox')
    ) as HTMLInputElement[];
    expect(specCheckboxes.length).toBeGreaterThan(0);
    specCheckboxes[0].click();
    specCheckboxes[0].dispatchEvent(new Event('change'));

    // Click color swatch #C97B2E (Dorado)
    const swatchBtn = document.querySelector(
      'button.color-picker__swatch[aria-label="Dorado"]'
    ) as HTMLButtonElement;
    expect(swatchBtn).not.toBeNull();
    swatchBtn.click();

    await settle(harness);

    // Submit form
    const submitBtn = Array.from(
      document.querySelectorAll('.professional-form button[type="submit"]')
    )[0] as HTMLButtonElement;
    expect(submitBtn).not.toBeNull();
    submitBtn.click();
    await settle(harness);

    // Expect POST request
    const postReq = httpMock.expectOne('/api/v1/professionals');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      documentType: 'CI',
      documentNumber: '1104622152',
      firstName: 'Carlos',
      lastName: 'Pérez',
      licenseNumber: 'LIC-2002',
      colorTag: '#C97B2E',
      specialtyIds: [1],
    });

    const newProfessional: ProfessionalDetail = {
      id: 'prof-2',
      userId: null,
      fullName: 'Dr. Carlos Pérez',
      firstName: 'Carlos',
      lastName: 'Pérez',
      documentType: 'CI',
      documentNumber: '1104622152',
      licenseNumber: 'LIC-2002',
      phoneE164: null,
      colorTag: '#C97B2E',
      active: true,
      createdAt: '2026-10-24T10:00:00Z',
      updatedAt: '2026-10-24T10:00:00Z',
      specialties: [{ id: 1, name: 'Odontología General', defaultDurationMinutes: 30 }],
    };

    postReq.flush({
      success: true,
      message: 'Profesional registrado',
      data: newProfessional,
    });

    // Expect list reload
    const reloadProfs = httpMock.expectOne('/api/v1/professionals');
    reloadProfs.flush({
      success: true,
      message: 'OK',
      data: [...PROFESSIONALS_FIXTURE, newProfessional],
    });

    const reloadSpecs = httpMock.expectOne('/api/v1/specialties');
    reloadSpecs.flush({ success: true, message: 'OK', data: SPECIALTIES_FIXTURE });

    await settle(harness);

    const textAfter = harness.fixture.nativeElement.textContent as string;
    expect(textAfter).toContain('Dr. Carlos Pérez');
  });

  it("editar una fila y guardar → PUT /api/v1/professionals/{id} responde 409 «El número de licencia '…' ya está en uso.» → el mensaje se ve en el formulario", async () => {
    const harness = await RouterTestingHarness.create('/direccion/profesionales');
    await settle(harness);

    const profsReq = httpMock.expectOne('/api/v1/professionals');
    profsReq.flush({ success: true, message: 'OK', data: PROFESSIONALS_FIXTURE });

    const specsReq = httpMock.expectOne('/api/v1/specialties');
    specsReq.flush({ success: true, message: 'OK', data: SPECIALTIES_FIXTURE });

    await settle(harness);

    // Click "Editar" on María González
    const editBtn = harness.fixture.nativeElement.querySelector(
      '.professional-table__action'
    ) as HTMLButtonElement;
    expect(editBtn).not.toBeNull();
    editBtn.click();
    await settle(harness);

    const licenseInput = document.querySelector('#prof-license') as HTMLInputElement;
    expect(licenseInput).not.toBeNull();
    licenseInput.value = 'LIC-CONFLICT';
    licenseInput.dispatchEvent(new Event('input'));
    await settle(harness);

    const submitBtn = document.querySelector('.professional-form button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn).not.toBeNull();
    submitBtn.click();
    await settle(harness);

    const putReq = httpMock.expectOne('/api/v1/professionals/prof-1');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      licenseNumber: 'LIC-CONFLICT',
    });

    putReq.flush(
      {
        success: false,
        message: "El número de licencia 'LIC-CONFLICT' ya está en uso.",
        data: null,
      },
      { status: 409, statusText: 'Conflict' }
    );
    await settle(harness);

    const formText = document.querySelector('.professional-form')?.textContent as string;
    expect(formText).toContain("El número de licencia 'LIC-CONFLICT' ya está en uso.");
  });
});
