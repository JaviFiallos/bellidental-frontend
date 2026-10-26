import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PerformedTreatment } from '../../models/treatment.models';
import { TreatmentListComponent } from '../treatment-list/treatment-list.component';

/** Tarjeta "Tratamientos" de la atención. Presentacional: la lista llega por input(); registrar sale por output(). */
@Component({
  selector: 'bd-treatments-section',
  standalone: true,
  imports: [AlertComponent, SkeletonComponent, MoneyPipe, TreatmentListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card treatments-section" aria-labelledby="treatments-section-title">
      <header class="treatments-section__header">
        <h3 id="treatments-section-title" class="treatments-section__title">Tratamientos</h3>
        @if (!isReadOnly()) {
          <button
            #openButton
            type="button"
            class="btn btn-primary treatments-section__new"
            (click)="openEditor.emit()"
          >
            Registrar tratamiento
          </button>
        }
      </header>

      @if (loadError(); as error) {
        <bd-alert variant="error" [message]="error">
          <button type="button" class="btn btn-outline" (click)="retryLoad.emit()">Reintentar</button>
        </bd-alert>
      } @else if (isLoading()) {
        <bd-skeleton height="3rem" width="100%" />
      } @else {
        @if (items().length > 0) {
          <bd-treatment-list
            [items]="items()"
            [isReadOnly]="isReadOnly()"
            [voiding]="voiding()"
            (voidRequested)="voidRequest.emit($event)"
          />
        } @else {
          <p class="treatments-section__empty">Sin tratamientos registrados en esta atención.</p>
        }
      }

      @if (actionError(); as error) {
        <bd-alert variant="error" [message]="error" />
      }

      <p class="treatments-section__total" aria-live="polite">
        <span>Total de la sesión</span>
        <strong class="treatments-section__total-value">{{ sessionTotal() | money }}</strong>
      </p>
    </section>
  `,
  styles: `
    .treatments-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .treatments-section__header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
    }

    .treatments-section__title {
      font-size: var(--fs-md);
      font-weight: 600;
      color: var(--blue-950);
      margin: 0;
    }

    .treatments-section__new {
      min-height: 44px;
    }

    .treatments-section__empty {
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
      margin: 0;
    }

    .treatments-section__total {
      display: flex;
      justify-content: flex-end;
      align-items: baseline;
      gap: var(--space-sm);
      margin: 0;
      padding-top: var(--space-xs);
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .treatments-section__total-value {
      font-size: var(--fs-md);
      color: var(--blue-950);
    }
  `,
})
export class TreatmentsSectionComponent {
  readonly isReadOnly = input<boolean>(false);

  readonly items = input<PerformedTreatment[]>([]);
  readonly isLoading = input<boolean>(false);
  readonly loadError = input<string | null>(null);
  readonly sessionTotal = input<number>(0);
  readonly actionError = input<string | null>(null);
  readonly voiding = input<boolean>(false);

  readonly openEditor = output<void>();
  readonly voidRequest = output<PerformedTreatment>();
  readonly retryLoad = output<void>();

  private readonly openButton = viewChild<ElementRef<HTMLButtonElement>>('openButton');

  /** Devuelve el foco al botón «Registrar tratamiento» (tras cerrar el panel). */
  focusOpenButton(): void {
    this.openButton()?.nativeElement.focus();
  }
}
