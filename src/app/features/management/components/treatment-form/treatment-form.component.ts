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
import {
  normalizeCode,
  parsePrice,
  PRICE_PATTERN,
  specialtyChoices,
} from '../../domain/catalog-display';
import {
  CatalogSpecialty,
  CatalogTreatment,
  TreatmentFormResult,
} from '../../models/catalog.models';

/** Alta o edición de un tratamiento. Presentacional: sale con `submitted` y `cancelled`. */
@Component({
  selector: 'bd-treatment-form',
  standalone: true,
  imports: [AlertComponent, FieldComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="treatment-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <bd-field
        label="Código"
        fieldId="treatment-code"
        [required]="!isEditing()"
        [error]="codeError()"
        [hint]="isEditing() ? 'El código no se puede cambiar.' : 'Se guarda en mayúsculas.'"
      >
        <input
          id="treatment-code"
          class="input"
          type="text"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          formControlName="code"
          [attr.aria-invalid]="codeError() !== null"
        />
      </bd-field>

      <bd-field label="Nombre" fieldId="treatment-name" [required]="true" [error]="nameError()">
        <input
          id="treatment-name"
          class="input"
          type="text"
          autocomplete="off"
          formControlName="name"
          [attr.aria-invalid]="nameError() !== null"
        />
      </bd-field>

      <bd-field label="Descripción" fieldId="treatment-description" hint="Opcional.">
        <textarea
          id="treatment-description"
          class="input treatment-form__textarea"
          rows="3"
          formControlName="description"
        ></textarea>
      </bd-field>

      <bd-field
        label="Precio"
        fieldId="treatment-price"
        [required]="true"
        [error]="priceError()"
        hint="En dólares, con hasta 2 decimales. Ejemplo: 12.50"
      >
        <input
          id="treatment-price"
          class="input"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          formControlName="basePrice"
          [attr.aria-invalid]="priceError() !== null"
        />
      </bd-field>

      @if (isEditing()) {
        <p class="treatment-form__note">El nuevo precio solo aplica a atenciones futuras.</p>
      }

      <bd-field
        label="Especialidad"
        fieldId="treatment-specialty"
        hint="Opcional. Sirve solo para filtrar el catálogo."
      >
        <select id="treatment-specialty" class="input" formControlName="specialtyId">
          <option value="">Cualquiera</option>
          @for (choice of specialtyOptions(); track choice.id) {
            <option [value]="choice.id">{{ choice.label }}</option>
          }
        </select>
      </bd-field>

      @if (errorMessage(); as message) {
        <bd-alert variant="error" [message]="message" />
      }

      <div class="treatment-form__actions">
        <button type="submit" class="btn btn-accent" [disabled]="saving()">
          {{ saving() ? 'Guardando…' : isEditing() ? 'Guardar cambios' : 'Crear tratamiento' }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="cancelled.emit()">Cancelar</button>
      </div>
    </form>
  `,
  styles: `
    .treatment-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      box-sizing: border-box;
    }

    .treatment-form .input {
      min-height: 44px;
      width: 100%;
      box-sizing: border-box;
    }

    .treatment-form__textarea {
      min-height: 5rem;
      padding: var(--space-xs) var(--space-sm);
      font-family: inherit;
      font-size: var(--fs-sm);
      resize: vertical;
    }

    .treatment-form__note {
      margin: 0;
      padding: var(--space-xs) var(--space-sm);
      border-radius: var(--radius-sm);
      background-color: var(--blue-100);
      color: var(--blue-800);
      font-size: var(--fs-sm);
    }

    .treatment-form__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .treatment-form__actions .btn {
      min-height: 44px;
    }
  `,
})
export class TreatmentFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  /** `null` = alta; con un tratamiento = edición (el código queda fijo). */
  readonly treatment = input<CatalogTreatment | null>(null);
  readonly specialties = input<CatalogSpecialty[]>([]);
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<TreatmentFormResult>();
  readonly cancelled = output<void>();

  readonly isEditing = computed(() => this.treatment() !== null);
  readonly specialtyOptions = computed(() =>
    specialtyChoices(this.specialties(), this.treatment()?.specialtyId ?? null)
  );

  private readonly attempted = signal<boolean>(false);

  readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    basePrice: ['', [Validators.required, Validators.pattern(PRICE_PATTERN)]],
    specialtyId: [''],
  });

  ngOnInit(): void {
    const current = this.treatment();
    if (!current) {
      return;
    }
    this.form.controls.code.disable();
    this.form.patchValue({
      code: current.code,
      name: current.name,
      description: current.description ?? '',
      basePrice: current.basePrice.toFixed(2),
      specialtyId: current.specialtyId === null ? '' : String(current.specialtyId),
    });
  }

  codeError(): string | null {
    const control = this.form.controls.code;
    return this.showErrors(control.invalid, control.touched) ? 'Escribe el código.' : null;
  }

  nameError(): string | null {
    const control = this.form.controls.name;
    if (!this.showErrors(control.invalid, control.touched)) {
      return null;
    }
    return control.hasError('required') ? 'Escribe el nombre.' : 'Máximo 150 caracteres.';
  }

  priceError(): string | null {
    const control = this.form.controls.basePrice;
    if (!this.showErrors(control.invalid, control.touched)) {
      return null;
    }
    return control.hasError('required')
      ? 'Escribe el precio.'
      : 'Escribe un precio válido, por ejemplo 12.50 (hasta 2 decimales).';
  }

  submit(): void {
    this.attempted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();
    const basePrice = parsePrice(raw.basePrice);
    if (basePrice === null) {
      return;
    }
    const name = raw.name.trim();
    const description = raw.description.trim();
    const specialtyId = raw.specialtyId === '' ? null : Number(raw.specialtyId);
    const specialtyPart = specialtyId === null ? {} : { specialtyId };

    if (this.isEditing()) {
      this.submitted.emit({
        kind: 'update',
        request: { name, description: description || null, basePrice, ...specialtyPart },
      });
      return;
    }
    this.submitted.emit({
      kind: 'create',
      request: {
        code: normalizeCode(raw.code),
        name,
        basePrice,
        ...(description ? { description } : {}),
        ...specialtyPart,
      },
    });
  }

  private showErrors(invalid: boolean, touched: boolean): boolean {
    return invalid && (touched || this.attempted());
  }
}
