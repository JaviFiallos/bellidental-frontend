import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ToastHostComponent } from '../../../../shared/components/toast-host/toast-host.component';
import { Medication } from '../../models/prescription.models';

@Component({
  selector: 'bd-medications-test-host',
  standalone: true,
  imports: [RouterOutlet, ToastHostComponent],
  template: `<bd-toast-host /><router-outlet />`,
})
class MedicationsTestHostComponent {}

const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 1,
    name: 'Amoxicilina',
    presentation: 'cápsula',
    concentration: '500 mg',
    route: 'oral',
    active: true,
    presets: [
      {
        id: 10,
        label: 'Cada 8 h × 7 días',
        dose: '1 cápsula',
        frequency: 'cada 8 horas',
        duration: '7 días',
        instructions: null,
        active: true,
      },
    ],
  },
  {
    id: 2,
    name: 'Ibuprofeno',
    presentation: 'tableta',
    concentration: '400 mg',
    route: 'oral',
    active: true,
    presets: [],
  },
];

const CREATED_MEDICATION: Medication = {
  id: 3,
  name: 'Prednisona',
  presentation: 'tableta',
  concentration: '20 mg',
  route: null,
  active: true,
  presets: [],
};

function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  return fixture.whenStable().then(() => fixture.detectChanges());
}

async function openMedications(): Promise<ComponentFixture<MedicationsTestHostComponent>> {
  const fixture = TestBed.createComponent(MedicationsTestHostComponent);
  fixture.detectChanges();
  await TestBed.inject(Router).navigateByUrl('/consultorio/medicamentos');
  await settle(fixture);
  return fixture;
}

async function loadMedications(
  fixture: ComponentFixture<MedicationsTestHostComponent>,
  httpMock: HttpTestingController
): Promise<void> {
  await settle(fixture);
  httpMock
    .expectOne('/api/v1/medications/manage')
    .flush({ success: true, message: 'OK', data: INITIAL_MEDICATIONS });
  await settle(fixture);
}

function findButton(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === text
  );
}

function typeInto(selector: string, value: string): void {
  const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!input) {
    throw new Error(`No existe ${selector}`);
  }
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('MedicationsPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'consultorio/medicamentos',
            loadComponent: () =>
              import('./medications.page').then((m) => m.MedicationsPage),
          },
        ]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('crear medicamento → aparece en la lista', async () => {
    const fixture = await openMedications();
    await loadMedications(fixture, httpMock);

    findButton('Nuevo medicamento')?.click();
    await settle(fixture);

    typeInto('#medication-name', 'Prednisona');
    typeInto('#medication-presentation', 'tableta');
    typeInto('#medication-concentration', '20 mg');
    await settle(fixture);

    const submitBtn = document.querySelector<HTMLButtonElement>(
      'bd-medication-form button[type="submit"]'
    );
    expect(submitBtn).not.toBeNull();
    submitBtn?.click();
    await settle(fixture);

    const createReq = httpMock.expectOne({ method: 'POST', url: '/api/v1/medications' });
    expect(createReq.request.body).toEqual({
      name: 'Prednisona',
      presentation: 'tableta',
      concentration: '20 mg',
    });
    createReq.flush(
      { success: true, message: 'Medicamento creado.', data: CREATED_MEDICATION },
      { status: 201, statusText: 'Created' }
    );
    await settle(fixture);

    httpMock.expectOne('/api/v1/medications/manage').flush({
      success: true,
      message: 'OK',
      data: [...INITIAL_MEDICATIONS, CREATED_MEDICATION],
    });
    await settle(fixture);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Prednisona');
    expect(text).toContain('20 mg · tableta');
  });

  it('nueva posología → POST con los textos', async () => {
    const fixture = await openMedications();
    await loadMedications(fixture, httpMock);

    document
      .querySelector<HTMLButtonElement>('button[aria-label="Posologías de Ibuprofeno"]')
      ?.click();
    await settle(fixture);

    findButton('Nueva posología')?.click();
    await settle(fixture);

    typeInto('#preset-label', 'Cada 8 h × 3 días');
    typeInto('#preset-dose', '1 tableta');
    typeInto('#preset-frequency', 'cada 8 horas');
    typeInto('#preset-duration', '3 días');
    await settle(fixture);

    const submitBtn = document.querySelector<HTMLButtonElement>(
      'bd-medication-preset-form button[type="submit"]'
    );
    expect(submitBtn).not.toBeNull();
    submitBtn?.click();
    await settle(fixture);

    const createPresetReq = httpMock.expectOne({
      method: 'POST',
      url: '/api/v1/medications/2/presets',
    });
    expect(createPresetReq.request.body).toEqual({
      label: 'Cada 8 h × 3 días',
      dose: '1 tableta',
      frequency: 'cada 8 horas',
      duration: '3 días',
    });
    createPresetReq.flush(
      {
        success: true,
        message: 'Posología creada.',
        data: {
          id: 20,
          label: 'Cada 8 h × 3 días',
          dose: '1 tableta',
          frequency: 'cada 8 horas',
          duration: '3 días',
          instructions: null,
          active: true,
        },
      },
      { status: 201, statusText: 'Created' }
    );
    await settle(fixture);

    const updatedIbuprofeno: Medication = {
      ...INITIAL_MEDICATIONS[1],
      presets: [
        {
          id: 20,
          label: 'Cada 8 h × 3 días',
          dose: '1 tableta',
          frequency: 'cada 8 horas',
          duration: '3 días',
          instructions: null,
          active: true,
        },
      ],
    };

    httpMock.expectOne('/api/v1/medications/manage').flush({
      success: true,
      message: 'OK',
      data: [INITIAL_MEDICATIONS[0], updatedIbuprofeno],
    });
    await settle(fixture);

    expect(fixture.nativeElement.textContent as string).toContain('Cada 8 h × 3 días');
  });

  it('editar medicamento usado → muestra el 409', async () => {
    const fixture = await openMedications();
    await loadMedications(fixture, httpMock);

    document
      .querySelector<HTMLButtonElement>('button[aria-label="Editar Amoxicilina"]')
      ?.click();
    await settle(fixture);

    typeInto('#medication-concentration', '875 mg');
    await settle(fixture);

    const submitBtn = document.querySelector<HTMLButtonElement>(
      'bd-medication-form button[type="submit"]'
    );
    expect(submitBtn).not.toBeNull();
    submitBtn?.click();
    await settle(fixture);

    const updateReq = httpMock.expectOne({
      method: 'PUT',
      url: '/api/v1/medications/1',
    });
    updateReq.flush(
      {
        success: false,
        message: 'El medicamento ya se usó en recetas: desactívalo y crea uno nuevo.',
        data: null,
      },
      { status: 409, statusText: 'Conflict' }
    );
    await settle(fixture);

    expect(fixture.nativeElement.textContent as string).toContain(
      'El medicamento ya se usó en recetas: desactívalo y crea uno nuevo.'
    );
    expect(document.querySelector('bd-medication-form')).not.toBeNull();
  });
});
