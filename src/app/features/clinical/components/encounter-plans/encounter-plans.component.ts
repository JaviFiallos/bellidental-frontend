import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Encounter } from '../../models/encounter.models';
import { EncounterTextField } from '../../domain/encounter-completeness';

const DIAGNOSTIC_SHORTCUTS = ['Biometría', 'Química sanguínea', 'Rayos X'];
const NORMAL_EXAM_TEXT = 'Sin patología aparente';

@Component({
  selector: 'bd-encounter-plans',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="plans">
      <div class="plans__field">
        <div class="plans__label-bar">
          <label class="plans__label" for="stomatognathic-exam-input">
            Examen del sistema estomatognático
          </label>
          @if (!isReadOnly()) {
            <button type="button" class="plans__shortcut" (click)="setNormalExam()">
              {{ normalExamText }}
            </button>
          }
        </div>
        @if (isReadOnly()) {
          <p class="plans__readonly">{{ values().stomatognathicExam || 'No registrado' }}</p>
        } @else {
          <textarea
            id="stomatognathic-exam-input"
            class="input plans__textarea"
            rows="3"
            [ngModel]="values().stomatognathicExam ?? ''"
            (ngModelChange)="onTextChange('stomatognathicExam', $event)"
          ></textarea>
        }
      </div>

      <div class="plans__field">
        <div class="plans__label-bar">
          <label class="plans__label" for="diagnostic-plan-input">Plan diagnóstico</label>
          @if (!isReadOnly()) {
            <div class="plans__shortcuts">
              @for (shortcut of diagnosticShortcuts; track shortcut) {
                <button type="button" class="plans__shortcut" (click)="addDiagnosticShortcut(shortcut)">
                  + {{ shortcut }}
                </button>
              }
            </div>
          }
        </div>
        @if (isReadOnly()) {
          <p class="plans__readonly">{{ values().diagnosticPlan || 'No registrado' }}</p>
        } @else {
          <textarea
            id="diagnostic-plan-input"
            class="input plans__textarea"
            rows="2"
            [ngModel]="values().diagnosticPlan ?? ''"
            (ngModelChange)="onTextChange('diagnosticPlan', $event)"
          ></textarea>
        }
      </div>

      <div class="plans__field">
        <label class="plans__label" for="therapeutic-plan-input">Plan terapéutico</label>
        @if (isReadOnly()) {
          <p class="plans__readonly">{{ values().therapeuticPlan || 'No registrado' }}</p>
        } @else {
          <textarea
            id="therapeutic-plan-input"
            class="input plans__textarea"
            rows="2"
            [ngModel]="values().therapeuticPlan ?? ''"
            (ngModelChange)="onTextChange('therapeuticPlan', $event)"
          ></textarea>
        }
      </div>

      <div class="plans__field">
        <label class="plans__label" for="educational-plan-input">Plan educacional</label>
        @if (isReadOnly()) {
          <p class="plans__readonly">{{ values().educationalPlan || 'No registrado' }}</p>
        } @else {
          <textarea
            id="educational-plan-input"
            class="input plans__textarea"
            rows="2"
            [ngModel]="values().educationalPlan ?? ''"
            (ngModelChange)="onTextChange('educationalPlan', $event)"
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

    .plans__label-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-xs);
    }

    .plans__label {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-600);
    }

    .plans__shortcuts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
    }

    .plans__shortcut {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0 var(--space-sm);
      border: 1px solid var(--slate-300);
      border-radius: var(--radius-sm);
      background-color: var(--white);
      color: var(--blue-900);
      font-size: var(--fs-sm);
      font-weight: 500;
      cursor: pointer;

      &:hover {
        background-color: var(--blue-50);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 1px;
      }
    }

    .plans__textarea {
      width: 100%;
      min-width: 0;
      resize: vertical;
      box-sizing: border-box;
    }

    .plans__readonly {
      margin: 0;
      padding: 0.5rem 0;
      font-size: var(--fs-sm);
      color: var(--slate-800);
      white-space: pre-line;
    }
  `,
})
export class EncounterPlansComponent {
  readonly values = input.required<
    Pick<Encounter, 'stomatognathicExam' | 'diagnosticPlan' | 'therapeuticPlan' | 'educationalPlan'>
  >();
  readonly isReadOnly = input<boolean>(false);
  readonly textChange = output<{ field: EncounterTextField; value: string | null }>();

  readonly diagnosticShortcuts = DIAGNOSTIC_SHORTCUTS;
  readonly normalExamText = NORMAL_EXAM_TEXT;

  onTextChange(field: EncounterTextField, value: string): void {
    this.textChange.emit({ field, value });
  }

  setNormalExam(): void {
    this.textChange.emit({ field: 'stomatognathicExam', value: NORMAL_EXAM_TEXT });
  }

  addDiagnosticShortcut(shortcut: string): void {
    const current = this.values().diagnosticPlan?.trim() ?? '';
    const items = current ? current.split(', ') : [];
    if (items.includes(shortcut)) return;
    const next = [...items, shortcut].join(', ');
    this.textChange.emit({ field: 'diagnosticPlan', value: next });
  }
}
