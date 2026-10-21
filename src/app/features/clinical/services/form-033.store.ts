import { computed, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, Observable, of, Subscription, throwError } from 'rxjs';
import { ApiError } from '../../../core/api/api.models';
import { OdontogramApi, OdontogramCatalog, PatientOdontogram } from '../../odontogram';
import { Patient, PatientsApi } from '../../patients';
import {
  calculateAgeAtDate,
  formatVitalSigns,
  getAgeGroupMarks,
  getFirst4Diagnoses,
  getOralHealthIndicators,
  getPlanMarks,
  getHistoryMarks,
} from '../domain/form-033';
import { ClinicalRecord, MedicalHistoryCondition } from '../models/clinical-record.models';
import { ClinicalSession, ClinicalSummary } from '../models/clinical-summary.models';
import { Encounter } from '../models/encounter.models';
import { ClinicalRecordsApi } from './clinical-records.api';
import { ClinicalSummaryApi } from './clinical-summary.api';
import { EncountersApi } from './encounters.api';

@Injectable()
export class Form033Store {
  private readonly patientsApi = inject(PatientsApi);
  private readonly clinicalRecordsApi = inject(ClinicalRecordsApi);
  private readonly odontogramApi = inject(OdontogramApi);
  private readonly clinicalSummaryApi = inject(ClinicalSummaryApi);
  private readonly encountersApi = inject(EncountersApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly patientId = signal<string>('');
  readonly patient = signal<Patient | null>(null);
  readonly clinicalRecord = signal<ClinicalRecord | null>(null);
  readonly conditions = signal<MedicalHistoryCondition[]>([]);
  readonly catalog = signal<OdontogramCatalog | null>(null);
  readonly odontogram = signal<PatientOdontogram | null>(null);
  readonly clinicalSummary = signal<ClinicalSummary | null>(null);

  readonly selectedSessionNumber = signal<number>(1);
  readonly referenceEncounter = signal<Encounter | null>(null);
  readonly referenceEncounterLoading = signal<boolean>(false);
  readonly referenceEncounterError = signal<string | null>(null);

  private encounterSubscription: Subscription | null = null;

  readonly sessions = computed<ClinicalSession[]>(() => {
    return this.clinicalSummary()?.sessions ?? [];
  });

  readonly hasNoSessions = computed<boolean>(() => {
    return !this.loading() && !this.error() && this.sessions().length === 0;
  });

  readonly selectedSession = computed<ClinicalSession | null>(() => {
    const list = this.sessions();
    if (list.length === 0) return null;
    const target = this.selectedSessionNumber();
    return list.find((s) => s.sessionNumber === target) ?? list[0];
  });

  readonly referenceProfessional = computed(() => {
    return this.selectedSession()?.professional ?? this.clinicalSummary()?.openedBy ?? null;
  });

  readonly referenceDate = computed<string>(() => {
    return this.selectedSession()?.startAt ?? this.clinicalSummary()?.openedAt ?? '';
  });

  readonly ageAtReference = computed<number>(() => {
    return calculateAgeAtDate(this.patient()?.birthDate ?? '', this.referenceDate());
  });

  readonly ageGroupMarks = computed(() => {
    return getAgeGroupMarks(this.ageAtReference());
  });

  readonly historyMarksAndLines = computed(() => {
    return getHistoryMarks(
      this.conditions(),
      this.clinicalRecord()?.historyEntries ?? [],
      this.clinicalRecord()?.noKnownHistory ?? false,
      this.clinicalRecord()?.currentMedication
    );
  });

  readonly vitalSigns = computed(() => {
    return formatVitalSigns(this.referenceEncounter());
  });

  readonly markedRegions = computed<number[]>(() => {
    return this.referenceEncounter()?.stomatognathicRegions ?? [];
  });

  readonly planMarksAndLines = computed(() => {
    const enc = this.referenceEncounter();
    return getPlanMarks(enc?.diagnosticExams, enc?.planDescription);
  });

  readonly first4Diagnoses = computed(() => {
    const enc = this.referenceEncounter();
    if (enc?.diagnoses && enc.diagnoses.length > 0) {
      return getFirst4Diagnoses(enc.diagnoses);
    }
    return getFirst4Diagnoses(this.selectedSession()?.diagnoses);
  });

  readonly oralHealthMarks = computed(() => {
    return getOralHealthIndicators(this.referenceEncounter());
  });

  load(patientId: string, initialSessionNumber?: number | null): void {
    this.loading.set(true);
    this.error.set(null);
    this.patientId.set(patientId);

    forkJoin({
      patient: this.patientsApi.getById(patientId),
      clinicalRecord: this.clinicalRecordOrNull(patientId),
      conditions: this.clinicalRecordsApi.listConditions(),
      catalog: this.odontogramApi.catalog(),
      odontogram: this.odontogramApi.getByPatient(patientId),
      clinicalSummary: this.clinicalSummaryApi.get(patientId),
    }).subscribe({
      next: (res) => {
        this.patient.set(res.patient);
        this.clinicalRecord.set(res.clinicalRecord);
        this.conditions.set(res.conditions);
        this.catalog.set(res.catalog);
        this.odontogram.set(res.odontogram);
        this.clinicalSummary.set(res.clinicalSummary);

        const sess = res.clinicalSummary.sessions || [];
        if (sess.length > 0) {
          let chosen = initialSessionNumber;
          if (!chosen || !sess.some((s) => s.sessionNumber === chosen)) {
            chosen = sess[0].sessionNumber;
          }
          this.selectedSessionNumber.set(chosen);
          const chosenSession = sess.find((s) => s.sessionNumber === chosen) ?? sess[0];
          this.loadEncounter(chosenSession.encounterId);
        } else {
          this.loading.set(false);
        }
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.error.set(err.status === 403 ? 'No tienes permiso' : err.message);
      },
    });
  }

  selectSession(sessionNumber: number): void {
    if (this.selectedSessionNumber() === sessionNumber) return;
    this.selectedSessionNumber.set(sessionNumber);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sesion: sessionNumber },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    const sess = this.sessions().find((s) => s.sessionNumber === sessionNumber);
    if (sess) {
      this.loadEncounter(sess.encounterId);
    }
  }

  /**
   * Sin historia clínica (404) la hoja se muestra vacía: el paciente aún no tiene atenciones.
   */
  private clinicalRecordOrNull(patientId: string): Observable<ClinicalRecord | null> {
    return this.clinicalRecordsApi.getByPatient(patientId).pipe(
      catchError((err: ApiError) => (err.status === 404 ? of(null) : throwError(() => err)))
    );
  }

  /**
   * Carga la atención de referencia. Una respuesta vieja (sesión cambiada antes de llegar) se descarta.
   */
  private loadEncounter(encounterId: string): void {
    this.encounterSubscription?.unsubscribe();
    this.referenceEncounter.set(null);
    this.referenceEncounterError.set(null);
    this.referenceEncounterLoading.set(true);

    this.encounterSubscription = this.encountersApi.get(encounterId).subscribe({
      next: (enc) => {
        this.referenceEncounter.set(enc);
        this.referenceEncounterLoading.set(false);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.referenceEncounterLoading.set(false);
        this.referenceEncounterError.set(err.message);
        this.loading.set(false);
      },
    });
  }
}
