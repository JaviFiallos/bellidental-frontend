import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  ConditionScope,
  DentalCondition,
  DentalSymbol,
  OdontogramCatalog,
  SymbolGlyphComponent,
  SymbolShape,
} from '../../../../odontogram';

interface Form033SymbolDef {
  code: string;
  status: 'PENDING' | 'DONE';
  label: string;
  fallbackScope: ConditionScope;
  fallbackShape: SymbolShape;
  fallbackColor: string;
  fallbackSecondaryColor?: string;
  fallbackFilled?: boolean;
  fallbackLineStyle?: 'SOLID' | 'DOTTED';
  fallbackSampleText?: string;
}

const SYMBOLS_DEF: Form033SymbolDef[] = [
  // Columna 1
  {
    code: 'SEALANT',
    status: 'PENDING',
    label: 'SELLANTE NECESARIO',
    fallbackScope: 'SURFACE',
    fallbackShape: 'CIRCLE',
    fallbackColor: 'var(--coral-700)',
  },
  {
    code: 'SEALANT',
    status: 'DONE',
    label: 'SELLANTE REALIZADO',
    fallbackScope: 'SURFACE',
    fallbackShape: 'CIRCLE',
    fallbackColor: 'var(--blue-700)',
  },
  {
    code: 'EXTRACTION',
    status: 'PENDING',
    label: 'EXTRACCIÓN INDICADA',
    fallbackScope: 'TOOTH',
    fallbackShape: 'CROSS',
    fallbackColor: 'var(--coral-700)',
  },
  {
    code: 'MISSING_CARIES',
    status: 'DONE',
    label: 'PÉRDIDA POR CARIES',
    fallbackScope: 'TOOTH',
    fallbackShape: 'CROSS',
    fallbackColor: 'var(--blue-700)',
  },

  // Columna 2
  {
    code: 'MISSING_OTHER',
    status: 'DONE',
    label: 'PÉRDIDA (OTRA CAUSA)',
    fallbackScope: 'TOOTH',
    fallbackShape: 'DOUBLE_SQUARE',
    fallbackColor: 'var(--blue-700)',
  },
  {
    code: 'ROOT_CANAL',
    status: 'DONE',
    label: 'ENDODONCIA',
    fallbackScope: 'TOOTH',
    fallbackShape: 'TRIANGLE',
    fallbackColor: 'var(--blue-700)',
  },
  {
    code: 'PROSTHESIS_FIXED',
    status: 'DONE',
    label: 'PRÓTESIS FIJA',
    fallbackScope: 'SPAN',
    fallbackShape: 'SQUARES_LINE',
    fallbackColor: 'var(--blue-700)',
  },
  {
    code: 'PROSTHESIS_REMOVABLE',
    status: 'DONE',
    label: 'PRÓTESIS REMOVIBLE',
    fallbackScope: 'SPAN',
    fallbackShape: 'DOTS_PARENTHESES',
    fallbackColor: 'var(--blue-700)',
    fallbackLineStyle: 'DOTTED',
  },

  // Columna 3
  {
    code: 'PROSTHESIS_TOTAL',
    status: 'DONE',
    label: 'PRÓTESIS TOTAL',
    fallbackScope: 'SPAN',
    fallbackShape: 'EQUALS',
    fallbackColor: 'var(--blue-700)',
  },
  {
    code: 'CROWN',
    status: 'DONE',
    label: 'CORONA',
    fallbackScope: 'TOOTH',
    fallbackShape: 'CIRCLE',
    fallbackColor: 'var(--coral-700)',
    fallbackFilled: true,
  },
  {
    code: 'FILLING',
    status: 'DONE',
    label: 'OBTURADO',
    fallbackScope: 'SURFACE',
    fallbackShape: 'CIRCLE',
    fallbackColor: 'var(--blue-700)',
    fallbackFilled: true,
  },
  {
    code: 'CARIES',
    status: 'PENDING',
    label: 'CARIES',
    fallbackScope: 'SURFACE',
    fallbackShape: 'CIRCLE',
    fallbackColor: 'var(--coral-700)',
    fallbackFilled: true,
  },
];

@Component({
  selector: 'bd-form-033-symbology',
  standalone: true,
  imports: [SymbolGlyphComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- 9 SIMBOLOGÍA DEL ODONTOGRAMA: 3 columnas x 4 filas, con el glifo del catálogo -->
    <section class="form033-section">
      <header class="section-band">
        <span class="section-title">9 SIMBOLOGÍA DEL ODONTOGRAMA</span>
      </header>
      <div class="symbols-grid">
        @for (sym of symbols(); track sym.label) {
          <div class="symbol-cell">
            <bd-symbol-glyph
              [scope]="sym.scope"
              [shape]="sym.shape"
              [color]="sym.color"
              [secondaryColor]="sym.secondaryColor ?? null"
              [filled]="sym.filled"
              [lineStyle]="sym.lineStyle"
              [sampleText]="sym.sampleText ?? null"
            />
            <span class="symbol-label">{{ sym.label }}</span>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    @use '../form-033' as f033;
    @include f033.section;
    @include f033.band;

    .symbols-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-template-rows: repeat(4, auto);
      grid-auto-flow: column;
      padding: 1pt;
      gap: 1pt;
      box-sizing: border-box;
    }

    .symbol-cell {
      display: flex;
      align-items: center;
      gap: 1.5pt;
      min-height: 12pt;
    }

    .symbol-cell ::ng-deep bd-symbol-glyph,
    .symbol-cell ::ng-deep svg {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
    }

    .symbol-label {
      font-size: 4.5pt;
      line-height: 1.05;
      color: var(--form033-ink);
    }
  `,
})
export class Form033SymbologyComponent {
  readonly catalog = input<OdontogramCatalog | null>(null);

  readonly symbols = computed(() => {
    const cat = this.catalog();
    return SYMBOLS_DEF.map((def) => {
      const cond = cat?.conditions?.find((c: DentalCondition) => c.code === def.code);
      const symbol = cond?.symbols?.find((s: DentalSymbol) => s.status === def.status) || cond?.symbols?.[0];
      return {
        label: def.label,
        scope: cond?.scope ?? def.fallbackScope,
        shape: symbol?.shape ?? def.fallbackShape,
        color: symbol?.color ?? def.fallbackColor,
        secondaryColor: symbol?.secondaryColor ?? def.fallbackSecondaryColor,
        filled: symbol?.filled ?? def.fallbackFilled ?? false,
        lineStyle: symbol?.lineStyle ?? def.fallbackLineStyle ?? 'SOLID',
        sampleText: def.fallbackSampleText,
      };
    });
  });
}
