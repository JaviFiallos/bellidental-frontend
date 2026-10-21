import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Patient, PatientSearchComponent } from '../../../patients';

@Component({
  selector: 'bd-appointment-patient-field',
  standalone: true,
  imports: [PatientSearchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="appt-patient-field">
      <span id="appt-patient-label" class="appt-patient-field__label">Paciente</span>

      @if (patient()) {
        <div class="appt-patient-field__summary" role="group" aria-labelledby="appt-patient-label">
          <div class="appt-patient-field__info">
            <span class="appt-patient-field__text">
              {{ patient()?.fullName }} · {{ patient()?.documentNumber }}
            </span>
          </div>
          <button
            type="button"
            class="btn btn-outline appt-patient-field__change-btn"
            (click)="onChangePatient()"
          >
            Cambiar
          </button>
        </div>
      } @else {
        <div #searchContainer class="appt-patient-field__search">
          <app-patient-search
            [query]="patientQuery()"
            [results]="patientResults()"
            [isLoading]="patientLoading()"
            [errorMessage]="patientError()"
            [canRegister]="false"
            (queryChange)="queryChange.emit($event)"
            (selected)="selected.emit($event)"
          />
        </div>
      }
    </div>
  `,
  styles: `
    .appt-patient-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .appt-patient-field__label {
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--color-text);
    }

    .appt-patient-field__summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      background-color: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-sm);
      min-height: 48px;
      box-sizing: border-box;
    }

    .appt-patient-field__text {
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--slate-800);
    }

    .appt-patient-field__change-btn {
      min-height: 44px;
      padding: 0 0.85rem;
      font-size: var(--fs-xs);
    }
  `,
})
export class AppointmentPatientFieldComponent implements AfterViewInit {
  readonly patient = input<Patient | null>(null);
  readonly patientQuery = input<string>('');
  readonly patientResults = input<Patient[]>([]);
  readonly patientLoading = input<boolean>(false);
  readonly patientError = input<string | null>(null);

  readonly queryChange = output<string>();
  readonly selected = output<Patient>();
  readonly clear = output<void>();

  readonly searchContainer = viewChild<ElementRef<HTMLElement>>('searchContainer');

  ngAfterViewInit(): void {
    this.focusSearch();
  }

  focusSearch(): void {
    setTimeout(() => {
      const container = this.searchContainer()?.nativeElement;
      const inputEl = container?.querySelector('input');
      inputEl?.focus();
    }, 50);
  }

  onChangePatient(): void {
    this.clear.emit();
    setTimeout(() => this.focusSearch(), 50);
  }
}
