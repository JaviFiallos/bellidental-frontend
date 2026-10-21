import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { Check } from 'lucide-angular';
import { IconComponent, LucideIconData } from '../../../../shared/components/icon/icon.component';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog';
import { Encounter } from '../../models/encounter.models';
import { EncounterTextField } from '../../domain/encounter-completeness';
import {
  parseStomatognathicExam,
  serializeStomatognathicExam,
} from '../../domain/stomatognathic-exam-text';
import {
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
            [disabled]="hasMarkedRegions() || hasGeneralField()"
            (click)="setNormalExam()"
          >
            {{ normalExamText }}
          </button>
        }
      </div>

      @if (isReadOnly()) {
        <ul class="exam__readonly-list">
          @for (region of markedRegions(); track region.id) {
            <li class="exam__field">
              <span class="exam__sublabel">{{ regionLabel(region) }}</span>
              <p class="exam__readonly">{{ regionText(region.id) || 'Sin descripción' }}</p>
            </li>
          }
          @if (hasGeneralField()) {
            <li class="exam__field">
              <span class="exam__sublabel">Observación general</span>
              <p class="exam__readonly">{{ parts().general }}</p>
            </li>
          }
          @if (!hasMarkedRegions() && !hasGeneralField()) {
            <li><p class="exam__readonly">No registrado</p></li>
          }
        </ul>
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

        @if (hasGeneralField()) {
          <div class="exam__field">
            <div class="exam__field-header">
              <label class="exam__sublabel" for="stomatognathic-general-input">
                Observación general
              </label>
              <button type="button" class="exam__remove" (click)="removeGeneralField()">
                Quitar
              </button>
            </div>
            <textarea
              id="stomatognathic-general-input"
              class="input exam__textarea"
              rows="2"
              [ngModel]="parts().general"
              (ngModelChange)="onGeneralTextChange($event)"
            ></textarea>
          </div>
        }

        <div class="exam__regions-fields">
          @for (region of markedRegions(); track region.id) {
            <div class="exam__field">
              <label class="exam__sublabel" [attr.for]="regionInputId(region.id)">
                {{ regionLabel(region) }}
              </label>
              <textarea
                #regionTextarea
                class="input exam__textarea"
                rows="2"
                [id]="regionInputId(region.id)"
                [attr.data-region-id]="region.id"
                [ngModel]="regionText(region.id)"
                (ngModelChange)="onRegionTextChange(region.id, $event)"
              ></textarea>
            </div>
          }
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

    .exam__shortcut,
    .exam__remove {
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

    .exam__regions-fields {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    @media (min-width: 64rem) {
      .exam__regions-fields {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
      }
    }

    .exam__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      min-width: 0;
    }

    .exam__field-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-xs);
    }

    .exam__textarea {
      width: 100%;
      min-width: 0;
      resize: vertical;
      box-sizing: border-box;
    }

    .exam__readonly-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      margin: 0;
      padding: 0;
      list-style: none;
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
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly values = input.required<
    Pick<Encounter, 'stomatognathicExam' | 'stomatognathicRegions'>
  >();
  readonly isReadOnly = input<boolean>(false);

  readonly regionToggle = output<number>();
  readonly textChange = output<{ field: EncounterTextField; value: string | null }>();

  private readonly regionTextareas =
    viewChildren<ElementRef<HTMLTextAreaElement>>('regionTextarea');

  readonly regions = STOMATOGNATHIC_REGIONS;
  readonly normalExamText = NORMAL_EXAM_TEXT;
  readonly checkIcon: LucideIconData = Check;

  /** El usuario abrió o editó la observación general; mantiene el campo visible aunque quede vacío. */
  private readonly generalFieldOpened = signal<boolean>(false);

  readonly markedRegionIds = computed(() => this.values().stomatognathicRegions ?? []);

  readonly hasMarkedRegions = computed(() => this.markedRegionIds().length > 0);

  readonly markedRegions = computed(() =>
    STOMATOGNATHIC_REGIONS.filter((region) => this.markedRegionIds().includes(region.id))
  );

  readonly parts = computed(() =>
    parseStomatognathicExam(this.values().stomatognathicExam, this.markedRegionIds())
  );

  readonly hasGeneralField = computed(
    () => this.generalFieldOpened() || this.parts().general.trim().length > 0
  );

  isRegionMarked(id: number): boolean {
    return this.markedRegionIds().includes(id);
  }

  regionText(id: number): string {
    return this.parts().regions[id] ?? '';
  }

  regionLabel(region: StomatognathicRegion): string {
    return `${region.id} · ${region.name}`;
  }

  regionInputId(id: number): string {
    return `stomatognathic-region-${id}`;
  }

  toggleRegion(region: StomatognathicRegion): void {
    if (this.isReadOnly()) return;

    if (!this.isRegionMarked(region.id)) {
      this.emitText(this.parts().general, this.parts().regions, [
        ...this.markedRegionIds(),
        region.id,
      ]);
      this.regionToggle.emit(region.id);
      this.focusRegion(region.id);
      return;
    }

    if (this.regionText(region.id).trim().length === 0) {
      this.unmarkRegion(region.id);
      return;
    }

    this.confirmDialog
      .open({
        title: `Desmarcar ${this.regionLabel(region)}`,
        message: 'Se borrará la descripción de esta región. ¿Continuar?',
        confirmLabel: 'Desmarcar',
        tone: 'danger',
      })
      .pipe(
        filter((result) => result.confirmed),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.unmarkRegion(region.id));
  }

  setNormalExam(): void {
    if (this.isReadOnly() || this.hasMarkedRegions() || this.hasGeneralField()) return;
    this.generalFieldOpened.set(true);
    this.emitText(NORMAL_EXAM_TEXT, {}, []);
  }

  onRegionTextChange(id: number, value: string): void {
    if (this.isReadOnly()) return;
    this.emitText(
      this.parts().general,
      { ...this.parts().regions, [id]: value },
      this.markedRegionIds()
    );
  }

  onGeneralTextChange(value: string): void {
    if (this.isReadOnly()) return;
    this.generalFieldOpened.set(true);
    this.emitText(value, this.parts().regions, this.markedRegionIds());
  }

  removeGeneralField(): void {
    if (this.isReadOnly()) return;
    const general = this.parts().general;
    if (general.trim().length === 0 || general === NORMAL_EXAM_TEXT) {
      this.clearGeneralField();
      return;
    }

    this.confirmDialog
      .open({
        title: 'Quitar observación general',
        message: 'Se borrará el texto de la observación general. ¿Continuar?',
        confirmLabel: 'Quitar',
        tone: 'danger',
      })
      .pipe(
        filter((result) => result.confirmed),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.clearGeneralField());
  }

  private unmarkRegion(id: number): void {
    const regions = { ...this.parts().regions };
    delete regions[id];
    this.emitText(
      this.parts().general,
      regions,
      this.markedRegionIds().filter((markedId) => markedId !== id)
    );
    this.regionToggle.emit(id);
  }

  private clearGeneralField(): void {
    this.generalFieldOpened.set(false);
    this.emitText('', this.parts().regions, this.markedRegionIds());
  }

  private emitText(
    general: string,
    regions: Readonly<Record<number, string>>,
    markedRegionIds: readonly number[]
  ): void {
    this.textChange.emit({
      field: 'stomatognathicExam',
      value: serializeStomatognathicExam(general, regions, markedRegionIds),
    });
  }

  private focusRegion(id: number): void {
    setTimeout(() => {
      const textarea = this.regionTextareas().find(
        (item) => item.nativeElement.dataset['regionId'] === String(id)
      );
      textarea?.nativeElement.focus();
    });
  }
}
