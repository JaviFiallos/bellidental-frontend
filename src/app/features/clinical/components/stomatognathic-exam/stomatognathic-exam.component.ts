import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Check } from 'lucide-angular';
import { IconComponent, LucideIconData } from '../../../../shared/components/icon/icon.component';
import { Encounter } from '../../models/encounter.models';
import { EncounterTextField } from '../../domain/encounter-completeness';
import {
  formatMarkedRegions,
  STOMATOGNATHIC_REGIONS,
  StomatognathicRegion,
} from '../../domain/stomatognathic-regions';

const NORMAL_EXAM_TEXT = 'Sin patología aparente';

@Component({
  selector: 'bd-stomatognathic-exam',
  standalone: true,
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="exam">
      <div class="exam__label-bar">
        <span class="exam__label" id="stomatognathic-regions-label">
          Examen del sistema estomatognático
        </span>
        @if (!isReadOnly()) {
          <button
            type="button"
            class="exam__shortcut"
            [disabled]="hasMarkedRegions()"
            (click)="setNormalExam()"
          >
            {{ normalExamText }}
          </button>
        }
      </div>

      @if (isReadOnly()) {
        <div class="exam__field">
          <span class="exam__sublabel">Regiones:</span>
          <p class="exam__readonly">{{ readOnlyRegionsText() }}</p>
        </div>
        <div class="exam__field">
          <span class="exam__sublabel">Descripción:</span>
          <p class="exam__readonly">{{ values().stomatognathicExam || 'No registrado' }}</p>
        </div>
      } @else {
        <div class="exam__regions-grid" role="group" aria-labelledby="stomatognathic-regions-label">
          @for (reg of regions; track reg.id) {
            <button
              type="button"
              class="region-btn"
              [class.region-btn--checked]="isRegionMarked(reg.id)"
              [attr.aria-pressed]="isRegionMarked(reg.id)"
              (click)="toggleRegion(reg)"
            >
              <span class="region-btn__checkbox" aria-hidden="true">
                @if (isRegionMarked(reg.id)) {
                  <bd-icon [name]="checkIcon" [size]="14" />
                }
              </span>
              <span class="region-btn__label">{{ reg.id }} {{ reg.name }}</span>
            </button>
          }
        </div>

        <div class="exam__field">
          <label class="exam__sublabel" for="stomatognathic-exam-input">Descripción</label>
          <textarea
            #examTextarea
            id="stomatognathic-exam-input"
            class="input exam__textarea"
            rows="3"
            [ngModel]="values().stomatognathicExam ?? ''"
            (ngModelChange)="onTextChange($event)"
          ></textarea>
        </div>
      }
    </div>
  `,
  styles: `
    .exam {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .exam__label-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-xs);
    }

    .exam__label {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-600);
    }

    .exam__sublabel {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-600);
    }

    .exam__shortcut {
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

      &:hover:not(:disabled) {
        background-color: var(--blue-50);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 1px;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .exam__regions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
      gap: var(--space-xs);
      width: 100%;
    }

    .region-btn {
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

    .region-btn__checkbox {
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

      .region-btn--checked & {
        background-color: var(--blue-600);
        border-color: var(--blue-600);
        color: var(--white);
      }
    }

    .region-btn__label {
      min-width: 0;
      line-height: 1.25;
    }

    .exam__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      min-width: 0;
    }

    .exam__textarea {
      width: 100%;
      min-width: 0;
      resize: vertical;
      box-sizing: border-box;
    }

    .exam__readonly {
      margin: 0;
      padding: 0.25rem 0;
      font-size: var(--fs-sm);
      color: var(--slate-800);
      white-space: pre-line;
    }
  `,
})
export class StomatognathicExamComponent {
  readonly values = input.required<
    Pick<Encounter, 'stomatognathicExam' | 'stomatognathicRegions'>
  >();
  readonly isReadOnly = input<boolean>(false);

  readonly regionToggle = output<number>();
  readonly textChange = output<{ field: EncounterTextField; value: string | null }>();

  readonly examTextarea = viewChild<ElementRef<HTMLTextAreaElement>>('examTextarea');

  readonly regions = STOMATOGNATHIC_REGIONS;
  readonly normalExamText = NORMAL_EXAM_TEXT;
  readonly checkIcon: LucideIconData = Check;

  readonly hasMarkedRegions = computed(
    () => (this.values().stomatognathicRegions?.length ?? 0) > 0
  );

  readonly readOnlyRegionsText = computed(() =>
    formatMarkedRegions(this.values().stomatognathicRegions)
  );

  isRegionMarked(id: number): boolean {
    return this.values().stomatognathicRegions?.includes(id) ?? false;
  }

  toggleRegion(reg: StomatognathicRegion): void {
    if (this.isReadOnly()) return;

    const isCurrentlyMarked = this.isRegionMarked(reg.id);
    if (!isCurrentlyMarked) {
      const currentText = this.values().stomatognathicExam ?? '';
      const prefix = `${reg.id}.`;
      const lines = currentText.split(/\r?\n/);
      const alreadyHasLine = lines.some((line) => line.trim().startsWith(prefix));

      if (!alreadyHasLine) {
        const lineToAdd = `${reg.id}. ${reg.name}: `;
        const trimmed = currentText.trimEnd();
        let nextText: string;
        if (trimmed.length === 0 || trimmed === NORMAL_EXAM_TEXT) {
          nextText = lineToAdd;
        } else {
          nextText = `${trimmed}\n${lineToAdd}`;
        }
        this.textChange.emit({ field: 'stomatognathicExam', value: nextText });
      }

      this.regionToggle.emit(reg.id);
      this.focusTextarea();
    } else {
      this.regionToggle.emit(reg.id);
    }
  }

  setNormalExam(): void {
    if (this.isReadOnly() || this.hasMarkedRegions()) return;
    this.textChange.emit({ field: 'stomatognathicExam', value: NORMAL_EXAM_TEXT });
  }

  onTextChange(value: string): void {
    this.textChange.emit({ field: 'stomatognathicExam', value });
  }

  private focusTextarea(): void {
    setTimeout(() => {
      const el = this.examTextarea()?.nativeElement;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    });
  }
}
