import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SymbolShape } from '../../models/odontogram.models';

@Component({
  selector: 'g[bdSpanGlyph]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (shape()) {
      @case ('SQUARES_LINE') {
        <svg:line
          x1="2"
          y1="12"
          x2="22"
          y2="12"
          [attr.stroke]="color()"
          stroke-width="1.8"
          [attr.stroke-dasharray]="lineStyle() === 'DOTTED' ? '3 2' : null"
        />
        <svg:rect x="3" y="9" width="6" height="6" [attr.fill]="color()" />
        <svg:rect x="15" y="9" width="6" height="6" [attr.fill]="color()" />
      }
      @case ('DOTS_PARENTHESES') {
        <svg:text
          x="4"
          y="12"
          dominant-baseline="central"
          text-anchor="middle"
          font-size="14"
          font-weight="600"
          [attr.fill]="color()"
        >
          (
        </svg:text>
        <svg:circle cx="9" cy="12" r="2" [attr.fill]="color()" />
        <svg:circle cx="12" cy="12" r="2" [attr.fill]="color()" />
        <svg:circle cx="15" cy="12" r="2" [attr.fill]="color()" />
        <svg:text
          x="20"
          y="12"
          dominant-baseline="central"
          text-anchor="middle"
          font-size="14"
          font-weight="600"
          [attr.fill]="color()"
        >
          )
        </svg:text>
      }
      @case ('EQUALS') {
        <svg:line x1="2" y1="9" x2="22" y2="9" [attr.stroke]="color()" stroke-width="2" />
        <svg:line x1="2" y1="15" x2="22" y2="15" [attr.stroke]="color()" stroke-width="2" />
      }
    }
  `,
})
export class SpanGlyphComponent {
  readonly shape = input.required<SymbolShape>();
  readonly color = input.required<string>();
  readonly lineStyle = input<'SOLID' | 'DOTTED'>('SOLID');
}
