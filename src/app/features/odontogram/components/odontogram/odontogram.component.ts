import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  QueryList,
  signal,
  ViewChildren,
} from '@angular/core';
import {
  buildLayout,
  LayoutPeriodontalCell,
  LayoutTooth,
  LO_TEETH,
  OdontogramLayout,
  OdontogramView,
  toPermanentHomologue,
  UP_TEETH,
} from '../../domain/odontogram-layout';
import {
  buildAccessibleToothLabel,
  buildMarks,
  isToothInSpan,
  MarksMap,
  SpanItem,
  ToothMarks,
} from '../../domain/finding-symbol';
import { fallbackTooth } from '../../domain/tooth-names';
import {
  getInitialFocusedTooth,
  getNextTooth,
  getReadingOrderTeeth,
  NavKey,
} from '../../domain/tooth-navigation';
import {
  DentalIndices,
  Finding,
  OdontogramCatalog,
  Tooth,
} from '../../models/odontogram.models';
import { DentalIndicesComponent } from '../dental-indices/dental-indices.component';
import { PeriodontalRowComponent } from '../periodontal-row/periodontal-row.component';
import { ToothComponent } from '../tooth/tooth.component';
import { SpanBandComponent } from '../span-band/span-band.component';
import { OdontogramLegendComponent } from '../odontogram-legend/odontogram-legend.component';
import { SegmentedComponent, SegmentedOption } from '../../../../shared/components/segmented/segmented.component';

interface RenderedToothItem {
  tooth: Tooth;
  layout: LayoutTooth;
  marks: ToothMarks | null;
  label: string;
}

interface RenderedSpanItem {
  span: SpanItem;
  offset: number;
  label: string;
}

