import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DentalIndices } from '../../models/odontogram.models';

@Component({
  selector: 'bd-dental-indices',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dental-indices">
      <div class="dental-indices__metrics">
        @if (indices(); as idx) {
          <span class="dental-indices__item">
            <strong>CPO {{ idx.cpoTotal }}</strong> · C {{ idx.cpoC }} · P {{ idx.cpoP }} · O {{ idx.cpoO }}
          </span>
          <span class="dental-indices__item">
            <strong>ceo {{ idx.ceoTotal }}</strong> · c {{ idx.ceoC }} · e {{ idx.ceoE }} · o {{ idx.ceoO }}
          </span>
        } @else {
          <span class="dental-indices__item">
            <strong>CPO 0</strong> · C 0 · P 0 · O 0
          </span>
          <span class="dental-indices__item">
            <strong>ceo 0</strong> · c 0 · e 0 · o 0
          </span>
        }

        @if (!hasFindings()) {
          <span class="dental-indices__empty">Sin hallazgos registrados</span>
        }
      </div>

      <span class="dental-indices__legend">
        Rojo = pendiente · azul = realizado · negro = prótesis
      </span>
    </div>
  `,
  styles: `
    .dental-indices {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm) var(--space-md);
      font-size: var(--fs-sm);
      color: var(--slate-800);
      margin-top: var(--space-sm);
      padding-top: var(--space-sm);
      border-top: 1px solid var(--slate-200);
    }

    .dental-indices__metrics {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-md);
    }

    .dental-indices__item strong {
      color: var(--blue-950);
      font-weight: 700;
    }

    .dental-indices__empty {
      color: var(--slate-500);
      font-style: italic;
    }

    .dental-indices__legend {
      color: var(--slate-500);
      font-size: var(--fs-xs);
    }
  `,
})
export class DentalIndicesComponent {
  readonly indices = input<DentalIndices | null>(null);
  readonly hasFindings = input<boolean>(true);
}
