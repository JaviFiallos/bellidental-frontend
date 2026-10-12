import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CalendarX } from 'lucide-angular';
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LucideIconData } from '../../../../shared/components/icon/icon.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { AgendaByStatusComponent } from '../../components/agenda-by-status/agenda-by-status.component';
import { AgendaDayListComponent } from '../../components/agenda-day-list/agenda-day-list.component';
import { AgendaGridComponent } from '../../components/agenda-grid/agenda-grid.component';
import { AgendaSummaryComponent } from '../../components/agenda-summary/agenda-summary.component';
import { AgendaToolbarComponent } from '../../components/agenda-toolbar/agenda-toolbar.component';
import { Appointment } from '../../models/appointment.models';
import { AgendaStore } from '../../services/agenda.store';

@Component({
  selector: 'bd-reception-agenda-page',
  standalone: true,
  imports: [
    AlertComponent,
    EmptyStateComponent,
    SkeletonComponent,
    AgendaToolbarComponent,
    AgendaSummaryComponent,
    AgendaGridComponent,
    AgendaByStatusComponent,
    AgendaDayListComponent,
  ],
  providers: [AgendaStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="reception-agenda-page">
      <!-- Barra superior / Toolbar -->
      <bd-agenda-toolbar
        [date]="store.date()"
        [view]="store.view()"
        [showCancelled]="store.showCancelled()"
        [lastUpdatedAt]="store.lastUpdatedAt()"
        [refreshError]="store.refreshError()"
        (dateChange)="onDateChange($event)"
        (viewChange)="onViewChange($event)"
        (toggleCancelled)="store.setShowCancelled($event)"
      />

      <!-- Contadores / Leyenda (solo si no hay error de carga principal) -->
      @if (!store.loading() && !store.error()) {
        <bd-agenda-summary [summary]="store.summary()" />
      }

      <!-- Estado: Error inicial o de recarga manual -->
      @if (store.error()) {
        <div class="reception-agenda-page__error-container">
          <bd-alert variant="error" [message]="store.error()">
            <button
              type="button"
              class="btn btn-primary reception-agenda-page__retry-btn"
              (click)="onRetry()"
            >
              Reintentar
            </button>
          </bd-alert>
        </div>
      }

      <!-- Estado: Carga inicial con skeleton con forma de grilla -->
      @if (store.loading()) {
        <div class="reception-agenda-page__skeleton-grid" aria-busy="true">
          <div class="reception-agenda-page__skeleton-header">
            <bd-skeleton height="2.5rem" width="100%" />
          </div>
          <div class="reception-agenda-page__skeleton-cols">
            <div class="reception-agenda-page__skeleton-time-col">
              <bd-skeleton height="8rem" width="100%" />
              <bd-skeleton height="8rem" width="100%" />
              <bd-skeleton height="8rem" width="100%" />
            </div>
            <div class="reception-agenda-page__skeleton-col">
              <bd-skeleton height="3.5rem" width="100%" />
              <bd-skeleton height="6rem" width="100%" />
              <bd-skeleton height="4rem" width="100%" />
            </div>
            <div class="reception-agenda-page__skeleton-col">
              <bd-skeleton height="5rem" width="100%" />
              <bd-skeleton height="7rem" width="100%" />
            </div>
            <div class="reception-agenda-page__skeleton-col">
              <bd-skeleton height="6rem" width="100%" />
              <bd-skeleton height="4rem" width="100%" />
            </div>
          </div>
        </div>
      }

      <!-- Estado: Ningún profesional con turno ni citas -->
      @if (!store.loading() && !store.error() && store.displayedProfessionals().length === 0) {
        <bd-empty-state
          [icon]="calendarXIcon"
          title="Ningún profesional atiende este día"
          description="No hay turnos asignados ni citas programadas para la fecha seleccionada."
        >
          <button
            type="button"
            class="btn btn-outline"
            (click)="store.setShowAllProfessionals(true)"
          >
            Ver todos los profesionales
          </button>
        </bd-empty-state>
      }

      <!-- Vistas de la agenda -->
      @if (!store.loading() && !store.error() && store.displayedProfessionals().length > 0) {
        @if (store.view() === 'professional') {
          <!-- En >= md se muestra la grilla -->
          <div class="reception-agenda-page__grid-container">
            <bd-agenda-grid
              [date]="store.date()"
              [now]="store.now()"
              [timeRange]="store.timeRange()"
              [professionals]="store.displayedProfessionals()"
              [effectiveDays]="store.effectiveDays()"
              [appointmentsByProf]="store.appointmentsByProfessional()"
              (opened)="onOpenAppointment($event)"
            />
          </div>

          <!-- En < md se muestra la lista por día y profesional -->
          <div class="reception-agenda-page__day-list-container">
            <bd-agenda-day-list
              [professionals]="store.displayedProfessionals()"
              [appointmentsByProf]="store.appointmentsByProfessional()"
              (opened)="onOpenAppointment($event)"
            />
          </div>
        } @else {
          <!-- Vista por estado -->
          <bd-agenda-by-status
            [appointmentsByStatus]="store.appointmentsByStatus()"
            [showCancelled]="store.showCancelled()"
            (opened)="onOpenAppointment($event)"
          />
        }
      }
    </div>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .reception-agenda-page {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .reception-agenda-page__error-container {
      margin: var(--space-md) 0;
    }

    .reception-agenda-page__retry-btn {
      margin-left: var(--space-md);
      font-size: var(--fs-xs);
      padding: 0.35rem 0.75rem;
    }

    .reception-agenda-page__skeleton-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      margin-top: var(--space-md);
      background-color: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
      padding: var(--space-md);
    }

    .reception-agenda-page__skeleton-header {
      width: 100%;
    }

    .reception-agenda-page__skeleton-cols {
      display: flex;
      gap: var(--space-md);
    }

    .reception-agenda-page__skeleton-time-col {
      width: 4.5rem;
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .reception-agenda-page__skeleton-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .reception-agenda-page__grid-container {
      display: block;
    }

    .reception-agenda-page__day-list-container {
      display: none;
    }

    @include bp.bp-down('md') {
      .reception-agenda-page__grid-container {
        display: none;
      }
      .reception-agenda-page__day-list-container {
        display: block;
      }
    }
  `,
})
export class ReceptionAgendaPage implements OnInit {
  readonly store = inject(AgendaStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly clinicClock = inject(ClinicClock);
  private readonly destroyRef = inject(DestroyRef);

  readonly calendarXIcon: LucideIconData = CalendarX;

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const queryDate = params.get('fecha');
        const queryView = params.get('vista');

        const effectiveDate = queryDate || this.clinicClock.todayDateString();
        const effectiveView: 'professional' | 'status' =
          queryView === 'estado' ? 'status' : 'professional';

        const needsUrlUpdate = !queryDate || !queryView;

        if (this.store.date() !== effectiveDate) {
          this.store.setDate(effectiveDate);
        }
        if (this.store.view() !== effectiveView) {
          this.store.setView(effectiveView);
        }

        if (needsUrlUpdate) {
          this.syncUrl(effectiveDate, effectiveView);
        }
      });
  }

  onDateChange(newDate: string): void {
    this.store.setDate(newDate);
    this.syncUrl(newDate, this.store.view());
  }

  onViewChange(newView: 'professional' | 'status'): void {
    this.store.setView(newView);
    this.syncUrl(this.store.date(), newView);
  }

  onRetry(): void {
    this.store.loadAgenda(this.store.date());
  }

  onOpenAppointment(appt: Appointment): void {
    // En tarea 003a solo emite, la página no hace nada aún (el panel es de la 003b)
  }

  private syncUrl(date: string, view: 'professional' | 'status'): void {
    const vistaParam = view === 'status' ? 'estado' : 'profesional';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        fecha: date,
        vista: vistaParam,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
