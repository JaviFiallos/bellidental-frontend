import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SessionStore } from '../../../../core/auth/session.store';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SideSheetComponent } from '../../../../shared/components/side-sheet';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { MedicationFormComponent } from '../../components/medication-form/medication-form.component';
import { MedicationPresetFormComponent } from '../../components/medication-preset-form/medication-preset-form.component';
import { MedicationPresetListComponent } from '../../components/medication-preset-list/medication-preset-list.component';
import { MedicationTableComponent } from '../../components/medication-table/medication-table.component';
import { summarizeMedications } from '../../domain/medication-display';
import { Medication, MedicationPreset } from '../../models/prescription.models';
import { MedicationCatalogStore } from '../../services/medication-catalog.store';

/**
 * Pantalla de administración de medicamentos y posologías para odontólogos y directores.
 */
@Component({
  selector: 'bd-medications-page',
  standalone: true,
  imports: [
    AlertComponent,
    EmptyStateComponent,
    FieldComponent,
    MedicationFormComponent,
    MedicationPresetFormComponent,
    MedicationPresetListComponent,
    MedicationTableComponent,
    PageHeaderComponent,
    SideSheetComponent,
    SkeletonComponent,
  ],
  providers: [MedicationCatalogStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="medications-page"
      [class.medications-page--panel-open]="store.activePanel() !== null"
    >
      <bd-page-header title="Medicamentos" [subtitle]="unlinkedUser() ? null : subtitle()">
        @if (!unlinkedUser()) {
          <button type="button" class="btn btn-accent" (click)="store.openNewMedication()">
            Nuevo medicamento
          </button>
        }
      </bd-page-header>

      @if (unlinkedUser()) {
        <bd-empty-state title="Tu usuario no está registrado como profesional" />
      } @else if (store.loading()) {
        <div class="medications-page__skeleton" aria-busy="true">
          <bd-skeleton height="2.5rem" width="100%" />
          <bd-skeleton height="2.5rem" width="100%" />
          <bd-skeleton height="2.5rem" width="100%" />
        </div>
      } @else if (store.error(); as message) {
        <bd-alert variant="error" [message]="message">
          <button type="button" class="btn btn-primary" (click)="store.load()">Reintentar</button>
        </bd-alert>
      } @else {
        <div class="medications-page__toolbar">
          <div class="medications-page__search">
            <bd-field
              label="Buscar"
              fieldId="medications-search"
              hint="Por nombre. Desde 2 caracteres."
            >
              <input
                id="medications-search"
                class="input"
                type="search"
                autocomplete="off"
                spellcheck="false"
                [value]="store.query()"
                (input)="onSearchInput($event)"
              />
            </bd-field>
          </div>
          <label class="medications-page__check">
            <input
              type="checkbox"
              [checked]="store.showInactive()"
              (change)="onShowInactiveChange($event)"
            />
            Mostrar inactivos
          </label>
        </div>

        @if (store.visibleMedications().length > 0) {
          <bd-medication-table
            [medications]="store.visibleMedications()"
            [busyId]="store.busyMedicationId()"
            (managePresets)="store.openPresets($event)"
            (edit)="store.openEditMedication($event)"
            (deactivate)="onDeactivateMedication($event)"
            (activate)="store.activateMedication($event)"
          />
        } @else if (store.medications().length === 0) {
          <bd-empty-state
            title="Todavía no hay medicamentos"
            description="Crea el primero con «Nuevo medicamento»."
          />
        } @else {
          <bd-empty-state
            title="Ningún medicamento coincide"
            description="Prueba con otro término de búsqueda o marca «Mostrar inactivos»."
          />
        }
      }

      <bd-side-sheet
        [isOpen]="store.activePanel() !== null"
        [titleId]="'medication-panel-title'"
        [fullscreenBelowMd]="true"
        (closed)="store.closePanel()"
      >
        @if (store.activePanel(); as panel) {
          @for (session of [store.panelSession()]; track session) {
            <div class="medications-page__sheet">
              <div class="medications-page__sheet-header">
                <h2 id="medication-panel-title" class="medications-page__sheet-title">
                  {{ panelTitle() }}
                </h2>
              </div>

              @switch (panel) {
                @case ('medication') {
                  <bd-medication-form
                    [medication]="store.selectedMedication()"
                    [saving]="store.saving()"
                    [errorMessage]="store.saveError()"
                    (save)="store.saveMedication($event)"
                    (cancel)="store.closePanel()"
                  />
                }
                @case ('presets') {
                  @if (store.presetFormOpen()) {
                    <bd-medication-preset-form
                      [preset]="store.selectedPreset()"
                      [saving]="store.saving()"
                      [errorMessage]="store.saveError()"
                      (save)="store.savePreset($event)"
                      (cancel)="store.closePresetForm()"
                    />
                  } @else {
                    @if (store.selectedMedication(); as med) {
                      <bd-medication-preset-list
                        [medication]="med"
                        [busyId]="store.busyPresetId()"
                        (newPreset)="store.openNewPreset()"
                        (editPreset)="store.openEditPreset($event)"
                        (deactivatePreset)="onDeactivatePreset($event)"
                        (activatePreset)="store.activatePreset($event)"
                      />
                    }
                  }
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

    .medications-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      min-width: 0;
      padding: var(--space-md);
      box-sizing: border-box;

      @include bp.bp-up(md) {
        padding: var(--space-lg);
      }

      &.medications-page--panel-open {
        @include bp.bp-up('lg') {
          padding-inline-end: 26rem;
        }
      }
    }

    .medications-page .btn {
      min-height: 44px;
    }

    .medications-page__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .medications-page__toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--space-sm) var(--space-md);
    }

    .medications-page__search {
      flex: 1 1 16rem;
      max-width: 28rem;
      min-width: 0;

      bd-field {
        display: block;
      }
    }

    .medications-page__check {
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

    .medications-page__sheet {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .medications-page__sheet-header {
      padding: 1.25rem 3rem 0.75rem 1.25rem;
      border-bottom: 1px solid var(--slate-100);
    }

    .medications-page__sheet-title {
      margin: 0;
      font-size: var(--fs-lg);
      font-weight: 700;
      color: var(--blue-950);
    }
  `,
})
export class MedicationsPage {
  readonly store = inject(MedicationCatalogStore);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly sessionStore = inject(SessionStore);

  /** Sin profesional vinculado no se administra el catálogo (mismo aviso que «Mis atenciones»). */
  readonly unlinkedUser = computed(() => !this.sessionStore.currentUser()?.professionalId);

  readonly subtitle = computed(() => summarizeMedications(this.store.medications()));

  readonly panelTitle = computed(() => {
    const panel = this.store.activePanel();
    const med = this.store.selectedMedication();
    if (panel === 'medication') {
      return med ? `Editar «${med.name}»` : 'Nuevo medicamento';
    }
    if (panel === 'presets') {
      if (this.store.presetFormOpen()) {
        const preset = this.store.selectedPreset();
        return preset ? `Editar posología «${preset.label}»` : 'Nueva posología';
      }
      return med ? `Posologías de ${med.name}` : 'Posologías';
    }
    return '';
  });

  constructor() {
    if (!this.unlinkedUser()) {
      this.store.load();
    }
  }

  onSearchInput(event: Event): void {
    this.store.setQuery((event.target as HTMLInputElement).value);
  }

  onShowInactiveChange(event: Event): void {
    this.store.setShowInactive((event.target as HTMLInputElement).checked);
  }

  onDeactivateMedication(medication: Medication): void {
    this.confirmDialog
      .open({
        title: 'Desactivar medicamento',
        message: 'Dejará de aparecer al recetar. Las recetas ya hechas no cambian.',
        confirmLabel: 'Desactivar',
        cancelLabel: 'Volver',
        tone: 'danger',
      })
      .subscribe((result) => {
        if (result.confirmed) {
          this.store.deactivateMedication(medication);
        }
      });
  }

  onDeactivatePreset(preset: MedicationPreset): void {
    this.confirmDialog
      .open({
        title: 'Desactivar posología',
        message: 'Dejará de aparecer al recetar. Las recetas ya hechas no cambian.',
        confirmLabel: 'Desactivar',
        cancelLabel: 'Volver',
        tone: 'danger',
      })
      .subscribe((result) => {
        if (result.confirmed) {
          this.store.deactivatePreset(preset);
        }
      });
  }
}
