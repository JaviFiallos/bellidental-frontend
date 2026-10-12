import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { ConditionScope, SymbolShape } from '../../models/odontogram.models';
import { SurfaceGlyphComponent } from './surface-glyph.component';
import { ToothGlyphComponent } from './tooth-glyph.component';
import { SpanGlyphComponent } from './span-glyph.component';

@Component({
  selector: 'bd-symbol-glyph',
  standalone: true,
  imports: [SurfaceGlyphComponent, ToothGlyphComponent, SpanGlyphComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      class="bd-symbol-glyph"
      aria-hidden="true"
    >
      @switch (scope()) {
        @case ('SURFACE') {
          <svg:g bdSurfaceGlyph [shape]="shape()" [color]="color()" />
        }
        @case ('TOOTH') {
          <svg:g
            bdToothGlyph
            [shape]="shape()"
            [color]="color()"
            [secondaryColor]="secondaryColor()"
            [filled]="filled()"
            [sampleText]="sampleText()"
          />
        }
        @case ('SPAN') {
          <svg:g
            bdSpanGlyph
            [shape]="shape()"
            [color]="color()"
            [lineStyle]="lineStyle()"
          />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    .bd-symbol-glyph {
      display: block;
      width: 24px;
      height: 24px;
    }
  `,
})
export class SymbolGlyphComponent {
  readonly shape = input.required<SymbolShape>();
  readonly scope = input.required<ConditionScope>();
  readonly color = input<string>('var(--slate-600)');
  readonly secondaryColor = input<string | null>(null);
  readonly filled = input<boolean>(false);
  readonly lineStyle = input<'SOLID' | 'DOTTED'>('SOLID');
  readonly sampleText = input<string | null>(null);
}
