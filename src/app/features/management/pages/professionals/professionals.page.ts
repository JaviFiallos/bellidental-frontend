import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SideSheetComponent } from '../../../../shared/components/side-sheet';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ProfessionalFormComponent } from '../../components/professional-form/professional-form.component';
import { ProfessionalTableComponent } from '../../components/professional-table/professional-table.component';
import { ProfessionalsAdminStore } from '../../services/professionals-admin.store';

@Component({
  selector: 'bd-professionals-page',
  standalone: true,
  imports: [
    AlertComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    ProfessionalFormComponent,
    ProfessionalTableComponent,
    SideSheetComponent,
    SkeletonComponent,
  ],
  providers: [ProfessionalsAdminStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="professionals-page"
      [class.professionals-page--panel-open]="store.activePanel() !== null"
    >
      <bd-page-header title="Profesionales" [subtitle]="professionalsSummary()">
        <button type="button" class="btn btn-accent" (click)="store.openCreate()">
          Nuevo profesional
        </button>
      </bd-page-header>

      @if (store.loading()) {
        <div class="professionals-page__skeleton" aria-busy="true">
          <bd-skeleton height="2.5rem" width="100%" />
          <bd-skeleton height="2.5rem" width="100%" />
          <bd-skeleton height="2.5rem" width="100%" />
        </div>
      } @else if (store.error(); as message) {
        <bd-alert variant="error" [message]="message">
          <button type="button" class="btn btn-primary" (click)="store.load()">
            Reintentar
          </button>
        </bd-alert>
      } @else if (store.sortedProfessionals().length === 0) {
        <bd-empty-state
          title="Sin profesionales registrados"
          description="Registra el primer profesional con sus especialidades y color para la agenda."
        >
          <button type="button" class="btn btn-primary" (click)="store.openCreate()">
            Nuevo profesional
          </button>
        </bd-empty-state>
      } @else {
        <bd-professional-table
          [professionals]="store.sortedProfessionals()"
          (edit)="store.openEdit($event)"
        />
      }

      <bd-side-sheet
        [isOpen]="store.activePanel() !== null"
        titleId="professional-form-title"
        [fullscreenBelowMd]="true"
        (closed)="store.closePanel()"
      >
        @if (store.activePanel()) {
          @for (session of [store.panelSession()]; track session) {
            <bd-professional-form
              [professional]="store.editingProfessional()"
              [specialties]="store.specialties()"
              [existingProfessionals]="store.professionals()"
              [saving]="store.saving()"
              [saveError]="store.saveError()"
              (saveCreate)="store.saveCreate($event)"
              (saveEdit)="store.saveEdit($event.id, $event.req)"
              (cancel)="store.closePanel()"
            />
          }
        }
      </bd-side-sheet>
    </section>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .professionals-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      min-width: 0;
      padding: var(--space-md);
      box-sizing: border-box;

      @include bp.bp-up(md) {
        padding: var(--space-lg);
      }

      &.professionals-page--panel-open {
        @include bp.bp-up('lg') {
          padding-inline-end: 26rem;
        }
      }
    }

    .professionals-page .btn {
      min-height: 44px;
    }

    .professionals-page__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }
  `,
})
export class ProfessionalsPage implements OnInit {
  readonly store = inject(ProfessionalsAdminStore);

  readonly professionalsSummary = computed(() => {
    const total = this.store.professionals().length;
    if (total === 0) return 'Sin profesionales registrados';
    const active = this.store.professionals().filter((p) => p.active).length;
    return `${total} ${total === 1 ? 'profesional' : 'profesionales'} · ${active} ${active === 1 ? 'activo' : 'activos'}`;
  });

  ngOnInit(): void {
    this.store.load();
  }
}
