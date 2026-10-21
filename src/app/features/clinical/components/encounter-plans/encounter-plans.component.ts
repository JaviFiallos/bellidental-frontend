import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Check } from 'lucide-angular';
import { IconComponent, LucideIconData } from '../../../../shared/components/icon/icon.component';
import { DiagnosticExam, Encounter } from '../../models/encounter.models';
import { EncounterTextField } from '../../domain/encounter-completeness';
import { DIAGNOSTIC_EXAMS, formatMarkedExams } from '../../domain/stomatognathic-regions';

@Component({
  selector: 'bd-encounter-plans',
  standalone: true,
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="plans">
      <div class="plans__field">
        <span class="plans__label" id="diagnostic-exams-label">Planes de diagnóstico</span>
        @if (isReadOnly()) {
          <p class="plans__readonly">{{ readOnlyExamsText() }}</p>
        } @else {
          <div class="plans__exams-row" role="group" aria-labelledby="diagnostic-exams-label">
            @for (exam of exams; track exam.code) {
              <button
                type="button"
                class="exam-btn"
                [class.exam-btn--checked]="isExamMarked(exam.code)"
                [attr.aria-pressed]="isExamMarked(exam.code)"
                (click)="toggleExam(exam.code)"
              >
                <span class="exam-btn__checkbox" aria-hidden="true">
                  @if (isExamMarked(exam.code)) {
                    <bd-icon [name]="checkIcon" [size]="14" />
                  }
                </span>
                <span class="exam-btn__label">{{ exam.label }}</span>
              </button>
            }
          </div>
        }
      </div>

      <div class="plans__field">
        <label class="plans__label" for="plan-description-input">Descripción</label>
        @if (isReadOnly()) {
          <p class="plans__readonly">{{ values().planDescription || 'No registrado' }}</p>
        } @else {
          <textarea
            id="plan-description-input"
            class="input plans__textarea"
            rows="5"
            [ngModel]="values().planDescription ?? ''"
            (ngModelChange)="onDescriptionChange($event)"
          ></textarea>
        }
      </div>
    </div>
  `,
  styles: `
    .plans {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .plans__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      min-width: 0;
    }

    .plans__label {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-600);
    }

    .plans__exams-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
      width: 100%;
    }

    .exam-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      min-height: 44px;
      padding: var(--space-xs) var(--space-sm);
      border: 1px solid var(--slate-300);
      border-radius: var(--radius-sm);
      background-color: var(--white);
      color: var(--slate-800);
      font-size: var(--fs-sm);
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      user-select: none;
      transition: background-color 0.15s ease, border-color 0.15s ease;

      &:hover {
        background-color: var(--slate-50);
        border-color: var(--slate-400);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 1px;
      }

      &--checked {
        background-color: var(--blue-50);
        border-color: var(--blue-600);
        color: var(--blue-950);
        font-weight: 600;

        &:hover {
          background-color: var(--blue-100);
        }
      }
    }

    .exam-btn__checkbox {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.125rem;
      height: 1.125rem;
      border: 1.5px solid var(--slate-400);
      border-radius: var(--radius-xs, 3px);
      background-color: var(--white);
      color: var(--white);
      flex-shrink: 0;
      box-sizing: border-box;

      .exam-btn--checked & {
        background-color: var(--blue-600);
        border-color: var(--blue-600);
        color: var(--white);
      }
    }

    .exam-btn__label {
      min-width: 0;
      line-height: 1.25;
    }

    .plans__textarea {
      width: 100%;
      min-width: 0;
      resize: vertical;
      box-sizing: border-box;
    }

    .plans__readonly {
      margin: 0;
      padding: 0.25rem 0;
      font-size: var(--fs-sm);
      color: var(--slate-800);
      white-space: pre-line;
    }
  `,
})
export class EncounterPlansComponent {
  readonly values = input.required<
    Pick<Encounter, 'diagnosticExams' | 'planDescription'>
  >();
  readonly isReadOnly = input<boolean>(false);

  readonly examToggle = output<DiagnosticExam>();
  readonly textChange = output<{ field: EncounterTextField; value: string | null }>();

  readonly exams = DIAGNOSTIC_EXAMS;
  readonly checkIcon: LucideIconData = Check;

  readonly readOnlyExamsText = computed(() =>
    formatMarkedExams(this.values().diagnosticExams)
  );

  isExamMarked(code: DiagnosticExam): boolean {
    return this.values().diagnosticExams?.includes(code) ?? false;
  }

  toggleExam(code: DiagnosticExam): void {
    if (this.isReadOnly()) return;
    this.examToggle.emit(code);
  }

  onDescriptionChange(value: string): void {
    this.textChange.emit({ field: 'planDescription', value });
  }
}
