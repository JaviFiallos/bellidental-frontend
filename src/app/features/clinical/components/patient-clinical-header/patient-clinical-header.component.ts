import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Patient } from '../../../patients';
import { ClinicalRecord, HistoryEntry } from '../../models/clinical-record.models';

@Component({
  selector: 'bd-patient-clinical-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="patient-clinical-header" role="region" aria-label="Información clínica del paciente">
      <div class="patient-clinical-header__line1">
        <span class="patient-clinical-header__name">{{ patient().fullName }}</span>
        <span class="patient-clinical-header__sep" aria-hidden="true">·</span>
        <span class="patient-clinical-header__detail">{{ ageText() }}</span>
        <span class="patient-clinical-header__sep" aria-hidden="true">·</span>
        <span class="patient-clinical-header__detail">{{ documentText() }}</span>
        <span class="patient-clinical-header__sep" aria-hidden="true">·</span>
        <span class="patient-clinical-header__record">{{ recordText() }}</span>
      </div>

      <div class="patient-clinical-header__line2">
        <div class="patient-clinical-header__chips">
          @if (activeEntries().length > 0) {
            @for (entry of activeEntries(); track entry.id) {
              <span class="chip-alert">
                <span class="chip-alert__icon" aria-hidden="true">⚠</span>
                <span class="chip-alert__text">{{ formatEntry(entry) }}</span>
              </span>
            }
          } @else if (clinicalRecord()?.noKnownHistory) {
            <span class="chip-neutral">
              No refiere antecedentes
            </span>
          } @else {
            <span class="chip-warning">
              <span class="chip-warning__icon" aria-hidden="true">ℹ</span>
              Antecedentes sin registrar
            </span>
          }

          @if (clinicalRecord()?.currentMedication) {
            <span class="chip-medication">
              Medicación: {{ clinicalRecord()?.currentMedication }}
            </span>
          }
        </div>
      </div>
    </header>
  `,
  styles: `
    .patient-clinical-header {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
    }

    .patient-clinical-header__line1 {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--space-xs);
      font-size: var(--fs-sm);
      color: var(--slate-700);
    }

    .patient-clinical-header__name {
      font-size: var(--fs-md);
      font-weight: 700;
      color: var(--blue-950);
    }

    .patient-clinical-header__sep {
      color: var(--slate-400);
    }

    .patient-clinical-header__record {
      font-weight: 600;
      color: var(--slate-800);
    }

    .patient-clinical-header__line2 {
      overflow-x: auto;
      padding-bottom: 2px;
    }

    .patient-clinical-header__chips {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      white-space: nowrap;
    }

    .chip-alert {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-pill);
      font-size: var(--fs-xs);
      font-weight: 600;
      background-color: var(--coral-100);
      color: var(--coral-800);
      border: 1px solid var(--coral-300);
    }

    .chip-alert__icon {
      font-weight: 700;
    }

    .chip-neutral {
      display: inline-flex;
      align-items: center;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-pill);
      font-size: var(--fs-xs);
      font-weight: 500;
      background-color: var(--slate-100);
      color: var(--slate-600);
      border: 1px solid var(--slate-300);
    }

    .chip-warning {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-pill);
      font-size: var(--fs-xs);
      font-weight: 600;
      background-color: var(--gold-100);
      color: var(--gold-800);
      border: 1px solid var(--gold-300);
    }

    .chip-medication {
      display: inline-flex;
      align-items: center;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-pill);
      font-size: var(--fs-xs);
      font-weight: 500;
      background-color: var(--blue-100);
      color: var(--blue-900);
      border: 1px solid var(--blue-300);
    }
  `,
})
export class PatientClinicalHeaderComponent {
  readonly patient = input.required<Patient>();
  readonly clinicalRecord = input<ClinicalRecord | null>(null);

  readonly ageText = computed(() => {
    const age = this.patient().age;
    return age !== null && age !== undefined ? `${age} años` : '';
  });

  readonly documentText = computed(() => {
    const p = this.patient();
    return `${p.documentType} ${p.documentNumber}`;
  });

  readonly recordText = computed(() => {
    return this.clinicalRecord()?.recordNumber || '';
  });

  readonly activeEntries = computed<HistoryEntry[]>(() => {
    const entries = this.clinicalRecord()?.historyEntries || [];
    return entries.filter((e) => e.active);
  });

  formatEntry(entry: HistoryEntry): string {
    if (entry.scope === 'PERSONAL') {
      return entry.conditionName === 'Otro' && entry.description
        ? entry.description
        : entry.conditionName;
    }
    return entry.relative
      ? `${entry.conditionName} (${entry.relative})`
      : entry.conditionName;
  }
}
