import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { patientFieldErrorMessage } from '../../domain/patient-field-error';
import { BloodType, DocumentType } from '../../models/patient.models';
import type { PatientFormGroup } from '../patient-form/patient-form.component';

@Component({
  selector: 'bd-patient-identity-fields',
  standalone: true,
  imports: [ReactiveFormsModule, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="identity-fields" [formGroup]="group()">
      <bd-field label="Tipo de documento" fieldId="patient-document-type">
        <select id="patient-document-type" class="input" formControlName="documentType">
          @for (option of documentTypeOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </bd-field>

      <bd-field
        label="Número de documento"
        fieldId="patient-document-number"
        [required]="true"
        [error]="fieldError(group().controls.documentNumber)"
      >
        <input
          id="patient-document-number"
          class="input"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          formControlName="documentNumber"
        />
      </bd-field>

      <bd-field
        label="Nombres"
        fieldId="patient-first-name"
        [required]="true"
        [error]="fieldError(group().controls.firstName)"
      >
        <input id="patient-first-name" class="input" type="text" autocomplete="given-name" formControlName="firstName" />
      </bd-field>

      <bd-field
        label="Apellidos"
        fieldId="patient-last-name"
        [required]="true"
        [error]="fieldError(group().controls.lastName)"
      >
        <input id="patient-last-name" class="input" type="text" autocomplete="family-name" formControlName="lastName" />
      </bd-field>

      <bd-field
        label="Fecha de nacimiento"
        fieldId="patient-birth-date"
        [required]="true"
        [error]="fieldError(group().controls.birthDate)"
      >
        <input
          id="patient-birth-date"
          class="input"
          type="date"
          [max]="maxBirthDate()"
          formControlName="birthDate"
        />
      </bd-field>

      <fieldset class="identity-fields__sex">
        <legend class="identity-fields__legend">
          Sexo <span class="identity-fields__required" aria-hidden="true">*</span>
        </legend>
        <bd-field [error]="fieldError(group().controls.sex)">
          <div class="identity-fields__radios">
            <label class="identity-fields__radio">
              <input type="radio" formControlName="sex" value="F" />
              Femenino
            </label>
            <label class="identity-fields__radio">
              <input type="radio" formControlName="sex" value="M" />
              Masculino
            </label>
          </div>
        </bd-field>
      </fieldset>

      <bd-field label="Tipo de sangre" fieldId="patient-blood-type">
        <select id="patient-blood-type" class="input" formControlName="bloodType">
          @for (option of bloodTypeOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </bd-field>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .identity-fields {
      display: contents;
    }

    .identity-fields__sex {
      border: none;
      margin: 0;
      padding: 0;
      min-width: 0;
    }

    .identity-fields__legend {
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--color-text);
      margin-bottom: var(--space-xs);
      padding: 0;
    }

    .identity-fields__required {
      color: var(--color-danger);
    }

    .identity-fields__radios {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-md);
    }

    .identity-fields__radio {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      min-height: 44px;
      min-width: 44px;
      font-size: var(--fs-base);
      cursor: pointer;

      input {
        width: 1.25rem;
        height: 1.25rem;
        accent-color: var(--color-primary);
      }
    }
  `,
})
export class PatientIdentityFieldsComponent {
  readonly group = input.required<PatientFormGroup>();
  readonly maxBirthDate = input.required<string>();

  readonly fieldError = patientFieldErrorMessage;

  readonly documentTypeOptions: { value: DocumentType; label: string }[] = [
    { value: 'CI', label: 'Cédula' },
    { value: 'RUC', label: 'RUC' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
  ];

  readonly bloodTypeOptions: { value: BloodType | ''; label: string }[] = [
    { value: '', label: 'Sin registrar' },
    { value: 'O_POS', label: 'O+' },
    { value: 'O_NEG', label: 'O-' },
    { value: 'A_POS', label: 'A+' },
    { value: 'A_NEG', label: 'A-' },
    { value: 'B_POS', label: 'B+' },
    { value: 'B_NEG', label: 'B-' },
    { value: 'AB_POS', label: 'AB+' },
    { value: 'AB_NEG', label: 'AB-' },
  ];
}
