import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  buildAsteriskPath,
  buildRegionPaths,
  getRegionFace,
  getSurfaceName,
  RegionPosition,
} from '../../domain/surface-layout';
import { ToothMarkItem, ToothMarks } from '../../domain/finding-symbol';
import { FindingStatus, SurfaceCode, Tooth } from '../../models/odontogram.models';
import { NavKey } from '../../domain/tooth-navigation';

interface RegionViewModel {
  position: RegionPosition;
  surface: SurfaceCode;
  path: string;
  fill: string;
  conditionCode: string | null;
  status: FindingStatus | null;
  title: string;
  asteriskPath: string | null;
  asteriskColor: string | null;
}

@Component({
  selector: 'g[bdTooth]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': '"img"',
    '[attr.aria-label]': 'label()',
    '[attr.tabindex]': 'tabIndex()',
    '[style.outline]': '"none"',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(keydown)': 'onKeydown($event)',
  },
  template: `
    <!-- Regiones y número con atenuación a 0.35 si la pieza está ausente (missing) -->
    <svg:g [attr.opacity]="isMissing() ? 0.35 : null">
      @for (region of renderedRegions(); track region.position) {
        <svg:path
          [attr.d]="region.path"
          [attr.fill]="region.fill"
          stroke="var(--slate-500)"
          stroke-width="1"
          [attr.data-tooth]="tooth().code"
          [attr.data-surface]="region.surface"
          [attr.data-condition]="region.conditionCode"
          [attr.data-status]="region.status"
        >
          <svg:title>{{ region.title }}</svg:title>
        </svg:path>

        @if (region.asteriskPath) {
          <svg:path
            [attr.d]="region.asteriskPath"
            [attr.stroke]="region.asteriskColor"
            stroke-width="2"
            stroke-linecap="round"
            pointer-events="none"
          />
        }
      }

      <svg:text
        [attr.x]="numberX()"
        [attr.y]="numberY()"
        text-anchor="middle"
        fill="var(--slate-600)"
        font-weight="500"
        font-size="15"
      >
        {{ tooth().code }}
      </svg:text>
    </svg:g>

    <!-- Marcas de pieza completa (opacidad 100%, ordenadas de abajo a arriba) -->
    @for (mark of renderedToothMarks(); track mark.conditionCode + mark.shape + mark.status) {
      @switch (mark.shape) {
        @case ('RECTANGLE') {
          <svg:rect
            [attr.x]="mark.rectX"
            [attr.y]="mark.rectY"
            [attr.width]="mark.rectW"
            [attr.height]="mark.rectH"
            [attr.fill]="mark.filled ? mark.color : 'none'"
            [attr.stroke]="mark.color"
            stroke-width="1.8"
            pointer-events="none"
          />
        }
        @case ('DOUBLE_SQUARE') {
          <svg:rect
            [attr.x]="mark.outerX"
            [attr.y]="mark.outerY"
            [attr.width]="mark.outerSize"
            [attr.height]="mark.outerSize"
            fill="none"
            [attr.stroke]="mark.color"
            stroke-width="1.8"
            pointer-events="none"
          />
          <svg:rect
            [attr.x]="mark.innerX"
            [attr.y]="mark.innerY"
            [attr.width]="mark.innerSize"
            [attr.height]="mark.innerSize"
            fill="none"
            [attr.stroke]="mark.color"
            stroke-width="1.8"
            pointer-events="none"
          />
        }
        @case ('TRIANGLE') {
          <svg:path
            [attr.d]="mark.trianglePath"
            fill="none"
            [attr.stroke]="mark.color"
            stroke-width="2.5"
            pointer-events="none"
          />
        }
        @case ('CIRCLE_CROSS') {
          <svg:circle
            [attr.cx]="mark.cx"
            [attr.cy]="mark.cy"
            [attr.r]="mark.circleR"
            fill="none"
            [attr.stroke]="mark.color"
            stroke-width="2.5"
            pointer-events="none"
          />
          <svg:path
            [attr.d]="mark.circleXPath"
            [attr.stroke]="mark.secondaryColor || mark.color"
            stroke-width="2.5"
            stroke-linecap="round"
            pointer-events="none"
          />
        }
        @case ('CROSS') {
          <svg:path
            [attr.d]="mark.crossPath"
            [attr.stroke]="mark.color"
            stroke-width="3.5"
            stroke-linecap="round"
            pointer-events="none"
          />
        }
      }
    }

    <!-- Anillo de foco visible (x-4, y-4, s+8, rx 6 o circular) -->
    @if (isFocused()) {
      <svg:rect
        [attr.x]="x() - 4"
        [attr.y]="y() - 4"
        [attr.width]="size() + 8"
        [attr.height]="size() + 8"
        [attr.rx]="shape() === 'circle' ? size() / 2 + 4 : 6"
        fill="none"
        stroke="var(--color-focus)"
        stroke-width="2.5"
        pointer-events="none"
      />
    }
  `,
})
export class ToothComponent {
  private elementRef = inject(ElementRef<SVGGElement>);

