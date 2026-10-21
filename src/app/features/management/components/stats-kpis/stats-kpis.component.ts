import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { formatPercent } from '../../domain/stats-period';
import { DashboardSummary } from '../../models/dashboard.models';

@Component({
  selector: 'bd-stats-kpis',
  standalone: true,
  imports: [MoneyPipe, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (summary(); as stats) {
      <div class="stats-kpis">
        <article class="stats-kpis__card">
          <h2 class="stats-kpis__title">Atenciones completadas</h2>
          <p class="stats-kpis__value">{{ stats.appointments.completedEncounters }}</p>
          <p class="stats-kpis__hint">en el período</p>
        </article>

        <article class="stats-kpis__card">
          <h2 class="stats-kpis__title">Citas</h2>
          <p class="stats-kpis__value">{{ stats.appointments.total }}</p>
          <p class="stats-kpis__hint">{{ stats.appointments.byStatus['ATTENDED'] ?? 0 }} atendidas</p>
        </article>

        <article class="stats-kpis__card">
          <h2 class="stats-kpis__title">Inasistencia</h2>
          <p class="stats-kpis__value">{{ formatPercent(stats.appointments.noShowRate) }}</p>
          <p class="stats-kpis__hint">{{ stats.appointments.byStatus['NO_SHOW'] ?? 0 }} no asistieron</p>
        </article>

        <article class="stats-kpis__card">
          <h2 class="stats-kpis__title">Pacientes nuevos</h2>
          <p class="stats-kpis__value">{{ stats.patients.newInRange }}</p>
          <p class="stats-kpis__hint">{{ stats.patients.totalActive }} activos en total</p>
        </article>

        <article class="stats-kpis__card">
          <h2 class="stats-kpis__title">Cobrado</h2>
          <p class="stats-kpis__value">{{ stats.billing.collected | money }}</p>
          <p class="stats-kpis__hint">pagos no anulados del período</p>
        </article>

        <article class="stats-kpis__card">
          <h2 class="stats-kpis__title">Saldo por cobrar</h2>
          <p class="stats-kpis__value">{{ stats.billing.outstandingBalance | money }}</p>
          <p class="stats-kpis__hint">total histórico de la clínica</p>
        </article>
      </div>
    } @else {
      <div class="stats-kpis stats-kpis--loading" aria-busy="true">
        @for (index of placeholders; track index) {
          <div class="stats-kpis__card">
            <bd-skeleton height="1rem" width="60%" />
            <bd-skeleton height="2rem" width="50%" />
          </div>
        }
      </div>
    }
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .stats-kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
      gap: var(--space-sm);
      min-width: 0;

      @include bp.bp-up(md) {
        gap: var(--space-md);
      }
    }

    .stats-kpis__card {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
      padding: var(--space-md);
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-sm);
    }

    .stats-kpis__title {
      margin: 0;
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--slate-600);
    }

    .stats-kpis__value {
      margin: 0;
      font-size: var(--fs-lg);
      font-weight: 700;
      color: var(--blue-950);
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;

      @include bp.bp-up(md) {
        font-size: var(--fs-xl);
      }
    }

    .stats-kpis__hint {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--slate-600);
    }
  `,
})
export class StatsKpisComponent {
  readonly summary = input.required<DashboardSummary | null>();

  readonly placeholders = [1, 2, 3, 4, 5, 6];
  readonly formatPercent = formatPercent;
}
