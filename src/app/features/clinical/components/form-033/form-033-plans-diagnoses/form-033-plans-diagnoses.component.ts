import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Form033DiagnosisItem, Form033PlanMarks, formatClinicDate, toRuledLines } from '../../../domain/form-033';

@Component({
  selector: 'bd-form-033-plans-diagnoses',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form033-plans-diag">
      <!-- 10 PLANES DE DIAGNÓSTICO, TERAPÉUTICO Y EDUCACIONAL (4 renglones) -->
      <section class="form033-section">
        <header class="section-band">
          <span class="section-title">10 PLANES DE DIAGNÓSTICO, TERAPÉUTICO Y EDUCACIONAL</span>
        </header>

        <table class="form033-table form033-plans-table">
          <tbody>
            <tr>
              <td class="cell-label">BIOMETRÍA</td>
              <td class="cell-mark">{{ planMarks().biometria ? 'X' : '' }}</td>
              <td class="cell-label">QUÍMICA SANGUÍNEA</td>
              <td class="cell-mark">{{ planMarks().quimicaSanguinea ? 'X' : '' }}</td>
              <td class="cell-label">RAYOS - X</td>
              <td class="cell-mark">{{ planMarks().rayosX ? 'X' : '' }}</td>
              <td class="cell-label">OTROS</td>
              <td class="cell-mark">{{ planMarks().otros ? 'X' : '' }}</td>
              <td class="cell-val cell-blank"></td>
            </tr>
          </tbody>
        </table>

        <div class="ruled-lines">
          @for (line of planRuledLines(); track $index) {
            <div class="ruled-line">{{ line }}</div>
          }
        </div>
      </section>

      <!-- 11 DIAGNÓSTICO: los encabezados CIE / PRE / DEF van en la banda, sobre cada bloque -->
      <section class="form033-section">
        <header class="section-band diag-band">
          <div class="diag-block-head">
            <div class="diag-title">
              <span class="section-title">11 DIAGNÓSTICO</span>
              <span class="section-subtext">PRE= PRESUNTIVO &nbsp;&nbsp; DEF= DEFINITIVO</span>
            </div>
            <span class="diag-caption">CIE</span>
            <span class="diag-caption">PRE</span>
            <span class="diag-caption">DEF</span>
          </div>
          <div class="diag-block-head">
            <div class="diag-title"></div>
            <span class="diag-caption">CIE</span>
            <span class="diag-caption">PRE</span>
            <span class="diag-caption">DEF</span>
          </div>
        </header>

        <div class="diag-grid">
          @for (column of diagnosisColumns(); track $index) {
            <div class="diag-column">
              @for (d of column; track d.index) {
                <div class="diag-row">
                  <span class="cell-num">{{ d.index }}</span>
                  <span class="cell-desc-val">{{ d.description }}</span>
                  <span class="cell-cie-val">{{ d.code }}</span>
                  <span class="cell-mark">{{ d.isPresumptive ? 'X' : '' }}</span>
                  <span class="cell-mark">{{ d.isDefinitive ? 'X' : '' }}</span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Fila de apertura: fecha, control, profesional, código, firma y número de hoja -->
        <table class="form033-table form033-opening-table">
          <tbody>
            <tr>
              <td class="cell-label">FECHA DE APERTURA</td>
              <td class="cell-val text-center">{{ openedAtLabel() }}</td>
              <td class="cell-label">FECHA DE CONTROL</td>
              <td class="cell-val"></td>
              <td class="cell-label">PROFESIONAL</td>
              <td class="cell-val">{{ professionalName() }}</td>
              <td class="cell-val text-center">
                <span class="cell-caption">CÓDIGO</span>
                {{ licenseNumber() }}
              </td>
              <td class="cell-label">FIRMA</td>
              <td class="cell-val"></td>
              <td class="cell-label">NÚMERO DE HOJA</td>
              <td class="cell-val text-center font-bold">{{ sheetNumber() }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  `,
  styles: `
    @use '../form-033' as f033;
    @include f033.section;
    @include f033.band;
    @include f033.table;
    @include f033.ruled-lines;

    .form033-plans-diag {
      display: flex;
      flex-direction: column;
      gap: 1.5mm;
      width: 100%;
    }

    .form033-plans-table .cell-label {
      width: 13%;
      height: 11pt;
    }

    .form033-plans-table .cell-mark {
      width: 5mm;
      height: 11pt;
    }

    .form033-plans-table .cell-blank {
      height: 11pt;
    }

    .diag-band {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      padding: 0;
    }

    .diag-block-head,
    .diag-row {
      display: grid;
      grid-template-columns: 12pt minmax(0, 1fr) 28pt 18pt 18pt;
    }

    .diag-block-head {
      align-items: center;
      padding: 1.5pt 0;
      box-sizing: border-box;
    }

    .diag-block-head:first-child {
      border-right: 1px solid var(--form033-border);
    }

    .diag-title {
      grid-column: span 2;
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding-left: 4pt;
    }

    .diag-caption {
      font-size: 5.5pt;
      font-weight: 700;
      text-align: center;
      color: var(--form033-ink);
    }

    .diag-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      border-bottom: 1px solid var(--form033-border);
    }

    .diag-column + .diag-column {
      border-left: 1px solid var(--form033-border);
    }

    .diag-row > * {
      border-bottom: 1px solid var(--form033-border);
      border-right: 1px solid var(--form033-border);
      box-sizing: border-box;
      min-height: 11pt;
      display: flex;
      align-items: center;
      overflow: hidden;
    }

    .diag-row > :last-child {
      border-right: none;
    }

    .cell-num {
      justify-content: center;
      font-weight: 700;
      font-size: 6.5pt;
      background-color: var(--form033-label);
      color: var(--form033-ink);
    }

    .cell-desc-val {
      padding: 0 2pt;
      font-size: 6.5pt;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: var(--form033-ink);
    }

    .cell-cie-val {
      justify-content: center;
      font-size: 6.5pt;
      font-weight: 700;
      color: var(--form033-ink);
    }

    .diag-row .cell-mark {
      justify-content: center;
    }

    .form033-opening-table .cell-label {
      height: 12pt;
    }

    .form033-opening-table .cell-val {
      height: 12pt;
    }

    .cell-caption {
      display: block;
      font-size: 5pt;
      font-weight: 700;
      line-height: 1;
      color: var(--form033-ink);
    }

    .form033-opening-table td:nth-child(1) { width: 11%; }
    .form033-opening-table td:nth-child(2) { width: 8%; }
    .form033-opening-table td:nth-child(3) { width: 10%; }
    .form033-opening-table td:nth-child(4) { width: 6%; }
    .form033-opening-table td:nth-child(5) { width: 8%; }
    .form033-opening-table td:nth-child(6) { width: 20%; }
    .form033-opening-table td:nth-child(7) { width: 10%; }
    .form033-opening-table td:nth-child(8) { width: 6%; }
    .form033-opening-table td:nth-child(9) { width: 6%; }
    .form033-opening-table td:nth-child(10) { width: 9%; }
    .form033-opening-table td:nth-child(11) { width: 6%; }
  `,
})
export class Form033PlansDiagnosesComponent {
  readonly planMarks = input<Form033PlanMarks>({
    biometria: false,
    quimicaSanguinea: false,
    rayosX: false,
    otros: false,
  });
  readonly planLines = input<string[]>([]);
  readonly diagnoses = input<Form033DiagnosisItem[]>([]);
  readonly openedAt = input<string>('');
  readonly professionalName = input<string>('');
  readonly licenseNumber = input<string>('');
  readonly sheetNumber = input<number>(1);

  readonly planRuledLines = computed(() => toRuledLines(this.planLines(), 4));

  /** Los 4 diagnósticos en dos columnas: 1–2 a la izquierda, 3–4 a la derecha. */
  readonly diagnosisColumns = computed<Form033DiagnosisItem[][]>(() => {
    const list = this.diagnoses();
    return [list.slice(0, 2), list.slice(2, 4)];
  });

  readonly openedAtLabel = computed(() => formatClinicDate(this.openedAt()));
}
