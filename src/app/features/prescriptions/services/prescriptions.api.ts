import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { Prescription, PrescriptionRequest } from '../models/prescription.models';
import { DocumentLink } from '../../../shared/utils/pdf-window';

@Injectable({
  providedIn: 'root',
})
export class PrescriptionsApi {
  private readonly api = inject(ApiClient);

  listByEncounter(encounterId: string): Observable<Prescription[]> {
    return this.api.get<Prescription[]>(`/api/v1/encounters/${encounterId}/prescriptions`);
  }

  create(encounterId: string, request: PrescriptionRequest): Observable<Prescription> {
    return this.api.post<Prescription>(`/api/v1/encounters/${encounterId}/prescriptions`, request);
  }

  update(prescriptionId: string, request: PrescriptionRequest): Observable<Prescription> {
    return this.api.put<Prescription>(`/api/v1/prescriptions/${prescriptionId}`, request);
  }

  issue(prescriptionId: string): Observable<Prescription> {
    return this.api.post<Prescription>(`/api/v1/prescriptions/${prescriptionId}/issue`);
  }

  void(prescriptionId: string): Observable<Prescription> {
    return this.api.post<Prescription>(`/api/v1/prescriptions/${prescriptionId}/void`);
  }

  /** Enlace temporal al PDF de una receta emitida (409 si aún no está emitida). */
  pdfLink(prescriptionId: string): Observable<DocumentLink> {
    return this.api.post<DocumentLink>(`/api/v1/prescriptions/${prescriptionId}/pdf-link`);
  }
}
