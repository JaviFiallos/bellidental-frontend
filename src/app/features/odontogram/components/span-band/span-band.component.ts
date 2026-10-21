import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  columnCenter,
  LO_TEETH,
  OdontogramView,
  QUADRANT_WIDTH,
  TOOTH,
  toPermanentHomologue,
  UP_TEETH,
} from '../../domain/odontogram-layout';
import { SpanItem } from '../../domain/finding-symbol';

@Component({
  selector: 'g[bdSpanBand]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': '"img"',
    '[attr.aria-label]': 'label()',
    'pointer-events': 'none',
  },
  template: `
    @if (viewModel(); as vm) {
      @switch (span().shape) {
        @case ('SQUARES_LINE') {
          <!-- Línea continua o punteada (si lineStyle === 'DOTTED') -->
          <svg:line
            [attr.x1]="vm.lineX1"
            [attr.y1]="vm.y"
            [attr.x2]="vm.lineX2"
            [attr.y2]="vm.y"
            [attr.stroke]="span().color"
            stroke-width="2"
            [attr.stroke-dasharray]="span().lineStyle === 'DOTTED' ? '4 3' : null"
          />
          <!-- Cuadrado relleno de 8x8 en cada columna visible -->
          @for (pt of vm.columns; track pt.code) {
            <svg:rect
              [attr.x]="pt.cx - 4"
              [attr.y]="vm.y - 4"
              width="8"
              height="8"
              [attr.fill]="span().color"
            />
          }
        }

        @case ('DOTS_PARENTHESES') {
          <!-- Paréntesis izquierdo si el extremo izquierdo está visible -->
          @if (vm.showLeftParen) {
            <svg:text
              [attr.x]="vm.leftParenX"
              [attr.y]="vm.y"
              text-anchor="middle"
              dominant-baseline="central"
              font-size="18"
              font-weight="600"
              [attr.fill]="span().color"
            >
              (
            </svg:text>
          }
          <!-- Puntos de radio 2.5 en cada columna visible -->
          @for (pt of vm.columns; track pt.code) {
            <svg:circle
              [attr.cx]="pt.cx"
              [attr.cy]="vm.y"
              r="2.5"
              [attr.fill]="span().color"
            />
          }
          <!-- Paréntesis derecho si el extremo derecho está visible -->
          @if (vm.showRightParen) {
            <svg:text
              [attr.x]="vm.rightParenX"
              [attr.y]="vm.y"
              text-anchor="middle"
              dominant-baseline="central"
              font-size="18"
              font-weight="600"
              [attr.fill]="span().color"
            >
              )
            </svg:text>
          }
        }

        @case ('EQUALS') {
          <!-- Dos líneas paralelas en centro - 3 y centro + 3 -->
          <svg:line
            [attr.x1]="vm.equalsX1"
            [attr.y1]="vm.y - 3"
            [attr.x2]="vm.equalsX2"
            [attr.y2]="vm.y - 3"
            [attr.stroke]="span().color"
            stroke-width="2"
          />
          <svg:line
            [attr.x1]="vm.equalsX1"
            [attr.y1]="vm.y + 3"
            [attr.x2]="vm.equalsX2"
            [attr.y2]="vm.y + 3"
            [attr.stroke]="span().color"
            stroke-width="2"
          />
        }
      }
    }
  `,
})
export class SpanBandComponent {
  readonly span = input.required<SpanItem>();
  readonly view = input.required<OdontogramView>();
  readonly offset = input<number>(0);
  readonly label = input.required<string>();

  readonly viewModel = computed(() => {
    const s = this.span();
    const v = this.view();
    const off = this.offset();
    const isUpper = s.arch === 'UPPER';

    // Determinar Y según la fila reservada y el desplazamiento por solapamiento
    let baseY: number;
    if (v === 'full') {
      baseY = isUpper ? 62 - off : 352 + off;
    } else if (v === 1 || v === 2) {
      if (!isUpper) return null;
      baseY = 96 - off;
    } else {
      if (isUpper) return null;
      baseY = 140 + off;
    }

    const archTeeth: readonly number[] = isUpper ? UP_TEETH : LO_TEETH;
    const permStart = toPermanentHomologue(s.startCode);
    const permEnd = toPermanentHomologue(s.endCode);

    const sIdx = archTeeth.indexOf(permStart);
    const eIdx = archTeeth.indexOf(permEnd);
    if (sIdx === -1 || eIdx === -1) {
      return null;
    }

    const minIdx = Math.min(sIdx, eIdx);
    const maxIdx = Math.max(sIdx, eIdx);
    const spanTeeth = archTeeth.slice(minIdx, maxIdx + 1);

    // Obtener centros de las columnas visibles en la vista actual
    const visibleCols: { code: number; cx: number }[] = [];
    for (const code of spanTeeth) {
      const cx = columnCenter(code, v);
      if (cx != null) {
        visibleCols.push({ code, cx });
      }
    }

    if (visibleCols.length === 0) {
      return null;
    }

    // Ordenar de izquierda a derecha por coordenada X
    visibleCols.sort((a, b) => a.cx - b.cx);

    const xs = visibleCols[0].cx;
    const xe = visibleCols[visibleCols.length - 1].cx;

    // Verificar si los extremos absolutos del rango están visibles en esta vista
    const hasLeftEndpoint = visibleCols.some((col) => col.code === archTeeth[minIdx]);
    const hasRightEndpoint = visibleCols.some((col) => col.code === archTeeth[maxIdx]);

    // Límites para SQUARES_LINE
    const lineX1 = xs;
    const lineX2 = xe;

    // Límites para DOTS_PARENTHESES: '(' en xs - TOOTH/2 + 6, ')' en xe + TOOTH/2 - 6
    const leftParenX = xs - TOOTH / 2 + 6;
    const rightParenX = xe + TOOTH / 2 - 6;

    // Límites para EQUALS: xs - TOOTH/2 + 4 a xe + TOOTH/2 - 4 (si se cortan en borde, extender)
    const equalsX1 = hasLeftEndpoint ? xs - TOOTH / 2 + 4 : (v === 'full' ? xs : 0);
    const equalsX2 = hasRightEndpoint ? xe + TOOTH / 2 - 4 : (v === 'full' ? xe : QUADRANT_WIDTH);

    return {
      y: baseY,
      columns: visibleCols,
      lineX1,
      lineX2,
      showLeftParen: hasLeftEndpoint,
      leftParenX,
      showRightParen: hasRightEndpoint,
      rightParenX,
      equalsX1,
      equalsX2,
    };
  });
}
