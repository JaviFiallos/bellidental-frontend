import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  DentalIndices,
  Finding,
  OdontogramCatalog,
  OdontogramComponent,
  PatientOdontogram,
} from '../../../../odontogram';
import { Form033Malocclusion, Form033OralHealthMarks, Form033Severity } from '../../../domain/form-033';
import { Form033SymbologyComponent } from '../form-033-symbology/form-033-symbology.component';

const SEVERITY_OPTIONS: { value: Form033Severity; label: string }[] = [
  { value: 'LEVE', label: 'LEVE' },
  { value: 'MODERADA', label: 'MODERADA' },
  { value: 'SEVERA', label: 'SEVERA' },
];

const MALOCCLUSION_OPTIONS: { value: Form033Malocclusion; label: string }[] = [
  { value: 'ANGLE_I', label: 'ANGLE I' },
  { value: 'ANGLE_II', label: 'ANGLE II' },
  { value: 'ANGLE_III', label: 'ANGLE III' },
];

@Component({
  selector: 'bd-form-033-oral-health',
  standalone: true,
  imports: [OdontogramComponent, Form033SymbologyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form033-oral">
      <!-- 6 ODONTOGRAMA -->
      <section class="form033-section">
        <header class="section-band">
          <span class="section-title">6 ODONTOGRAMA</span>
          <span class="section-subtext">PINTAR CON: AZUL PARA TRATAMIENTO REALIZADO - ROJO PARA PATOLOGÍA ACTUAL &nbsp;|&nbsp; MOVILIDAD Y RECESIÓN: MARCAR "X" (1, 2 ó 3), SI APLICA</span>
        </header>
        <div class="odontogram-box">
          @if (catalog(); as cat) {
            <bd-odontogram
              [catalog]="cat"
              [findings]="findings()"
              [indices]="indices()"
              variant="form-033"
            />
          }
        </div>
      </section>

      <!-- Fila inferior: secciones 7, 8 y 9 -->
      <div class="oral-bottom-grid">
        <!-- 7 INDICADORES DE SALUD BUCAL -->
        <section class="form033-section">
          <header class="section-band">
            <span class="section-title">7 INDICADORES DE SALUD BUCAL</span>
          </header>
          <div class="sec7-content">
            <table class="form033-table table-hygiene">
              <thead>
                <tr>
                  <th colspan="4" class="cell-label cell-hygiene-title">HIGIENE ORAL SIMPLIFICADA</th>
                </tr>
                <tr>
                  <th class="cell-label col-pieces">PIEZAS DENTALES</th>
                  <th class="cell-label col-score">PLACA<br><span class="scale-text">0-1-2-3-9</span></th>
                  <th class="cell-label col-score">CÁLCULO<br><span class="scale-text">0-1-2-3</span></th>
                  <th class="cell-label col-score">GINGIVITIS<br><span class="scale-text">0-1</span></th>
                </tr>
              </thead>
              <tbody>
                <tr><td class="cell-piece">16 &nbsp; 17 &nbsp; 55</td><td class="cell-val"></td><td class="cell-val"></td><td class="cell-val"></td></tr>
                <tr><td class="cell-piece">11 &nbsp; 21 &nbsp; 51</td><td class="cell-val"></td><td class="cell-val"></td><td class="cell-val"></td></tr>
                <tr><td class="cell-piece">26 &nbsp; 27 &nbsp; 65</td><td class="cell-val"></td><td class="cell-val"></td><td class="cell-val"></td></tr>
                <tr><td class="cell-piece">36 &nbsp; 37 &nbsp; 75</td><td class="cell-val"></td><td class="cell-val"></td><td class="cell-val"></td></tr>
                <tr><td class="cell-piece">31 &nbsp; 41 &nbsp; 71</td><td class="cell-val"></td><td class="cell-val"></td><td class="cell-val"></td></tr>
                <tr><td class="cell-piece">46 &nbsp; 47 &nbsp; 85</td><td class="cell-val"></td><td class="cell-val"></td><td class="cell-val"></td></tr>
                <tr class="row-total">
                  <td class="cell-total-label">TOTALES</td>
                  <td class="cell-total"></td>
                  <td class="cell-total"></td>
                  <td class="cell-total"></td>
                </tr>
              </tbody>
            </table>

            <div class="sec7-right-col">
              <div class="sec7-block">
                <span class="cell-label block-header">ENFERMEDAD PERIODONTAL</span>
                <div class="block-options">
                  @for (option of severityOptions; track option.value) {
                    <span class="opt-label">{{ option.label }}</span>
                    <span class="cell-mark">{{ oralHealthMarks().periodontal === option.value ? 'X' : '' }}</span>
                  }
                </div>
              </div>

              <div class="sec7-block">
                <span class="cell-label block-header">MAL OCLUSIÓN</span>
                <div class="block-options">
                  @for (option of malocclusionOptions; track option.value) {
                    <span class="opt-label">{{ option.label }}</span>
                    <span class="cell-mark">{{ oralHealthMarks().malocclusion === option.value ? 'X' : '' }}</span>
                  }
                </div>
              </div>

              <div class="sec7-block">
                <span class="cell-label block-header">FLUOROSIS</span>
                <div class="block-options">
                  @for (option of severityOptions; track option.value) {
                    <span class="opt-label">{{ option.label }}</span>
                    <span class="cell-mark">{{ oralHealthMarks().fluorosis === option.value ? 'X' : '' }}</span>
                  }
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Columna derecha: 8 índices CPO-ceo y 9 simbología -->
        <div class="oral-right-col">
          <!-- 8 ÍNDICES CPO-ceo -->
          <section class="form033-section">
            <header class="section-band">
              <span class="section-title">8 ÍNDICES CPO-ceo</span>
            </header>
            <table class="form033-table table-cpo">
              <thead>
                <tr>
                  <th class="cell-label cell-dentition">D</th>
                  <th class="cell-label">C</th>
                  <th class="cell-label">P</th>
                  <th class="cell-label">O</th>
                  <th class="cell-total-label">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="cell-dentition"></td>
                  <td class="cell-val text-center">{{ cpoValues().c }}</td>
                  <td class="cell-val text-center">{{ cpoValues().p }}</td>
                  <td class="cell-val text-center">{{ cpoValues().o }}</td>
                  <td class="cell-total text-center font-bold">{{ cpoValues().total }}</td>
                </tr>
                <tr class="header-ceo">
                  <td class="cell-label cell-dentition">d</td>
                  <td class="cell-label">c</td>
                  <td class="cell-label">e</td>
                  <td class="cell-label">o</td>
                  <td class="cell-total-label">TOTAL</td>
                </tr>
                <tr>
                  <td class="cell-dentition"></td>
                  <td class="cell-val text-center">{{ ceoValues().c }}</td>
                  <td class="cell-val text-center">{{ ceoValues().e }}</td>
                  <td class="cell-val text-center">{{ ceoValues().o }}</td>
                  <td class="cell-total text-center font-bold">{{ ceoValues().total }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <bd-form-033-symbology [catalog]="catalog()" />
        </div>
      </div>
    </div>
  `,
  styles: `
    @use '../form-033' as f033;
    @include f033.section;
    @include f033.band;
    @include f033.table;

    .form033-oral {
      display: flex;
      flex-direction: column;
      gap: 1.5mm;
      width: 100%;
    }

    .section-subtext {
      font-size: 4.8pt;
    }

    .odontogram-box {
      background-color: var(--form033-odontogram);
      padding: 2pt 4pt;
      display: flex;
      justify-content: center;
      align-items: center;
      max-height: 58mm;
      overflow: hidden;
      box-sizing: border-box;
    }

    .odontogram-box ::ng-deep .odontogram-container {
      max-width: 100% !important;
      margin: 0 !important;
      gap: 0 !important;
    }

    .odontogram-box ::ng-deep .odontogram-svg {
      max-height: 54mm;
      width: 100%;
      height: auto;
    }

    .oral-bottom-grid {
      display: grid;
      grid-template-columns: 55% 45%;
      gap: 1.5mm;
      width: 100%;
    }

    .oral-right-col {
      display: flex;
      flex-direction: column;
      gap: 1.5mm;
    }

    .sec7-content {
      display: flex;
      gap: 1mm;
      padding: 1.5pt;
      box-sizing: border-box;
    }

    .form033-table th,
    .form033-table td {
      padding: 0.5pt 1pt;
    }

    .cell-label {
      font-size: 5pt;
      height: 10pt;
      line-height: 1.05;
    }

    .cell-hygiene-title {
      height: 9pt;
      font-size: 5.2pt;
    }

    .col-pieces {
      width: 34%;
    }

    .col-score {
      width: 22%;
    }

    .scale-text {
      font-size: 4.5pt;
      font-weight: normal;
    }

    .cell-piece {
      background-color: var(--form033-paper);
      font-size: 5.5pt;
      text-align: center;
      height: 8.5pt;
      vertical-align: middle;
      color: var(--form033-ink);
    }

    .cell-val {
      height: 8.5pt;
      font-size: 6pt;
    }

    .row-total td {
      height: 9pt;
    }

    .cell-total-label {
      background-color: var(--form033-total);
      font-size: 5pt;
      font-weight: 700;
      text-align: center;
      vertical-align: middle;
      color: var(--form033-ink);
    }

    .cell-total {
      background-color: var(--form033-total);
      font-size: 6pt;
      vertical-align: middle;
      color: var(--form033-ink);
    }

    .table-hygiene {
      width: 62%;
    }

    .sec7-right-col {
      width: 38%;
      display: flex;
      flex-direction: column;
      gap: 1.5pt;
    }

    .sec7-block {
      border: 1px solid var(--form033-border);
      display: flex;
      flex-direction: column;
    }

    .block-header {
      border-bottom: 1px solid var(--form033-border);
      padding: 0.5pt 1pt;
      font-size: 4.8pt;
    }

    .block-options {
      display: grid;
      grid-template-columns: 1fr 14pt;
      align-items: center;
    }

    .opt-label {
      font-size: 4.8pt;
      padding-left: 2pt;
      border-bottom: 1px solid var(--form033-border);
      height: 8pt;
      display: flex;
      align-items: center;
      color: var(--form033-ink);
    }

    .block-options .cell-mark {
      height: 8pt;
      line-height: 8pt;
      border-left: 1px solid var(--form033-border);
      border-bottom: 1px solid var(--form033-border);
      font-size: 6.5pt;
    }

    .block-options > :nth-last-child(-n + 2) {
      border-bottom: none;
    }

    .table-cpo {
      width: 100%;
    }

    .cell-dentition {
      width: 12pt;
      text-align: center;
      font-size: 6pt;
      font-weight: 700;
      background-color: var(--form033-paper);
      color: var(--form033-ink);
    }
  `,
})
export class Form033OralHealthComponent {
  readonly odontogram = input<PatientOdontogram | null>(null);
  readonly catalog = input<OdontogramCatalog | null>(null);
  readonly oralHealthMarks = input<Form033OralHealthMarks>({
    periodontal: null,
    malocclusion: null,
    fluorosis: null,
  });

  readonly severityOptions = SEVERITY_OPTIONS;
  readonly malocclusionOptions = MALOCCLUSION_OPTIONS;

  readonly findings = computed<Finding[]>(() => {
    return this.odontogram()?.findings ?? [];
  });

  readonly indices = computed<DentalIndices | null>(() => {
    return this.odontogram()?.indices ?? null;
  });

  readonly cpoValues = computed(() => {
    const idx = this.indices();
    return {
      c: idx?.cpoC ?? 0,
      p: idx?.cpoP ?? 0,
      o: idx?.cpoO ?? 0,
      total: idx?.cpoTotal ?? 0,
    };
  });

  readonly ceoValues = computed(() => {
    const idx = this.indices();
    return {
      c: idx?.ceoC ?? 0,
      e: idx?.ceoE ?? 0,
      o: idx?.ceoO ?? 0,
      total: idx?.ceoTotal ?? 0,
    };
  });
}
