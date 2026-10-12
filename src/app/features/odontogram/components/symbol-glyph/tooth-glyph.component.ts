import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SymbolShape } from '../../models/odontogram.models';

@Component({
  selector: 'g[bdToothGlyph]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (shape()) {
      @case ('CROSS') {
        <svg:path
          d="M4 4L20 20M20 4L4 20"
          [attr.stroke]="color()"
          stroke-width="2.5"
          stroke-linecap="round"
        />
      }
      @case ('CIRCLE_CROSS') {
        <svg:circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          [attr.stroke]="color()"
          stroke-width="2"
        />
        <svg:path
          d="M7 7L17 17M17 7L7 17"
          [attr.stroke]="secondaryColor() || color()"
          stroke-width="2"
          stroke-linecap="round"
        />
      }
      @case ('TRIANGLE') {
        <svg:path
          d="M12 3L21 19L3 19Z"
          fill="none"
          [attr.stroke]="color()"
          stroke-width="2.2"
        />
      }
      @case ('DOUBLE_SQUARE') {
        <svg:rect
          x="2"
          y="2"
          width="20"
          height="20"
          fill="none"
          [attr.stroke]="color()"
          stroke-width="1.5"
        />
        <svg:rect
          x="6"
          y="6"
          width="12"
          height="12"
          fill="none"
          [attr.stroke]="color()"
          stroke-width="1.5"
        />
      }
      @case ('RECTANGLE') {
        <svg:rect
          x="4"
          y="7"
          width="16"
          height="10"
          [attr.fill]="filled() ? color() : 'none'"
          [attr.stroke]="color()"
          stroke-width="1.8"
        />
      }
      @case ('NUMBER') {
        <svg:rect
          x="3"
          y="4"
          width="18"
          height="16"
          rx="2"
          fill="var(--blue-50)"
          stroke="var(--slate-300)"
        />
        <svg:text
          x="12"
          y="12"
          dominant-baseline="central"
          text-anchor="middle"
          font-size="11"
          font-weight="700"
          fill="var(--blue-900)"
        >
          {{ sampleText() || '1' }}
        </svg:text>
      }
    }
  `,
})
export class ToothGlyphComponent {
  readonly shape = input.required<SymbolShape>();
  readonly color = input.required<string>();
  readonly secondaryColor = input<string | null>(null);
  readonly filled = input<boolean>(false);
  readonly sampleText = input<string | null>(null);
}
