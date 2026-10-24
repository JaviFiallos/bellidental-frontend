import { ChangeDetectionStrategy, Component, inject, input, OnInit, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import {
  DiagnosisOption,
  DraftItem,
  Medication,
  Prescription,
  PrescriptionHeaderDraft,
} from '../../models/prescription.models';
import { PrescriptionItemFormComponent } from '../prescription-item-form/prescription-item-form.component';
import { PrescriptionItemListComponent } from '../prescription-item-list/prescription-item-list.component';

const GENERAL_INSTRUCTION_SHORTCUTS: readonly string[] = [
  'No comer ni beber durante 1 hora',
  'Tomar con alimentos',
  'Completar el tratamiento aunque desaparezcan las molestias',
];

/** Editor de receta (borrador): diagnóstico, medicamentos, indicaciones generales y guardar. Presentacional. */
@Component({
  selector: 'bd-prescription-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    FieldComponent,
    PrescriptionItemFormComponent,
    PrescriptionItemListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prescription-editor sheet-form" [formGroup]="header">
      <h2 id="prescription-editor-title" class="sheet-form__title">
        {{ prescription() ? 'Editar receta' : 'Nueva receta' }}
      </h2>

      <bd-field label="Diagnóstico" fieldId="prescription-diagnosis">
        <select id="prescription-diagnosis" class="prescription-editor__select" formControlName="encounterDiagnosisId">
          @for (diagnosis of diagnoses(); track diagnosis.id) {
            <option [value]="diagnosis.id">{{ diagnosis.label }}</option>
          }
        </select>
      </bd-field>

      <section class="sheet-form__section" aria-label="Medicamentos de la receta">
        <h3 class="sheet-form__subtitle">Medicamentos</h3>
        <bd-prescription-item-form
          [medications]="medications()"
          [isSearching]="isSearching()"
          [searchError]="searchError()"
          [editingItem]="editingItem()"
          (queryChange)="medicationQueryChange.emit($event)"
          (addItem)="addItem.emit($event)"
          (cancelEdit)="cancelItemEdit.emit()"
        />
        <bd-prescription-item-list
          [items]="items()"
          [editingIndex]="editingItemIndex()"
          (edit)="editItem.emit($event)"
          (remove)="removeItem.emit($event)"
        />
      </section>

      <section class="sheet-form__section" aria-label="Indicaciones generales">
        <bd-field label="Indicaciones generales" fieldId="prescription-general" hint="Opcional. Una línea por indicación">
          <textarea id="prescription-general" class="prescription-editor__textarea" rows="3" formControlName="generalInstructions"></textarea>
        </bd-field>
        <div class="prescription-editor__shortcuts" role="group" aria-label="Indicaciones frecuentes">
          @for (shortcut of shortcuts; track shortcut) {
            <button type="button" class="prescription-editor__shortcut" (click)="addShortcut(shortcut)">
              {{ shortcut }}
            </button>
          }
        </div>
      </section>

      @if (saveError(); as error) {
        <bd-alert variant="error" [message]="error" />
      }

      <footer class="sheet-form__footer">
        <button type="button" class="btn btn-outline prescription-editor__btn" (click)="close.emit()">Cancelar</button>
        <button type="button" class="btn btn-outline prescription-editor__btn" [disabled]="!canSave()" (click)="onSave()">
          {{ saving() ? 'Guardando…' : 'Guardar borrador' }}
        </button>
        <button type="button" class="btn btn-primary prescription-editor__btn" [disabled]="!canSave()" (click)="onSaveAndEmit()">
          {{ saving() ? 'Emitiendo…' : 'Emitir e imprimir' }}
        </button>
      </footer>
    </div>
  `,
  styles: `
    .prescription-editor__select,
    .prescription-editor__textarea {
      width: 100%;
      box-sizing: border-box;
      min-height: 44px;
      padding: var(--space-xs) var(--space-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background-color: var(--white);
      font: inherit;
      font-size: var(--fs-sm);
      color: var(--color-text);
    }

    .prescription-editor__textarea {
      resize: vertical;
    }

    .prescription-editor__shortcuts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
    }

    .prescription-editor__shortcut {
      min-height: 44px;
      padding: 0 var(--space-sm);
      border: 1px solid var(--blue-300);
      border-radius: var(--radius-sm);
      background-color: var(--blue-50);
      color: var(--blue-900);
      font-size: var(--fs-sm);
      cursor: pointer;
    }

    .prescription-editor__select:focus-visible,
    .prescription-editor__textarea:focus-visible,
    .prescription-editor__shortcut:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 1px;
    }

    .prescription-editor__btn {
      min-height: 44px;
    }
  `,
})
export class PrescriptionEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly diagnoses = input<DiagnosisOption[]>([]);
  readonly prescription = input<Prescription | null>(null);
  /** Receta anulada de la que se copian diagnóstico e indicaciones ("Anular y rehacer"). */
  readonly copiedFrom = input<Prescription | null>(null);
  readonly items = input<DraftItem[]>([]);
  readonly editingItem = input<DraftItem | null>(null);
  readonly editingItemIndex = input<number | null>(null);
  readonly medications = input<Medication[]>([]);
  readonly isSearching = input<boolean>(false);
  readonly searchError = input<string | null>(null);
  readonly saving = input<boolean>(false);
  readonly saveError = input<string | null>(null);

  readonly medicationQueryChange = output<string>();
  readonly addItem = output<DraftItem>();
  readonly editItem = output<number>();
  readonly removeItem = output<number>();
  readonly cancelItemEdit = output<void>();
  readonly save = output<PrescriptionHeaderDraft>();
  readonly saveAndEmit = output<PrescriptionHeaderDraft>();
  readonly close = output<void>();

  readonly shortcuts = GENERAL_INSTRUCTION_SHORTCUTS;

  readonly header = this.fb.nonNullable.group({
    encounterDiagnosisId: '',
    generalInstructions: '',
  });

  ngOnInit(): void {
    const source = this.prescription() ?? this.copiedFrom();
    this.header.reset({
      encounterDiagnosisId: source?.encounterDiagnosisId ?? this.diagnoses()[0]?.id ?? '',
      generalInstructions: source?.generalInstructions ?? '',
    });
  }

  canSave(): boolean {
    return this.items().length > 0 && !this.saving() && this.header.getRawValue().encounterDiagnosisId !== '';
  }

  addShortcut(text: string): void {
    const control = this.header.controls.generalInstructions;
    const current = control.value.trim();
    control.setValue(current ? `${current}\n${text}` : text);
  }

  onSave(): void {
    if (!this.canSave()) return;
    this.save.emit(this.currentHeader());
  }

  onSaveAndEmit(): void {
    if (!this.canSave()) return;
    this.saveAndEmit.emit(this.currentHeader());
  }

  private currentHeader(): PrescriptionHeaderDraft {
    const value = this.header.getRawValue();
    return {
      encounterDiagnosisId: value.encounterDiagnosisId,
      generalInstructions: value.generalInstructions,
    };
  }
}
