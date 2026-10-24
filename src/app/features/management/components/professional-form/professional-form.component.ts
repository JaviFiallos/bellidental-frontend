import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { isValidCedula } from '../../../../shared/utils/cedula';
import { toEcuadorE164, toEcuadorLocal } from '../../../../shared/utils/e164';
import { DocumentType } from '../../../patients';
import {
  CreateProfessionalRequest,
  ProfessionalDetail,
  Specialty,
  UpdateProfessionalRequest,
} from '../../../professionals';
import {
  colorInUseBy,
  normalizeHexColor,
  SUGGESTED_PROFESSIONAL_COLORS,
  suggestUnusedColor,
} from '../../domain/professional-colors';
import { ColorSwatchPickerComponent } from '../color-swatch-picker/color-swatch-picker.component';

const DEFAULT_COLOR = SUGGESTED_PROFESSIONAL_COLORS[0].hex;

function atLeastOneSpecialtyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as number[];
    return Array.isArray(value) && value.length > 0 ? null : { required: true };
  };
}

@Component({
  selector: 'bd-professional-form',
  standalone: true,
  imports: [
    AlertComponent,
    ColorSwatchPickerComponent,
    FieldComponent,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="sheet-form professional-form" [formGroup]="form" (ngSubmit)="onSubmit()">
      <h2 id="professional-form-title" class="sheet-form__title">
        {{ isEdit() ? 'Editar profesional' : 'Nuevo profesional' }}
      </h2>

      @if (saveError()) {
        <bd-alert variant="error" [message]="saveError()!" />
      }

      <div class="sheet-form__section">
        <h3 class="sheet-form__subtitle">Datos personales</h3>

        <div class="professional-form__row">
          <bd-field label="Tipo de documento" fieldId="prof-doc-type">
            <select
              id="prof-doc-type"
              class="input"
              formControlName="documentType"
              (change)="onDocTypeChange()"
            >
              <option value="CI">Cédula (CI)</option>
              <option value="RUC">RUC</option>
              <option value="PASAPORTE">Pasaporte</option>
            </select>
          </bd-field>

          <bd-field
            label="Número de documento"
            fieldId="prof-doc-number"
            [required]="true"
            [error]="docNumberError()"
          >
            <input
              id="prof-doc-number"
              class="input"
              type="text"
              formControlName="documentNumber"
              autocomplete="off"
            />
          </bd-field>
        </div>

        <div class="professional-form__row">
          <bd-field
            label="Nombres"
            fieldId="prof-first-name"
            [required]="true"
            [error]="fieldError('firstName', 'El nombre es obligatorio.')"
          >
            <input
              id="prof-first-name"
              class="input"
              type="text"
              formControlName="firstName"
              autocomplete="off"
            />
          </bd-field>

          <bd-field
            label="Apellidos"
            fieldId="prof-last-name"
            [required]="true"
            [error]="fieldError('lastName', 'El apellido es obligatorio.')"
          >
            <input
              id="prof-last-name"
              class="input"
              type="text"
              formControlName="lastName"
              autocomplete="off"
            />
          </bd-field>
        </div>

        <div class="professional-form__row">
          <bd-field
            label="Número de licencia"
            fieldId="prof-license"
            [required]="true"
            [error]="fieldError('licenseNumber', 'La licencia es obligatoria.')"
          >
            <input
              id="prof-license"
              class="input"
              type="text"
              formControlName="licenseNumber"
              autocomplete="off"
            />
          </bd-field>

          <bd-field
            label="Teléfono"
            fieldId="prof-phone"
            hint="Ej. 0987654321"
            [error]="phoneError()"
          >
            <input
              id="prof-phone"
              class="input"
              type="tel"
              formControlName="phone"
              autocomplete="tel"
            />
          </bd-field>
        </div>
      </div>

      <div class="sheet-form__section">
        <h3 class="sheet-form__subtitle">Especialidades</h3>
        <p class="professional-form__hint">Selecciona al menos una especialidad.</p>

        <div class="professional-form__specialties" role="group" aria-label="Especialidades">
          @for (spec of specialties(); track spec.id) {
            <label class="professional-form__checkbox-label">
              <input
                type="checkbox"
                class="professional-form__checkbox"
                [checked]="hasSpecialty(spec.id)"
                (change)="onSpecialtyToggle(spec.id, $event)"
              />
              <span>{{ spec.name }}</span>
            </label>
          }
        </div>
        @if (form.controls.specialtyIds.touched && form.controls.specialtyIds.hasError('required')) {
          <p class="professional-form__error" role="alert">
            Selecciona al menos una especialidad.
          </p>
        }
      </div>

      <div class="sheet-form__section">
        <h3 class="sheet-form__subtitle">Color en la agenda</h3>
        <p class="professional-form__hint">Identifica los turnos y atenciones del profesional.</p>

        <bd-color-swatch-picker [formControl]="form.controls.colorTag" />

        @if (colorWarning(); as warning) {
          <div class="professional-form__warning" role="status">
            <span aria-hidden="true">ℹ</span>
            <span>{{ warning }}</span>
          </div>
        }
      </div>

      <div class="sheet-form__footer">
        <button
          type="button"
          class="btn btn-outline"
          [disabled]="saving()"
          (click)="cancel.emit()"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          [disabled]="saving()"
          [attr.aria-busy]="saving()"
        >
          {{ saving() ? 'Guardando…' : 'Guardar' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .professional-form {
      max-width: 100%;
    }

    .professional-form__row {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);

      @include bp.bp-up(md) {
        flex-direction: row;
        gap: var(--space-md);

        > * {
          flex: 1;
        }
      }
    }

    .professional-form__hint {
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
      margin: 0 0 var(--space-xs);
    }

    .professional-form__specialties {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-xs);

      @include bp.bp-up(sm) {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .professional-form__checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      min-height: 44px;
      font-size: var(--fs-sm);
      color: var(--color-text);
      cursor: pointer;
    }

    .professional-form__checkbox {
      width: 1.25rem;
      height: 1.25rem;
      accent-color: var(--blue-800);
      cursor: pointer;
    }

    .professional-form__error {
      font-size: var(--fs-xs);
      color: var(--color-danger);
      margin: var(--space-xs) 0 0;
    }

    .professional-form__warning {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-xs) var(--space-sm);
      font-size: var(--fs-xs);
      color: var(--gold-700);
      background-color: var(--gold-100);
      border-radius: var(--radius-sm);
      margin-top: var(--space-xs);
    }
  `,
})
export class ProfessionalFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly professional = input<ProfessionalDetail | null>(null);
  readonly specialties = input.required<Specialty[]>();
  readonly existingProfessionals = input<ProfessionalDetail[]>([]);
  readonly saving = input<boolean>(false);
  readonly saveError = input<string | null>(null);

  readonly saveCreate = output<CreateProfessionalRequest>();
  readonly saveEdit = output<{ id: string; req: UpdateProfessionalRequest }>();
  readonly cancel = output<void>();

  readonly isEdit = computed(() => this.professional() !== null);

  readonly selectedColorSignal = signal<string>(DEFAULT_COLOR);

  readonly colorWarning = computed(() => {
    const color = this.selectedColorSignal();
    const currentId = this.professional()?.id;
    const usedBy = colorInUseBy(color, this.existingProfessionals(), currentId);
    return usedBy ? `Este color ya lo usa ${usedBy}` : null;
  });

  readonly form = this.fb.group({
    documentType: this.fb.control<DocumentType>('CI'),
    documentNumber: this.fb.control<string>('', [
      Validators.required,
      this.createDocumentValidator(),
    ]),
    firstName: this.fb.control<string>('', [Validators.required]),
    lastName: this.fb.control<string>('', [Validators.required]),
    licenseNumber: this.fb.control<string>('', [Validators.required]),
    phone: this.fb.control<string>('', [this.createPhoneValidator()]),
    specialtyIds: this.fb.control<number[]>([], [atLeastOneSpecialtyValidator()]),
    colorTag: this.fb.control<string>(DEFAULT_COLOR, [Validators.required]),
  });

  constructor() {
    effect(() => {
      const prof = this.professional();
      if (prof) {
        this.form.patchValue({
          documentType: prof.documentType,
          documentNumber: prof.documentNumber,
          firstName: prof.firstName,
          lastName: prof.lastName,
          licenseNumber: prof.licenseNumber,
          phone: toEcuadorLocal(prof.phoneE164),
          specialtyIds: prof.specialties.map((s) => s.id),
          colorTag: prof.colorTag || DEFAULT_COLOR,
        });
        this.selectedColorSignal.set(prof.colorTag || DEFAULT_COLOR);
      } else {
        const proposedColor = suggestUnusedColor(this.existingProfessionals());
        this.form.patchValue({
          documentType: 'CI',
          documentNumber: '',
          firstName: '',
          lastName: '',
          licenseNumber: '',
          phone: '',
          specialtyIds: [],
          colorTag: proposedColor,
        });
        this.selectedColorSignal.set(proposedColor);
      }
    });
  }

  ngOnInit(): void {
    this.form.controls.colorTag.valueChanges.subscribe((val) => {
      if (val) {
        this.selectedColorSignal.set(normalizeHexColor(val));
      }
    });
  }

  onDocTypeChange(): void {
    this.form.controls.documentNumber.updateValueAndValidity();
  }

  hasSpecialty(id: number): boolean {
    return this.form.controls.specialtyIds.value.includes(id);
  }

  onSpecialtyToggle(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = [...this.form.controls.specialtyIds.value];
    if (checked && !current.includes(id)) {
      current.push(id);
    } else if (!checked && current.includes(id)) {
      const idx = current.indexOf(id);
      current.splice(idx, 1);
    }
    this.form.controls.specialtyIds.setValue(current);
    this.form.controls.specialtyIds.markAsTouched();
  }

  docNumberError(): string | null {
    const ctrl = this.form.controls.documentNumber;
    if (!ctrl.touched) return null;
    if (ctrl.hasError('required')) return 'El número de documento es obligatorio.';
    if (ctrl.hasError('invalidCedula')) return 'Cédula ecuatoriana inválida.';
    return null;
  }

  phoneError(): string | null {
    const ctrl = this.form.controls.phone;
    if (!ctrl.touched) return null;
    if (ctrl.hasError('invalidPhone')) return 'Teléfono ecuatoriano no válido.';
    return null;
  }

  fieldError(fieldName: 'firstName' | 'lastName' | 'licenseNumber', requiredMessage: string): string | null {
    const ctrl = this.form.controls[fieldName];
    if (!ctrl.touched) return null;
    if (ctrl.hasError('required')) return requiredMessage;
    return null;
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();
    const phoneVal = raw.phone.trim() ? toEcuadorE164(raw.phone) : undefined;
    const phoneE164 = phoneVal ?? undefined;
    const colorTag = normalizeHexColor(raw.colorTag);

    if (this.isEdit()) {
      const prof = this.professional()!;
      const updateReq: UpdateProfessionalRequest = {};

      if (raw.documentType !== prof.documentType) {
        updateReq.documentType = raw.documentType;
      }
      if (raw.documentNumber.trim() !== prof.documentNumber) {
        updateReq.documentNumber = raw.documentNumber.trim();
      }
      if (raw.firstName.trim() !== prof.firstName) {
        updateReq.firstName = raw.firstName.trim();
      }
      if (raw.lastName.trim() !== prof.lastName) {
        updateReq.lastName = raw.lastName.trim();
      }
      if (raw.licenseNumber.trim() !== prof.licenseNumber) {
        updateReq.licenseNumber = raw.licenseNumber.trim();
      }
      const existingPhone = prof.phoneE164 ?? undefined;
      if (phoneE164 !== existingPhone) {
        updateReq.phoneE164 = phoneE164;
      }
      if (colorTag !== normalizeHexColor(prof.colorTag ?? '')) {
        updateReq.colorTag = colorTag;
      }

      const oldSpecialtyIds = prof.specialties.map((s) => s.id).sort();
      const newSpecialtyIds = [...raw.specialtyIds].sort();
      const changedSpecialties =
        oldSpecialtyIds.length !== newSpecialtyIds.length ||
        oldSpecialtyIds.some((id, i) => id !== newSpecialtyIds[i]);
      if (changedSpecialties) {
        updateReq.specialtyIds = raw.specialtyIds;
      }

      this.saveEdit.emit({ id: prof.id, req: updateReq });
    } else {
      const createReq: CreateProfessionalRequest = {
        documentType: raw.documentType,
        documentNumber: raw.documentNumber.trim(),
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        licenseNumber: raw.licenseNumber.trim(),
        colorTag,
        specialtyIds: raw.specialtyIds,
        ...(phoneE164 ? { phoneE164 } : {}),
      };
      this.saveCreate.emit(createReq);
    }
  }

  private createDocumentValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      if (this.form?.controls.documentType.value === 'CI') {
        return isValidCedula(control.value) ? null : { invalidCedula: true };
      }
      return null;
    };
  }

  private createPhoneValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      return toEcuadorE164(control.value) !== null ? null : { invalidPhone: true };
    };
  }
}
