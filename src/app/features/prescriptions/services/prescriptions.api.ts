import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { Prescription, PrescriptionRequest } from '../models/prescription.models';

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

  pdf(prescriptionId: string): Observable<Blob> {
    return this.api.getBlob(`/api/v1/prescriptions/${prescriptionId}/pdf`);
  }
}
