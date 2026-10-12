import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ComboboxComponent } from '../../../../shared/components/combobox/combobox.component';
import {
  SegmentedComponent,
  SegmentedOption,
} from '../../../../shared/components/segmented/segmented.component';
import { Diagnosis, DiagnosisCertainty } from '../../models/encounter.models';
import { Icd10Code } from '../../models/icd10.models';

@Component({
  selector: 'bd-diagnosis-list',
  standalone: true,
  imports: [ComboboxComponent, SegmentedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="diagnosis-list" aria-label="Diagnósticos de la atención">
      <h2 class="diagnosis-list__title">Diagnósticos</h2>

      @if (!isReadOnly()) {
        <div class="diagnosis-list__add-bar">
          <div class="diagnosis-list__segmented">
            <bd-segmented
              [options]="certaintyOptions"
              [(value)]="selectedCertainty"
              label="Certeza del diagnóstico"
            />
          </div>

          <div class="diagnosis-list__combobox">
            <bd-combobox
              #combobox
              [items]="results()"
              [value]="searchQuery()"
              [isLoading]="loading()"
              [errorMessage]="searchError()"
              [placeholder]="'CIE-10: código (K02.1) o texto (caries)'"
              (valueChange)="onQueryChange($event)"
              (selected)="onIcd10Selected($event)"
            >
              <ng-template let-code>
                <div class="icd10-option">
                  <span class="icd10-option__code">{{ code.code }}</span>
                  <span class="icd10-option__desc">{{ code.description }}</span>
                </div>
              </ng-template>
            </bd-combobox>
          </div>
        </div>

        @if (errorMessage()) {
          <div class="diagnosis-list__error" role="alert">
            {{ errorMessage() }}
          </div>
        }
      }

      <!-- Lista de diagnósticos activos -->
      <div class="diagnosis-list__content">
        @if (diagnoses().length === 0) {
          <p class="diagnosis-list__empty">Sin diagnósticos registrados</p>
        } @else {
          <ul class="diagnosis-list__items">
            @for (diag of diagnoses(); track diag.id) {
              <li class="diagnosis-item">
                <div class="diagnosis-item__info">
                  <span class="diagnosis-item__code">{{ diag.code }}</span>
                  <span class="diagnosis-item__desc">{{ diag.description }}</span>
                </div>

                <div class="diagnosis-item__actions">
                  <span
                    class="diagnosis-item__certainty-badge"
                    [class.diagnosis-item__certainty-badge--def]="diag.certainty === 'DEFINITIVE'"
                    [class.diagnosis-item__certainty-badge--pre]="diag.certainty === 'PRESUMPTIVE'"
                    [attr.aria-label]="diag.certainty === 'DEFINITIVE' ? 'Definitivo' : 'Presuntivo'"
                  >
                    <span class="certainty-full">{{ diag.certainty === 'DEFINITIVE' ? 'Definitivo' : 'Presuntivo' }}</span>
                    <span class="certainty-short" aria-hidden="true">{{ diag.certainty === 'DEFINITIVE' ? 'DEF' : 'PRE' }}</span>
                  </span>

                  @if (!isReadOnly()) {
                    <button
                      type="button"
                      class="btn btn-outline btn-danger-text diagnosis-item__void-btn"
                      [attr.aria-label]="'Anular diagnóstico ' + diag.code"
                      (click)="voidDiagnosis.emit(diag)"
                    >
                      Anular
                    </button>
                  }
                </div>
              </li>
            }
          </ul>
        }
      </div>
    </section>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .diagnosis-list {
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
      padding: var(--space-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .diagnosis-list__title {
      margin: 0;
      font-size: var(--fs-md);
      font-weight: 700;
      color: var(--blue-950);
    }

    .diagnosis-list__add-bar {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);

      @include bp.bp-up(sm) {
        flex-direction: row;
        align-items: center;
      }
    }

    .diagnosis-list__segmented {
      flex-shrink: 0;
    }

    .diagnosis-list__combobox {
      flex: 1;
      min-width: 0;
    }

    .icd10-option {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      min-height: 44px;
    }

    .icd10-option__code {
      font-weight: 700;
      color: var(--blue-900);
    }

    .icd10-option__desc {
      color: var(--slate-700);
    }

    .diagnosis-list__error {
      font-size: var(--fs-xs);
      color: var(--coral-700);
      font-weight: 500;
    }

    .diagnosis-list__empty {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--slate-500);
      font-style: italic;
    }

    .diagnosis-list__items {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .diagnosis-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      padding: var(--space-xs) var(--space-sm);
      border-radius: var(--radius-sm);
      background-color: var(--slate-50);
      border: 1px solid var(--slate-200);
    }

    .diagnosis-item__info {
      display: flex;
      align-items: baseline;
      gap: var(--space-xs);
      flex: 1;
      min-width: 0;
    }

    .diagnosis-item__code {
      font-size: var(--fs-sm);
      font-weight: 700;
      color: var(--blue-950);
    }

    .diagnosis-item__desc {
      font-size: var(--fs-sm);
      color: var(--slate-800);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .diagnosis-item__actions {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex-shrink: 0;
    }

    .diagnosis-item__certainty-badge {
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      font-size: var(--fs-xs);
      font-weight: 600;
    }

    .diagnosis-item__certainty-badge--def {
      background-color: var(--blue-100);
      color: var(--blue-900);
      border: 1px solid var(--blue-300);
    }

    .diagnosis-item__certainty-badge--pre {
      background-color: var(--gold-100);
      color: var(--gold-900);
      border: 1px solid var(--gold-300);
    }

    .certainty-full {
      display: none;
      @include bp.bp-up(sm) {
        display: inline;
      }
    }

    .certainty-short {
      display: inline;
      @include bp.bp-up(sm) {
        display: none;
      }
    }

    .diagnosis-item__void-btn {
      min-height: 44px;
      padding: 0 var(--space-sm);
      font-size: var(--fs-xs);
      font-weight: 600;
    }

    .btn-danger-text {
      color: var(--coral-700);
      border-color: var(--coral-300);

      &:hover {
        background-color: var(--coral-100);
        color: var(--coral-800);
      }
    }
  `,
})
export class DiagnosisListComponent {
  readonly diagnoses = input.required<Diagnosis[]>();
  readonly isReadOnly = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  // Search inputs from store
  readonly results = input<Icd10Code[]>([]);
  readonly loading = input<boolean>(false);
  readonly searchError = input<string | null>(null);

  readonly queryChange = output<string>();
  readonly addDiagnosis = output<{ icd10Id: number; certainty: DiagnosisCertainty }>();
  readonly voidDiagnosis = output<Diagnosis>();

  readonly comboboxRef = viewChild<ComboboxComponent<Icd10Code>>('combobox');

  readonly selectedCertainty = signal<DiagnosisCertainty>('DEFINITIVE');
  readonly searchQuery = signal<string>('');

  readonly certaintyOptions: SegmentedOption<DiagnosisCertainty>[] = [
    { value: 'DEFINITIVE', label: 'Definitivo' },
    { value: 'PRESUMPTIVE', label: 'Presuntivo' },
  ];

  onQueryChange(q: string): void {
    this.searchQuery.set(q);
    this.queryChange.emit(q);
  }

  onIcd10Selected(item: Icd10Code): void {
    const certainty = this.selectedCertainty();
    this.addDiagnosis.emit({ icd10Id: item.id, certainty });

    // Reset combobox and certainty after add
    this.searchQuery.set('');
    this.queryChange.emit('');
    this.selectedCertainty.set('DEFINITIVE');

    setTimeout(() => {
      this.comboboxRef()?.focusInput();
    }, 0);
  }
}
