import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog';
import { SideSheetComponent } from '../../../../shared/components/side-sheet/side-sheet.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import { OdontogramComponent, OdontogramStore } from '../../../odontogram';
import { CompleteBarComponent } from '../../components/complete-bar/complete-bar.component';
import { DiagnosisListComponent } from '../../components/diagnosis-list/diagnosis-list.component';
import { EncounterNotesComponent } from '../../components/encounter-notes/encounter-notes.component';
import { HistoryPanelComponent } from '../../components/history-panel/history-panel.component';
import { PatientClinicalHeaderComponent } from '../../components/patient-clinical-header/patient-clinical-header.component';
import {
  CreateHistoryEntryRequest,
  HistoryEntry,
  MedicalHistoryCondition,
} from '../../models/clinical-record.models';
import { Diagnosis, DiagnosisCertainty } from '../../models/encounter.models';
import { EncounterStore } from '../../services/encounter.store';
import { HistoryPanelStore } from '../../services/history-panel.store';

@Component({
  selector: 'bd-encounter-page',
  standalone: true,
  imports: [
    RouterLink,
    AlertComponent,
    SkeletonComponent,
    PatientClinicalHeaderComponent,
    OdontogramComponent,
    EncounterNotesComponent,
    DiagnosisListComponent,
    CompleteBarComponent,
    SideSheetComponent,
    HistoryPanelComponent,
    ClinicDatePipe,
    ClinicTimePipe,
  ],
  providers: [EncounterStore, HistoryPanelStore, OdontogramStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="encounter-page">
      <!-- Navegación superior -->
      <nav class="encounter-page__nav" aria-label="Navegación del consultorio">
        <a routerLink="/consultorio" class="encounter-page__back-link">
          ← Mis citas
        </a>
      </nav>

      <!-- Estado: Carga con Skeleton -->
      @if (store.loading()) {
        <div class="encounter-page__skeleton" aria-busy="true">
          <bd-skeleton height="4.5rem" width="100%" />
          <bd-skeleton height="7rem" width="100%" />
          <bd-skeleton height="12rem" width="100%" />
        </div>
      }

      <!-- Estado: No encontrada (404) -->
      @else if (store.notFound()) {
        <div class="encounter-page__not-found">
          <bd-alert variant="warning" message="No se encontró esta atención">
            <a routerLink="/consultorio" class="btn btn-outline encounter-page__return-btn">
              Volver a Mis citas
            </a>
          </bd-alert>
        </div>
      }

      <!-- Estado: Error general -->
      @else if (store.error()) {
        <div class="encounter-page__error">
          <bd-alert variant="error" [message]="store.error()">
            <button type="button" class="btn btn-primary" (click)="onRetry()">
              Reintentar
            </button>
            <a routerLink="/consultorio" class="btn btn-outline">
              Volver a Mis citas
            </a>
          </bd-alert>
        </div>
      }

      <!-- Contenido de la atención -->
      @else if (store.encounter() && store.patient()) {
        <!-- Banners informativos según modo -->
        @if (store.editMode() === 'completed_editable') {
          <div class="encounter-page__banner">
            <bd-alert variant="info">
              <span>
                Atención completada el {{ store.encounter()?.closedAt | clinicDate:'long' }} a las {{ store.encounter()?.closedAt | clinicTime }} · puedes corregirla
              </span>
            </bd-alert>
          </div>
        } @else if (store.editMode() === 'voided') {
          <div class="encounter-page__banner">
            <bd-alert variant="error">
              <span>Atención anulada: {{ store.encounter()?.voidReason || 'Sin motivo' }}</span>
            </bd-alert>
          </div>
        } @else if (store.editMode() === 'other_professional') {
          <div class="encounter-page__banner">
            <bd-alert variant="warning">
              <span>Solo lectura: esta atención la registró otro odontólogo</span>
            </bd-alert>
          </div>
        }

        <main class="encounter-page__main">
          <!-- 1. Cabecera clínica del paciente -->
          <bd-patient-clinical-header
            [patient]="store.patient()!"
            [clinicalRecord]="store.clinicalRecord()"
            (openHistory)="historyStore.open()"
          />

          <!-- 2. Odontograma vigente (solo lectura) -->
          <section class="card encounter-page__odontogram-card" aria-label="Odontograma">
            <div class="encounter-page__odontogram-header">
              <h3 class="encounter-page__odontogram-title">Odontograma</h3>
            </div>

            @if (odontogramStore.loading()) {
              <bd-skeleton height="24rem" width="100%" />
            } @else if (odontogramStore.error()) {
              <bd-alert variant="error" [message]="odontogramStore.error()!">
                <button
                  type="button"
                  class="btn btn-outline"
                  (click)="odontogramStore.reload()"
                >
                  Reintentar
                </button>
              </bd-alert>
            } @else if (odontogramStore.catalog() && odontogramStore.odontogram()) {
              <bd-odontogram
                [catalog]="odontogramStore.catalog()!"
                [findings]="odontogramStore.findings()"
                [indices]="odontogramStore.indices()"
              />
            }
          </section>

          <!-- 3. Motivo y enfermedad actual -->
          <bd-encounter-notes
            [chiefComplaint]="store.chiefComplaint()"
            [currentIllness]="store.currentIllness()"
            [isReadOnly]="store.isReadOnly()"
            [saveStatus]="store.saveStatus()"
            [saveErrorMessage]="store.saveErrorMessage()"
            (chiefComplaintChange)="store.setChiefComplaint($event)"
            (currentIllnessChange)="store.setCurrentIllness($event)"
            (retrySave)="store.retrySave()"
          />

          <!-- 4. Diagnósticos -->
          <bd-diagnosis-list
            [diagnoses]="store.activeDiagnoses()"
            [isReadOnly]="store.isReadOnly()"
            [errorMessage]="store.diagnosisError()"
            [results]="store.icd10Results()"
            [loading]="store.icd10Loading()"
            [searchError]="store.icd10Error()"
            (queryChange)="store.searchIcd10($event)"
            (addDiagnosis)="onAddDiagnosis($event)"
            (voidDiagnosis)="onVoidDiagnosis($event)"
          />
        </main>

        <!-- 5. Barra de completar fija abajo -->
        <bd-complete-bar
          [missingRequirements]="store.missingRequirements()"
          [canComplete]="store.canComplete()"
          [isCompleted]="store.isCompleted()"
          [isReadOnly]="store.isReadOnly()"
          [saveStatus]="store.saveStatus()"
          [completing]="store.completing()"
          [errorMessage]="store.completeError()"
          (complete)="onComplete()"
        />

        <!-- 6. Panel lateral de antecedentes con bd-side-sheet -->
        <bd-side-sheet
          [isOpen]="historyStore.isOpen()"
          [fullscreenBelowMd]="true"
          titleId="history-panel-title"
          (closed)="historyStore.close()"
        >
          @if (historyStore.generalError()) {
            <bd-alert variant="error" [message]="historyStore.generalError()" />
          }
          <bd-history-panel
            [patientName]="store.patient()?.fullName || ''"
            [conditions]="historyStore.conditions()"
            [conditionsLoading]="historyStore.conditionsLoading()"
            [conditionsError]="historyStore.conditionsError()"
            [entries]="historyStore.clinicalRecord()?.historyEntries || []"
            [currentMedication]="historyStore.currentMedication()"
            [medicationStatus]="historyStore.medicationStatus()"
            [medicationError]="historyStore.medicationError()"
            [noKnownHistory]="historyStore.noKnownHistory()"
            [noKnownHistoryError]="historyStore.noKnownHistoryError()"
            [isReadOnly]="historyStore.isReadOnly()"
            [rowErrors]="historyStore.rowErrors()"
            [lastSuccessEntry]="historyStore.lastRegisteredEntry()"
            (addEntry)="onAddHistoryEntry($event)"
            (voidEntry)="onVoidHistoryEntry($event)"
            (medicationChange)="onMedicationChange($event)"
            (noKnownHistoryChange)="onNoKnownHistoryChange($event)"
            (retryConditions)="historyStore.loadConditionsIfNeeded()"
          />
        </bd-side-sheet>
      }
    </div>
  `,


  styles: `
    .encounter-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      padding-bottom: var(--space-md);
      max-width: 1366px;
      margin: 0 auto;
      box-sizing: border-box;
      min-height: 100%;
    }


    .encounter-page__nav {
      display: flex;
      align-items: center;
    }

    .encounter-page__back-link {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0 var(--space-xs);
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--blue-900);
      text-decoration: none;
      border-radius: var(--radius-sm);

      &:hover {
        text-decoration: underline;
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
      }
    }

    .encounter-page__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .encounter-page__main {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .encounter-page__banner {
      display: flex;
      flex-direction: column;
    }

    .encounter-page__odontogram-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .encounter-page__odontogram-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .encounter-page__odontogram-title {
      font-size: var(--fs-md);
      font-weight: 600;
      color: var(--blue-950);
      margin: 0;
    }

    .encounter-page__return-btn {
      margin-left: var(--space-sm);
    }
  `,
})
export class EncounterPage implements OnInit {
  readonly store = inject(EncounterStore);
  readonly historyStore = inject(HistoryPanelStore);
  readonly odontogramStore = inject(OdontogramStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);

  private lastLoadedPatientId: string | null = null;

  constructor() {
    effect(() => {
      const patientId = this.store.encounter()?.patientId;
      if (patientId && patientId !== this.lastLoadedPatientId) {
        this.lastLoadedPatientId = patientId;
        this.odontogramStore.load(patientId);
      }
    });
  }

  ngOnInit(): void {
    const encounterId = this.route.snapshot.paramMap.get('encounterId');
    if (encounterId) {
      this.store.load(encounterId);
    }
  }

  onRetry(): void {
    const encounterId = this.route.snapshot.paramMap.get('encounterId');
    if (encounterId) {
      this.store.load(encounterId);
    }
    if (this.odontogramStore.error()) {
      this.odontogramStore.reload();
    }
  }

  onAddDiagnosis(event: { icd10Id: number; certainty: DiagnosisCertainty }): void {
    this.store.addDiagnosis(event).subscribe({
      error: () => {},
    });
  }

  onVoidDiagnosis(diagnosis: Diagnosis): void {
    this.confirmDialog
      .open({
        title: 'Anular diagnóstico',
        message: `${diagnosis.code} ${diagnosis.description} quedará anulado en esta atención.`,
        tone: 'danger',
        confirmLabel: 'Anular',
      })
      .subscribe((res) => {
        if (res.confirmed) {
          this.store.voidDiagnosis(diagnosis.id).subscribe({
            next: () => {
              this.notificationService.success('Diagnóstico anulado');
            },
            error: (err) => {
              const msg = err?.message || 'Error al anular diagnóstico';
              this.notificationService.error(msg);
            },
          });
        }
      });
  }

  onComplete(): void {
    this.store.complete().subscribe({
      next: () => {
        this.notificationService.success('Atención completada');
        this.router.navigate(['/consultorio']);
      },
      error: () => {},
    });
  }

  onAddHistoryEntry(event: { conditionId: number; request: CreateHistoryEntryRequest }): void {
    this.historyStore.addEntry(event.conditionId, event.request).subscribe({
      error: () => {},
    });
  }

  onVoidHistoryEntry(event: { condition: MedicalHistoryCondition; entry: HistoryEntry }): void {
    const { condition, entry } = event;
    const scopeLabel =
      entry.scope === 'PERSONAL'
        ? condition.name === 'Otro' && entry.description
          ? entry.description
          : 'Personal'
        : `Familiar (${entry.relative || 'pariente'})`;

    this.confirmDialog
      .open({
        title: 'Anular antecedente',
        message: `¿Deseas anular el antecedente "${condition.name}: ${scopeLabel}"? Esta acción no se puede deshacer.`,
        tone: 'danger',
        confirmLabel: 'Anular',
      })
      .subscribe((res) => {
        if (res.confirmed) {
          this.historyStore.voidEntry(condition.id, entry.id).subscribe({
            error: () => {},
          });
        }
      });
  }

  onMedicationChange(val: string): void {
    this.historyStore.updateMedication(val).subscribe({
      error: () => {},
    });
  }

  onNoKnownHistoryChange(val: boolean): void {
    this.historyStore.setNoKnownHistory(val).subscribe({
      error: () => {},
    });
  }
}

