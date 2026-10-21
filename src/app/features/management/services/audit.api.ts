import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { AuditEntityName, AuditEntry } from '../models/audit.models';

@Injectable({
  providedIn: 'root',
})
export class AuditApi {
  private readonly api = inject(ApiClient);

  /** Historial de un registro, de la revisión más antigua a la más reciente. Solo ADMIN (director). */
  history(entity: AuditEntityName, id: string): Observable<AuditEntry[]> {
    return this.api.get<AuditEntry[]>(`/api/v1/audit/${entity}/${id}`);
  }
}
