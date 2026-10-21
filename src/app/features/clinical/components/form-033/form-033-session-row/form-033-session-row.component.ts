import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Form033TreatmentSession } from '../../../domain/form-033';

@Component({
  selector: 'bd-form-033-session-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="treatment-session treatment-columns">
      <div class="treatment-block treatment-block--left">
        <div class="treatment-col col-session">
          <div class="cell-line">
            <span class="cell-caption">SESIÓN</span>
            <span class="session-number">{{ session().sessionNumber ?? '' }}</span>
          </div>
          <div class="cell-line cell-sublabel">FECHA</div>
          <div class="cell-date">{{ session().date }}</div>
        </div>
        <div class="treatment-col col-diagnoses">
          @for (line of session().diagnosisRows; track $index) {
            <div class="ruled-row">{{ line }}</div>
          }
        </div>
      </div>

      <div class="treatment-block treatment-block--right">
        <div class="treatment-col col-procedures">
          @for (line of session().procedureRows; track $index) {
            <div class="ruled-row">{{ line }}</div>
          }
        </div>
        <div class="treatment-col col-prescriptions">
          @for (line of session().prescriptionRows; track $index) {
            <div class="ruled-row">{{ line }}</div>
          }
        </div>
        <div class="treatment-col col-signature">
          <div class="cell-line">
            <span class="cell-caption">CÓDIGO</span>
            <span class="cell-code-value">{{ session().professionalCode }}</span>
          </div>
          <div class="cell-line cell-sublabel">FIRMA</div>
          <div class="cell-sign"></div>
        </div>
      </div>
    </div>
  `,
  styles: `
    @use '../form-033' as f033;
    @include f033.treatment-columns;

    :host {
      display: block;
    }

    .treatment-session {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .cell-line {
      box-sizing: border-box;
      min-height: 5.5mm;
      display: flex;
      align-items: center;
      gap: 1mm;
      padding: 0 1.2mm;
      border-bottom: 1px solid var(--form033-border);
      font-size: 6pt;
      line-height: 1.2;
      color: var(--form033-ink);
    }

    .cell-caption {
      font-size: 5.5pt;
      font-weight: 700;
    }

    .cell-sublabel {
      justify-content: center;
      background-color: var(--form033-sublabel);
      font-size: 5.5pt;
      font-weight: 700;
    }

    .session-number {
      min-width: 6mm;
      text-align: center;
      font-size: 8pt;
      font-weight: 700;
    }

    .cell-code-value {
      font-size: 6pt;
      font-weight: 600;
    }

    .cell-date {
      flex: 1 1 auto;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 1.2mm;
      border-bottom: 1px solid var(--form033-border);
      font-size: 6.5pt;
      color: var(--form033-ink);
    }

    .cell-sign {
      flex: 1 1 auto;
      box-sizing: border-box;
    }

    .ruled-row {
      box-sizing: border-box;
      min-height: 5.5mm;
      padding: 0.6mm 1.2mm;
      border-bottom: 1px solid var(--form033-border);
      font-size: 6.5pt;
      line-height: 1.2;
      color: var(--form033-ink);
      overflow-wrap: anywhere;
    }
  `,
})
export class Form033SessionRowComponent {
  readonly session = input.required<Form033TreatmentSession>();
}