  readonly tooth = input.required<Tooth>();
  readonly x = input.required<number>();
  readonly y = input.required<number>();
  readonly size = input.required<number>();
  readonly shape = input.required<'square' | 'circle'>();
  readonly numberX = input.required<number>();
  readonly numberY = input.required<number>();
  readonly marks = input<ToothMarks | null>(null);
  readonly label = input.required<string>();
  readonly tabIndex = input<number>(-1);

  readonly toothActivate = output<number>();
  readonly keyNav = output<{ key: NavKey; code: number; event: KeyboardEvent }>();

  readonly isFocused = signal<boolean>(false);

  readonly isMissing = computed<boolean>(() => this.marks()?.missing ?? false);

  readonly renderedRegions = computed<RegionViewModel[]>(() => {
    const code = this.tooth().code;
    const s = this.size();
    const geoms = buildRegionPaths(this.x(), this.y(), s, this.shape());
    const m = this.marks();

    const positions: RegionPosition[] = ['top', 'right', 'bottom', 'left', 'center'];

    return positions.map((pos) => {
      const geom = geoms[pos];
      const surface = getRegionFace(code, pos);
      const mark = m?.faces?.[surface];
      const sName = getSurfaceName(code, surface);

      const fill = mark && mark.kind === 'fill' ? mark.color : 'var(--white)';
      const conditionCode = mark ? mark.conditionCode : null;
      const status = mark ? mark.status : null;

      const title = mark
        ? `${code} · ${sName}: ${mark.conditionName} (${mark.status === 'PENDING' ? 'Pendiente' : 'Realizado'})`
        : `${code} · ${sName}`;

      const isAsterisk = mark && mark.kind === 'asterisk';
      const asteriskPath = isAsterisk ? buildAsteriskPath(geom.centroid, s, pos) : null;
      const asteriskColor = isAsterisk ? mark.color : null;

      return {
        position: pos,
        surface,
        path: geom.path,
        fill,
        conditionCode,
        status,
        title,
        asteriskPath,
        asteriskColor,
      };
    });
  });

  readonly renderedToothMarks = computed(() => {
    const m = this.marks();
    if (!m || !m.toothMarks) {
      return [];
    }

    const x = this.x();
    const y = this.y();
    const s = this.size();
    const isUpper = this.tooth().arch === 'UPPER';

    return m.toothMarks.map((tm: ToothMarkItem) => {
      // CROSS: diagonales con margen 4
      const crossPath = `M${x + 4} ${y + 4}L${x + s - 4} ${y + s - 4}M${x + s - 4} ${y + 4}L${x + 4} ${y + s - 4}`;

      // CIRCLE_CROSS: radio s/2 - 2, X con margen 0.28*s
      const cx = x + s / 2;
      const cy = y + s / 2;
      const circleR = s / 2 - 2;
      const xm = 0.28 * s;
      const circleXPath = `M${x + xm} ${y + xm}L${x + s - xm} ${y + s - xm}M${x + s - xm} ${y + xm}L${x + xm} ${y + s - xm}`;

      // TRIANGLE: punta hacia la raíz (arriba en superior, abajo en inferior)
      const trianglePath = isUpper
        ? `M${x + s / 2} ${y + 5}L${x + s - 5} ${y + s - 6}L${x + 5} ${y + s - 6}Z`
        : `M${x + s / 2} ${y + s - 5}L${x + s - 5} ${y + 6}L${x + 5} ${y + 6}Z`;

      // DOUBLE_SQUARE: x-5 de s+10 y x-2 de s+4
      const outerX = x - 5;
      const outerY = y - 5;
      const outerSize = s + 10;
      const innerX = x - 2;
      const innerY = y - 2;
      const innerSize = s + 4;

      // RECTANGLE: (x+0.15*s, y+0.36*s) de 0.7*s x 0.28*s
      const rectX = x + 0.15 * s;
      const rectY = y + 0.36 * s;
      const rectW = 0.7 * s;
      const rectH = 0.28 * s;

      return {
        ...tm,
        crossPath,
        cx,
        cy,
        circleR,
        circleXPath,
        trianglePath,
        outerX,
        outerY,
        outerSize,
        innerX,
        innerY,
        innerSize,
        rectX,
        rectY,
        rectW,
        rectH,
      };
    });
  });

  focus(): void {
    this.elementRef.nativeElement.focus();
  }

  onFocus(): void {
    this.isFocused.set(true);
  }

  onBlur(): void {
    this.isFocused.set(false);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toothActivate.emit(this.tooth().code);
      return;
    }

    if (
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      this.keyNav.emit({
        key: event.key as NavKey,
        code: this.tooth().code,
        event,
      });
    }
  }
}
