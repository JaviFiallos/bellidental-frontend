import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  ViewChild,
} from '@angular/core';
import { DentalCondition } from '../../models/odontogram.models';

@Component({
  selector: 'bd-periodontal-grades',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      #sectionRef
      class="conditions-group"
      id="periodontal-section"
      aria-labelledby="periodontal-group-heading"
    >
      <h4 id="periodontal-group-heading" class="conditions-group__title">Periodontal</h4>

      <!-- Movilidad (0, 1, 2, 3) -->
      @if (mobilityCondition(); as mobCond) {
        <div class="periodontal-row">
          <span class="periodontal-label">{{ mobCond.name }}</span>
          <div class="periodontal-buttons" role="group" [attr.aria-label]="mobCond.name">
            @for (grade of mobilityGrades; track grade) {
              <button
                type="button"
                class="btn btn-outline periodontal-btn"
                [attr.aria-pressed]="currentMobilityGrade() === grade"
                [class.periodontal-btn--active]="currentMobilityGrade() === grade"
                [disabled]="saving()"
                (click)="onSelect(mobCond, grade)"
              >
                {{ grade }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Recesión (I, II, III, IV) -->
      @if (recessionCondition(); as recCond) {
        <div class="periodontal-row">
          <span class="periodontal-label">{{ recCond.name }}</span>
          <div class="periodontal-buttons" role="group" [attr.aria-label]="recCond.name">
            @for (item of recessionGrades; track item.grade) {
              <button
                type="button"
                class="btn btn-outline periodontal-btn"
                [attr.aria-pressed]="currentRecessionGrade() === item.grade"
                [class.periodontal-btn--active]="currentRecessionGrade() === item.grade"
                [disabled]="saving()"
                (click)="onSelect(recCond, item.grade)"
              >
                {{ item.roman }}
              </button>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .conditions-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .conditions-group__title {
      margin: 0;
      font-size: var(--fs-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--slate-500);
    }

    .periodontal-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
    }

    .periodontal-label {
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--slate-600);
      min-width: 5rem;
    }

    .periodontal-buttons {
      display: flex;
      gap: 0.35rem;
    }

    .periodontal-btn {
      min-height: 44px;
      min-width: 44px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--slate-600);
      border-radius: var(--radius-sm);

      &.periodontal-btn--active,
      &[aria-pressed='true'] {
        background: var(--blue-700);
        color: var(--white);
        border-color: var(--blue-700);
      }
    }
  `,
})
export class PeriodontalGradesComponent {
  @ViewChild('sectionRef') sectionRef?: ElementRef<HTMLElement>;

  readonly mobilityCondition = input<DentalCondition | null>(null);
  readonly recessionCondition = input<DentalCondition | null>(null);
  readonly currentMobilityGrade = input<number | null>(null);
  readonly currentRecessionGrade = input<number | null>(null);
  readonly saving = input<boolean>(false);

  readonly gradeSelected = output<{ condition: DentalCondition; grade: number }>();

  readonly mobilityGrades = [0, 1, 2, 3];
  readonly recessionGrades = [
    { grade: 1, roman: 'I' },
    { grade: 2, roman: 'II' },
    { grade: 3, roman: 'III' },
    { grade: 4, roman: 'IV' },
  ];

  onSelect(condition: DentalCondition, grade: number): void {
    this.gradeSelected.emit({ condition, grade });
  }

  focusSection(): void {
    this.sectionRef?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
