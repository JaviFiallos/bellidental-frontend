import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  CELL_HEIGHT,
  LayoutPeriodontalCell,
  PeriodontalRowType,
  TOOTH,
} from '../../domain/odontogram-layout';
import { toRomanNumeral, ToothMarks } from '../../domain/finding-symbol';

interface CellViewModel {
  cell: LayoutPeriodontalCell;
  text: string | null;
  color: string | null;
}

@Component({
  selector: 'g[bdPeriodontalRow]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (item of renderedCells(); track item.cell.column) {
      <svg:g
        [attr.data-row]="rowType()"
        [attr.data-column]="item.cell.permanentCode"
        [style.cursor]="editable() ? 'pointer' : null"
        (click)="onCellClick(item.cell)"
      >
        <svg:rect
          [attr.x]="item.cell.x"
          [attr.y]="item.cell.y"
          [attr.width]="toothWidth"
          [attr.height]="cellHeight"
          rx="3"
          fill="var(--white)"
          stroke="var(--slate-300)"
          stroke-width="1"
        />

        @if (item.text) {
          <svg:text
            [attr.x]="item.cell.x + toothWidth / 2"
            [attr.y]="item.cell.y + cellHeight / 2"
            text-anchor="middle"
            dominant-baseline="central"
            [attr.fill]="item.color"
            font-weight="700"
            font-size="15"
          >
            {{ item.text }}
          </svg:text>
        }
      </svg:g>
    }
  `,
})
export class PeriodontalRowComponent {
  readonly rowType = input.required<PeriodontalRowType>();
  readonly cells = input.required<LayoutPeriodontalCell[]>();
  readonly marksByTooth = input.required<Record<number, ToothMarks>>();
  readonly editable = input<boolean>(false);

  readonly cellClick = output<{ permanentCode: number; rowType: PeriodontalRowType }>();

  readonly toothWidth = TOOTH;
  readonly cellHeight = CELL_HEIGHT;

  readonly renderedCells = computed<CellViewModel[]>(() => {
    const isRecession = this.rowType() === 'recU' || this.rowType() === 'recL';
    const marks = this.marksByTooth();

    return this.cells().map((cell) => {
      const perm = marks[cell.permanentCode];
      const dec = cell.deciduousCode ? marks[cell.deciduousCode] : undefined;

      const permVal = isRecession ? perm?.recession : perm?.mobility;
      const decVal = isRecession ? dec?.recession : dec?.mobility;
      const effective = permVal ?? decVal;

      let text: string | null = null;
      let color: string | null = null;

      if (effective) {
        text = isRecession ? toRomanNumeral(effective.grade) : String(effective.grade);
        color = effective.color;
      }

      return {
        cell,
        text,
        color,
      };
    });
  });

  onCellClick(cell: LayoutPeriodontalCell): void {
    if (!this.editable()) return;
    this.cellClick.emit({ permanentCode: cell.permanentCode, rowType: this.rowType() });
  }
}