@Component({
  selector: 'bd-odontogram',
  standalone: true,
  imports: [
    ToothComponent,
    PeriodontalRowComponent,
    DentalIndicesComponent,
    SpanBandComponent,
    OdontogramLegendComponent,
    SegmentedComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="odontogram-container">
      <!-- Selector de cuadrantes si el contenedor mide menos de 720 px -->
      @if (isNarrow()) {
        <div class="odontogram-quadrant-bar">
          <bd-segmented
            [options]="quadrantOptions"
            label="Cuadrante"
            [value]="selectedQuadrant()"
            (valueChange)="onQuadrantChange($event)"
          />
          <p class="odontogram-orientation">{{ orientationText() }}</p>
        </div>
      }

      <svg
        [attr.viewBox]="viewBox()"
        role="group"
        aria-label="Odontograma"
        class="odontogram-svg"
      >
        <!-- Etiquetas laterales o superiores de fila -->
        @for (lbl of layout().labels; track lbl.text + lbl.y) {
          <svg:text
            [attr.x]="lbl.x"
            [attr.y]="lbl.y"
            [attr.text-anchor]="lbl.anchor || 'end'"
            dominant-baseline="central"
            class="odontogram-label"
          >
            {{ lbl.text }}
          </svg:text>
        }

        <!-- Línea media (vertical discontinua, solo en vista completa) -->
        @if (layout().view === 'full') {
          <svg:line
            [attr.x1]="layout().midlineX"
            y1="2"
            [attr.x2]="layout().midlineX"
            [attr.y2]="layout().height - 2"
            stroke="var(--slate-300)"
            stroke-dasharray="3 3"
          />

          <!-- Separador horizontal (arcada superior / inferior) -->
          <svg:line
            [attr.x1]="layout().separatorX1"
            [attr.y1]="layout().separatorY"
            [attr.x2]="layout().separatorX2"
            [attr.y2]="layout().separatorY"
            stroke="var(--slate-200)"
          />
        }

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

        <!-- Bandas de prótesis en rango -->
        @for (band of renderedSpans(); track band.span.startCode + '-' + band.span.endCode + '-' + band.span.conditionName) {
          <svg:g
            bdSpanBand
            [span]="band.span"
            [view]="activeView()"
            [offset]="band.offset"
            [label]="band.label"
          />
        }

        <!-- Piezas dentales con foco itinerante -->
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
            [tabIndex]="focusedToothCode() === item.tooth.code ? 0 : -1"
            (toothActivate)="toothActivate.emit($event)"
            (keyNav)="onKeyNav($event)"
          />
        }
      </svg>

      <!-- Índices CPO y ceo -->
      <bd-dental-indices
        [indices]="indices()"
        [hasFindings]="findings().length > 0"
      />

      <!-- Leyenda plegable del catálogo -->
      <bd-odontogram-legend [catalog]="catalog()" />
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
      gap: 0.5rem;
    }

    .odontogram-quadrant-bar {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      margin-bottom: 0.25rem;
    }

    .odontogram-orientation {
      margin: 0;
      font-size: var(--fs-xs);
      color: var(--slate-500);
      text-align: center;
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
export class OdontogramComponent implements OnInit, OnDestroy {
  private elementRef = inject(ElementRef<HTMLElement>);
  private resizeObserver?: ResizeObserver;
  private hasUserNavigated = false;

  @ViewChildren(ToothComponent) toothComponents!: QueryList<ToothComponent>;

  readonly catalog = input.required<OdontogramCatalog>();
  readonly findings = input<Finding[]>([]);
  readonly indices = input<DentalIndices | null>(null);

  readonly toothActivate = output<number>();

  readonly isNarrow = signal<boolean>(false);
  readonly selectedQuadrant = signal<1 | 2 | 4 | 3>(1);
  readonly focusedToothCode = signal<number>(18);

  readonly quadrantOptions: SegmentedOption<1 | 2 | 4 | 3>[] = [
    { value: 1, label: '18–11' },
    { value: 2, label: '21–28' },
    { value: 4, label: '48–41' },
    { value: 3, label: '31–38' },
  ];

  readonly orientationText = computed<string>(() => {
    switch (this.selectedQuadrant()) {
      case 1:
        return 'Superior derecho · vestibular arriba, palatina abajo';
      case 2:
        return 'Superior izquierdo · vestibular arriba, palatina abajo';
      case 4:
        return 'Inferior derecho · lingual arriba, vestibular abajo';
      case 3:
        return 'Inferior izquierdo · lingual arriba, vestibular abajo';
      default:
        return '';
    }
  });

  readonly activeView = computed<OdontogramView>(() => {
    return this.isNarrow() ? this.selectedQuadrant() : 'full';
  });

  readonly layout = computed<OdontogramLayout>(() => {
    return buildLayout(this.activeView());
  });

  readonly viewBox = computed<string>(() => {
    const l = this.layout();
    return `0 0 ${l.width} ${l.height}`;
  });

  readonly marksMap = computed<MarksMap>(() => {
    return buildMarks(this.findings(), this.catalog());
  });

  readonly recUCells = computed<LayoutPeriodontalCell[]>(() => {
    return this.layout().periodontalCells.filter((c) => c.row === 'recU');
  });

  readonly movUCells = computed<LayoutPeriodontalCell[]>(() => {
    return this.layout().periodontalCells.filter((c) => c.row === 'movU');
  });

  readonly movLCells = computed<LayoutPeriodontalCell[]>(() => {
    return this.layout().periodontalCells.filter((c) => c.row === 'movL');
  });

  readonly recLCells = computed<LayoutPeriodontalCell[]>(() => {
    return this.layout().periodontalCells.filter((c) => c.row === 'recL');
  });

  readonly renderedSpans = computed<RenderedSpanItem[]>(() => {
    const spans = this.marksMap().spans;
    const upperPlaced: [number, number][] = [];
    const lowerPlaced: [number, number][] = [];
    const result: RenderedSpanItem[] = [];

    for (const span of spans) {
      const isUpper = span.arch === 'UPPER';
      const archTeeth: readonly number[] = isUpper ? UP_TEETH : LO_TEETH;
      const permStart = toPermanentHomologue(span.startCode);
      const permEnd = toPermanentHomologue(span.endCode);
      const sIdx = archTeeth.indexOf(permStart);
      const eIdx = archTeeth.indexOf(permEnd);

      let offset = 0;
      if (sIdx !== -1 && eIdx !== -1) {
        const min = Math.min(sIdx, eIdx);
        const max = Math.max(sIdx, eIdx);
        const placed = isUpper ? upperPlaced : lowerPlaced;
        const overlaps = placed.some(([pMin, pMax]) => max >= pMin && min <= pMax);
        if (overlaps) {
          offset = 7;
        }
        placed.push([min, max]);
      }

      const statusLabel = span.status === 'PENDING' ? 'Pendiente' : 'Realizado';
      const label = `${span.conditionName} de ${span.startCode} a ${span.endCode} (${statusLabel})`;
      result.push({ span, offset, label });
    }

    return result;
  });

  readonly renderedTeeth = computed<RenderedToothItem[]>(() => {
    const cat = this.catalog();
    const marks = this.marksMap();
    const toothMap = new Map<number, Tooth>();
    for (const t of cat.teeth) {
      toothMap.set(t.code, t);
    }

    return this.layout().teeth.map((lt) => {
      const tooth = toothMap.get(lt.code) ?? fallbackTooth(lt.code);
      const toothMarks = marks.byTooth[lt.code] || null;
      const label = buildAccessibleToothLabel(
        lt.code,
        cat,
        toothMarks || undefined,
        marks.spans
      );

      return {
        tooth,
        layout: lt,
        marks: toothMarks,
        label,
      };
    });
  });

  constructor() {
    // Garantiza que la pieza enfocada esté siempre entre las visibles y recalcula
    // cuando activeView o findings cambian (accesibilidad con Tab en cuadrantes y recarga).
    effect(() => {
      const view = this.activeView();
      // Leer findings para reaccionar a recargas (ej. tras registrar en 010)
      this.findings();
      const marks = this.marksMap();
      const visibleTeeth = getReadingOrderTeeth(view);

      const teethWithFindings = new Set<number>();
      for (const [codeStr, tm] of Object.entries(marks.byTooth)) {
        const c = Number(codeStr);
        if (
          Object.keys(tm.faces).length > 0 ||
          tm.mobility != null ||
          tm.recession != null ||
          tm.toothMarks.length > 0 ||
          tm.missing
        ) {
          teethWithFindings.add(c);
        }
      }
      for (const sp of marks.spans) {
        for (const t of this.catalog().teeth) {
          if (isToothInSpan(t.code, sp)) {
            teethWithFindings.add(t.code);
          }
        }
      }

      const current = this.focusedToothCode();
      if (!visibleTeeth.includes(current) || !this.hasUserNavigated) {
        const initial = getInitialFocusedTooth(view, teethWithFindings);
        this.focusedToothCode.set(initial);
      }
    });
  }

  ngOnInit(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 0) {
            this.isNarrow.set(w < 720);
          }
        }
      });
      this.resizeObserver.observe(this.elementRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onQuadrantChange(quad: 1 | 2 | 4 | 3): void {
    this.selectedQuadrant.set(quad);
    const firstTooth = getReadingOrderTeeth(quad)[0];
    if (firstTooth) {
      this.focusedToothCode.set(firstTooth);
    }
  }

  onKeyNav(e: { key: NavKey; code: number; event: KeyboardEvent }): void {
    this.hasUserNavigated = true;
    const next = getNextTooth(e.code, e.key, this.activeView());
    if (next !== this.focusedToothCode()) {
      this.focusedToothCode.set(next);
      setTimeout(() => {
        const tc = this.toothComponents.find((c) => c.tooth().code === next);
        tc?.focus();
      });
    }
  }
}
