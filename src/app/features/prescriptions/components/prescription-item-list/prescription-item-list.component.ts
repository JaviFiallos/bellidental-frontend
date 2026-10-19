import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DraftItem } from '../../models/prescription.models';

/** Ítems de la receta en el editor, con "Editar" y "Quitar". Presentacional. */
@Component({
  selector: 'bd-prescription-item-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length === 0) {
      <p class="prescription-item-list__empty">Aún no hay medicamentos en esta receta.</p>
    } @else {
      <ol class="prescription-item-list">
        @for (item of items(); track $index; let i = $index) {
          <li class="prescription-item-list__row" [class.prescription-item-list__row--editing]="editingIndex() === i">
            <div class="prescription-item-list__info">
              <span class="prescription-item-list__name">{{ i + 1 }}. {{ item.medication.label }}</span>
              <span class="prescription-item-list__detail">{{ posology(item) }}</span>
              @if (item.quantity) {
                <span class="prescription-item-list__detail">Cantidad: {{ item.quantity }}</span>
              }
            </div>
            <div class="prescription-item-list__actions">
              <button type="button" class="btn btn-outline prescription-item-list__btn" (click)="edit.emit(i)">
                Editar
              </button>
              <button type="button" class="btn btn-outline prescription-item-list__btn" (click)="remove.emit(i)">
                Quitar
              </button>
            </div>
          </li>
        }
      </ol>
    }
  `,
  styles: `
    .prescription-item-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .prescription-item-list__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      padding: var(--space-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
    }

    .prescription-item-list__row--editing {
      border-color: var(--color-focus);
      background-color: var(--blue-50);
    }

    .prescription-item-list__info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .prescription-item-list__name {
      font-weight: 600;
      font-size: var(--fs-sm);
      color: var(--color-text);
    }

    .prescription-item-list__detail {
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .prescription-item-list__actions {
      display: flex;
      gap: var(--space-xs);
    }

    .prescription-item-list__btn {
      min-height: 44px;
    }

    .prescription-item-list__empty {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }
  `,
})
export class PrescriptionItemListComponent {
  readonly items = input<DraftItem[]>([]);
  readonly editingIndex = input<number | null>(null);

  readonly edit = output<number>();
  readonly remove = output<number>();

  posology(item: DraftItem): string {
    return [item.dose, item.frequency, item.duration].filter((part) => part.trim() !== '').join(' · ');
  }
}
