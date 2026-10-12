import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { AgendaSummary } from '../../services/agenda.store';

interface SummaryChip {
  id: string;
  dotClass: string;
  label: string;
}

@Component({
  selector: 'bd-agenda-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="agenda-summary" role="group" aria-label="Resumen del día">
      @for (item of chips(); track item.id; let last = $last) {
        <span class="agenda-summary__item">
          @if (item.dotClass) {
            <span class="agenda-summary__dot {{ item.dotClass }}" aria-hidden="true"></span>
          }
          <span class="agenda-summary__text">{{ item.label }}</span>
        </span>
        @if (!last) {
          <span class="agenda-summary__separator" aria-hidden="true">·</span>
        }
      }
    </div>
  `,
  styles: `
    .agenda-summary {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      font-size: var(--fs-sm);
      color: var(--slate-700);
      padding: 0.4rem 0;
      margin-bottom: var(--space-sm);
    }

    .agenda-summary__item {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-weight: 500;
    }

    .agenda-summary__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .agenda-summary__dot--scheduled {
      background-color: var(--appointment-scheduled-bar);
    }

    .agenda-summary__dot--waiting {
      background-color: var(--appointment-waiting-bar);
    }

    .agenda-summary__dot--attended {
      background-color: var(--appointment-completed-bar);
    }

    .agenda-summary__dot--no-show {
      background-color: var(--appointment-no-show-bar);
    }

    .agenda-summary__separator {
      color: var(--slate-400);
      font-weight: bold;
    }
  `,
})
export class AgendaSummaryComponent {
  readonly summary = input.required<AgendaSummary>();

  readonly chips = computed<SummaryChip[]>(() => {
    const s = this.summary();
    const result: SummaryChip[] = [];

    // Total citas
    result.push({
      id: 'total',
      dotClass: '',
      label: `${s.total} ${s.total === 1 ? 'cita' : 'citas'}`,
    });

    if (s.scheduled > 0) {
      result.push({
        id: 'scheduled',
        dotClass: 'agenda-summary__dot--scheduled',
        label: `${s.scheduled} ${s.scheduled === 1 ? 'agendada' : 'agendadas'}`,
      });
    }

    if (s.waiting > 0) {
      result.push({
        id: 'waiting',
        dotClass: 'agenda-summary__dot--waiting',
        label: `${s.waiting} en espera`,
      });
    }

    if (s.attended > 0) {
      result.push({
        id: 'attended',
        dotClass: 'agenda-summary__dot--attended',
        label: `${s.attended} ${s.attended === 1 ? 'atendida' : 'atendidas'}`,
      });
    }

    if (s.noShow > 0) {
      result.push({
        id: 'no-show',
        dotClass: 'agenda-summary__dot--no-show',
        label: `${s.noShow} ${s.noShow === 1 ? 'no asistió' : 'no asistieron'}`,
      });
    }

    return result;
  });
}
