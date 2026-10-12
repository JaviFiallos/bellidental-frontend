import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Pencil } from 'lucide-angular';
import { IconComponent, LucideIconData } from '../../../../shared/components/icon/icon.component';
import { PhonePipe } from '../../../../shared/pipes/phone.pipe';
import { DocumentType, Patient } from '../../models/patient.models';

interface IdentityDetail {
  label: string;
  value: string;
}

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  CI: 'CI',
  RUC: 'RUC',
  PASAPORTE: 'Pasaporte',
};

@Component({
  selector: 'bd-patient-identity',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="patient-identity" aria-labelledby="patient-identity-title">
      <div class="patient-identity__header">
        <div class="patient-identity__titles">
          <h1 id="patient-identity-title" class="patient-identity__name">{{ patient().fullName }}</h1>
          <p class="patient-identity__summary">{{ summary() }}</p>
        </div>
        @if (canEdit()) {
          <button type="button" class="btn btn-outline patient-identity__edit" (click)="edit.emit()">
            <bd-icon [name]="pencilIcon" [size]="16" />
            Editar
          </button>
        }
      </div>

      @if (details().length > 0) {
        <dl class="patient-identity__details">
          @for (detail of details(); track detail.label) {
            <div class="patient-identity__detail">
              <dt>{{ detail.label }}</dt>
              <dd>{{ detail.value }}</dd>
            </div>
          }
        </dl>
      }
    </section>
  `,
  styles: `
    .patient-identity {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-lg);
      box-sizing: border-box;
    }

    .patient-identity__header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-md);
    }

    .patient-identity__titles {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      min-width: 0;
    }

    .patient-identity__name {
      margin: 0;
      font-family: var(--font-heading);
      font-size: var(--fs-xl);
      line-height: var(--lh-tight);
      color: var(--blue-950);
      overflow-wrap: anywhere;
    }

    .patient-identity__summary {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .patient-identity__edit {
      min-height: 2.75rem;
      font-size: var(--fs-sm);
    }

    .patient-identity__details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: var(--space-md);
      margin: 0;
    }

    .patient-identity__detail {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }

    .patient-identity__detail dt {
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
    }

    .patient-identity__detail dd {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text);
      overflow-wrap: anywhere;
    }
  `,
})
export class PatientIdentityComponent {
  readonly patient = input.required<Patient>();
  readonly canEdit = input<boolean>(false);
  readonly edit = output<void>();

  readonly pencilIcon: LucideIconData = Pencil;
  private readonly phonePipe = new PhonePipe();

  readonly summary = computed(() => {
    const patient = this.patient();
    const parts: string[] = [];

    if (patient.documentNumber) {
      parts.push(`${DOCUMENT_LABELS[patient.documentType]} ${patient.documentNumber}`);
    }
    if (patient.age !== null) {
      parts.push(`${patient.age} ${patient.age === 1 ? 'año' : 'años'}`);
    }
    const phone = this.phonePipe.transform(patient.phoneE164);
    if (phone) {
      parts.push(phone);
    }

    return parts.join(' · ');
  });

  readonly details = computed<IdentityDetail[]>(() => {
    const patient = this.patient();
    const details: IdentityDetail[] = [];

    if (patient.email) {
      details.push({ label: 'Correo', value: patient.email });
    }
    if (patient.bloodTypeLabel) {
      details.push({ label: 'Tipo de sangre', value: patient.bloodTypeLabel });
    }
    if (patient.emergencyContactName) {
      const phone = this.phonePipe.transform(patient.emergencyContactPhoneE164);
      details.push({
        label: 'Contacto de emergencia',
        value: phone ? `${patient.emergencyContactName} · ${phone}` : patient.emergencyContactName,
      });
    }

    return details;
  });
}
