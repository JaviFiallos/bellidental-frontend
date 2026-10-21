import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Form033AgeGroupMarks } from '../../../domain/form-033';

@Component({
  selector: 'bd-form-033-identification',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="form033-ident" aria-label="Identificación del paciente">
      <!-- Identificación: etiquetas arriba, valores debajo -->
      <table class="form033-table form033-ident__main-table">
        <thead>
          <tr>
            <th class="cell-label">ESTABLECIMIENTO</th>
            <th class="cell-label">NOMBRE</th>
            <th class="cell-label">APELLIDO</th>
            <th class="cell-label">SEXO (M-F)</th>
            <th class="cell-label">EDAD</th>
            <th class="cell-label">Nº HISTORIA CLÍNICA</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="cell-val">{{ clinicName() }}</td>
            <td class="cell-val">{{ firstName() }}</td>
            <td class="cell-val">{{ lastName() }}</td>
            <td class="cell-val text-center">{{ sex() }}</td>
            <td class="cell-val text-center">{{ age() }}</td>
            <td class="cell-val text-center font-bold">{{ recordNumber() }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Grupos de edad: una fila de etiqueta + casilla por grupo -->
      <table class="form033-table form033-ident__age-table">
        <tbody>
          <tr>
            <td class="cell-label">MENOR DE 1 AÑO</td>
            <td class="cell-mark">{{ mark(ageMarks().menor1) }}</td>
            <td class="cell-label">1 - 4 AÑOS</td>
            <td class="cell-mark">{{ mark(ageMarks().de1a4) }}</td>
            <td class="cell-label">5 - 9 AÑOS PROGRAMADO</td>
            <td class="cell-mark">{{ mark(ageMarks().de5a9Prog) }}</td>
            <td class="cell-label">5-14 AÑOS NO PROGRAMADO</td>
            <td class="cell-mark">{{ mark(ageMarks().de5a14NoProg) }}</td>
            <td class="cell-label">10-14 AÑOS PROGRAMADO</td>
            <td class="cell-mark">{{ mark(ageMarks().de10a14Prog) }}</td>
            <td class="cell-label">15 - 19 AÑOS</td>
            <td class="cell-mark">{{ mark(ageMarks().de15a19) }}</td>
            <td class="cell-label">MAYOR DE 20 AÑOS</td>
            <td class="cell-mark">{{ mark(ageMarks().mayor20) }}</td>
            <td class="cell-label">EMBARAZADA</td>
            <td class="cell-mark">{{ mark(ageMarks().embarazada) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  `,
  styles: `
    @use '../form-033' as f033;
    @include f033.section;
    @include f033.table;

    .form033-ident {
      display: flex;
      flex-direction: column;
      gap: 1mm;
      width: 100%;
    }

    .form033-ident__main-table th:nth-child(1) { width: 25%; }
    .form033-ident__main-table th:nth-child(2),
    .form033-ident__main-table th:nth-child(3) { width: 22%; }
    .form033-ident__main-table th:nth-child(4),
    .form033-ident__main-table th:nth-child(5) { width: 8%; }
    .form033-ident__main-table th:nth-child(6) { width: 15%; }

    .form033-ident__main-table .cell-label {
      height: 13pt;
      white-space: nowrap;
      overflow: hidden;
    }

    .form033-ident__main-table .cell-val {
      height: 14pt;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .form033-ident__age-table .cell-label {
      font-size: 5.5pt;
      height: 13pt;
    }

    .form033-ident__age-table .cell-mark {
      width: 5mm;
      height: 13pt;
    }
  `,
})
export class Form033IdentificationComponent {
  readonly clinicName = input<string>('');
  readonly firstName = input<string>('');
  readonly lastName = input<string>('');
  readonly sex = input<string>('');
  readonly age = input<number | string>('');
  readonly recordNumber = input<string>('');
  readonly ageMarks = input<Form033AgeGroupMarks>({
    menor1: false,
    de1a4: false,
    de5a9Prog: false,
    de5a14NoProg: false,
    de10a14Prog: false,
    de15a19: false,
    mayor20: false,
    embarazada: false,
  });

  mark(checked: boolean): string {
    return checked ? 'X' : '';
  }
}
