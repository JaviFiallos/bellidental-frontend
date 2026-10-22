import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SegmentedComponent, SegmentedOption } from '../../../../shared/components/segmented/segmented.component';
import { SideSheetComponent } from '../../../../shared/components/side-sheet';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { SpecialtyFormComponent } from '../../components/specialty-form/specialty-form.component';
import { SpecialtyTableComponent } from '../../components/specialty-table/specialty-table.component';
import { TreatmentFormComponent } from '../../components/treatment-form/treatment-form.component';
import { TreatmentTableComponent } from '../../components/treatment-table/treatment-table.component';
import { summarizeSpecialties, summarizeTreatments } from '../../domain/catalog-display';
import { CatalogSpecialty, CatalogTreatment } from '../../models/catalog.models';
import { CatalogStore, CatalogTab } from '../../services/catalog.store';

const TAB_OPTIONS: SegmentedOption<CatalogTab>[] = [
  { value: 'treatments', label: 'Tratamientos' },
  { value: 'specialties', label: 'Especialidades' },
];

/** Catálogo del director: tratamientos y especialidades en dos pestañas, con un solo panel lateral. */
@Component({
  selector: 'bd-catalog-page',
  standalone: true,
  imports: [
    AlertComponent,
    EmptyStateComponent,
    FieldComponent,
    PageHeaderComponent,
    SegmentedComponent,
    SideSheetComponent,
    SkeletonComponent,
    SpecialtyFormComponent,
    SpecialtyTableComponent,
    TreatmentFormComponent,
    TreatmentTableComponent,
  ],
  providers: [CatalogStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="catalog-page" [class.catalog-page--panel-open]="store.activePanel() !== null">
      <bd-page-header title="Catálogo" [subtitle]="subtitle()">
        <button type="button" class="btn btn-accent" (click)="onNew()">{{ newLabel() }}</button>
      </bd-page-header>

      <div class="catalog-page__tabs">
        <bd-segmented
          label="Secciones del catálogo"
          [options]="tabOptions"
          [value]="store.tab()"
          (valueChange)="store.selectTab($event)"
        />
      </div>

      @if (store.loading()) {
        <div class="catalog-page__skeleton" aria-busy="true">
          <bd-skeleton height="2.5rem" width="100%" />
          <bd-skeleton height="2.5rem" width="100%" />
          <bd-skeleton height="2.5rem" width="100%" />
        </div>
      } @else if (store.error(); as message) {
        <bd-alert variant="error" [message]="message">
          <button type="button" class="btn btn-primary" (click)="store.load()">Reintentar</button>
        </bd-alert>
      } @else if (store.tab() === 'treatments') {
        <div class="catalog-page__toolbar">
          <div class="catalog-page__search">
            <bd-field
              label="Buscar"
              fieldId="catalog-search"
              hint="Por código o nombre. Desde 2 caracteres."
            >
              <input
                id="catalog-search"
                class="input"
                type="search"
                autocomplete="off"
                spellcheck="false"
                [value]="store.query()"
                (input)="onSearchInput($event)"
              />
            </bd-field>
          </div>
          <label class="catalog-page__check">
            <input
              type="checkbox"
              [checked]="store.showInactive()"
              (change)="onShowInactiveChange($event)"
            />
            Mostrar inactivos
          </label>
        </div>

        @if (store.visibleTreatments().length > 0) {
          <bd-treatment-table
            [treatments]="store.visibleTreatments()"
            [specialtyNames]="store.specialtyNames()"
            [busyId]="store.busyTreatmentId()"
            (edit)="store.openEditTreatment($event)"
            (deactivate)="onDeactivateTreatment($event)"
            (activate)="store.activateTreatment($event)"
          />
        } @else if (store.treatments().length === 0) {
          <bd-empty-state
            title="Todavía no hay tratamientos"
            description="Crea el primero con «Nuevo tratamiento»."
          />
        } @else {
          <bd-empty-state
            title="Ningún tratamiento coincide"
            description="Prueba con otro código o nombre, o marca «Mostrar inactivos»."
          />
        }
      } @else {
        @if (store.specialties().length > 0) {
          <bd-specialty-table
            [specialties]="store.specialties()"
            [busyId]="store.busySpecialtyId()"
            (edit)="store.openEditSpecialty($event)"
            (deactivate)="onDeactivateSpecialty($event)"
            (activate)="store.activateSpecialty($event)"
          />
        } @else {
          <bd-empty-state
            title="Todavía no hay especialidades"
            description="Crea la primera con «Nueva especialidad»."
          />
        }
      }

      <bd-side-sheet
        [isOpen]="store.activePanel() !== null"
        [titleId]="'catalog-panel-title'"
        [fullscreenBelowMd]="true"
        (closed)="store.closePanel()"
      >
        @if (store.activePanel(); as panel) {
          <!-- Clave por sesión de apertura: cada apertura crea el formulario de nuevo (sin datos de otra fila). -->
          @for (session of [store.panelSession()]; track session) {
            <div class="catalog-page__sheet">
              <div class="catalog-page__sheet-header">
                <h2 id="catalog-panel-title" class="catalog-page__sheet-title">{{ panelTitle() }}</h2>
              </div>
              @switch (panel) {
                @case ('treatment') {
                  <bd-treatment-form
                    [treatment]="store.selectedTreatment()"
                    [specialties]="store.specialties()"
                    [saving]="store.saving()"
                    [errorMessage]="store.saveError()"
                    (submitted)="store.saveTreatment($event)"
                    (cancelled)="store.closePanel()"
                  />
                }
                @case ('specialty') {
                  <bd-specialty-form
                    [specialty]="store.selectedSpecialty()"
                    [saving]="store.saving()"
                    [errorMessage]="store.saveError()"
                    (submitted)="store.saveSpecialty($event)"
                    (cancelled)="store.closePanel()"
                  />
                }
              }
            </div>
          }
        }
      </bd-side-sheet>
    </section>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .catalog-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      min-width: 0;
      padding: var(--space-md);
      box-sizing: border-box;

      @include bp.bp-up(md) {
        padding: var(--space-lg);
      }

      &.catalog-page--panel-open {
        @include bp.bp-up('lg') {
          padding-inline-end: 26rem;
        }
      }
    }

    .catalog-page .btn {
      min-height: 44px;
    }

    .catalog-page__tabs {
      max-width: 100%;
      overflow-x: auto;
    }

    .catalog-page__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .catalog-page__toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--space-sm) var(--space-md);
    }

    .catalog-page__search {
      flex: 1 1 16rem;
      max-width: 28rem;
      min-width: 0;

      bd-field {
        display: block;
      }
    }

    .catalog-page__check {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      min-height: 44px;
      font-size: var(--fs-sm);
      color: var(--color-text);
      cursor: pointer;

      input {
        width: 1.25rem;
        height: 1.25rem;
        margin: 0;
      }
    }

    .catalog-page__sheet {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .catalog-page__sheet-header {
      padding: 1.25rem 3rem 0.75rem 1.25rem;
      border-bottom: 1px solid var(--slate-100);
    }

    .catalog-page__sheet-title {
      margin: 0;
      font-size: var(--fs-lg);
      font-weight: 700;
      color: var(--blue-950);
    }
  `,
})
export class CatalogPage {
  readonly store = inject(CatalogStore);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly tabOptions = TAB_OPTIONS;

  readonly subtitle = computed(() =>
    this.store.tab() === 'treatments'
      ? summarizeTreatments(this.store.treatments())
      : summarizeSpecialties(this.store.specialties())
  );

  readonly newLabel = computed(() =>
    this.store.tab() === 'treatments' ? 'Nuevo tratamiento' : 'Nueva especialidad'
  );

  readonly panelTitle = computed(() => {
    const treatment = this.store.selectedTreatment();
    const specialty = this.store.selectedSpecialty();
    switch (this.store.activePanel()) {
      case 'treatment':
        return treatment ? `Editar «${treatment.code}»` : 'Nuevo tratamiento';
      case 'specialty':
        return specialty ? `Editar «${specialty.name}»` : 'Nueva especialidad';
      default:
        return '';
    }
  });

  constructor() {
    this.store.load();
  }

  onNew(): void {
    if (this.store.tab() === 'treatments') {
      this.store.openNewTreatment();
    } else {
      this.store.openNewSpecialty();
    }
  }

  onSearchInput(event: Event): void {
    this.store.setQuery((event.target as HTMLInputElement).value);
  }

  onShowInactiveChange(event: Event): void {
    this.store.setShowInactive((event.target as HTMLInputElement).checked);
  }

  onDeactivateTreatment(treatment: CatalogTreatment): void {
    this.confirmDialog
      .open({
        title: 'Desactivar tratamiento',
        message: 'Dejará de aparecer en las atenciones. El historial no cambia.',
        confirmLabel: 'Desactivar',
        cancelLabel: 'Volver',
        tone: 'danger',
      })
      .subscribe((result) => {
        if (result.confirmed) {
          this.store.deactivateTreatment(treatment);
        }
      });
  }

  onDeactivateSpecialty(specialty: CatalogSpecialty): void {
    this.confirmDialog
      .open({
        title: 'Desactivar especialidad',
        message: `«${specialty.name}» dejará de estar disponible. Si tiene profesionales activos o citas futuras, el sistema lo impedirá y te dirá por qué.`,
        confirmLabel: 'Desactivar',
        cancelLabel: 'Volver',
        tone: 'danger',
      })
      .subscribe((result) => {
        if (result.confirmed) {
          this.store.deactivateSpecialty(specialty);
        }
      });
  }
}
