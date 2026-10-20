import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileText } from 'lucide-angular';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Patient } from '../../../patients';
import { ClinicalRecord, HistoryEntry } from '../../models/clinical-record.models';

@Component({
  selector: 'bd-patient-clinical-header',
  standalone: true,
  imports: [RouterLink, IconComponent],
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

          <!-- Botón de antecedentes -->
          @if (isUnregistered()) {
            <button
              type="button"
              class="btn-history-warning"
              aria-haspopup="dialog"
              (click)="openHistory.emit()"
            >
              Registrar antecedentes
            </button>
          } @else {
            <button
              type="button"
              class="btn-history-secondary"
              aria-haspopup="dialog"
              (click)="openHistory.emit()"
            >
              Antecedentes
            </button>
          }

          <!-- Enlace Formulario 033 -->
          <a
            class="btn-form-033"
            [routerLink]="['/pacientes', patient().id, '033']"
            aria-label="Ver Formulario 033"
          >
            <bd-icon [name]="fileTextIcon" [size]="16" />
            <span>Formulario 033</span>
          </a>
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
      color: var(--slate-600);
    }

    .patient-clinical-header__name {
      font-size: var(--fs-md);
      font-weight: 700;
      color: var(--blue-950);
    }

    .patient-clinical-header__sep {
      color: var(--slate-500);
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
      color: var(--coral-700);
      border: 1px solid color-mix(in srgb, var(--coral-500) 45%, var(--coral-100));
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
      color: var(--gold-700);
      border: 1px solid color-mix(in srgb, var(--gold-400) 40%, var(--gold-100));
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

    .btn-history-warning {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 var(--space-sm);
      border-radius: var(--radius-sm);
      font-size: var(--fs-xs);
      font-weight: 600;
      background-color: var(--gold-100);
      color: var(--gold-700);
      border: 1px solid var(--gold-400);
      cursor: pointer;
      transition: background-color var(--transition-fast), border-color var(--transition-fast);

      &:hover {
        background-color: color-mix(in srgb, var(--gold-400) 30%, var(--gold-100));
        border-color: var(--gold-600);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
      }
    }

    .btn-history-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 var(--space-sm);
      border-radius: var(--radius-sm);
      font-size: var(--fs-xs);
      font-weight: 600;
      background-color: var(--white);
      color: var(--slate-600);
      border: 1px solid var(--slate-300);
      cursor: pointer;
      transition: background-color var(--transition-fast), border-color var(--transition-fast);

      &:hover {
        background-color: var(--slate-50);
        border-color: var(--slate-500);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
      }
    }

    .btn-form-033 {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-xs);
      min-height: 44px;
      padding: 0 var(--space-sm);
      border-radius: var(--radius-sm);
      font-size: var(--fs-xs);
      font-weight: 600;
      background-color: var(--white);
      color: var(--blue-800);
      border: 1px solid var(--blue-300);
      text-decoration: none;
      cursor: pointer;
      transition: background-color var(--transition-fast), border-color var(--transition-fast);

      &:hover {
        background-color: var(--blue-50);
        border-color: var(--blue-500);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
      }
    }
  `,

})
export class PatientClinicalHeaderComponent {
  readonly patient = input.required<Patient>();
  readonly clinicalRecord = input<ClinicalRecord | null>(null);

  readonly openHistory = output<void>();

  readonly fileTextIcon = FileText;

  readonly isUnregistered = computed<boolean>(() => {
    const rec = this.clinicalRecord();
    if (!rec) return true;
    const hasActive = (rec.historyEntries || []).some((e) => e.active);
    return !hasActive && !rec.noKnownHistory;
  });

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

