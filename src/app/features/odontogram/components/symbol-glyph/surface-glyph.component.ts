import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SymbolShape } from '../../models/odontogram.models';

@Component({
  selector: 'g[bdSurfaceGlyph]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Caja de la pieza en miniatura -->
    <svg:rect
      x="3"
      y="3"
      width="18"
      height="18"
      fill="var(--white)"
      stroke="var(--slate-500)"
      stroke-width="1"
    />
    @if (shape() === 'ASTERISK') {
      <svg:path
        d="M7 12L17 12M9.5 7.67L14.5 16.33M14.5 7.67L9.5 16.33"
        [attr.stroke]="color()"
        stroke-width="1.8"
        stroke-linecap="round"
      />
    } @else {
      <svg:rect
        x="8"
        y="8"
        width="8"
        height="8"
        [attr.fill]="color()"
        stroke="var(--slate-500)"
        stroke-width="0.8"
      />
    }
  `,
})
export class SurfaceGlyphComponent {
  readonly shape = input.required<SymbolShape>();
  readonly color = input.required<string>();
}
