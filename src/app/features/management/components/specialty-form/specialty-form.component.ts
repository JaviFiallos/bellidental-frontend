import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { DEFAULT_DURATION_MINUTES, DURATION_OPTIONS_MINUTES, formatDuration } from '../../domain/catalog-display';
import { CatalogSpecialty, SpecialtyRequest } from '../../models/catalog.models';

/** Alta o edición de una especialidad. Presentacional: sale con `submitted` y `cancelled`. */
@Component({
  selector: 'bd-specialty-form',
  standalone: true,
  imports: [AlertComponent, FieldComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="specialty-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <bd-field label="Nombre" fieldId="specialty-name" [required]="true" [error]="nameError()">
        <input
          id="specialty-name"
          class="input"
          type="text"
          autocomplete="off"
          formControlName="name"
          [attr.aria-invalid]="nameError() !== null"
        />
      </bd-field>

      <bd-field
        label="Duración por defecto"
        fieldId="specialty-duration"
        [required]="true"
        hint="Se usa al agendar citas de esta especialidad."
      >
        <select id="specialty-duration" class="input" formControlName="defaultDurationMinutes">
          @for (minutes of durations; track minutes) {
            <option [ngValue]="minutes">{{ formatDuration(minutes) }}</option>
          }
        </select>
      </bd-field>

      @if (errorMessage(); as message) {
        <bd-alert variant="error" [message]="message" />
      }

      <div class="specialty-form__actions">
        <button type="submit" class="btn btn-accent" [disabled]="saving()">
          {{ saving() ? 'Guardando…' : specialty() ? 'Guardar cambios' : 'Crear especialidad' }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="cancelled.emit()">Cancelar</button>
      </div>
    </form>
  `,
  styles: `
    .specialty-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      box-sizing: border-box;
    }

    .specialty-form .input {
      min-height: 44px;
      width: 100%;
      box-sizing: border-box;
    }

    .specialty-form__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .specialty-form__actions .btn {
      min-height: 44px;
    }
  `,
})
export class SpecialtyFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  /** `null` = alta; con una especialidad = edición. */
  readonly specialty = input<CatalogSpecialty | null>(null);
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<SpecialtyRequest>();
  readonly cancelled = output<void>();

  readonly durations = DURATION_OPTIONS_MINUTES;
  readonly formatDuration = formatDuration;

  private readonly attempted = signal<boolean>(false);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    defaultDurationMinutes: [DEFAULT_DURATION_MINUTES, [Validators.required]],
  });

  ngOnInit(): void {
    const current = this.specialty();
    if (current) {
      this.form.patchValue({
        name: current.name,
        defaultDurationMinutes: current.defaultDurationMinutes,
      });
    }
  }

  nameError(): string | null {
    const control = this.form.controls.name;
    if (!control.invalid || !(control.touched || this.attempted())) {
      return null;
    }
    return control.hasError('required') ? 'Escribe el nombre.' : 'Máximo 100 caracteres.';
  }

  submit(): void {
    this.attempted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const raw = this.form.getRawValue();
    this.submitted.emit({
      name: raw.name.trim(),
      defaultDurationMinutes: raw.defaultDurationMinutes,
    });
  }
}
