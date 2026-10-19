import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { ComboboxComponent } from '../../../../shared/components/combobox/combobox.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import {
  DiagnosisOption,
  FindingOption,
  PerformedTreatment,
  RecordTreatmentRequest,
  Treatment,
} from '../../models/treatment.models';
import { TreatmentFormComponent } from '../treatment-form/treatment-form.component';
import { TreatmentListComponent } from '../treatment-list/treatment-list.component';

/** Tarjeta "Tratamientos" de la atención. Presentacional: el estado llega por input() y las acciones salen por output(). */
@Component({
  selector: 'bd-treatments-section',
  standalone: true,
  imports: [
    ComboboxComponent,
    AlertComponent,
    SkeletonComponent,
    MoneyPipe,
    TreatmentFormComponent,
    TreatmentListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card treatments-section" aria-labelledby="treatments-section-title">
      <header class="treatments-section__header">
        <h3 id="treatments-section-title" class="treatments-section__title">Tratamientos</h3>
      </header>

      @if (!isReadOnly()) {
        <div class="treatments-section__search" (focusin)="catalogRequest.emit()">
          <bd-combobox
            #treatmentSearch
            [items]="results()"
            [value]="query()"
            [minQueryLength]="0"
            [isLoading]="catalogLoading()"
            [errorMessage]="catalogError()"
            placeholder="Código o nombre: resina, D23…"
            (valueChange)="queryChange.emit($event)"
            (selected)="pick.emit($event)"
          >
            <ng-template let-treatment>
              <div class="treatment-option">
                <span class="treatment-option__code">{{ treatment.code }}</span>
                <span class="treatment-option__name">{{ treatment.name }}</span>
                <span class="treatment-option__price">{{ treatment.basePrice | money }}</span>
              </div>
            </ng-template>
          </bd-combobox>
        </div>

        @for (treatment of selectedTreatments(); track treatment.id) {
          <bd-treatment-form
            [treatment]="treatment"
            [diagnoses]="diagnoses()"
            [findings]="pendingFindings()"
            [selectedFindingId]="selectedFindingId()"
            [initialToothCode]="selectedTooth()"
            [saving]="saving()"
            [errorMessage]="saveError()"
            (register)="register.emit($event)"
            (cancel)="cancel.emit()"
            (findingChange)="findingChange.emit($event)"
          />
        }
      }

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

    .treatments-section__title {
      font-size: var(--fs-md);
      font-weight: 600;
      color: var(--blue-950);
      margin: 0;
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

    .treatment-option {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--space-xs) var(--space-sm);
      min-height: 44px;
      padding: var(--space-xs) var(--space-sm);
      font-size: var(--fs-sm);
    }

    .treatment-option__code {
      font-weight: 700;
      color: var(--blue-900);
    }

    .treatment-option__price {
      margin-inline-start: auto;
      color: var(--color-text-muted);
    }
  `,
})
export class TreatmentsSectionComponent {
  readonly diagnoses = input<DiagnosisOption[]>([]);
  readonly pendingFindings = input<FindingOption[]>([]);
  readonly isReadOnly = input<boolean>(false);

  readonly items = input<PerformedTreatment[]>([]);
  readonly isLoading = input<boolean>(false);
  readonly loadError = input<string | null>(null);
  readonly sessionTotal = input<number>(0);
  readonly actionError = input<string | null>(null);
  readonly voiding = input<boolean>(false);

  readonly query = input<string>('');
  readonly results = input<Treatment[]>([]);
  readonly catalogLoading = input<boolean>(false);
  readonly catalogError = input<string | null>(null);

  readonly selectedTreatment = input<Treatment | null>(null);
  readonly selectedTooth = input<number | null>(null);
  readonly selectedFindingId = input<string | null>(null);
  readonly saving = input<boolean>(false);
  readonly saveError = input<string | null>(null);

  readonly catalogRequest = output<void>();
  readonly queryChange = output<string>();
  readonly pick = output<Treatment>();
  readonly cancel = output<void>();
  readonly findingChange = output<string | null>();
  readonly register = output<RecordTreatmentRequest>();
  readonly voidRequest = output<PerformedTreatment>();
  readonly retryLoad = output<void>();

  private readonly searchCombobox = viewChild<ComboboxComponent<Treatment>>('treatmentSearch');

  readonly selectedTreatments = computed<Treatment[]>(() => {
    const treatment = this.selectedTreatment();
    return treatment ? [treatment] : [];
  });

  focusSearch(): void {
    this.searchCombobox()?.focusInput();
  }
}
