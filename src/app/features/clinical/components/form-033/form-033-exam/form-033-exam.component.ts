import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Form033VitalSigns, splitTextLines, toRuledLines } from '../../../domain/form-033';

@Component({
  selector: 'bd-form-033-exam',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form033-exam">
      <!-- 4 SIGNOS VITALES: una fila de etiqueta + valor por signo -->
      <section class="form033-section">
        <header class="section-band">
          <span class="section-title">4 SIGNOS VITALES</span>
        </header>
        <table class="form033-table form033-vitals-table">
          <tbody>
            <tr>
              <td class="cell-label">PRESIÓN ARTERIAL</td>
              <td class="cell-val text-center">{{ vitalSigns().bp }}</td>
              <td class="cell-label">FRECUENCIA CARDÍACA min.</td>
              <td class="cell-val text-center">{{ vitalSigns().heartRate }}</td>
              <td class="cell-label">TEMPERATURA °C</td>
              <td class="cell-val text-center">{{ vitalSigns().temperature }}</td>
              <td class="cell-label">F. RESPIRAT. min.</td>
              <td class="cell-val text-center">{{ vitalSigns().respiratoryRate }}</td>
              <td class="cell-val cell-blank"></td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- 5 EXAMEN DEL SISTEMA ESTOMATOGNÁTICO: regiones en blanco (no se guardan) y 5 renglones -->
      <section class="form033-section">
        <header class="section-band">
          <span class="section-title">5 EXAMEN DEL SISTEMA ESTOMATOGNÁTICO</span>
          <span class="section-subtext">DESCRIBIR ABAJO LA PATOLOGÍA DE LA REGIÓN AFECTADA ANOTANDO EL NÚMERO</span>
        </header>

        <div class="regions-grid regions-grid--8">
          @for (reg of regionsRow1; track reg.id) {
            <div class="region-box">
              <span class="region-label">{{ reg.id }}. {{ reg.name }}</span>
              <span class="region-mark"></span>
            </div>
          }
        </div>

        <div class="regions-grid regions-grid--8">
          @for (reg of regionsRow2; track reg.id) {
            <div class="region-box">
              <span class="region-label">{{ reg.id }}. {{ reg.name }}</span>
              <span class="region-mark"></span>
            </div>
          }
          <div class="regions-filler"></div>
        </div>

        <div class="ruled-lines">
          @for (line of examLines(); track $index) {
            <div class="ruled-line">{{ line }}</div>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    @use '../form-033' as f033;
    @include f033.section;
    @include f033.band;
    @include f033.table;
    @include f033.ruled-lines;

    .form033-exam {
      display: flex;
      flex-direction: column;
      gap: 1.5mm;
      width: 100%;
    }

    .form033-vitals-table .cell-label {
      height: 12pt;
    }

    .form033-vitals-table .cell-val {
      height: 12pt;
    }

    .form033-vitals-table td:nth-child(1) { width: 9%; }
    .form033-vitals-table td:nth-child(2) { width: 6%; }
    .form033-vitals-table td:nth-child(3) { width: 13%; }
    .form033-vitals-table td:nth-child(4) { width: 5%; }
    .form033-vitals-table td:nth-child(5) { width: 8%; }
    .form033-vitals-table td:nth-child(6) { width: 6%; }
    .form033-vitals-table td:nth-child(7) { width: 9%; }
    .form033-vitals-table td:nth-child(8) { width: 6%; }

    .regions-grid {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      width: 100%;
      box-sizing: border-box;
      border-bottom: 1px solid var(--form033-border);
    }

    .region-box {
      display: flex;
      border-right: 1px solid var(--form033-border);
      box-sizing: border-box;
      min-height: 11pt;
    }

    .regions-filler {
      grid-column: span 4;
    }

    .region-label {
      flex: 1;
      min-width: 0;
      background-color: var(--form033-label);
      font-size: 5pt;
      font-weight: 700;
      line-height: 1.1;
      display: flex;
      align-items: center;
      padding: 0.5pt 2pt;
      color: var(--form033-ink);
    }

    .region-mark {
      width: 11pt;
      background-color: var(--form033-mark);
      border-left: 1px solid var(--form033-border);
    }
  `,
})
export class Form033ExamComponent {
  readonly vitalSigns = input<Form033VitalSigns>({
    bp: '',
    heartRate: '',
    temperature: '',
    respiratoryRate: '',
  });
  readonly stomatognathicExam = input<string>('');

  readonly examLines = computed(() => toRuledLines(splitTextLines(this.stomatognathicExam()), 5));

  readonly regionsRow1 = [
    { id: 1, name: 'LABIOS' },
    { id: 2, name: 'MEJILLAS' },
    { id: 3, name: 'MAXILAR SUP.' },
    { id: 4, name: 'MAXILAR INF.' },
    { id: 5, name: 'LENGUA' },
    { id: 6, name: 'PALADAR' },
    { id: 7, name: 'PISO' },
    { id: 8, name: 'CARRILLOS' },
  ];

  readonly regionsRow2 = [
    { id: 9, name: 'GLÁNDULAS SALIVALES' },
    { id: 10, name: 'OROFARINGE' },
    { id: 11, name: 'A. T. M.' },
    { id: 12, name: 'GANGLIOS' },
  ];
}
