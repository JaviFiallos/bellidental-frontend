import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'bd-complete-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="complete-bar" role="region" aria-label="Acciones de la atención">
      <div class="complete-bar__content">
        <!-- Requisitos faltantes o estado de guardado -->
        <div class="complete-bar__status" id="complete-bar-status">
          @if (isCompleted()) {
            <span class="status-msg status-msg--info">Atención completada</span>
          } @else if (saveStatus() === 'saving') {
            <span class="status-msg status-msg--saving">Guardando…</span>
          } @else if (missingRequirements().length > 0) {
            <span class="status-msg status-msg--warning">
              {{ missingRequirementsText() }}
            </span>
          } @else if (errorMessage()) {
            <span class="status-msg status-msg--error" role="alert">
              {{ errorMessage() }}
            </span>
          }
        </div>

        <!-- Botón Completar atención -->
        @if (!isCompleted() && !isReadOnly()) {
          <div class="complete-bar__actions">
            <button
              type="button"
              class="btn btn-primary complete-bar__btn"
              [disabled]="!canComplete() || completing()"
              [attr.aria-describedby]="missingRequirements().length > 0 ? 'complete-bar-status' : null"
              (click)="complete.emit()"
            >
              @if (completing()) {
                Completando…
              } @else {
                Completar atención
              }
            </button>
          </div>
        }
      </div>
    </footer>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .complete-bar {
      position: sticky;
      bottom: 0;
      z-index: 100;
      background-color: var(--white);
      border-top: 1px solid var(--slate-300);
      box-shadow: 0 -2px 10px color-mix(in srgb, var(--blue-950) 6%, transparent);
      padding: var(--space-sm) var(--space-md);
      box-sizing: border-box;
      width: 100%;
    }

    .complete-bar__content {
      max-width: 1366px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);

      @include bp.bp-up(sm) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .complete-bar__status {
      font-size: var(--fs-sm);
      font-weight: 500;
      min-height: 24px;
      display: flex;
      align-items: center;
    }

    .status-msg--warning {
      color: var(--gold-700);
      font-weight: 600;
    }


    .status-msg--saving {
      color: var(--slate-600);
    }

    .status-msg--error {
      color: var(--coral-700);
      font-weight: 600;
    }

    .status-msg--info {
      color: var(--teal-700);
      font-weight: 600;
    }

    .complete-bar__actions {
      display: flex;
      align-items: center;
    }

    .complete-bar__btn {
      height: 48px;
      min-height: 48px;
      padding: 0 var(--space-lg);
      font-size: var(--fs-sm);
      font-weight: 600;
      width: 100%;

      @include bp.bp-up(sm) {
        width: auto;
      }
    }
  `,
})
export class CompleteBarComponent {
  readonly missingRequirements = input.required<string[]>();
  readonly canComplete = input.required<boolean>();
  readonly isCompleted = input<boolean>(false);
  readonly isReadOnly = input<boolean>(false);
  readonly saveStatus = input<string>('idle');
  readonly completing = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly complete = output<void>();

  readonly missingRequirementsText = computed(() => {
    return this.missingRequirements().join(' · ');
  });
}
