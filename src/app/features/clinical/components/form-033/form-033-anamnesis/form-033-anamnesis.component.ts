import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { splitTextLines, toRuledLines } from '../../../domain/form-033';
import { MedicalHistoryCondition } from '../../../models/clinical-record.models';

@Component({
  selector: 'bd-form-033-anamnesis',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form033-anamnesis">
      <!-- 1 MOTIVO DE CONSULTA (1 renglón) -->
      <section class="form033-section">
        <header class="section-band">
          <span class="section-title">1 MOTIVO DE CONSULTA</span>
          <span class="section-subtext">ANOTAR LA CAUSA DEL PROBLEMA EN LA VERSIÓN DEL INFORMANTE</span>
        </header>
        <div class="ruled-lines">
          @for (line of complaintLines(); track $index) {
            <div class="ruled-line">{{ line }}</div>
          }
        </div>
      </section>

      <!-- 2 ENFERMEDAD O PROBLEMA ACTUAL (3 renglones) -->
      <section class="form033-section">
        <header class="section-band">
          <span class="section-title">2 ENFERMEDAD O PROBLEMA ACTUAL</span>
          <span class="section-subtext">REGISTRAR SÍNTOMAS: CRONOLOGÍA, LOCALIZACIÓN, CARACTERÍSTICAS, INTENSIDAD, CAUSA APARENTE, SÍNTOMAS ASOCIADOS, EVOLUCIÓN, ESTADO ACTUAL.</span>
        </header>
        <div class="ruled-lines">
          @for (line of illnessLines(); track $index) {
            <div class="ruled-line">{{ line }}</div>
          }
        </div>
      </section>

      <!-- 3 ANTECEDENTES PERSONALES Y FAMILIARES (una fila de etiqueta + casilla por condición, 2 renglones) -->
      <section class="form033-section">
        <header class="section-band">
          <span class="section-title">3 ANTECEDENTES PERSONALES Y FAMILIARES</span>
        </header>

        <table class="form033-table form033-history-table">
          <tbody>
            <tr>
              @for (cond of sortedConditions(); track cond.id) {
                <td class="cell-label">{{ formatConditionTitle(cond) }}</td>
                <td class="cell-mark">{{ historyMarks()[cond.id] ? 'X' : '' }}</td>
              }
            </tr>
          </tbody>
        </table>

        <div class="ruled-lines">
          @for (line of historyRuledLines(); track $index) {
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

    .form033-anamnesis {
      display: flex;
      flex-direction: column;
      gap: 1.5mm;
      width: 100%;
    }

    .form033-history-table .cell-label {
      height: 14pt;
    }

    .form033-history-table .cell-mark {
      width: 4.5mm;
      height: 11pt;
    }
  `,
})
export class Form033AnamnesisComponent {
  readonly chiefComplaint = input<string>('');
  readonly currentIllness = input<string>('');
  readonly conditions = input<MedicalHistoryCondition[]>([]);
  readonly historyMarks = input<Record<number, boolean>>({});
  readonly historyLines = input<string[]>([]);

  readonly complaintLines = computed(() => toRuledLines(splitTextLines(this.chiefComplaint()), 1));
  readonly illnessLines = computed(() => toRuledLines(splitTextLines(this.currentIllness()), 3));
  readonly historyRuledLines = computed(() => toRuledLines(this.historyLines(), 2));

  readonly sortedConditions = computed<MedicalHistoryCondition[]>(() => {
    return [...(this.conditions() || [])].sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
  });

  formatConditionTitle(cond: MedicalHistoryCondition): string {
    const order = cond.displayOrder;
    const name = cond.name.toUpperCase();
    if (name.includes('ANTIBIOTICO') || name.includes('ANTIBIÓTICO')) return `${order}. ALERGIA ANTIBIÓTICO`;
    if (name.includes('ANESTESIA')) return `${order}. ALERGIA ANESTESIA`;
    if (name.includes('HEMORRAGIA')) return `${order}. HEMORRAGIAS`;
    if (name.includes('TUBERCULOSIS')) return `${order}. TUBERCULOSIS`;
    if (name.includes('HIPERTENSION') || name.includes('HIPERTENSIÓN')) return `${order}. HIPERTENSIÓN`;
    if (name.includes('CARDIACA') || name.includes('CARDÍACA')) return `${order}. ENF. CARDÍACA`;
    return `${order}. ${name}`;
  }
}
