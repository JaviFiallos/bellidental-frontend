import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Professional } from '../../../professionals';

/** Profesionales activos sin cuenta de acceso. Presentacional; sin lista no se muestra nada. */
@Component({
  selector: 'bd-professionals-without-access',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (professionals().length > 0) {
      <section class="without-access" aria-labelledby="without-access-title">
        <h2 id="without-access-title" class="without-access__title">Profesionales sin cuenta</h2>
        <ul class="without-access__list">
          @for (professional of professionals(); track professional.id) {
            <li class="without-access__item">
              <span class="without-access__identity">
                <span class="without-access__name">{{ professional.fullName }}</span>
                <span class="without-access__license">Matrícula {{ professional.licenseNumber }}</span>
              </span>
              <button
                type="button"
                class="btn btn-outline without-access__action"
                [attr.aria-label]="'Dar acceso a ' + professional.fullName"
                (click)="grantAccess.emit(professional)"
              >
                Dar acceso
              </button>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .without-access {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .without-access__title {
      margin: 0;
      font-size: var(--fs-md);
      font-weight: 700;
      color: var(--blue-950);
    }

    .without-access__list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
      gap: var(--space-sm);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .without-access__item {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      padding: var(--space-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
    }

    .without-access__identity {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .without-access__name {
      font-weight: 600;
      color: var(--blue-950);
      overflow-wrap: anywhere;
    }

    .without-access__license {
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
    }

    .without-access__action {
      min-height: 44px;
      white-space: nowrap;
    }
  `,
})
export class ProfessionalsWithoutAccessComponent {
  readonly professionals = input.required<Professional[]>();

  readonly grantAccess = output<Professional>();
}
