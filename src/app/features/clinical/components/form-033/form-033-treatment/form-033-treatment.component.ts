import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Form033TreatmentSession } from '../../../domain/form-033';
import { Form033SessionRowComponent } from '../form-033-session-row/form-033-session-row.component';

@Component({
  selector: 'bd-form-033-treatment',
  standalone: true,
  imports: [Form033SessionRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="form033-section">
      <header class="section-band">
        <span class="section-title">12 TRATAMIENTO</span>
      </header>

      <div class="treatment-columns">
        <div class="treatment-block treatment-block--left">
          <div class="treatment-col treatment-label col-session">SESIÓN Y FECHA</div>
          <div class="treatment-col treatment-label col-diagnoses">DIAGNOSTICOS Y COMPLICACIONES</div>
        </div>
        <div class="treatment-block treatment-block--right">
          <div class="treatment-col treatment-label col-procedures">PROCEDIMIENTOS</div>
          <div class="treatment-col treatment-label col-prescriptions">PRESCRIPCIONES</div>
          <div class="treatment-col treatment-label col-signature">CÓDIGO Y FIRMA</div>
        </div>
      </div>

      @for (session of sessions(); track $index) {
        <bd-form-033-session-row [session]="session" />
      }
    </section>
  `,
  styles: `
    @use '../form-033' as f033;
    @include f033.section;
    @include f033.band;
    @include f033.treatment-columns;

    .form033-section {
      width: 100%;
    }

    .treatment-label {
      background-color: var(--form033-label);
      color: var(--form033-ink);
      font-size: 5.5pt;
      font-weight: 700;
      text-align: center;
      justify-content: center;
      align-items: center;
      line-height: 1.1;
      padding: 0.8mm 1mm;
      border-bottom: 1px solid var(--form033-border);
    }
  `,
})
export class Form033TreatmentComponent {
  readonly sessions = input.required<Form033TreatmentSession[]>();
}
