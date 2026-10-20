import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArrowLeft, FileText, Printer } from 'lucide-angular';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { chunkTreatmentSessionsForSheets, formatClinicDate } from '../../domain/form-033';
import { Form033SheetComponent } from '../../components/form-033/form-033-sheet/form-033-sheet.component';
import { Form033IdentificationComponent } from '../../components/form-033/form-033-identification/form-033-identification.component';
import { Form033AnamnesisComponent } from '../../components/form-033/form-033-anamnesis/form-033-anamnesis.component';
import { Form033ExamComponent } from '../../components/form-033/form-033-exam/form-033-exam.component';
import { Form033OralHealthComponent } from '../../components/form-033/form-033-oral-health/form-033-oral-health.component';
import { Form033PlansDiagnosesComponent } from '../../components/form-033/form-033-plans-diagnoses/form-033-plans-diagnoses.component';
import { Form033TreatmentComponent } from '../../components/form-033/form-033-treatment/form-033-treatment.component';
import { Form033Store } from '../../services/form-033.store';

@Component({
  selector: 'bd-form-033-page',
  standalone: true,
  imports: [
    RouterLink,
    AlertComponent,
    EmptyStateComponent,
    IconComponent,
    SkeletonComponent,
    Form033SheetComponent,
    Form033IdentificationComponent,
    Form033AnamnesisComponent,
    Form033ExamComponent,
    Form033OralHealthComponent,
    Form033PlansDiagnosesComponent,
    Form033TreatmentComponent,
  ],
  providers: [Form033Store],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form033-page">
      <!-- 1. Barra de herramientas exterior -->
      <nav class="form033-page__toolbar" aria-label="Herramientas del formulario">
        <div class="form033-page__toolbar-left">
          <a
            class="btn btn-outline form033-page__back-btn"
            [routerLink]="['/pacientes', store.patientId()]"
            aria-label="Volver a la ficha del paciente"
          >
            <bd-icon [name]="arrowLeftIcon" [size]="18" />
            <span>Volver a la ficha</span>
          </a>
        </div>

        @if (!store.loading() && !store.error() && store.sessions().length > 0) {
          <div class="form033-page__toolbar-right">
            <label for="form033-session-select" class="form033-page__select-label">
              Atención de referencia:
            </label>
            <select
              id="form033-session-select"
              class="input form033-page__session-select"
              [value]="store.selectedSessionNumber()"
              (change)="onSessionChange($event)"
            >
              @for (sess of store.sessions(); track sess.encounterId) {
                <option [value]="sess.sessionNumber">
                  {{ sessionOptionLabel(sess.sessionNumber, sess.startAt) }}
                </option>
              }
            </select>

            <button
              type="button"
              class="btn btn-primary form033-page__print-btn"
              (click)="printForm()"
              aria-label="Imprimir formulario 033"
            >
              <bd-icon [name]="printerIcon" [size]="18" />
              <span>Imprimir</span>
            </button>
          </div>
        }
      </nav>

      <!-- 2. Estados de Carga y Error -->
      @if (store.loading()) {
        <div class="form033-page__skeleton" aria-busy="true">
          <bd-skeleton height="3rem" width="100%" />
          <bd-skeleton height="20rem" width="100%" />
          <bd-skeleton height="20rem" width="100%" />
        </div>
      } @else if (store.error(); as err) {
        <div class="form033-page__error">
          <bd-alert variant="error" [message]="err">
            <button type="button" class="btn btn-primary" (click)="retryLoad()">Reintentar</button>
          </bd-alert>
        </div>
      } @else if (store.hasNoSessions()) {
        <div class="form033-page__empty">
          <bd-empty-state
            [icon]="fileTextIcon"
            title="Este paciente aún no tiene atenciones"
            description="El 033 se llena desde la primera atención."
          >
            <a [routerLink]="['/pacientes', store.patientId()]" class="btn btn-primary">
              Volver a la ficha
            </a>
          </bd-empty-state>
        </div>
      } @else {
        @if (store.referenceEncounterError(); as encounterError) {
          <div class="form033-page__alert">
            <bd-alert variant="error" [message]="'No se pudo cargar la atención de referencia: ' + encounterError" />
          </div>
        }

        <!-- 3. Contenedor para las hojas A4 fijas -->
        <section class="form033-page__viewport" tabindex="0" aria-label="Vista del documento Formulario 033">
          <!-- Hoja 1: Odontología (1) -->
          <bd-form-033-sheet [pageNumber]="1">
            <bd-form-033-identification
              [clinicName]="store.clinicalSummary()?.clinicName ?? 'Bellidental'"
              [firstName]="store.patient()?.firstName ?? ''"
              [lastName]="store.patient()?.lastName ?? ''"
              [sex]="store.patient()?.sex ?? ''"
              [age]="store.ageAtReference()"
              [recordNumber]="store.clinicalRecord()?.recordNumber ?? ''"
              [ageMarks]="store.ageGroupMarks()"
            />

            <bd-form-033-anamnesis
              [chiefComplaint]="store.referenceEncounter()?.chiefComplaint ?? ''"
              [currentIllness]="store.referenceEncounter()?.currentIllness ?? ''"
              [conditions]="store.conditions()"
              [historyMarks]="store.historyMarksAndLines().conditionMarks"
              [historyLines]="store.historyMarksAndLines().lines"
            />

            <bd-form-033-exam
              [vitalSigns]="store.vitalSigns()"
              [stomatognathicExam]="store.referenceEncounter()?.stomatognathicExam ?? ''"
              [markedRegions]="store.markedRegions()"
            />

            <bd-form-033-oral-health
              [odontogram]="store.odontogram()"
              [catalog]="store.catalog()"
              [oralHealthMarks]="store.oralHealthMarks()"
            />
          </bd-form-033-sheet>

          <!-- Hojas 2+: Odontología (2) - Secciones 10, 11 y 12; las sesiones se reparten por renglones -->
          @for (sessions of treatmentSheets(); track $index; let sheetIndex = $index) {
            <bd-form-033-sheet [pageNumber]="2" [startsNewPage]="true">
              <bd-form-033-plans-diagnoses
                [sheetNumber]="sheetIndex + 1"
                [planMarks]="store.planMarksAndLines().marks"
                [planLines]="store.planMarksAndLines().lines"
                [diagnoses]="store.first4Diagnoses()"
                [openedAt]="store.clinicalSummary()?.openedAt ?? ''"
                [professionalName]="store.referenceProfessional()?.fullName ?? ''"
                [licenseNumber]="store.referenceProfessional()?.licenseNumber ?? ''"
              />

              <bd-form-033-treatment [sessions]="sessions" />
            </bd-form-033-sheet>
          }
        </section>
      }
    </div>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .form033-page {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-height: 100%;
      box-sizing: border-box;
      gap: var(--space-md);
      padding: var(--space-md);
      background-color: var(--color-bg);
    }

    .form033-page__toolbar {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-sm);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-sm) var(--space-md);
      box-shadow: var(--shadow-sm);
    }

    .form033-page__back-btn {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .form033-page__toolbar-right {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-xs);
    }

    .form033-page__select-label {
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--color-text);
    }

    .form033-page__session-select {
      width: 100%;
      min-height: 44px;
      font-size: var(--fs-sm);
      padding: 0 var(--space-sm);
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background-color: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
    }

    .form033-page__print-btn {
      width: 100%;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-xs);
    }

    @include bp.bp-up(sm) {
      .form033-page__toolbar {
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
      }

      .form033-page__toolbar-right {
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
      }

      .form033-page__session-select {
        width: auto;
      }

      .form033-page__print-btn {
        width: auto;
      }
    }

    .form033-page__viewport {
      width: 100%;
      overflow-x: auto;
      overflow-y: visible;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-xl);
      padding: var(--space-md) 0 var(--space-2xl) 0;
      outline: none;
    }

    .form033-page__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      max-width: 60rem;
      margin: 0 auto;
      width: 100%;
    }

    .form033-page__alert {
      max-width: 40rem;
      width: 100%;
      margin: 0 auto;
    }

    .form033-page__error,
    .form033-page__empty {
      max-width: 40rem;
      margin: var(--space-xl) auto;
      width: 100%;
    }

    @media print {
      .form033-page {
        padding: 0 !important;
        margin: 0 !important;
        background: transparent !important;
        gap: 0 !important;
        width: 100% !important;
        display: block !important;
      }

      .form033-page__toolbar {
        display: none !important;
      }

      .form033-page__viewport {
        display: block !important;
        overflow: visible !important;
        padding: 0 !important;
        margin: 0 !important;
        gap: 0 !important;
        width: 100% !important;
      }
    }
  `,
})
export class Form033Page implements OnInit {
  readonly store = inject(Form033Store);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly arrowLeftIcon = ArrowLeft;
  readonly fileTextIcon = FileText;
  readonly printerIcon = Printer;

  readonly treatmentSheets = computed(() => chunkTreatmentSessionsForSheets(this.store.sessions()));

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const patientId = params.get('id');
      if (patientId) {
        const querySesion = this.route.snapshot.queryParamMap.get('sesion');
        const sessionNum = querySesion ? Number(querySesion) : null;
        this.store.load(patientId, sessionNum);
      }
    });
  }

  onSessionChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const num = Number(target.value);
    if (!isNaN(num)) {
      this.store.selectSession(num);
    }
  }

  sessionOptionLabel(sessionNumber: number, startAt: string): string {
    const suffix = sessionNumber === 1 ? ' · Apertura' : '';
    return `Sesión ${sessionNumber} · ${formatClinicDate(startAt)}${suffix}`;
  }

  printForm(): void {
    window.print();
  }

  retryLoad(): void {
    const patientId = this.store.patientId();
    if (patientId) {
      const querySesion = this.route.snapshot.queryParamMap.get('sesion');
      const sessionNum = querySesion ? Number(querySesion) : null;
      this.store.load(patientId, sessionNum);
    }
  }
}

