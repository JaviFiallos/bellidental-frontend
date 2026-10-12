import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiError } from '../../../../core/api/api.models';
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { isValidCedula } from '../../../../shared/utils/cedula';
import { toEcuadorE164, toEcuadorLocal } from '../../../../shared/utils/e164';
import {
  BloodType,
  CreatePatientRequest,
  DocumentType,
  Patient,
  Sex,
  UpdatePatientRequest,
} from '../../models/patient.models';
import { PatientFormComponent, PatientFormGroup } from '../../components/patient-form/patient-form.component';
import { PatientsApi } from '../../services/patients.api';

type PatientFormValue = ReturnType<PatientFormGroup['getRawValue']>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requiredText(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}

function phoneNumber(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  return toEcuadorE164(value) ? null : { phone: true };
}

function email(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  return EMAIL_PATTERN.test(value) ? null : { email: true };
}

function cedulaWhenCi(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  const documentType = control.parent?.get('documentType')?.value;
  if (documentType !== 'CI' || !value) return null;
  return isValidCedula(value) ? null : { cedula: true };
}

function toCreateRequest(value: PatientFormValue): CreatePatientRequest {
  const request: CreatePatientRequest = {
    documentType: value.documentType,
    documentNumber: value.documentNumber.trim(),
    firstName: value.firstName.trim(),
    lastName: value.lastName.trim(),
    birthDate: value.birthDate,
    // Obligatorio: el formulario no envía si no hay sexo seleccionado
    sex: value.sex as Sex,
  };

  if (value.bloodType) request.bloodType = value.bloodType;

  const phone = toEcuadorE164(value.phone);
  if (phone) request.phoneE164 = phone;

  const contactEmail = value.email.trim();
  if (contactEmail) request.email = contactEmail;

  const emergencyName = value.emergencyContactName.trim();
  if (emergencyName) request.emergencyContactName = emergencyName;

  const emergencyPhone = toEcuadorE164(value.emergencyContactPhone);
  if (emergencyPhone) request.emergencyContactPhoneE164 = emergencyPhone;

  const notes = value.adminNotes.trim();
  if (notes) request.adminNotes = notes;

  return request;
}

function toUpdateRequest(value: PatientFormValue): UpdatePatientRequest {
  return {
    documentType: value.documentType,
    documentNumber: value.documentNumber.trim(),
    firstName: value.firstName.trim(),
    lastName: value.lastName.trim(),
    birthDate: value.birthDate,
    sex: value.sex as Sex,
    bloodType: value.bloodType || null,
    // Los opcionales vacíos van como "" para que el backend los borre
    phoneE164: toEcuadorE164(value.phone) ?? '',
    email: value.email.trim(),
    emergencyContactName: value.emergencyContactName.trim(),
    emergencyContactPhoneE164: toEcuadorE164(value.emergencyContactPhone) ?? '',
    adminNotes: value.adminNotes.trim(),
  };
}

