import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClient } from '../../../core/api/api-client';
import { EffectiveDay, Schedule, ScheduleRequest } from '../models/schedule.models';

/** Convierte `HH:mm:ss` o `HH:mm` a `HH:mm`. */
export function toClockTime(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

function normalizeSchedule(schedule: Schedule): Schedule {
  return {
    ...schedule,
    startTime: toClockTime(schedule.startTime),
    endTime: toClockTime(schedule.endTime),
  };
}

@Injectable({
  providedIn: 'root',
})
export class SchedulesApi {
  private readonly api = inject(ApiClient);

  getEffective(professionalId: string, from: string, to: string): Observable<EffectiveDay[]> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to);

    return this.api.get<EffectiveDay[]>(
      `/api/v1/professionals/${professionalId}/schedules/effective`,
      { params }
    );
  }

  /** Reglas activas: semana tipo (`weekday`) y excepciones por fecha (`specificDate`). */
  list(professionalId: string): Observable<Schedule[]> {
    return this.api
      .get<Schedule[]>(`/api/v1/professionals/${professionalId}/schedules`)
      .pipe(map((schedules) => schedules.map(normalizeSchedule)));
  }

  create(professionalId: string, body: ScheduleRequest): Observable<Schedule> {
    return this.api
      .post<Schedule>(`/api/v1/professionals/${professionalId}/schedules`, body)
      .pipe(map(normalizeSchedule));
  }

  update(scheduleId: number, body: ScheduleRequest): Observable<Schedule> {
    return this.api
      .put<Schedule>(`/api/v1/schedules/${scheduleId}`, body)
      .pipe(map(normalizeSchedule));
  }

  deactivate(scheduleId: number): Observable<void> {
    return this.api.post<void>(`/api/v1/schedules/${scheduleId}/deactivate`);
  }
}
