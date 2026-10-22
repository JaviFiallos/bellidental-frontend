import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { Page } from '../../../core/api/page';
import {
  AuditEntityName,
  AuditEntry,
  AuditLogEntry,
  AuditLogQuery,
} from '../models/audit.models';

@Injectable({
  providedIn: 'root',
})
export class AuditApi {
  private readonly api = inject(ApiClient);

  /** Historial de un registro, de la revisión más antigua a la más reciente. Solo ADMIN (director). */
  history(entity: AuditEntityName, id: string): Observable<AuditEntry[]> {
    return this.api.get<AuditEntry[]>(`/api/v1/audit/${entity}/${id}`);
  }

  /** Historial completo de una atención y sus entidades hijas (diagnósticos, hallazgos, tratamientos, recetas). */
  encounterFull(id: string): Observable<AuditEntry[]> {
    return this.api.get<AuditEntry[]>(`/api/v1/audit/encounters/${id}/full`);
  }

  /** Lista paginada de actividad del sistema con filtros. */
  list(query: AuditLogQuery): Observable<Page<AuditLogEntry>> {
    const params: Record<string, string | number> = {
      from: query.from,
      to: query.to,
      page: query.page ?? 0,
      size: query.size ?? 50,
    };
    if (query.entity) {
      params['entity'] = query.entity;
    }
    if (query.userId) {
      params['userId'] = query.userId;
    }
    if (query.patientId) {
      params['patientId'] = query.patientId;
    }
    return this.api.get<Page<AuditLogEntry>>('/api/v1/audit', { params });
  }
}
