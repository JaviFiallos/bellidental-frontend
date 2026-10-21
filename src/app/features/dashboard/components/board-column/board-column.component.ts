import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { Appointment } from '../../../appointments';
import { BoardColumnKey } from '../../domain/board-columns';
import { BoardItemComponent } from '../board-item/board-item.component';

let nextColumnId = 0;

@Component({
  selector: 'bd-board-column',
  standalone: true,
  imports: [BoardItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="board-column" [attr.aria-labelledby]="headerId">
      <header class="board-column__header">
        <h2 [id]="headerId" class="board-column__title">
          <span>{{ title() }}</span>
          <span class="board-column__count">({{ appointments().length }})</span>
        </h2>
      </header>

      <div class="board-column__content">
        @if (appointments().length === 0) {
          <div class="board-column__empty" role="status">
            <p class="board-column__empty-text">{{ emptyMessage() }}</p>
          </div>
        } @else {
          <ul class="board-column__list">
            @for (appt of appointments(); track appt.id) {
              <li
                bd-board-item
                [appointment]="appt"
                [column]="columnKey()"
                (attend)="attend.emit($event)"
                (navigateEncounter)="navigateEncounter.emit($event)"
              ></li>
            }
          </ul>
        }
      </div>
    </section>
  `,
  styles: `
    .board-column {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      background-color: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .board-column__header {
      padding: var(--space-sm) var(--space-md);
      background-color: var(--white);
      border-bottom: 1px solid var(--slate-200);
      flex-shrink: 0;
    }

    .board-column__title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0;
      font-size: var(--fs-sm);
      font-weight: 700;
      color: var(--blue-950);
      line-height: var(--lh-tight);
    }

    .board-column__count {
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--slate-500);
      background-color: var(--slate-100);
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-pill);
    }

    .board-column__content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: var(--space-sm);
    }

    .board-column__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .board-column__empty {
      padding: var(--space-xl) var(--space-sm);
      text-align: center;
    }

    .board-column__empty-text {
      font-size: var(--fs-xs);
      color: var(--slate-500);
      margin: 0;
    }
  `,
})
export class BoardColumnComponent {
  readonly title = input.required<string>();
  readonly columnKey = input.required<BoardColumnKey>();
  readonly appointments = input.required<Appointment[]>();
  readonly emptyMessage = input<string>('Sin citas');

  readonly attend = output<Appointment>();
  readonly navigateEncounter = output<string>();

  readonly headerId = `board-column-header-${nextColumnId++}`;
}
