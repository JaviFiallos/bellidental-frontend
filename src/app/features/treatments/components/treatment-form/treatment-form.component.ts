import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { DiagnosisOption, RecordTreatmentRequest, Treatment } from '../../models/treatment.models';

interface TreatmentFormValue {
  quantity: number;
  price: number;
  toothCode: number | null;
  surfaceCode: string;
  diagnosisId: string;
  notes: string;
}

type TreatmentForm = FormGroup<{
  quantity: FormControl<number>;
  price: FormControl<number>;
  toothCode: FormControl<number | null>;
  surfaceCode: FormControl<string>;
  diagnosisId: FormControl<string>;
  notes: FormControl<string>;
}>;

const SURFACE_OPTIONS: readonly { code: string; name: string }[] = [
  { code: 'O', name: 'Oclusal' },
  { code: 'V', name: 'Vestibular' },
  { code: 'L', name: 'Lingual' },
  { code: 'M', name: 'Mesial' },
  { code: 'D', name: 'Distal' },
];

function integerAtLeastOne(control: AbstractControl<number | null>): ValidationErrors | null {
  const value = control.value;
  return value !== null && Number.isInteger(value) && value >= 1 ? null : { integerAtLeastOne: true };
}

function atMostTwoDecimals(control: AbstractControl<number | null>): ValidationErrors | null {
  const value = control.value;
  if (value === null || !Number.isFinite(value)) return { atMostTwoDecimals: true };
  return Math.abs(Math.round(value * 100) - value * 100) < 1e-6 ? null : { atMostTwoDecimals: true };
}

