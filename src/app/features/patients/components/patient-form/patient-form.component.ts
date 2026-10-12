import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { BloodType, DocumentType, Sex } from '../../models/patient.models';
import { PatientContactFieldsComponent } from '../patient-contact-fields/patient-contact-fields.component';
import { PatientIdentityFieldsComponent } from '../patient-identity-fields/patient-identity-fields.component';

export type PatientFormGroup = FormGroup<{
  documentType: FormControl<DocumentType>;
  documentNumber: FormControl<string>;
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  birthDate: FormControl<string>;
  sex: FormControl<Sex | ''>;
  bloodType: FormControl<BloodType | ''>;
  phone: FormControl<string>;
  email: FormControl<string>;
  emergencyContactName: FormControl<string>;
  emergencyContactPhone: FormControl<string>;
  adminNotes: FormControl<string>;
}>;

const REQUIRED_CONTROL_NAMES = ['documentNumber', 'firstName', 'lastName', 'birthDate', 'sex'] as const;

@Component({
  selector: 'bd-patient-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AlertComponent,
    FieldComponent,
    PatientIdentityFieldsComponent,
    PatientContactFieldsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="patient-form" [formGroup]="form()" (ngSubmit)="onSubmit()" novalidate>
      @if (errorMessage()) {
        <bd-alert variant="error" [message]="errorMessage()">
          @if (duplicatePatientId(); as patientId) {
            <a class="patient-form__existing-link" [routerLink]="['/pacientes', patientId]">
              Ver su ficha
            </a>
          }
        </bd-alert>
      }

      <section class="patient-form__section" aria-labelledby="patient-identity-title">
        <h2 id="patient-identity-title" class="patient-form__section-title">Identificación</h2>
        <div class="patient-form__grid">
          <bd-patient-identity-fields [group]="form()" [maxBirthDate]="maxBirthDate()" />
        </div>
      </section>

      <section class="patient-form__section" aria-labelledby="patient-contact-title">
        <h2 id="patient-contact-title" class="patient-form__section-title">Contacto</h2>
        <div class="patient-form__grid">
          <bd-patient-contact-fields [group]="form()" />
        </div>
      </section>

      <section class="patient-form__section" aria-labelledby="patient-notes-title">
        <h2 id="patient-notes-title" class="patient-form__section-title">Observaciones</h2>
        <div class="patient-form__grid">
          <bd-field
            class="patient-form__wide"
            label="Notas administrativas"
            fieldId="patient-admin-notes"
            hint="Presupuestos, acuerdos de pago…"
          >
            <textarea
              id="patient-admin-notes"
              class="input patient-form__textarea"
              rows="3"
              maxlength="1000"
              formControlName="adminNotes"
            ></textarea>
          </bd-field>
        </div>
      </section>

      <div class="patient-form__actions">
        <button type="button" class="btn btn-ghost" (click)="cancel.emit()">Cancelar</button>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          {{ saving() ? 'Guardando…' : 'Guardar' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .patient-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .patient-form__section {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-lg);
    }

    .patient-form__section-title {
      font-size: var(--fs-md);
      margin: 0 0 var(--space-md) 0;
    }

    .patient-form__grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-md);
    }

    .patient-form__wide {
      display: flex;
      flex-direction: column;
    }

    .patient-form__textarea {
      height: auto;
      min-height: 5.5rem;
      padding: var(--space-sm) var(--space-md);
      resize: vertical;
    }

    .patient-form__existing-link {
      font-weight: 600;
      text-decoration: underline;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }

    .patient-form__actions {
      position: sticky;
      bottom: 0;
      display: flex;
      gap: var(--space-sm);
      padding: var(--space-md);
      background-color: var(--color-surface);
      border-top: 1px solid var(--color-border);
      z-index: 1;

      .btn {
        min-height: 44px;
      }

      .btn-primary {
        flex: 1;
      }
    }

    @include bp.bp-up('md') {
      .patient-form__grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .patient-form__wide {
        grid-column: 1 / -1;
      }

      .patient-form__actions {
        position: static;
        justify-content: flex-end;
        padding: 0;
        background-color: transparent;
        border-top: none;

        .btn-primary {
          flex: 0 0 auto;
        }
      }
    }
  `,
})
export class PatientFormComponent implements AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly form = input.required<PatientFormGroup>();
  readonly maxBirthDate = input.required<string>();
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly duplicatePatientId = input<string | null>(null);

  readonly save = output<void>();
  readonly cancel = output<void>();

  ngAfterViewInit(): void {
    // Foco inicial: primer campo obligatorio vacío
    const emptyName = REQUIRED_CONTROL_NAMES.find((name) => !this.form().controls[name].value);
    if (emptyName) {
      this.host.nativeElement
        .querySelector<HTMLElement>(`[formControlName="${emptyName}"]`)
        ?.focus();
    }
  }

  onSubmit(): void {
    if (this.form().invalid) {
      this.form().markAllAsTouched();
      this.host.nativeElement
        .querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid, textarea.ng-invalid')
        ?.focus();
      return;
    }
    this.save.emit();
  }
}
