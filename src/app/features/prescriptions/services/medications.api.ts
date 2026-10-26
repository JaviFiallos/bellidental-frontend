import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import {
  Medication,
  MedicationPreset,
  MedicationPresetRequest,
  MedicationRequest,
} from '../models/prescription.models';

@Injectable({
  providedIn: 'root',
})
export class MedicationsApi {
  private readonly api = inject(ApiClient);

  search(query: string): Observable<Medication[]> {
    return this.api.get<Medication[]>('/api/v1/medications', { params: { query } });
  }

  listManage(): Observable<Medication[]> {
    return this.api.get<Medication[]>('/api/v1/medications/manage');
  }

  createMedication(request: MedicationRequest): Observable<Medication> {
    return this.api.post<Medication>('/api/v1/medications', request);
  }

  updateMedication(id: number, request: MedicationRequest): Observable<Medication> {
    return this.api.put<Medication>(`/api/v1/medications/${id}`, request);
  }

  deactivateMedication(id: number): Observable<Medication> {
    return this.api.post<Medication>(`/api/v1/medications/${id}/deactivate`);
  }

  activateMedication(id: number): Observable<Medication> {
    return this.api.post<Medication>(`/api/v1/medications/${id}/activate`);
  }

  createPreset(medicationId: number, request: MedicationPresetRequest): Observable<MedicationPreset> {
    return this.api.post<MedicationPreset>(`/api/v1/medications/${medicationId}/presets`, request);
  }

  updatePreset(id: number, request: MedicationPresetRequest): Observable<MedicationPreset> {
    return this.api.put<MedicationPreset>(`/api/v1/medication-presets/${id}`, request);
  }

  deactivatePreset(id: number): Observable<MedicationPreset> {
    return this.api.post<MedicationPreset>(`/api/v1/medication-presets/${id}/deactivate`);
  }

  activatePreset(id: number): Observable<MedicationPreset> {
    return this.api.post<MedicationPreset>(`/api/v1/medication-presets/${id}/activate`);
  }
}

