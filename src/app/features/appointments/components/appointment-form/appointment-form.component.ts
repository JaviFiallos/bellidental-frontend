import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { Patient } from '../../../patients';
import { Professional, Specialty } from '../../../professionals';
import { AvailableSlot } from '../../models/appointment.models';
import { AppointmentPatientFieldComponent } from '../appointment-patient-field/appointment-patient-field.component';
import { SlotPickerComponent } from '../slot-picker/slot-picker.component';

@Component({
  selector: 'bd-appointment-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    FieldComponent,
    AppointmentPatientFieldComponent,
    SlotPickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="appt-form" (submit)="onSubmit($event)">
      <!-- 1. Paciente -->
      <bd-appointment-patient-field
        #patientField
        [patient]="patient()"
        [patientQuery]="patientQuery()"
        [patientResults]="patientResults()"
        [patientLoading]="patientLoading()"
        [patientError]="patientError()"
        (queryChange)="patientQueryChange.emit($event)"
        (selected)="patientSelected.emit($event)"
        (clear)="onPatientClear()"
      />

      <!-- 2. Especialidad -->
      <bd-field
        label="Especialidad"
        fieldId="appt-specialty-select"
        [hint]="durationText()"
      >
        <select
          id="appt-specialty-select"
          class="input"
          [value]="selectedSpecialtyId() !== null ? selectedSpecialtyId() : ''"
          (change)="onSpecialtyChange($event)"
        >
          <option value="" disabled [selected]="selectedSpecialtyId() === null">
            Selecciona una especialidad
          </option>
          @for (spec of availableSpecialties(); track spec.id) {
            <option [value]="spec.id" [selected]="spec.id === selectedSpecialtyId()">{{ spec.name }}</option>
          }
        </select>
      </bd-field>

      <!-- 3. Profesional -->
      <bd-field
        label="Profesional"
        fieldId="appt-professional-select"
        [hint]="professionalHint()"
      >
        <select
          id="appt-professional-select"
          class="input"
          [value]="selectedProfessionalId()"
          (change)="onProfessionalChange($event)"
          [disabled]="selectedSpecialtyId() === null || availableProfessionals().length === 0"
        >
          <option value="" disabled [selected]="!selectedProfessionalId()">
            {{ selectedSpecialtyId() !== null ? 'Selecciona un profesional' : 'Elige una especialidad primero' }}
          </option>
          @for (prof of availableProfessionals(); track prof.id) {
            <option [value]="prof.id" [selected]="prof.id === selectedProfessionalId()">{{ prof.fullName }}</option>
          }
        </select>
      </bd-field>

      <!-- 4. Fecha -->
      <bd-field label="Fecha" fieldId="appt-date-input">
        <div class="appt-form__date-row">
          <input
            type="date"
            id="appt-date-input"
            class="input appt-form__date-input"
            [min]="minDate()"
            [value]="date()"
            (change)="onDateChange($event)"
          />
          <button
            type="button"
            class="btn btn-outline appt-form__quick-btn"
            (click)="todayClick.emit()"
          >
            Hoy
          </button>
          <button
            type="button"
            class="btn btn-outline appt-form__quick-btn"
            (click)="tomorrowClick.emit()"
          >
            Mañana
          </button>
        </div>
      </bd-field>

      <!-- 5. Hora -->
      <div class="appt-form__slot-section">
        <span id="appt-slot-label" class="appt-form__section-label">Hora</span>
        @if (notice()) {
          <p class="appt-form__notice" role="status">{{ notice() }}</p>
        }
        <bd-slot-picker
          [ariaLabelledby]="'appt-slot-label'"
          [slots]="slots()"
          [selectedSlot]="selectedSlot()"
          [loading]="slotsLoading()"
          [error]="slotsError()"
          [ready]="isSlotPickerReady()"
          (slotChange)="slotSelected.emit($event)"
          (nextDay)="nextDayClicked.emit()"
          (retry)="retrySlots.emit()"
        />
      </div>

      <!-- 6. Motivo (opcional) -->
      <bd-field label="Motivo (opcional)" fieldId="appt-reason-input">
        <input
          type="text"
          id="appt-reason-input"
          class="input"
          maxlength="255"
          placeholder="Ej. Control de ortodoncia, dolor..."
          [formControl]="reasonControl"
        />
      </bd-field>

      <!-- Errores de API -->
      @if (errorMessage()) {
        <div class="appt-form__error-box">
          <bd-alert variant="error" [message]="errorMessage()!" />
        </div>
      }

      <!-- Pie / Botón fijo -->
      <div class="appt-form__footer">
        <button
          type="submit"
          class="btn btn-primary appt-form__submit-btn"
          [disabled]="!canSubmit() || saving()"
        >
          @if (saving()) {
            <span>Agendando...</span>
          } @else {
            <span>Agendar cita</span>
          }
        </button>
      </div>
    </form>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .appt-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      padding-bottom: 5.5rem;
      position: relative;
    }

    .appt-form__date-row {
      display: flex;
      gap: var(--space-xs);
      align-items: center;
    }

    .appt-form__date-input {
      flex: 1;
      min-width: 0;
    }

    .appt-form__quick-btn {
      min-height: 44px;
      padding: 0 0.85rem;
      flex-shrink: 0;
    }

    .appt-form__slot-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .appt-form__section-label {
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--color-text);
    }

    .appt-form__notice {
      font-size: var(--fs-sm);
      color: var(--gold-700);
      margin: 0;
      padding: 0.25rem 0;
    }

    .appt-form__error-box {
      margin-top: var(--space-xs);
    }

    .appt-form__footer {
      position: sticky;
      bottom: 0;
      left: 0;
      right: 0;
      margin: var(--space-md) -1rem -1rem -1rem;
      padding: var(--space-md);
      background-color: var(--white);
      border-top: 1px solid var(--slate-200);
      box-shadow: 0 -4px 6px -1px color-mix(in srgb, var(--blue-950) 8%, transparent);
      z-index: 10;
    }

    .appt-form__submit-btn {
      width: 100%;
      min-height: 44px;
      font-weight: 600;
    }
  `,
})
export class AppointmentFormComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly patient = input<Patient | null>(null);
  readonly patientQuery = input<string>('');
  readonly patientResults = input<Patient[]>([]);
  readonly patientLoading = input<boolean>(false);
  readonly patientError = input<string | null>(null);

  readonly availableSpecialties = input<Specialty[]>([]);
  readonly selectedSpecialtyId = input<number | null>(null);
  readonly durationText = input<string | null>(null);

  readonly availableProfessionals = input<Professional[]>([]);
  readonly selectedProfessionalId = input<string>('');

  readonly minDate = input<string>('');
  readonly date = input<string>('');

  readonly slots = input<AvailableSlot[]>([]);
  readonly selectedSlot = input<AvailableSlot | null>(null);
  readonly slotsLoading = input<boolean>(false);
  readonly slotsError = input<string | null>(null);
  readonly isSlotPickerReady = input<boolean>(false);
  readonly notice = input<string | null>(null);

  readonly canSubmit = input<boolean>(false);
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly patientQueryChange = output<string>();
  readonly patientSelected = output<Patient>();
  readonly patientClear = output<void>();

  readonly specialtyChange = output<number | null>();
  readonly professionalChange = output<string>();
  readonly dateChange = output<string>();
  readonly todayClick = output<void>();
  readonly tomorrowClick = output<void>();

  readonly slotSelected = output<AvailableSlot>();
  readonly nextDayClicked = output<void>();
  readonly retrySlots = output<void>();

  readonly save = output<string | undefined>();

  readonly patientField = viewChild(AppointmentPatientFieldComponent);

  readonly reasonControl = this.fb.control('');

  readonly selectedProfessional = computed(() => {
    const id = this.selectedProfessionalId();
    return this.availableProfessionals().find((p) => p.id === id) || null;
  });

  readonly professionalHint = computed(() => {
    const prof = this.selectedProfessional();
    return prof ? prof.licenseNumber : null;
  });

  ngAfterViewInit(): void {
    this.focusPatientSearch();
  }

  focusPatientSearch(): void {
    this.patientField()?.focusSearch();
  }

  onPatientClear(): void {
    this.patientClear.emit();
    this.reasonControl.setValue('');
  }

  onSpecialtyChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.specialtyChange.emit(value ? Number(value) : null);
  }

  onProfessionalChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.professionalChange.emit(value);
  }

  onDateChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.dateChange.emit(value);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.canSubmit() || this.saving()) {
      return;
    }
    const reason = this.reasonControl.value.trim();
    this.save.emit(reason || undefined);
  }
}
