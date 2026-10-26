import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import {
  SegmentedComponent,
  SegmentedOption,
} from '../../../../shared/components/segmented/segmented.component';
import { PatientListView } from '../../models/patient.models';

const VIEW_OPTIONS: SegmentedOption<PatientListView>[] = [
  { value: 'ATTENDED', label: 'Últimos atendidos' },
  { value: 'CREATED', label: 'Últimos registrados' },
];

@Component({
  selector: 'bd-patient-list-filters',
  standalone: true,
  imports: [FieldComponent, SegmentedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="patient-list-filters">
      <div class="patient-list-filters__view">
        <bd-segmented
          label="Vista de pacientes"
          [options]="viewOptions"
          [value]="view()"
          (valueChange)="viewChange.emit($event)"
        />
      </div>

      <div class="patient-list-filters__search">
        <bd-field label="Buscar por nombre o cédula" fieldId="patient-list-search">
          <input
            id="patient-list-search"
            class="input"
            type="search"
            placeholder="Buscar por nombre o cédula"
            [value]="inputValue()"
            (input)="onSearchInput($event)"
          />
        </bd-field>
      </div>

      @if (canFilterBalance()) {
        <label class="patient-list-filters__check">
          <input
            type="checkbox"
            [checked]="withBalance()"
            (change)="onBalanceChange($event)"
          />
          <span>Solo con saldo pendiente</span>
        </label>
      }
    </div>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .patient-list-filters {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      align-items: stretch;
      width: 100%;
    }

    .patient-list-filters__view {
      display: flex;
    }

    .patient-list-filters__search {
      width: 100%;
    }

    .patient-list-filters__search .input {
      min-height: 44px;
      width: 100%;
      box-sizing: border-box;
    }

    .patient-list-filters__check {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      font-size: var(--fs-sm);
      color: var(--color-text);
      cursor: pointer;
      user-select: none;
      min-height: 44px;
    }

    .patient-list-filters__check input[type='checkbox'] {
      width: 1.125rem;
      height: 1.125rem;
      cursor: pointer;
      accent-color: var(--navy-700);
    }

    @include bp.bp-up(md) {
      .patient-list-filters {
        flex-direction: row;
        align-items: flex-end;
        flex-wrap: wrap;
      }

      .patient-list-filters__search {
        max-width: 22rem;
      }
    }
  `,
})
export class PatientListFiltersComponent {
  readonly view = input.required<PatientListView>();
  readonly query = input<string>('');
  readonly withBalance = input<boolean>(false);
  readonly canFilterBalance = input<boolean>(false);

  readonly viewChange = output<PatientListView>();
  readonly queryChange = output<string>();
  readonly withBalanceChange = output<boolean>();

  readonly viewOptions = VIEW_OPTIONS;
  readonly inputValue = signal<string>('');

  private readonly searchSubject$ = new Subject<string>();

  constructor() {
    effect(() => {
      const q = this.query();
      untracked(() => {
        this.inputValue.set(q);
      });
    });

    this.searchSubject$
      .pipe(
        debounceTime(300),
        map((text) => {
          const trimmed = text.trim();
          return trimmed.length >= 2 ? trimmed : '';
        }),
        distinctUntilChanged(),
        takeUntilDestroyed()
      )
      .subscribe((query) => {
        this.queryChange.emit(query);
      });
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.inputValue.set(input.value);
    this.searchSubject$.next(input.value);
  }

  onBalanceChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.withBalanceChange.emit(input.checked);
  }
}