@Component({
  selector: 'bd-patient-form-page',
  standalone: true,
  imports: [PageHeaderComponent, SkeletonComponent, AlertComponent, PatientFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="patient-form-page">
      <bd-page-header [title]="pageTitle" />

      @if (loading()) {
        <div class="patient-form-page__skeleton" aria-busy="true">
          <bd-skeleton height="3rem" width="100%" />
          <bd-skeleton height="3rem" width="100%" />
          <bd-skeleton height="3rem" width="100%" />
          <bd-skeleton height="6rem" width="100%" />
        </div>
      } @else if (loadError()) {
        <bd-alert variant="error" [message]="loadError()">
          <button type="button" class="btn btn-primary" (click)="reloadPatient()">Reintentar</button>
        </bd-alert>
      } @else {
        <bd-patient-form
          [form]="form"
          [maxBirthDate]="maxBirthDate"
          [saving]="saving()"
          [errorMessage]="errorMessage()"
          [duplicatePatientId]="duplicatePatientId()"
          (save)="onSave()"
          (cancel)="onCancel()"
        />
      }
    </div>
  `,
  styles: `
    .patient-form-page {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 56rem;
      margin: 0 auto;
      box-sizing: border-box;
    }

    .patient-form-page__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-lg);
    }
  `,
})
export class PatientFormPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly patientsApi = inject(PatientsApi);
  private readonly clinicClock = inject(ClinicClock);
  private readonly notificationService = inject(NotificationService);

  private readonly patientId = this.route.snapshot.paramMap.get('id');

  readonly pageTitle = this.patientId ? 'Editar paciente' : 'Nuevo paciente';
  readonly maxBirthDate = this.clinicClock.todayDateString();
  readonly form: PatientFormGroup = this.createForm();

  readonly loading = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly duplicatePatientId = signal<string | null>(null);

  ngOnInit(): void {
    this.form.controls.documentType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.form.controls.documentNumber.updateValueAndValidity());

    if (this.patientId) {
      this.loadPatient(this.patientId);
    } else {
      this.prefillFromSearch();
    }
  }

  reloadPatient(): void {
    if (this.patientId) {
      this.loadPatient(this.patientId);
    }
  }

  onSave(): void {
    if (this.saving()) return;

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set(null);
    this.duplicatePatientId.set(null);

    const request$ = this.patientId
      ? this.patientsApi.update(this.patientId, toUpdateRequest(value))
      : this.patientsApi.create(toCreateRequest(value));

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (patient: Patient) => {
        this.notificationService.success(
          this.patientId
            ? 'Datos actualizados'
            : `Paciente registrado: ${patient.fullName}`
        );
        this.router.navigate(['/pacientes', patient.id]);
      },
      error: (err: ApiError) => this.onSaveError(err, value.documentNumber.trim()),
    });
  }

  onCancel(): void {
    this.router.navigate(this.patientId ? ['/pacientes', this.patientId] : ['/recepcion']);
  }

  private createForm(): PatientFormGroup {
    return this.formBuilder.nonNullable.group({
      documentType: ['CI' as DocumentType],
      documentNumber: ['', [requiredText, Validators.maxLength(30), cedulaWhenCi]],
      firstName: ['', [requiredText, Validators.maxLength(100)]],
      lastName: ['', [requiredText, Validators.maxLength(100)]],
      birthDate: ['', [Validators.required]],
      sex: ['' as Sex | '', [Validators.required]],
      bloodType: ['' as BloodType | ''],
      phone: ['', [phoneNumber]],
      email: ['', [email, Validators.maxLength(150)]],
      emergencyContactName: ['', [Validators.maxLength(150)]],
      emergencyContactPhone: ['', [phoneNumber]],
      adminNotes: ['', [Validators.maxLength(1000)]],
    });
  }

  private prefillFromSearch(): void {
    const query = (this.route.snapshot.queryParamMap.get('q') ?? '').trim();
    if (!query) return;

    const compact = query.replace(/\s/g, '');
    if (/^\d+$/.test(compact)) {
      this.form.patchValue({ documentType: 'CI', documentNumber: compact });
    } else {
      this.form.patchValue({ firstName: query });
    }
  }

  private loadPatient(id: string): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.patientsApi
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (patient) => {
          this.fillForm(patient);
          this.loading.set(false);
        },
        error: (err: ApiError) => {
          this.loadError.set(err.message);
          this.loading.set(false);
        },
      });
  }

  private fillForm(patient: Patient): void {
    this.form.patchValue({
      documentType: patient.documentType,
      documentNumber: patient.documentNumber,
      firstName: patient.firstName,
      lastName: patient.lastName,
      birthDate: patient.birthDate,
      sex: patient.sex,
      bloodType: patient.bloodType ?? '',
      phone: toEcuadorLocal(patient.phoneE164),
      email: patient.email ?? '',
      emergencyContactName: patient.emergencyContactName ?? '',
      emergencyContactPhone: toEcuadorLocal(patient.emergencyContactPhoneE164),
      adminNotes: patient.adminNotes ?? '',
    });
  }

  private onSaveError(err: ApiError, documentNumber: string): void {
    this.saving.set(false);
    this.errorMessage.set(err.message);

    if (err.status === 409 && !this.patientId) {
      this.findExistingPatient(documentNumber);
    }
  }

  private findExistingPatient(documentNumber: string): void {
    this.patientsApi
      .search(documentNumber, 0, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          const first = page.content[0];
          if (first && first.documentNumber === documentNumber) {
            this.duplicatePatientId.set(first.id);
          }
        },
        // Si la búsqueda falla, solo queda el mensaje del 409.
        error: () => {},
      });
  }
}
