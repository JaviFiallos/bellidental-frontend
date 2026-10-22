import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionStore } from '../../../../core/auth/session.store';
import { AuditHistoryDialogService } from '../../../management';
import { PaymentDialogService } from '../../../billing';
import { NotificationService } from '../../../../core/services/notification.service';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog';
import { SideSheetComponent } from '../../../../shared/components/side-sheet/side-sheet.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { ClinicTimePipe } from '../../../../shared/pipes/clinic-time.pipe';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import {
  CreateFindingRequest,
  Finding,
  getConditionName,
  getFindingWhere,
  OdontogramComponent,
  OdontogramStore,
} from '../../../odontogram';
import {
  DiagnosisOption,
  FindingOption,
  PerformedTreatment,
  RecordTreatmentRequest,
  TreatmentsSectionComponent,
  TreatmentsStore,
} from '../../../treatments';
import {
  Prescription,
  PrescriptionEditorComponent,
  PrescriptionHeaderDraft,
  PrescriptionsSectionComponent,
  PrescriptionsStore,
} from '../../../prescriptions';
import { CompleteBarComponent } from '../../components/complete-bar/complete-bar.component';
import { DiagnosisListComponent } from '../../components/diagnosis-list/diagnosis-list.component';
import { EncounterExtraComponent } from '../../components/encounter-extra/encounter-extra.component';
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
    TreatmentsSectionComponent,
    PrescriptionsSectionComponent,
    PrescriptionEditorComponent,
    EncounterExtraComponent,
    CompleteBarComponent,
    SideSheetComponent,
    HistoryPanelComponent,
    ClinicDatePipe,
    ClinicTimePipe,
    MoneyPipe,
  ],
  providers: [EncounterStore, HistoryPanelStore, OdontogramStore, TreatmentsStore, PrescriptionsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="encounter-page">
      <!-- Navegación superior -->
      <nav class="encounter-page__nav" aria-label="Navegación del consultorio">
        <a routerLink="/consultorio" class="encounter-page__back-link">
          ← Mis citas
        </a>
        @if (canChargeCompleted()) {
          <button
            type="button"
            class="btn btn-outline btn-sm encounter-page__header-charge-btn"
            (click)="onOpenChargeDialog()"
          >
            Cobrar
          </button>
        }
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
            [canViewChanges]="isDirector()"
            (openHistory)="historyStore.open()"
            (viewChanges)="onOpenChangesHistory()"
          />

          <!-- 2. Odontograma vigente (solo lectura) -->
          <section class="card encounter-page__odontogram-card" aria-label="Odontograma">
            <div class="encounter-page__odontogram-header">
              <h3 class="encounter-page__odontogram-title">Odontograma</h3>
            </div>

            @if (odontogramStore.loading() && !odontogramStore.odontogram()) {
              <bd-skeleton height="24rem" width="100%" />
            } @else if (odontogramStore.error() && !odontogramStore.odontogram()) {
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
                [editable]="odontogramEditable()"
                [canVoid]="odontogramCanVoid()"
                [encounterFindingIds]="odontogramStore.encounterFindingIds()"
                [saving]="odontogramStore.saving()"
                [actionError]="odontogramStore.actionError()"
                [lastAction]="odontogramStore.lastAction()"
                (registerFinding)="onRegisterFinding($event)"
                (voidFinding)="onVoidFinding($event)"
                (treatFinding)="onTreatFinding($event)"
                (toothActivate)="treatmentsStore.selectTooth($event)"
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

          <!-- 4b. Tratamientos: catálogo, registro, total y anulación -->
          <div #treatmentsBlock>
          <bd-treatments-section
            [diagnoses]="diagnosisOptions()"
            [pendingFindings]="pendingFindingOptions()"
            [selectedFindingId]="treatmentsStore.selectedFindingId()"
            [isReadOnly]="store.isReadOnly()"
            [items]="treatmentsStore.items()"
            [isLoading]="treatmentsStore.loading()"
            [loadError]="treatmentsStore.loadError()"
            [sessionTotal]="treatmentsStore.sessionTotal()"
            [actionError]="treatmentsStore.actionError()"
            [voiding]="treatmentsStore.voiding()"
            [query]="treatmentsStore.query()"
            [results]="treatmentsStore.results()"
            [catalogLoading]="treatmentsStore.catalogLoading()"
            [catalogError]="treatmentsStore.catalogError()"
            [selectedTreatment]="treatmentsStore.selectedTreatment()"
            [selectedTooth]="treatmentsStore.selectedTooth()"
            [saving]="treatmentsStore.saving()"
            [saveError]="treatmentsStore.saveError()"
            (catalogRequest)="treatmentsStore.ensureCatalog()"
            (queryChange)="treatmentsStore.setQuery($event)"
            (pick)="treatmentsStore.pickTreatment($event)"
            (cancel)="treatmentsStore.clearSelection()"
            (findingChange)="treatmentsStore.selectFinding($event)"
            (register)="onRegisterTreatment($event)"
            (voidRequest)="onVoidTreatment($event)"
            (retryLoad)="treatmentsStore.reload()"
          />
          </div>

          <!-- 4c. Receta: lista de la atención y borrador en el editor lateral -->
          <bd-prescriptions-section
            [prescriptions]="prescriptionsStore.prescriptions()"
            [isLoading]="prescriptionsStore.loading()"
            [loadError]="prescriptionsStore.loadError()"
            [canCreate]="prescriptionsCanCreate()"
            [canUpdate]="prescriptionsCanUpdate()"
            [hasDiagnoses]="diagnosisOptions().length > 0"
            [actionError]="prescriptionsStore.actionError()"
            [busyPrescriptionId]="prescriptionsStore.busyPrescriptionId()"
            [pendingPdfId]="prescriptionsStore.pendingPdf()?.prescriptionId ?? null"
            (newPrescription)="prescriptionsStore.openNew()"
            (editPrescription)="prescriptionsStore.openEdit($event)"
            (emitPrescription)="onEmitPrescription($event)"
            (printPrescription)="onPrintPrescription($event)"
            (openPendingPdf)="prescriptionsStore.openPendingPdf()"
            (voidPrescription)="onVoidPrescription($event)"
            (redoPrescription)="onRedoPrescription($event)"
            (retryLoad)="prescriptionsStore.reload()"
          />

          <!-- 5. Más del 033: signos vitales, examen, indicadores y planes (plegado) -->
          <bd-encounter-extra
            [encounter]="store.encounter()!"
            [missingSections]="store.missing033()"
            [isReadOnly]="store.isReadOnly()"
            [saveStatus]="store.saveStatus()"
            [saveErrorMessage]="store.saveErrorMessage()"
            (vitalSignChange)="store.setVitalSign($event.field, $event.value)"
            (indicatorChange)="store.setExtraField($event.field, $event.value)"
            (textChange)="store.setExtraField($event.field, $event.value)"
            (regionToggle)="store.toggleStomatognathicRegion($event)"
            (examToggle)="store.toggleDiagnosticExam($event)"
            (retrySave)="store.retrySave()"
          />
        </main>

        <!-- Aviso de cobro de sesión -->
        @if (chargeNotice(); as notice) {
          <div class="encounter-page__charge-notice" role="status">
            <span class="encounter-page__charge-notice-text">
              Total de la sesión: <strong>{{ notice.total | money }}</strong>
            </span>
            <div class="encounter-page__charge-notice-actions">
              <button
                type="button"
                class="btn btn-primary btn-sm"
                (click)="onChargeNow()"
              >
                Cobrar ahora
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                (click)="onChargeLater()"
              >
                Después
              </button>
            </div>
          </div>
        }

        <!-- 6. Barra de completar fija abajo -->
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

        <!-- 7. Panel lateral de antecedentes con bd-side-sheet -->
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

        <!-- 8. Editor de receta en panel lateral (pantalla completa bajo md) -->
        <bd-side-sheet
          [isOpen]="prescriptionsStore.editorOpen()"
          [fullscreenBelowMd]="true"
          titleId="prescription-editor-title"
          (closed)="prescriptionsStore.closeEditor()"
        >
          @if (prescriptionsStore.editorOpen()) {
            <bd-prescription-editor
              [diagnoses]="diagnosisOptions()"
              [prescription]="prescriptionsStore.editing()"
              [items]="prescriptionsStore.items()"
              [editingItem]="prescriptionsStore.editingItem()"
              [editingItemIndex]="prescriptionsStore.editingItemIndex()"
              [medications]="prescriptionsStore.medicationResults()"
              [isSearching]="prescriptionsStore.medicationSearching()"
              [searchError]="prescriptionsStore.medicationSearchError()"
              [saving]="prescriptionsStore.saving()"
              [saveError]="prescriptionsStore.saveError()"
              [copiedFrom]="prescriptionsStore.copiedFrom()"
              (medicationQueryChange)="prescriptionsStore.searchMedications($event)"
              (addItem)="prescriptionsStore.upsertItem($event)"
              (editItem)="prescriptionsStore.editItem($event)"
              (removeItem)="prescriptionsStore.removeItem($event)"
              (cancelItemEdit)="prescriptionsStore.cancelItemEdit()"
              (save)="onSavePrescription($event)"
              (saveAndEmit)="onSaveAndEmitPrescription($event)"
              (close)="prescriptionsStore.closeEditor()"
            />
          }
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
      justify-content: space-between;
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

    .encounter-page__charge-notice {
      position: sticky;
      bottom: 4.5rem;
      z-index: 20;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      background-color: var(--blue-900);
      color: var(--white);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      margin: 0 var(--space-md) var(--space-sm) var(--space-md);
    }

    .encounter-page__charge-notice-text {
      font-size: var(--fs-sm);
    }

    .encounter-page__charge-notice-actions {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .encounter-page__charge-notice-actions .btn-ghost {
      color: var(--white);
    }

    .encounter-page__header-charge-btn {
      margin-inline-start: auto;
    }
  `,
})
export class EncounterPage implements OnInit {
  readonly store = inject(EncounterStore);
  readonly historyStore = inject(HistoryPanelStore);
  readonly odontogramStore = inject(OdontogramStore);
  readonly treatmentsStore = inject(TreatmentsStore);
  readonly prescriptionsStore = inject(PrescriptionsStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly auditHistory = inject(AuditHistoryDialogService);
  private readonly paymentDialog = inject(PaymentDialogService);

  readonly isDirector = computed<boolean>(() => this.sessionStore.profile() === 'DIRECTOR');
  readonly chargeNotice = signal<{ total: number } | null>(null);

  readonly canChargeCompleted = computed<boolean>(() => {
    return this.store.isCompleted() && this.sessionStore.hasPermission('BILLING_CREATE');
  });

  readonly odontogramEditable = computed<boolean>(() => {
    return !this.store.isReadOnly() && this.sessionStore.hasPermission('RECORD_CREATE');
  });

  readonly odontogramCanVoid = computed<boolean>(() => {
    return this.sessionStore.hasPermission('RECORD_UPDATE');
  });

  /** Recetar: solo con permiso de crear y atención editable (no solo lectura ni anulada). */
  readonly prescriptionsCanCreate = computed<boolean>(() => {
    return !this.store.isReadOnly() && this.sessionStore.hasPermission('RECORD_CREATE');
  });

  readonly prescriptionsCanUpdate = computed<boolean>(() => {
    return !this.store.isReadOnly() && this.sessionStore.hasPermission('RECORD_UPDATE');
  });

  readonly treatmentsSection = viewChild(TreatmentsSectionComponent);
  readonly treatmentsBlock = viewChild<ElementRef<HTMLElement>>('treatmentsBlock');

  /** Hallazgos pendientes del paciente, en el formato que pide la sección de tratamientos. */
  readonly pendingFindingOptions = computed<FindingOption[]>(() => {
    const catalog = this.odontogramStore.catalog();
    return this.odontogramStore
      .findings()
      .filter((finding) => finding.status === 'PENDING')
      .map((finding) => ({
        id: finding.id,
        toothCode: finding.toothCode,
        surfaceCode: finding.surfaceCode,
        label: `${finding.toothCode} · ${finding.surfaceLabel ?? getFindingWhere(finding)} · ${getConditionName(finding, catalog)}`,
      }));
  });

  readonly diagnosisOptions = computed<DiagnosisOption[]>(() => {
    return this.store.activeDiagnoses().map((diagnosis) => ({
      id: diagnosis.id,
      label: `${diagnosis.code} · ${diagnosis.description}`,
    }));
  });

  private lastLoadedPatientId: string | null = null;

  constructor() {
    effect(() => {
      const enc = this.store.encounter();
      const patientId = enc?.patientId;
      if (patientId && patientId !== this.lastLoadedPatientId) {
        this.lastLoadedPatientId = patientId;
        this.odontogramStore.load(patientId, enc.id);
      }
    });
  }

  ngOnInit(): void {
    const encounterId = this.route.snapshot.paramMap.get('encounterId');
    if (encounterId) {
      this.store.load(encounterId);
      this.treatmentsStore.load(encounterId);
      this.prescriptionsStore.load(encounterId);
    }
  }

  onOpenChangesHistory(): void {
    const encounterId = this.route.snapshot.paramMap.get('encounterId');
    if (!encounterId) return;
    this.auditHistory.open({
      entity: 'encounters',
      id: encounterId,
      title: 'Historial de cambios de la atención',
      isEncounterFull: true,
    });
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
    const sessionTotal = this.treatmentsStore.sessionTotal();
    const canCreateBilling = this.sessionStore.hasPermission('BILLING_CREATE');

    this.store.complete().subscribe({
      next: () => {
        this.notificationService.success('Atención completada');
        if (canCreateBilling && sessionTotal > 0) {
          this.chargeNotice.set({ total: sessionTotal });
        } else {
          this.router.navigate(['/consultorio']);
        }
      },
      error: () => {},
    });
  }

  onChargeNow(): void {
    const encounter = this.store.encounter();
    const patient = this.store.patient();
    if (!encounter || !patient) return;

    this.paymentDialog
      .open({
        patientId: patient.id,
        patientName: patient.fullName,
        encounterId: encounter.id,
      })
      .subscribe(() => {
        this.chargeNotice.set(null);
        this.router.navigate(['/consultorio']);
      });
  }

  onChargeLater(): void {
    this.chargeNotice.set(null);
    this.router.navigate(['/consultorio']);
  }

  onOpenChargeDialog(): void {
    const encounter = this.store.encounter();
    const patient = this.store.patient();
    if (!encounter || !patient) return;

    this.paymentDialog.open({
      patientId: patient.id,
      patientName: patient.fullName,
      encounterId: encounter.id,
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

  onRegisterTreatment(request: RecordTreatmentRequest): void {
    const linksPendingFinding =
      !!request.dentalFindingId &&
      this.pendingFindingOptions().some((option) => option.id === request.dentalFindingId);

    this.treatmentsStore.record(request).subscribe({
      next: () => {
        this.notificationService.success('Tratamiento registrado');
        // El backend crea el hallazgo realizado: el odontograma se pide de nuevo para pintarlo en azul.
        if (linksPendingFinding) {
          this.odontogramStore.reload();
        }
        this.treatmentsSection()?.focusSearch();
      },
      error: () => {},
    });
  }

  /** "Tratar" en el panel de la pieza: preselecciona el hallazgo, lleva a Tratamientos y enfoca el buscador. */
  onTreatFinding(finding: Finding): void {
    this.treatmentsStore.selectFinding(finding.id);

    // Diferido: el panel de la pieza se cierra en el siguiente ciclo y cambia la altura de la página.
    setTimeout(() => {
      const block = this.treatmentsBlock()?.nativeElement;
      const reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (block && typeof block.scrollIntoView === 'function') {
        block.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
      this.treatmentsSection()?.focusSearch();
    });
  }

  onVoidTreatment(item: PerformedTreatment): void {
    this.confirmDialog
      .open({
        title: 'Anular tratamiento',
        message: `${item.treatmentCode} · ${item.treatmentName} dejará de contar en el total de la sesión.`,
        tone: 'danger',
        confirmLabel: 'Anular',
        reasonLabel: 'Motivo de la anulación',
        reasonRequired: true,
      })
      .subscribe((result) => {
        if (!result.confirmed || !result.reason) return;

        this.treatmentsStore.void(item, result.reason.trim()).subscribe({
          next: (message) => this.notificationService.success(message || 'Tratamiento anulado'),
          error: () => {},
        });
      });
  }

  onSavePrescription(draft: PrescriptionHeaderDraft): void {
    this.prescriptionsStore.save(draft.encounterDiagnosisId, draft.generalInstructions).subscribe({
      next: () => this.notificationService.success('Receta guardada como borrador'),
      error: () => {},
    });
  }

  /** Guarda, emite y abre el PDF. La pestaña se abre en este clic (dentro del store). */
  onSaveAndEmitPrescription(draft: PrescriptionHeaderDraft): void {
    this.prescriptionsStore.saveAndEmit(draft.encounterDiagnosisId, draft.generalInstructions).subscribe({
      next: () => this.notificationService.success('Receta emitida'),
      error: () => {},
    });
  }

  onEmitPrescription(prescription: Prescription): void {
    this.prescriptionsStore.emit(prescription).subscribe({
      next: () => this.notificationService.success('Receta emitida'),
      error: () => {},
    });
  }

  onPrintPrescription(prescription: Prescription): void {
    this.prescriptionsStore.print(prescription).subscribe({
      error: () => {},
    });
  }

  onVoidPrescription(prescription: Prescription): void {
    this.confirmDialog
      .open({
        title: 'Anular borrador',
        message: '¿Anular este borrador?',
        tone: 'danger',
        confirmLabel: 'Anular',
      })
      .subscribe((res) => {
        if (!res.confirmed) return;
        this.prescriptionsStore.voidPrescription(prescription).subscribe({
          next: () => this.notificationService.success('Receta anulada'),
          error: () => {},
        });
      });
  }

  onRedoPrescription(prescription: Prescription): void {
    this.confirmDialog
      .open({
        title: 'Anular y rehacer',
        message: 'La receta emitida quedará anulada y se abrirá un borrador con los mismos datos.',
        tone: 'danger',
        confirmLabel: 'Anular y rehacer',
      })
      .subscribe((res) => {
        if (!res.confirmed) return;
        this.prescriptionsStore.voidAndRedo(prescription).subscribe({
          next: () => this.notificationService.success('Receta anulada'),
          error: () => {},
        });
      });
  }

  onRegisterFinding(req: CreateFindingRequest): void {
    this.odontogramStore.register(req);
  }

  onVoidFinding(finding: Finding): void {
    const condName = getConditionName(finding, this.odontogramStore.catalog());
    const where = getFindingWhere(finding);

    this.confirmDialog
      .open({
        title: 'Anular hallazgo',
        message: `${condName} · ${where} quedará anulado en esta atención.`,
        tone: 'danger',
        confirmLabel: 'Anular',
      })
      .subscribe((res) => {
        if (res.confirmed) {
          this.odontogramStore.void(finding);
        }
      });
  }
}

