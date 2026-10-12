import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  buildLayout,
  LayoutPeriodontalCell,
  LayoutTooth,
  OdontogramLayout,
} from '../../domain/odontogram-layout';
import {
  buildAccessibleToothLabel,
  buildMarks,
  MarksMap,
  ToothMarks,
} from '../../domain/finding-symbol';
import {
  DentalIndices,
  Finding,
  OdontogramCatalog,
  Tooth,
} from '../../models/odontogram.models';
import { DentalIndicesComponent } from '../dental-indices/dental-indices.component';
import { PeriodontalRowComponent } from '../periodontal-row/periodontal-row.component';
import { ToothComponent } from '../tooth/tooth.component';

interface RenderedToothItem {
  tooth: Tooth;
  layout: LayoutTooth;
  marks: ToothMarks | null;
  label: string;
}

@Component({
  selector: 'bd-odontogram',
  standalone: true,
  imports: [
    ToothComponent,
    PeriodontalRowComponent,
    DentalIndicesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="odontogram-container">
      <svg
        [attr.viewBox]="viewBox"
        role="group"
        aria-label="Odontograma"
        class="odontogram-svg"
      >
        <!-- Etiquetas laterales de fila -->
        @for (lbl of layout.labels; track lbl.text + lbl.y) {
          <svg:text
            [attr.x]="lbl.x"
            [attr.y]="lbl.y"
            text-anchor="end"
            dominant-baseline="central"
            class="odontogram-label"
          >
            {{ lbl.text }}
          </svg:text>
        }

        <!-- Línea media (vertical discontinua) -->
        <svg:line
          [attr.x1]="layout.midlineX"
          y1="2"
          [attr.x2]="layout.midlineX"
          [attr.y2]="layout.height - 2"
          stroke="var(--slate-300)"
          stroke-dasharray="3 3"
        />

        <!-- Separador horizontal (arcada superior / inferior) -->
        <svg:line
          [attr.x1]="layout.separatorX1"
          [attr.y1]="layout.separatorY"
          [attr.x2]="layout.separatorX2"
          [attr.y2]="layout.separatorY"
          stroke="var(--slate-200)"
        />

        <!-- Filas periodontales -->
        <svg:g
          bdPeriodontalRow
          rowType="recU"
          [cells]="recUCells()"
          [marksByTooth]="marksMap().byTooth"
        />
        <svg:g
          bdPeriodontalRow
          rowType="movU"
          [cells]="movUCells()"
          [marksByTooth]="marksMap().byTooth"
        />
        <svg:g
          bdPeriodontalRow
          rowType="movL"
          [cells]="movLCells()"
          [marksByTooth]="marksMap().byTooth"
        />
        <svg:g
          bdPeriodontalRow
          rowType="recL"
          [cells]="recLCells()"
          [marksByTooth]="marksMap().byTooth"
        />

        <!-- Piezas dentales (52 piezas) -->
        @for (item of renderedTeeth(); track item.tooth.code) {
          <svg:g
            bdTooth
            [tooth]="item.tooth"
            [x]="item.layout.x"
            [y]="item.layout.y"
            [size]="item.layout.size"
            [shape]="item.layout.shape"
            [numberX]="item.layout.numberX"
            [numberY]="item.layout.numberY"
            [marks]="item.marks"
            [label]="item.label"
          />
        }
      </svg>

      <!-- Índices CPO y ceo -->
      <bd-dental-indices
        [indices]="indices()"
        [hasFindings]="findings().length > 0"
      />
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .odontogram-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 56rem;
      margin: 0 auto;
    }

    .odontogram-svg {
      display: block;
      width: 100%;
      height: auto;
      max-width: 56rem;
      margin: 0 auto;
      font-family: inherit;
      user-select: none;
    }

    .odontogram-label {
      font-size: 15px;
      fill: var(--slate-500);
      letter-spacing: 0.04em;
      font-weight: 500;
    }
  `,
})
export class OdontogramComponent {
  readonly catalog = input.required<OdontogramCatalog>();
  readonly findings = input<Finding[]>([]);
  readonly indices = input<DentalIndices | null>(null);

  readonly layout: OdontogramLayout = buildLayout();
  readonly viewBox = `0 0 ${this.layout.width} ${this.layout.height}`;

  readonly marksMap = computed<MarksMap>(() => {
    return buildMarks(this.findings(), this.catalog());
  });

  readonly recUCells = computed<LayoutPeriodontalCell[]>(() => {
    return this.layout.periodontalCells.filter((c) => c.row === 'recU');
  });

  readonly movUCells = computed<LayoutPeriodontalCell[]>(() => {
    return this.layout.periodontalCells.filter((c) => c.row === 'movU');
  });

  readonly movLCells = computed<LayoutPeriodontalCell[]>(() => {
    return this.layout.periodontalCells.filter((c) => c.row === 'movL');
  });

  readonly recLCells = computed<LayoutPeriodontalCell[]>(() => {
    return this.layout.periodontalCells.filter((c) => c.row === 'recL');
  });

  readonly renderedTeeth = computed<RenderedToothItem[]>(() => {
    const cat = this.catalog();
    const marks = this.marksMap();
    const toothMap = new Map<number, Tooth>();
    for (const t of cat.teeth) {
      toothMap.set(t.code, t);
    }

    return this.layout.teeth.map((lt) => {
      let tooth = toothMap.get(lt.code);
      if (!tooth) {
        const quadrant = Math.floor(lt.code / 10);
        const position = lt.code % 10;
        const isDeciduous = quadrant >= 5;
        const arch = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6 ? 'UPPER' : 'LOWER';
        const type = position <= 2 ? 'INCISOR' : position === 3 ? 'CANINE' : position <= 5 ? (isDeciduous ? 'MOLAR' : 'PREMOLAR') : 'MOLAR';
        tooth = {
          code: lt.code,
          dentition: isDeciduous ? 'DECIDUOUS' : 'PERMANENT',
          arch,
          quadrant,
          position,
          type,
        };
      }

      const toothMarks = marks.byTooth[lt.code] || null;
      const label = buildAccessibleToothLabel(lt.code, cat, toothMarks || undefined);

      return {
        tooth,
        layout: lt,
        marks: toothMarks,
        label,
      };
    });
  });
}
