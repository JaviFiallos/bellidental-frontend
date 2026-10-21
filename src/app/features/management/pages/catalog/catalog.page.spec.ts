import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ToastHostComponent } from '../../../../shared/components/toast-host/toast-host.component';
import { CatalogSpecialty, CatalogTreatment } from '../../models/catalog.models';

/** Anfitrión de prueba: la página vive en su `router-outlet` y el ToastHost de la app se monta a su lado. */
@Component({
  selector: 'bd-catalog-test-host',
  standalone: true,
  imports: [RouterOutlet, ToastHostComponent],
  template: `<bd-toast-host /><router-outlet />`,
})
class CatalogTestHostComponent {}

const TREATMENTS: CatalogTreatment[] = [
  {
    id: 1,
    code: 'CONS-01',
    name: 'Consulta de valoración',
    description: null,
    basePrice: 15,
    specialtyId: null,
    active: true,
  },
  {
    id: 2,
    code: 'END-01',
    name: 'Endodoncia unirradicular',
    description: 'Tratamiento de conducto de un canal',
    basePrice: 120,
    specialtyId: 2,
    active: true,
  },
];

const SPECIALTIES: CatalogSpecialty[] = [
  { id: 1, name: 'Odontología general', defaultDurationMinutes: 30, active: true },
  { id: 2, name: 'Endodoncia', defaultDurationMinutes: 60, active: true },
];

const CREATED_TREATMENT: CatalogTreatment = {
  id: 3,
  code: 'END-02',
  name: 'Endodoncia multirradicular',
  description: null,
  basePrice: 45.5,
  specialtyId: 2,
  active: true,
};

function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  return fixture.whenStable().then(() => fixture.detectChanges());
}

async function openCatalog(): Promise<ComponentFixture<CatalogTestHostComponent>> {
  const fixture = TestBed.createComponent(CatalogTestHostComponent);
  fixture.detectChanges();
  await TestBed.inject(Router).navigateByUrl('/direccion/catalogo');
  await settle(fixture);
  return fixture;
}

async function loadCatalog(
  fixture: ComponentFixture<CatalogTestHostComponent>,
  httpMock: HttpTestingController
): Promise<void> {
  await settle(fixture);
  httpMock
    .expectOne('/api/v1/treatments/manage')
    .flush({ success: true, message: 'OK', data: TREATMENTS });
  httpMock
    .expectOne('/api/v1/specialties/manage')
    .flush({ success: true, message: 'OK', data: SPECIALTIES });
  await settle(fixture);
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

function chooseOption(selector: string, value: string): void {
  const select = document.querySelector<HTMLSelectElement>(selector);
  if (!select) {
    throw new Error(`No existe ${selector}`);
  }
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

describe('CatalogPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'direccion/catalogo',
            loadComponent: () => import('./catalog.page').then((module) => module.CatalogPage),
          },
        ]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('crear tratamiento → lo muestra en la tabla', async () => {
    const fixture = await openCatalog();
    await loadCatalog(fixture, httpMock);

    findButton('Nuevo tratamiento')?.click();
    await settle(fixture);
    typeInto('#treatment-code', 'end-02');
    typeInto('#treatment-name', 'Endodoncia multirradicular');
    typeInto('#treatment-price', '45.5');
    chooseOption('#treatment-specialty', '2');
    await settle(fixture);
    findButton('Crear tratamiento')?.click();
    await settle(fixture);

    const createRequest = httpMock.expectOne({ method: 'POST', url: '/api/v1/treatments' });
    expect(createRequest.request.body).toEqual({
      code: 'END-02',
      name: 'Endodoncia multirradicular',
      basePrice: 45.5,
      specialtyId: 2,
    });
    createRequest.flush(
      { success: true, message: 'Tratamiento creado.', data: CREATED_TREATMENT },
      { status: 201, statusText: 'Created' }
    );
    await settle(fixture);

    httpMock.expectOne('/api/v1/treatments/manage').flush({
      success: true,
      message: 'OK',
      data: [...TREATMENTS, CREATED_TREATMENT],
    });
    await settle(fixture);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('END-02');
    expect(text).toContain('Endodoncia multirradicular');
    expect(text).toContain('45,50');
  });

  it('editar precio → PUT sin código', async () => {
    const fixture = await openCatalog();
    await loadCatalog(fixture, httpMock);

    document.querySelector<HTMLButtonElement>('button[aria-label="Editar END-01"]')?.click();
    await settle(fixture);
    typeInto('#treatment-price', '135');
    await settle(fixture);
    findButton('Guardar cambios')?.click();
    await settle(fixture);

    const updateRequest = httpMock.expectOne({ method: 'PUT', url: '/api/v1/treatments/2' });
    expect(updateRequest.request.body).toEqual({
      name: 'Endodoncia unirradicular',
      description: 'Tratamiento de conducto de un canal',
      basePrice: 135,
      specialtyId: 2,
    });
    expect(updateRequest.request.body).not.toHaveProperty('code');
    updateRequest.flush({
      success: true,
      message: 'Tratamiento actualizado.',
      data: { ...TREATMENTS[1], basePrice: 135 },
    });
    await settle(fixture);

    httpMock.expectOne('/api/v1/treatments/manage').flush({
      success: true,
      message: 'OK',
      data: [TREATMENTS[0], { ...TREATMENTS[1], basePrice: 135 }],
    });
    await settle(fixture);

    expect(fixture.nativeElement.textContent as string).toContain('135,00');
  });

  it('desactivar especialidad con conflicto → muestra el mensaje del backend', async () => {
    const fixture = await openCatalog();
    await loadCatalog(fixture, httpMock);

    findButton('Especialidades')?.click();
    await settle(fixture);
    document.querySelector<HTMLButtonElement>('button[aria-label="Desactivar Endodoncia"]')?.click();
    await settle(fixture);
    document.querySelector<HTMLButtonElement>('[role="alertdialog"] .btn-danger')?.click();
    await settle(fixture);

    httpMock
      .expectOne({ method: 'POST', url: '/api/v1/specialties/2/deactivate' })
      .flush(
        {
          success: false,
          message: 'Hay profesionales con esta especialidad; quítasela antes.',
          data: null,
        },
        { status: 409, statusText: 'Conflict' }
      );
    await settle(fixture);

    expect(fixture.nativeElement.textContent as string).toContain(
      'Hay profesionales con esta especialidad; quítasela antes.'
    );
    expect(document.querySelector('button[aria-label="Desactivar Endodoncia"]')).not.toBeNull();
  });
});
