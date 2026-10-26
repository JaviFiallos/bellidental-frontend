import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ComboboxComponent } from '../../../../shared/components/combobox/combobox.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import {
  matchesExistingPreset,
  suggestPresetLabel,
} from '../../domain/medication-display';
import {
  DraftItem,
  DraftMedication,
  formatMedicationLabel,
  Medication,
  MedicationPreset,
  MedicationPresetRequest,
  toDraftMedication,
} from '../../models/prescription.models';

const EMPTY_POSOLOGY = {
  dose: '',
  frequency: '',
  duration: '',
  quantity: '',
  instructions: '',
};

/** Medicamento → presets → posología. Presentacional: la búsqueda llega por input() y el ítem sale por output(). */
@Component({
  selector: 'bd-prescription-item-form',
  standalone: true,
  imports: [ReactiveFormsModule, ComboboxComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prescription-item-form" [formGroup]="form">
      <div class="prescription-item-form__medication">
        <span class="prescription-item-form__label">Medicamento</span>
        <bd-combobox
          #medicationCombobox
          [items]="medications()"
          [value]="searchText()"
          [minQueryLength]="1"
          [isLoading]="isSearching()"
          [errorMessage]="searchError()"
          [actionLabel]="comboboxActionLabel()"
          placeholder="Escribe el nombre: amo, ibu…"
          (valueChange)="onSearchText($event)"
          (selected)="onMedicationSelected($event)"
          (action)="onComboboxAction()"
        >
          <ng-template let-medication>
            <div class="medication-option">{{ labelOf(medication) }}</div>
          </ng-template>
        </bd-combobox>
      </div>

      @if (selectedMedication(); as medication) {
        @if (medication.presets.length > 0) {
          <div class="prescription-item-form__presets" role="group" aria-label="Posología predefinida">
            @for (preset of medication.presets; track preset.id) {
              <button
                type="button"
                class="prescription-item-form__preset"
                [class.prescription-item-form__preset--active]="presetId() === preset.id"
                [attr.aria-pressed]="presetId() === preset.id"
                (click)="applyPreset(preset)"
              >
                {{ preset.label }}
              </button>
            }
          </div>
        }
      }

      <div class="prescription-item-form__grid">
        <bd-field
          label="Dosis"
          fieldId="prescription-dose"
          [error]="missingWithoutPreset(form.controls.dose.value)"
        >
          <input id="prescription-dose" class="prescription-item-form__input" type="text" maxlength="100" formControlName="dose" />
        </bd-field>
        <bd-field
          label="Frecuencia"
          fieldId="prescription-frequency"
          [error]="missingWithoutPreset(form.controls.frequency.value)"
        >
          <input id="prescription-frequency" class="prescription-item-form__input" type="text" maxlength="100" formControlName="frequency" />
        </bd-field>
        <bd-field
          label="Duración"
          fieldId="prescription-duration"
          [error]="missingWithoutPreset(form.controls.duration.value)"
        >
          <input id="prescription-duration" class="prescription-item-form__input" type="text" maxlength="100" formControlName="duration" />
        </bd-field>
        <bd-field label="Cantidad" fieldId="prescription-quantity" hint="Opcional. Texto libre">
          <input id="prescription-quantity" class="prescription-item-form__input" type="text" maxlength="50" formControlName="quantity" />
        </bd-field>
        <bd-field label="Indicaciones del medicamento" fieldId="prescription-item-instructions" hint="Opcional">
          <input id="prescription-item-instructions" class="prescription-item-form__input" type="text" formControlName="instructions" />
        </bd-field>
      </div>

      @if (canSaveAsPreset() && !savingPresetOpen()) {
        <div class="prescription-item-form__preset-action">
          <button
            type="button"
            class="btn btn-outline prescription-item-form__preset-action-btn"
            (click)="onOpenSavePreset()"
          >
            Guardar como plantilla
          </button>
        </div>
      }

      @if (savingPresetOpen()) {
        <div class="prescription-item-form__save-preset-inline">
          <bd-field label="Nombre de la plantilla" fieldId="prescription-preset-name">
            <input
              id="prescription-preset-name"
              class="prescription-item-form__input"
              type="text"
              maxlength="60"
              [value]="presetNameInput()"
              (input)="onPresetNameInput($event)"
            />
          </bd-field>

          @if (presetSaveError(); as error) {
            <p class="prescription-item-form__error" role="alert">{{ error }}</p>
          }

          <div class="prescription-item-form__preset-inline-actions">
            <button
              type="button"
              class="btn btn-accent prescription-item-form__btn"
              [disabled]="isPresetSaving() || !presetNameInput().trim()"
              (click)="onSavePreset()"
            >
              {{ isPresetSaving() ? 'Guardando…' : 'Guardar' }}
            </button>
            <button
              type="button"
              class="btn btn-ghost prescription-item-form__btn"
              [disabled]="isPresetSaving()"
              (click)="onCancelSavePreset()"
            >
              Cancelar
            </button>
          </div>
        </div>
      }

      @if (submitError(); as error) {
        <p class="prescription-item-form__error" role="alert">{{ error }}</p>
      }

      <div class="prescription-item-form__actions">
        @if (editingItem()) {
          <button type="button" class="btn btn-outline prescription-item-form__btn" (click)="cancelEdit.emit()">
            Cancelar edición
          </button>
        }
        <button type="button" class="btn btn-primary prescription-item-form__btn" (click)="submit()">
          {{ editingItem() ? 'Actualizar medicamento' : 'Agregar' }}
        </button>
      </div>
    </div>
  `,
  styles: `
    .prescription-item-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      padding: var(--space-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background-color: var(--color-bg);
    }

    .prescription-item-form__label {
      display: block;
      font-size: var(--fs-sm);
      font-weight: 500;
      margin-bottom: var(--space-xs);
    }

    .medication-option {
      min-height: 44px;
      display: flex;
      align-items: center;
      padding: var(--space-xs) var(--space-sm);
      font-size: var(--fs-sm);
    }

    .prescription-item-form__presets {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
    }

    .prescription-item-form__preset {
      min-height: 44px;
      padding: 0 var(--space-sm);
      border: 1px solid var(--blue-300);
      border-radius: var(--radius-sm);
      background-color: var(--white);
      color: var(--blue-900);
      font-size: var(--fs-sm);
      cursor: pointer;
    }

    .prescription-item-form__preset--active {
      background-color: var(--blue-800);
      border-color: var(--blue-800);
      color: var(--white);
      font-weight: 600;
    }

    .prescription-item-form__preset:focus-visible,
    .prescription-item-form__input:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 1px;
    }

    .prescription-item-form__grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-sm);
    }

    .prescription-item-form__input {
      width: 100%;
      box-sizing: border-box;
      min-height: 44px;
      padding: 0 var(--space-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background-color: var(--white);
      font: inherit;
      font-size: var(--fs-sm);
      color: var(--color-text);
    }

    .prescription-item-form__preset-action {
      display: flex;
      align-items: center;
    }

    .prescription-item-form__preset-action-btn {
      min-height: 44px;
      font-size: var(--fs-sm);
    }

    .prescription-item-form__save-preset-inline {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      padding: var(--space-sm);
      border-radius: var(--radius-sm);
      background-color: var(--blue-50);
      border: 1px dashed var(--blue-300);
    }

    .prescription-item-form__preset-inline-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
    }

    .prescription-item-form__error {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-danger);
    }

    .prescription-item-form__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-xs);
    }

    .prescription-item-form__btn {
      min-height: 44px;
    }
  `,
})
export class PrescriptionItemFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly medications = input<Medication[]>([]);
  readonly isSearching = input<boolean>(false);
  readonly searchError = input<string | null>(null);
  readonly editingItem = input<DraftItem | null>(null);

  readonly createdMedication = input<Medication | null>(null);
  readonly createdPreset = input<MedicationPreset | null>(null);
  readonly isPresetSaving = input<boolean>(false);
  readonly presetSaveError = input<string | null>(null);

  readonly queryChange = output<string>();
  readonly addItem = output<DraftItem>();
  readonly cancelEdit = output<void>();
  readonly requestAddMedication = output<string>();
  readonly savePreset = output<{ medicationId: number; request: MedicationPresetRequest }>();

  private readonly medicationCombobox = viewChild<ComboboxComponent<Medication>>('medicationCombobox');

  readonly form = this.fb.nonNullable.group({ ...EMPTY_POSOLOGY });
  private readonly formValues = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly searchText = signal<string>('');
  readonly selectedMedication = signal<DraftMedication | null>(null);
  readonly presetId = signal<number | null>(null);
  readonly submitted = signal<boolean>(false);
  readonly submitError = signal<string | null>(null);

  readonly savingPresetOpen = signal<boolean>(false);
  readonly presetNameInput = signal<string>('');

  readonly labelOf = formatMedicationLabel;

  readonly comboboxActionLabel = computed(() => {
    const text = this.searchText().trim();
    if (text.length >= 2 && this.medications().length === 0 && !this.isSearching()) {
      return `＋ Agregar «${text}»`;
    }
    return null;
  });

  readonly canSaveAsPreset = computed(() => {
    const med = this.selectedMedication();
    if (!med) return false;
    const values = this.formValues();
    const d = values?.dose?.trim() ?? '';
    const f = values?.frequency?.trim() ?? '';
    const dur = values?.duration?.trim() ?? '';
    if (!d || !f || !dur) return false;
    return !matchesExistingPreset(med.presets, {
      dose: d,
      frequency: f,
      duration: dur,
      instructions: values?.instructions,
    });
  });

  constructor() {
    // Al editar un ítem, el formulario muestra sus valores; al agregar o cancelar, vuelve a estar vacío.
    effect(() => {
      const item = this.editingItem();
      untracked(() => this.loadItem(item));
    });

    // Al crearse un nuevo medicamento desde la receta, queda seleccionado.
    effect(() => {
      const created = this.createdMedication();
      if (created) {
        untracked(() => this.onMedicationSelected(created));
      }
    });

    // Al guardarse una posología como plantilla, se añade a los presets y queda seleccionada.
    effect(() => {
      const newPreset = this.createdPreset();
      if (newPreset) {
        untracked(() => {
          const med = this.selectedMedication();
          if (med) {
            const exists = med.presets.some((p) => p.id === newPreset.id);
            const updated = exists
              ? med.presets.map((p) => (p.id === newPreset.id ? newPreset : p))
              : [...med.presets, newPreset];
            this.selectedMedication.set({
              ...med,
              presets: updated,
            });
            this.presetId.set(newPreset.id);
            this.savingPresetOpen.set(false);
          }
        });
      }
    });
  }

  onSearchText(text: string): void {
    this.searchText.set(text);
    this.selectedMedication.set(null);
    this.presetId.set(null);
    this.savingPresetOpen.set(false);
    this.queryChange.emit(text);
  }

  onComboboxAction(): void {
    const text = this.searchText().trim();
    if (text.length >= 2) {
      this.requestAddMedication.emit(text);
    }
  }

  onMedicationSelected(medication: Medication): void {
    this.selectedMedication.set(toDraftMedication(medication));
    this.searchText.set(formatMedicationLabel(medication));
    this.presetId.set(null);
    this.submitError.set(null);
    this.savingPresetOpen.set(false);
    this.form.reset({ ...EMPTY_POSOLOGY });

    // Con un solo preset, viene elegido.
    if (medication.presets.length === 1) {
      this.applyPreset(medication.presets[0]);
    }
  }

  applyPreset(preset: MedicationPreset): void {
    this.presetId.set(preset.id);
    this.submitError.set(null);
    this.savingPresetOpen.set(false);
    this.form.patchValue({
      dose: preset.dose,
      frequency: preset.frequency,
      duration: preset.duration,
      instructions: preset.instructions ?? '',
    });
  }

  onOpenSavePreset(): void {
    this.savingPresetOpen.set(true);
    const suggested = suggestPresetLabel(
      this.form.controls.frequency.value,
      this.form.controls.duration.value
    );
    this.presetNameInput.set(suggested);
  }

  onPresetNameInput(event: Event): void {
    this.presetNameInput.set((event.target as HTMLInputElement).value);
  }

  onCancelSavePreset(): void {
    this.savingPresetOpen.set(false);
  }

  onSavePreset(): void {
    const med = this.selectedMedication();
    const label = this.presetNameInput().trim();
    if (!med || !label) {
      return;
    }
    const values = this.form.getRawValue();
    const request: MedicationPresetRequest = {
      label,
      dose: values.dose.trim(),
      frequency: values.frequency.trim(),
      duration: values.duration.trim(),
      ...(values.instructions.trim() ? { instructions: values.instructions.trim() } : {}),
    };
    this.savePreset.emit({ medicationId: med.id, request });
  }

  missingWithoutPreset(value: string): string | null {
    if (!this.submitted() || this.presetId() !== null) return null;
    return value.trim() === '' ? 'Obligatorio sin preset' : null;
  }

  submit(): void {
    this.submitted.set(true);
    const medication = this.selectedMedication();
    if (!medication) {
      this.submitError.set('Elige un medicamento de la lista.');
      return;
    }

    const values = this.form.getRawValue();
    const missingPosology =
      this.presetId() === null &&
      (values.dose.trim() === '' || values.frequency.trim() === '' || values.duration.trim() === '');
    if (missingPosology) {
      this.submitError.set('Sin preset, la dosis, la frecuencia y la duración son obligatorias.');
      return;
    }

    this.addItem.emit({
      medication,
      presetId: this.presetId(),
      dose: values.dose,
      frequency: values.frequency,
      duration: values.duration,
      quantity: values.quantity,
      instructions: values.instructions,
    });
    this.loadItem(null);
    this.medicationCombobox()?.focusInput();
  }

  private loadItem(item: DraftItem | null): void {
    this.submitted.set(false);
    this.submitError.set(null);
    this.savingPresetOpen.set(false);
    if (!item) {
      this.searchText.set('');
      this.selectedMedication.set(null);
      this.presetId.set(null);
      this.form.reset({ ...EMPTY_POSOLOGY });
      return;
    }

    this.searchText.set(item.medication.label);
    this.selectedMedication.set(item.medication);
    this.presetId.set(item.presetId);
    this.form.reset({
      dose: item.dose,
      frequency: item.frequency,
      duration: item.duration,
      quantity: item.quantity,
      instructions: item.instructions,
    });
  }
}
