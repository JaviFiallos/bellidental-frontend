import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  buildAsteriskPath,
  buildRegionPaths,
  getRegionFace,
  getSurfaceName,
  RegionPosition,
} from '../../domain/surface-layout';
import { ToothMarks } from '../../domain/finding-symbol';
import { FindingStatus, SurfaceCode, Tooth } from '../../models/odontogram.models';

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
  },
  template: `
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
  `,
})
export class ToothComponent {
  readonly tooth = input.required<Tooth>();
  readonly x = input.required<number>();
  readonly y = input.required<number>();
  readonly size = input.required<number>();
  readonly shape = input.required<'square' | 'circle'>();
  readonly numberX = input.required<number>();
  readonly numberY = input.required<number>();
  readonly marks = input<ToothMarks | null>(null);
  readonly label = input.required<string>();

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
      const asteriskPath = isAsterisk ? buildAsteriskPath(geom.centroid, s) : null;
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
}
