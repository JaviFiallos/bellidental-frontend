import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import { CompleteBarComponent } from '../../components/complete-bar/complete-bar.component';
import { DiagnosisListComponent } from '../../components/diagnosis-list/diagnosis-list.component';
import { EncounterNotesComponent } from '../../components/encounter-notes/encounter-notes.component';
import { PatientClinicalHeaderComponent } from '../../components/patient-clinical-header/patient-clinical-header.component';
import { Diagnosis, DiagnosisCertainty } from '../../models/encounter.models';
import { EncounterStore } from '../../services/encounter.store';

@Component({
  selector: 'bd-encounter-page',
  standalone: true,
  imports: [
    RouterLink,
    AlertComponent,
    SkeletonComponent,
    PatientClinicalHeaderComponent,
    EncounterNotesComponent,
    DiagnosisListComponent,
    CompleteBarComponent,
    ClinicDatePipe,
    ClinicTimePipe,
  ],
  providers: [EncounterStore],
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
          />

          <!-- 2. Motivo y enfermedad actual -->
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

          <!-- 3. Diagnósticos -->
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

          <!-- 4. Franja baja reservada para el odontograma -->
          <section class="encounter-page__odontogram-placeholder" aria-label="Odontograma">
            <span class="odontogram-placeholder__icon" aria-hidden="true">🦷</span>
            <span class="odontogram-placeholder__text">
              El odontograma se agrega en la próxima versión
            </span>
          </section>
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
      }
    </div>
  `,
  styles: `
    .encounter-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      padding-bottom: 5.5rem; /* Espacio para que la barra fija no tape el contenido */
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

    .encounter-page__odontogram-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
      background-color: var(--slate-100);
      border: 1px dashed var(--slate-300);
      border-radius: var(--radius-md);
      color: var(--slate-600);
      font-size: var(--fs-xs);
    }

    .odontogram-placeholder__icon {
      font-size: 1rem;
    }

    .encounter-page__return-btn {
      margin-left: var(--space-sm);
    }
  `,
})
export class EncounterPage implements OnInit {
  readonly store = inject(EncounterStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);

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
}