/** Tratamiento elegido: cantidad, precio, pieza, cara, diagnóstico y nota. Emite la petición lista para el backend. */
@Component({
  selector: 'bd-treatment-form',
  standalone: true,
  imports: [ReactiveFormsModule, FieldComponent, AlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="treatment-form" [formGroup]="form" (ngSubmit)="onSubmit()">
      <header class="treatment-form__header">
        <span class="treatment-form__code">{{ treatment().code }}</span>
        <span class="treatment-form__name">{{ treatment().name }}</span>
      </header>

      <div class="treatment-form__grid">
        <bd-field
          label="Cantidad"
          fieldId="treatment-quantity"
          [error]="fieldError(form.controls.quantity, 'Ingresa un número entero de 1 o más')"
        >
          <input
            id="treatment-quantity"
            class="treatment-form__input"
            type="number"
            inputmode="numeric"
            min="1"
            step="1"
            formControlName="quantity"
          />
        </bd-field>

        <bd-field
          label="Precio"
          fieldId="treatment-price"
          [error]="fieldError(form.controls.price, 'Ingresa un precio de 0 o más, con 2 decimales')"
        >
          <input
            id="treatment-price"
            class="treatment-form__input"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            formControlName="price"
          />
        </bd-field>

        <bd-field
          label="Pieza"
          fieldId="treatment-tooth"
          hint="Opcional. Número FDI (temporales 51–85)"
          [error]="fieldError(form.controls.toothCode, 'La pieza debe estar entre 11 y 85')"
        >
          <input
            id="treatment-tooth"
            class="treatment-form__input"
            type="number"
            inputmode="numeric"
            min="11"
            max="85"
            step="1"
            formControlName="toothCode"
          />
        </bd-field>

        <bd-field label="Cara" fieldId="treatment-surface" hint="Solo con pieza">
          <select id="treatment-surface" class="treatment-form__input" formControlName="surfaceCode">
            <option value="">—</option>
            @for (surface of surfaceOptions; track surface.code) {
              <option [value]="surface.code">{{ surface.code }} · {{ surface.name }}</option>
            }
          </select>
        </bd-field>

        <bd-field label="Diagnóstico" fieldId="treatment-diagnosis">
          <select id="treatment-diagnosis" class="treatment-form__input" formControlName="diagnosisId">
            <option value="">Sin diagnóstico</option>
            @for (diagnosis of diagnoses(); track diagnosis.id) {
              <option [value]="diagnosis.id">{{ diagnosis.label }}</option>
            }
          </select>
        </bd-field>

        <bd-field label="Nota (opcional)" fieldId="treatment-notes">
          <input id="treatment-notes" class="treatment-form__input" type="text" formControlName="notes" />
        </bd-field>
      </div>

      @if (errorMessage()) {
        <bd-alert variant="error" [message]="errorMessage()" />
      }

      <div class="treatment-form__actions">
        <button type="button" class="btn btn-outline treatment-form__btn" (click)="cancel.emit()">
          Cancelar
        </button>
        <button
          type="submit"
          class="btn btn-primary treatment-form__btn"
          [disabled]="form.invalid || saving()"
        >
          {{ saving() ? 'Registrando…' : 'Registrar' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    :host {
      display: block;
      container-type: inline-size;
    }

    .treatment-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background-color: var(--blue-50);
    }

    .treatment-form__header {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--space-xs);
    }

    .treatment-form__code {
      font-weight: 700;
      color: var(--blue-950);
    }

    .treatment-form__name {
      color: var(--color-text);
    }

    .treatment-form__grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-sm);
    }

    .treatment-form__input {
      width: 100%;
      min-height: 44px;
      box-sizing: border-box;
      padding: var(--space-xs) var(--space-sm);
      border: 1px solid var(--slate-300);
      border-radius: var(--radius-sm);
      background-color: var(--white);
      font-family: inherit;
      font-size: var(--fs-sm);
      color: var(--color-text);

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: -1px;
      }
    }

    .treatment-form__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-sm);
    }

    .treatment-form__btn {
      min-height: 44px;
      padding: 0.5rem 1rem;
      font-size: var(--fs-sm);
      font-weight: 600;
    }

    @container (min-width: 36rem) {
      .treatment-form__grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @container (min-width: 60rem) {
      .treatment-form__grid {
        grid-template-columns: repeat(6, minmax(0, 1fr));
      }
    }
  `,
})
export class TreatmentFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly treatment = input.required<Treatment>();
  readonly diagnoses = input<DiagnosisOption[]>([]);
  readonly initialToothCode = input<number | null>(null);
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly register = output<RecordTreatmentRequest>();
  readonly cancel = output<void>();

  readonly surfaceOptions = SURFACE_OPTIONS;

  form!: TreatmentForm;

  ngOnInit(): void {
    const initialTooth = this.initialToothCode();

    this.form = this.fb.nonNullable.group({
      quantity: this.fb.nonNullable.control(1, [integerAtLeastOne]),
      price: this.fb.nonNullable.control(this.treatment().basePrice, [
        Validators.required,
        Validators.min(0),
        atMostTwoDecimals,
      ]),
      toothCode: this.fb.control<number | null>(initialTooth, [
        Validators.min(11),
        Validators.max(85),
      ]),
      surfaceCode: this.fb.nonNullable.control({ value: '', disabled: initialTooth === null }),
      diagnosisId: this.fb.nonNullable.control(this.diagnoses()[0]?.id ?? ''),
      notes: this.fb.nonNullable.control(''),
    });

    this.form.controls.toothCode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tooth) => {
        const surface = this.form.controls.surfaceCode;
        if (tooth === null) {
          surface.setValue('');
          surface.disable();
        } else {
          surface.enable();
        }
      });
  }

  fieldError(control: AbstractControl, message: string): string | null {
    return control.invalid && (control.dirty || control.touched) ? message : null;
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving()) return;

    const raw: TreatmentFormValue = this.form.getRawValue();
    const request: RecordTreatmentRequest = {
      treatmentId: this.treatment().id,
      quantity: raw.quantity,
      price: raw.price,
    };

    if (raw.diagnosisId) {
      request.encounterDiagnosisId = raw.diagnosisId;
    }
    if (raw.toothCode !== null) {
      request.toothCode = raw.toothCode;
      if (raw.surfaceCode) {
        request.surfaceCode = raw.surfaceCode;
      }
    }
    const notes = raw.notes.trim();
    if (notes) {
      request.notes = notes;
    }

    this.register.emit(request);
  }
}
