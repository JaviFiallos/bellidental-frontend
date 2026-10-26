import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { MedicationPreset, MedicationPresetRequest } from '../../models/prescription.models';

/**
 * Formulario presentacional para crear o editar una posología predefinida (plantilla).
 */
@Component({
  selector: 'bd-medication-preset-form',
  standalone: true,
  imports: [AlertComponent, FieldComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="preset-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <bd-field
        label="Etiqueta"
        fieldId="preset-label"
        [required]="true"
        [error]="labelError()"
        hint="Ej.: Cada 8 h × 7 días"
      >
        <input
          id="preset-label"
          class="input"
          type="text"
          autocomplete="off"
          formControlName="label"
          maxlength="60"
          [attr.aria-invalid]="labelError() !== null"
        />
      </bd-field>

      <bd-field
        label="Dosis"
        fieldId="preset-dose"
        [required]="true"
        [error]="doseError()"
        hint="Ej.: 500 mg, 1 cápsula"
      >
        <input
          id="preset-dose"
          class="input"
          type="text"
          autocomplete="off"
          formControlName="dose"
          maxlength="100"
          [attr.aria-invalid]="doseError() !== null"
        />
      </bd-field>

      <bd-field
        label="Frecuencia"
        fieldId="preset-frequency"
        [required]="true"
        [error]="frequencyError()"
        hint="Ej.: Cada 8 horas"
      >
        <input
          id="preset-frequency"
          class="input"
          type="text"
          autocomplete="off"
          formControlName="frequency"
          maxlength="100"
          [attr.aria-invalid]="frequencyError() !== null"
        />
      </bd-field>

      <bd-field
        label="Duración"
        fieldId="preset-duration"
        [required]="true"
        [error]="durationError()"
        hint="Ej.: Por 7 días"
      >
        <input
          id="preset-duration"
          class="input"
          type="text"
          autocomplete="off"
          formControlName="duration"
          maxlength="100"
          [attr.aria-invalid]="durationError() !== null"
        />
      </bd-field>

      <bd-field label="Indicaciones" fieldId="preset-instructions" hint="Opcional.">
        <textarea
          id="preset-instructions"
          class="input preset-form__textarea"
          rows="2"
          formControlName="instructions"
        ></textarea>
      </bd-field>

      @if (errorMessage(); as message) {
        <bd-alert variant="error" [message]="message" />
      }

      <div class="preset-form__actions">
        <button type="submit" class="btn btn-accent" [disabled]="saving()">
          {{ saving() ? 'Guardando…' : isEditing() ? 'Guardar cambios' : 'Guardar posología' }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="cancel.emit()">
          Cancelar
        </button>
      </div>
    </form>
  `,
  styles: `
    .preset-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      box-sizing: border-box;
    }

    .preset-form .input {
      min-height: 44px;
      width: 100%;
      box-sizing: border-box;
    }

    .preset-form__textarea {
      min-height: 4.5rem;
      padding: var(--space-xs) var(--space-sm);
      font-family: inherit;
      font-size: var(--fs-sm);
      resize: vertical;
    }

    .preset-form__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .preset-form__actions .btn {
      min-height: 44px;
    }
  `,
})
export class MedicationPresetFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  readonly preset = input<MedicationPreset | null>(null);
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly save = output<MedicationPresetRequest>();
  readonly cancel = output<void>();

  readonly isEditing = computed(() => this.preset() !== null);
  private readonly attempted = signal<boolean>(false);

  readonly form = this.formBuilder.nonNullable.group({
    label: ['', [Validators.required, Validators.maxLength(60)]],
    dose: ['', [Validators.required, Validators.maxLength(100)]],
    frequency: ['', [Validators.required, Validators.maxLength(100)]],
    duration: ['', [Validators.required, Validators.maxLength(100)]],
    instructions: [''],
  });

  ngOnInit(): void {
    const current = this.preset();
    if (!current) {
      return;
    }
    this.form.patchValue({
      label: current.label,
      dose: current.dose,
      frequency: current.frequency,
      duration: current.duration,
      instructions: current.instructions ?? '',
    });
  }

  labelError(): string | null {
    const control = this.form.controls.label;
    if (!this.showErrors(control.invalid, control.touched)) {
      return null;
    }
    return control.hasError('required') ? 'Escribe la etiqueta.' : 'Máximo 60 caracteres.';
  }

  doseError(): string | null {
    const control = this.form.controls.dose;
    if (!this.showErrors(control.invalid, control.touched)) {
      return null;
    }
    return control.hasError('required') ? 'Escribe la dosis.' : 'Máximo 100 caracteres.';
  }

  frequencyError(): string | null {
    const control = this.form.controls.frequency;
    if (!this.showErrors(control.invalid, control.touched)) {
      return null;
    }
    return control.hasError('required') ? 'Escribe la frecuencia.' : 'Máximo 100 caracteres.';
  }

  durationError(): string | null {
    const control = this.form.controls.duration;
    if (!this.showErrors(control.invalid, control.touched)) {
      return null;
    }
    return control.hasError('required') ? 'Escribe la duración.' : 'Máximo 100 caracteres.';
  }

  submit(): void {
    this.attempted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();
    const label = raw.label.trim();
    const dose = raw.dose.trim();
    const frequency = raw.frequency.trim();
    const duration = raw.duration.trim();
    const instructions = raw.instructions.trim();

    if (!label || !dose || !frequency || !duration) {
      return;
    }

    const request: MedicationPresetRequest = {
      label,
      dose,
      frequency,
      duration,
      ...(instructions ? { instructions } : {}),
    };

    this.save.emit(request);
  }

  private showErrors(invalid: boolean, touched: boolean): boolean {
    return invalid && (touched || this.attempted());
  }
}
