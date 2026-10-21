import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import {
  CatalogSpecialty,
  CatalogTreatment,
  CreateTreatmentRequest,
  SpecialtyRequest,
  UpdateTreatmentRequest,
} from '../models/catalog.models';

/** Catálogo de tratamientos y especialidades del director (backend 021). Nunca se elimina: solo se desactiva. */
@Injectable({
  providedIn: 'root',
})
export class CatalogApi {
  private readonly api = inject(ApiClient);

  listTreatments(): Observable<CatalogTreatment[]> {
    return this.api.get<CatalogTreatment[]>('/api/v1/treatments/manage');
  }

  createTreatment(request: CreateTreatmentRequest): Observable<CatalogTreatment> {
    return this.api.post<CatalogTreatment>('/api/v1/treatments', request);
  }

  updateTreatment(id: number, request: UpdateTreatmentRequest): Observable<CatalogTreatment> {
    return this.api.put<CatalogTreatment>(`/api/v1/treatments/${id}`, request);
  }

  deactivateTreatment(id: number): Observable<CatalogTreatment> {
    return this.api.post<CatalogTreatment>(`/api/v1/treatments/${id}/deactivate`);
  }

  activateTreatment(id: number): Observable<CatalogTreatment> {
    return this.api.post<CatalogTreatment>(`/api/v1/treatments/${id}/activate`);
  }

  listSpecialties(): Observable<CatalogSpecialty[]> {
    return this.api.get<CatalogSpecialty[]>('/api/v1/specialties/manage');
  }

  createSpecialty(request: SpecialtyRequest): Observable<CatalogSpecialty> {
    return this.api.post<CatalogSpecialty>('/api/v1/specialties', request);
  }

  updateSpecialty(id: number, request: SpecialtyRequest): Observable<CatalogSpecialty> {
    return this.api.put<CatalogSpecialty>(`/api/v1/specialties/${id}`, request);
  }

  /** Puede responder 409 (urgencias del bot, profesionales activos o citas futuras): se muestra su `message`. */
  deactivateSpecialty(id: number): Observable<CatalogSpecialty> {
    return this.api.post<CatalogSpecialty>(`/api/v1/specialties/${id}/deactivate`);
  }

  activateSpecialty(id: number): Observable<CatalogSpecialty> {
    return this.api.post<CatalogSpecialty>(`/api/v1/specialties/${id}/activate`);
  }
}
