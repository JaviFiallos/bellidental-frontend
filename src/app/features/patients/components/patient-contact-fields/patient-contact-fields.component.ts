import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { patientFieldErrorMessage } from '../../domain/patient-field-error';
import type { PatientFormGroup } from '../patient-form/patient-form.component';

@Component({
  selector: 'bd-patient-contact-fields',
  standalone: true,
  imports: [ReactiveFormsModule, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="contact-fields" [formGroup]="group()">
      <bd-field
        label="Teléfono"
        fieldId="patient-phone"
        hint="Ej. 0987 654 321"
        [error]="fieldError(group().controls.phone)"
      >
        <input
          id="patient-phone"
          class="input"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          formControlName="phone"
        />
      </bd-field>

      <bd-field label="Correo" fieldId="patient-email" [error]="fieldError(group().controls.email)">
        <input
          id="patient-email"
          class="input"
          type="email"
          autocomplete="email"
          formControlName="email"
        />
      </bd-field>

      <bd-field
        label="Contacto de emergencia: nombre"
        fieldId="patient-emergency-name"
        [error]="fieldError(group().controls.emergencyContactName)"
      >
        <input
          id="patient-emergency-name"
          class="input"
          type="text"
          formControlName="emergencyContactName"
        />
      </bd-field>

      <bd-field
        label="Contacto de emergencia: teléfono"
        fieldId="patient-emergency-phone"
        hint="Ej. 0987 654 321"
        [error]="fieldError(group().controls.emergencyContactPhone)"
      >
        <input
          id="patient-emergency-phone"
          class="input"
          type="tel"
          inputmode="tel"
          formControlName="emergencyContactPhone"
        />
      </bd-field>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .contact-fields {
      display: contents;
    }
  `,
})
export class PatientContactFieldsComponent {
  readonly group = input.required<PatientFormGroup>();

  readonly fieldError = patientFieldErrorMessage;
}
