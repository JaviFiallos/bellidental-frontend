import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  ConditionScope,
  OdontogramCatalog,
  SymbolShape,
} from '../../models/odontogram.models';
import { toRomanNumeral } from '../../domain/finding-symbol';
import { SymbolGlyphComponent } from '../symbol-glyph/symbol-glyph.component';

interface LegendItem {
  id: string;
  label: string;
  scope: ConditionScope;
  shape: SymbolShape;
  color: string;
  secondaryColor?: string | null;
  filled?: boolean;
  lineStyle?: 'SOLID' | 'DOTTED';
  sampleText?: string;
}

interface LegendSection {
  title: string;
  items: LegendItem[];
}

@Component({
  selector: 'bd-odontogram-legend',
  standalone: true,
  imports: [SymbolGlyphComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details class="bd-legend">
      <summary class="bd-legend__summary">
        <span>Leyenda</span>
      </summary>

      <div class="bd-legend__content">
        @for (section of sections(); track section.title) {
          @if (section.items.length > 0) {
            <section class="bd-legend__section">
              <h4 class="bd-legend__section-title">{{ section.title }}</h4>
              <div class="bd-legend__grid">
                @for (item of section.items; track item.id) {
                  <div class="bd-legend__item">
                    <bd-symbol-glyph
                      [scope]="item.scope"
                      [shape]="item.shape"
                      [color]="item.color"
                      [secondaryColor]="item.secondaryColor ?? null"
                      [filled]="item.filled ?? false"
                      [lineStyle]="item.lineStyle ?? 'SOLID'"
                      [sampleText]="item.sampleText ?? null"
                    />
                    <span class="bd-legend__item-label">{{ item.label }}</span>
                  </div>
                }
              </div>
            </section>
          }
        }
      </div>
    </details>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      margin-top: 1rem;
    }

    .bd-legend {
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
      background-color: var(--white);
      overflow: hidden;
      transition: border-color var(--transition-fast);
    }

    .bd-legend[open] {
      box-shadow: var(--shadow-sm);
    }

    .bd-legend__summary {
      display: flex;
      align-items: center;
      min-height: 44px;
      padding: 0.6rem 1rem;
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--slate-600);
      cursor: pointer;
      user-select: none;
      background-color: var(--slate-50);
      transition: background-color var(--transition-fast), color var(--transition-fast);
    }

    .bd-legend__summary:hover {
      background-color: var(--slate-100);
      color: var(--slate-800);
    }

    .bd-legend__summary:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: -2px;
    }

    .bd-legend__content {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      border-top: 1px solid var(--slate-200);
    }

    .bd-legend__section {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .bd-legend__section-title {
      margin: 0;
      font-size: var(--fs-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--slate-500);
    }

    .bd-legend__grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.6rem 1.25rem;
    }

    @media (min-width: 768px) {
      .bd-legend__grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 1024px) {
      .bd-legend__grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .bd-legend__item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: var(--fs-sm);
      color: var(--slate-600);
    }

    .bd-legend__item-label {
      line-height: 1.3;
    }
  `,
})
export class OdontogramLegendComponent {
  readonly catalog = input.required<OdontogramCatalog>();

  readonly sections = computed<LegendSection[]>(() => {
    const cat = this.catalog();
    if (!cat || !cat.conditions) {
      return [];
    }

    const surfaceItems: LegendItem[] = [];
    const toothItems: LegendItem[] = [];
    const spanItems: LegendItem[] = [];
    const perioItems: LegendItem[] = [];

    for (const cond of cat.conditions) {
      // 1. Periodontal (NUMBER)
      if (cond.category === 'PERIODONTAL' || cond.symbols.some((s) => s.shape === 'NUMBER')) {
        const sym = cond.symbols[0];
        const color = sym?.color ?? 'var(--blue-900)';
        if (cond.code === 'MOBILITY') {
          const gMin = cond.gradeMin ?? 0;
          const gMax = cond.gradeMax ?? 3;
          perioItems.push({
            id: `cond-${cond.id}`,
            label: `Movilidad (grado ${gMin}–${gMax})`,
            scope: 'TOOTH',
            shape: 'NUMBER',
            color,
            sampleText: '1',
          });
        } else if (cond.code === 'RECESSION') {
          const gMin = toRomanNumeral(cond.gradeMin ?? 1);
          const gMax = toRomanNumeral(cond.gradeMax ?? 4);
          perioItems.push({
            id: `cond-${cond.id}`,
            label: `Recesión gingival (clase ${gMin}–${gMax})`,
            scope: 'TOOTH',
            shape: 'NUMBER',
            color,
            sampleText: 'II',
          });
        }
        continue;
      }

      // 2. SURFACE
      if (cond.scope === 'SURFACE') {
        for (const sym of cond.symbols) {
          const statusText = sym.status === 'PENDING' ? 'Pendiente' : 'Realizado';
          surfaceItems.push({
            id: `cond-${cond.id}-${sym.id}`,
            label: `${cond.name} · ${statusText}`,
            scope: 'SURFACE',
            shape: sym.shape,
            color: sym.color,
          });
        }
        continue;
      }

      // 3. SPAN
      if (cond.scope === 'SPAN') {
        for (const sym of cond.symbols) {
          const statusText = sym.status === 'PENDING' ? 'Pendiente' : 'Realizado';
          spanItems.push({
            id: `cond-${cond.id}-${sym.id}`,
            label: `${cond.name} · ${statusText}`,
            scope: 'SPAN',
            shape: sym.shape,
            color: sym.color,
            lineStyle: sym.lineStyle,
          });
        }
        continue;
      }

      // 4. TOOTH (sin NUMBER)
      if (cond.scope === 'TOOTH') {
        for (const sym of cond.symbols) {
          if (sym.shape === 'NUMBER') continue;
          const statusText = sym.status === 'PENDING' ? 'Pendiente' : 'Realizado';
          toothItems.push({
            id: `cond-${cond.id}-${sym.id}`,
            label: `${cond.name} · ${statusText}`,
            scope: 'TOOTH',
            shape: sym.shape,
            color: sym.color,
            secondaryColor: sym.secondaryColor,
            filled: sym.filled,
          });
        }
      }
    }

    return [
      { title: 'En una cara', items: surfaceItems },
      { title: 'En la pieza', items: toothItems },
      { title: 'Prótesis (de una pieza a otra)', items: spanItems },
      { title: 'Periodontal', items: perioItems },
    ];
  });
}
