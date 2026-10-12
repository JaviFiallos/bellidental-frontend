import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { ClinicClock } from '../../../../core/services/clinic-clock.service';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import {
  SegmentedComponent,
  SegmentedOption,
} from '../../../../shared/components/segmented/segmented.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import { Appointment } from '../../../appointments';
import { Encounter } from '../../../clinical';
import { BoardColumnComponent } from '../../components/board-column/board-column.component';
import {
  OpenEncounterDialogComponent,
  OpenEncounterDialogData,
} from '../../components/open-encounter-dialog/open-encounter-dialog.component';
import { BoardColumnKey } from '../../domain/board-columns';
import { DentistBoardStore } from '../../services/dentist-board.store';

@Component({
  selector: 'bd-dentist-board-page',
  standalone: true,
  imports: [
    AlertComponent,
    EmptyStateComponent,
    SkeletonComponent,
    SegmentedComponent,
    BoardColumnComponent,
    ClinicDatePipe,
  ],
  providers: [DentistBoardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dentist-board-page">
      <!-- Cabecera -->
      <header class="dentist-board__header">
        <div class="dentist-board__header-main">
          <h1 class="dentist-board__title">Mis citas · {{ today() | clinicDate }}</h1>
          <div class="dentist-board__counters">
            {{ countersText() }}
          </div>
        </div>

        @if (store.refreshError()) {
          <div class="dentist-board__refresh-notice" role="status">
            <span>No se pudo actualizar</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              class="dentist-board__refresh-btn"
              (click)="store.refresh()"
            >
              Reintentar
            </button>
          </div>
        }
      </header>

      <!-- Estado: Carga inicial -->
      @if (store.loading()) {
        <div class="dentist-board__skeleton" aria-busy="true">
          <div class="dentist-board__skeleton-cols">
            <bd-skeleton height="20rem" width="100%" />
            <bd-skeleton height="20rem" width="100%" />
            <bd-skeleton height="20rem" width="100%" />
            <bd-skeleton height="20rem" width="100%" />
          </div>
        </div>
      }

      <!-- Estado: Usuario sin vincular -->
      @else if (store.unlinkedUser()) {
        <bd-empty-state
          title="Tu usuario no está vinculado a un profesional, así que no tiene citas propias."
        />
      }

      <!-- Estado: Error inicial -->
      @else if (store.error()) {
        <div class="dentist-board__error">
          <bd-alert variant="error" [message]="store.error()">
            <button
              type="button"
              class="btn btn-primary dentist-board__retry-btn"
              (click)="store.load()"
            >
              Reintentar
            </button>
          </bd-alert>
        </div>
      }

      <!-- Estado: Sin citas -->
      @else if (store.isEmpty()) {
        <bd-empty-state title="No tienes citas hoy" />
      }

      <!-- Contenido con citas -->
      @else {
        <!-- Vista Grilla (>= lg) -->
        <div class="dentist-board__grid">
          <bd-board-column
            title="Agendadas"
            columnKey="scheduled"
            [appointments]="store.scheduled()"
            (attend)="onAttend($event)"
            (navigateEncounter)="onNavigateEncounter($event)"
          />
          <bd-board-column
            title="En espera"
            columnKey="waiting"
            [appointments]="store.waiting()"
            (attend)="onAttend($event)"
            (navigateEncounter)="onNavigateEncounter($event)"
          />
          <bd-board-column
            title="En atención"
            columnKey="in-progress"
            [appointments]="store.inProgress()"
            (attend)="onAttend($event)"
            (navigateEncounter)="onNavigateEncounter($event)"
          />
          <bd-board-column
            title="Atendidas"
            columnKey="attended"
            [appointments]="store.attended()"
            (attend)="onAttend($event)"
            (navigateEncounter)="onNavigateEncounter($event)"
          />
        </div>

        <!-- Vista Pestañas (< lg) -->
        <div class="dentist-board__tabs">
          <div class="dentist-board__tabs-nav">
            <bd-segmented
              [options]="tabOptions()"
              [(value)]="selectedTab"
              label="Columnas de citas"
            />
          </div>

          <div class="dentist-board__tabs-content">
            <bd-board-column
              [title]="activeColumn().title"
              [columnKey]="selectedTab()"
              [appointments]="activeColumn().appointments"
              (attend)="onAttend($event)"
              (navigateEncounter)="onNavigateEncounter($event)"
            />
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .dentist-board-page {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      box-sizing: border-box;
      padding: var(--space-md);
      gap: var(--space-md);
      overflow-x: hidden;
    }

    .dentist-board__header {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      flex-shrink: 0;
    }

    .dentist-board__header-main {
      display: flex;
      flex-direction: column;
      gap: var(--space-2xs);

      @include bp.bp-up(sm) {
        flex-direction: row;
        align-items: baseline;
        justify-content: space-between;
      }
    }

    .dentist-board__title {
      font-size: var(--fs-xl);
      font-weight: 700;
      color: var(--blue-950);
      margin: 0;
      line-height: var(--lh-tight);
    }

    .dentist-board__counters {
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--slate-600);
      line-height: var(--lh-normal);
    }

    .dentist-board__refresh-notice {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      font-size: var(--fs-xs);
      color: var(--coral-700);
      background-color: var(--coral-100);
      border: 1px solid var(--coral-400);
      padding: 0.2rem 0.6rem;
      border-radius: var(--radius-sm);
      align-self: flex-start;
    }

    .dentist-board__refresh-btn {
      background: none;
      border: none;
      padding: 0;
      color: var(--coral-800);
      text-decoration: underline;
      font-size: inherit;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        color: var(--coral-900);
      }
    }

    .dentist-board__skeleton {
      flex: 1;
      min-height: 0;
    }

    .dentist-board__skeleton-cols {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-md);

      @include bp.bp-up(lg) {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .dentist-board__error {
      padding: var(--space-md) 0;
    }

    .dentist-board__retry-btn {
      margin-left: var(--space-sm);
    }

    .dentist-board__grid {
      display: none;

      @include bp.bp-up(lg) {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: var(--space-md);
        flex: 1;
        min-height: 0;
      }
    }

    .dentist-board__tabs {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      flex: 1;
      min-height: 0;

      @include bp.bp-up(lg) {
        display: none;
      }
    }

    .dentist-board__tabs-nav {
      flex-shrink: 0;
      overflow-x: auto;
    }

    .dentist-board__tabs-content {
      flex: 1;
      min-height: 0;
    }
  `,
})
export class DentistBoardPage {
  readonly store = inject(DentistBoardStore);
  private readonly clinicClock = inject(ClinicClock);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);

  readonly today = computed(() => this.clinicClock.now());
  readonly selectedTab = signal<BoardColumnKey>('waiting');

  readonly countersText = computed(() => {
    return `${this.store.totalCount()} hoy · ${this.store.waiting().length} en espera · ${this.store.inProgress().length} en atención · ${this.store.attended().length} atendidas`;
  });

  readonly tabOptions = computed<SegmentedOption<BoardColumnKey>[]>(() => [
    {
      value: 'scheduled',
      label: `Agendadas (${this.store.scheduled().length})`,
    },
    {
      value: 'waiting',
      label: `En espera (${this.store.waiting().length})`,
    },
    {
      value: 'in-progress',
      label: `En atención (${this.store.inProgress().length})`,
    },
    {
      value: 'attended',
      label: `Atendidas (${this.store.attended().length})`,
    },
  ]);

  readonly activeColumn = computed(() => {
    switch (this.selectedTab()) {
      case 'scheduled':
        return { title: 'Agendadas', appointments: this.store.scheduled() };
      case 'in-progress':
        return { title: 'En atención', appointments: this.store.inProgress() };
      case 'attended':
        return { title: 'Atendidas', appointments: this.store.attended() };
      default:
        return { title: 'En espera', appointments: this.store.waiting() };
    }
  });

  onAttend(appointment: Appointment): void {
    const dialogRef = this.dialog.open<Encounter, OpenEncounterDialogData>(
      OpenEncounterDialogComponent,
      {
        data: {
          patientName: appointment.patientName,
          startAt: appointment.startAt,
          submit: (chiefComplaint: string) =>
            this.store.startEncounter(appointment, chiefComplaint),
        },
        role: 'dialog',
        ariaLabelledBy: 'open-encounter-dialog-title',
        hasBackdrop: true,
        backdropClass: 'cdk-overlay-dark-backdrop',
        disableClose: false,
      }
    );

    dialogRef.closed.subscribe((encounter) => {
      if (encounter?.id) {
        this.router.navigate(['/consultorio/atencion', encounter.id]);
      }
    });
  }

  onNavigateEncounter(encounterId: string): void {
    this.router.navigate(['/consultorio/atencion', encounterId]);
  }
}
