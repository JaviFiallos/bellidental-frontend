import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ComboboxComponent } from '../../../../shared/components/combobox/combobox.component';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import {
  DiagnosisOption,
  FindingOption,
  RecordTreatmentRequest,
  Treatment,
} from '../../models/treatment.models';
import { TreatmentFormComponent } from '../treatment-form/treatment-form.component';

/** Panel "Registrar tratamiento": buscador del catálogo y formulario del tratamiento elegido. Presentacional. */
@Component({
  selector: 'bd-treatment-editor',
  standalone: true,
  imports: [ComboboxComponent, MoneyPipe, TreatmentFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="treatment-editor sheet-form">
      <h2 id="treatment-editor-title" class="sheet-form__title">Registrar tratamiento</h2>

      <div class="treatment-editor__search" (focusin)="catalogRequest.emit()">
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

      @if (selectedTreatment(); as treatment) {
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

      <footer class="sheet-form__footer">
        <button type="button" class="btn btn-outline treatment-editor__close" (click)="close.emit()">
          Cancelar
        </button>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .treatment-editor__search {
      display: block;
    }

    .treatment-editor__close {
      min-height: 44px;
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
export class TreatmentEditorComponent {
  readonly diagnoses = input<DiagnosisOption[]>([]);
  readonly pendingFindings = input<FindingOption[]>([]);

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
  readonly close = output<void>();
  readonly findingChange = output<string | null>();
  readonly register = output<RecordTreatmentRequest>();

  private readonly searchCombobox = viewChild<ComboboxComponent<Treatment>>('treatmentSearch');

  constructor() {
    // Al abrir el panel, el foco inicial va al buscador del catálogo.
    afterNextRender(() => this.searchCombobox()?.focusInput());
  }
}
