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
import { Medication, MedicationRequest } from '../../models/prescription.models';

/**
 * Formulario presentacional para crear o editar un medicamento del catálogo.
 * Reutilizable tanto en la administración de medicamentos como en el editor de recetas.
 */
@Component({
  selector: 'bd-medication-form',
  standalone: true,
  imports: [AlertComponent, FieldComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="medication-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <bd-field label="Nombre" fieldId="medication-name" [required]="true" [error]="nameError()">
        <input
          id="medication-name"
          class="input"
          type="text"
          autocomplete="off"
          formControlName="name"
          maxlength="150"
          [attr.aria-invalid]="nameError() !== null"
        />
      </bd-field>

      <bd-field
        label="Presentación"
        fieldId="medication-presentation"
        [required]="true"
        [error]="presentationError()"
        hint="Ej.: Tableta, Cápsula, Jarabe, Suspensión"
      >
        <input
          id="medication-presentation"
          class="input"
          type="text"
          autocomplete="off"
          formControlName="presentation"
          maxlength="100"
          [attr.aria-invalid]="presentationError() !== null"
        />
      </bd-field>

      <bd-field
        label="Concentración"
        fieldId="medication-concentration"
        [required]="true"
        [error]="concentrationError()"
        hint="Ej.: 500 mg, 1 g, 250 mg / 5 ml"
      >
        <input
          id="medication-concentration"
          class="input"
          type="text"
          autocomplete="off"
          formControlName="concentration"
          maxlength="100"
          [attr.aria-invalid]="concentrationError() !== null"
        />
      </bd-field>

      <bd-field
        label="Vía de administración"
        fieldId="medication-route"
        hint="Opcional."
        [error]="routeError()"
      >
        <input
          id="medication-route"
          class="input"
          type="text"
          list="medication-route-suggestions"
          autocomplete="off"
          formControlName="route"
          maxlength="50"
          [attr.aria-invalid]="routeError() !== null"
        />
        <datalist id="medication-route-suggestions">
          <option value="Oral"></option>
          <option value="Bucal"></option>
          <option value="Tópica"></option>
          <option value="Sublingual"></option>
        </datalist>
      </bd-field>

      @if (isEditing()) {
        <p class="medication-form__note">
          Si ya se usó en una receta no se puede editar: desactívalo y crea otro.
        </p>
      }

      @if (errorMessage(); as message) {
        <bd-alert variant="error" [message]="message" />
      }

      <div class="medication-form__actions">
        <button type="submit" class="btn btn-accent" [disabled]="saving()">
          {{ saving() ? 'Guardando…' : isEditing() ? 'Guardar cambios' : 'Guardar' }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="cancel.emit()">
          Cancelar
        </button>
      </div>
    </form>
  `,
  styles: `
    .medication-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      box-sizing: border-box;
    }

    .medication-form .input {
      min-height: 44px;
      width: 100%;
      box-sizing: border-box;
    }

    .medication-form__note {
      margin: 0;
      padding: var(--space-xs) var(--space-sm);
      border-radius: var(--radius-sm);
      background-color: var(--blue-100);
      color: var(--blue-800);
      font-size: var(--fs-sm);
    }

    .medication-form__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .medication-form__actions .btn {
      min-height: 44px;
    }
  `,
})
export class MedicationFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  readonly medication = input<Medication | Partial<Medication> | null>(null);
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly save = output<MedicationRequest>();
  readonly cancel = output<void>();

  readonly isEditing = computed(() => Boolean(this.medication()?.id));
  private readonly attempted = signal<boolean>(false);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    presentation: ['', [Validators.required, Validators.maxLength(100)]],
    concentration: ['', [Validators.required, Validators.maxLength(100)]],
    route: ['', [Validators.maxLength(50)]],
  });

  ngOnInit(): void {
    const current = this.medication();
    if (!current) {
      return;
    }
    this.form.patchValue({
      name: current.name ?? '',
      presentation: current.presentation ?? '',
      concentration: current.concentration ?? '',
      route: current.route ?? '',
    });
  }

  nameError(): string | null {
    const control = this.form.controls.name;
    if (!this.showErrors(control.invalid, control.touched)) {
      return null;
    }
    return control.hasError('required') ? 'Escribe el nombre.' : 'Máximo 150 caracteres.';
  }

  presentationError(): string | null {
    const control = this.form.controls.presentation;
    if (!this.showErrors(control.invalid, control.touched)) {
      return null;
    }
    return control.hasError('required')
      ? 'Escribe la presentación.'
      : 'Máximo 100 caracteres.';
  }

  concentrationError(): string | null {
    const control = this.form.controls.concentration;
    if (!this.showErrors(control.invalid, control.touched)) {
      return null;
    }
    return control.hasError('required')
      ? 'Escribe la concentración.'
      : 'Máximo 100 caracteres.';
  }

  routeError(): string | null {
    const control = this.form.controls.route;
    if (!this.showErrors(control.invalid, control.touched)) {
      return null;
    }
    return control.hasError('maxlength') ? 'Máximo 50 caracteres.' : null;
  }

  submit(): void {
    this.attempted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();
    const name = raw.name.trim();
    const presentation = raw.presentation.trim();
    const concentration = raw.concentration.trim();
    const route = raw.route.trim();

    if (!name || !presentation || !concentration) {
      return;
    }

    const request: MedicationRequest = {
      name,
      presentation,
      concentration,
      ...(route ? { route } : {}),
    };

    this.save.emit(request);
  }

  private showErrors(invalid: boolean, touched: boolean): boolean {
    return invalid && (touched || this.attempted());
  }
}
