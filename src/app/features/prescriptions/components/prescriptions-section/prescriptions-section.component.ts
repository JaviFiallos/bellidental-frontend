import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { Prescription } from '../../models/prescription.models';

/** Tarjeta "Receta" de la atención. Presentacional: la lista llega por input() y las acciones salen por output(). */
@Component({
  selector: 'bd-prescriptions-section',
  standalone: true,
  imports: [AlertComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card prescriptions-section" aria-labelledby="prescriptions-section-title">
      <header class="prescriptions-section__header">
        <h3 id="prescriptions-section-title" class="prescriptions-section__title">Receta</h3>
        @if (canCreate()) {
          <button
            type="button"
            class="btn btn-primary prescriptions-section__new"
            [disabled]="!hasDiagnoses()"
            (click)="newPrescription.emit()"
          >
            {{ hasDiagnoses() ? 'Nueva receta' : 'Agrega un diagnóstico para recetar' }}
          </button>
        }
      </header>

      @if (loadError(); as error) {
        <bd-alert variant="error" [message]="error">
          <button type="button" class="btn btn-outline" (click)="retryLoad.emit()">Reintentar</button>
        </bd-alert>
      } @else if (isLoading()) {
        <bd-skeleton height="3rem" width="100%" />
      } @else if (prescriptions().length > 0) {
        <ul class="prescriptions-section__list">
          @for (prescription of prescriptions(); track prescription.id) {
            <li class="prescriptions-section__row">
              <div class="prescriptions-section__info">
                <div class="prescriptions-section__meta">
                  <span
                    class="prescriptions-section__status"
                    [class.prescriptions-section__status--draft]="prescription.status === 'DRAFT'"
                    [class.prescriptions-section__status--issued]="prescription.status === 'ISSUED'"
                  >
                    {{ prescription.status === 'DRAFT' ? 'Borrador' : 'Emitida' }}
                  </span>
                  <span class="prescriptions-section__code">{{ prescription.icd10Code }}</span>
                  <span class="prescriptions-section__diagnosis">{{ prescription.icd10Description }}</span>
                </div>
                <p class="prescriptions-section__medications">
                  {{ medicationNames(prescription) }}
                </p>
              </div>
              @if (canUpdate() && prescription.status === 'DRAFT') {
                <button type="button" class="btn btn-outline prescriptions-section__edit" (click)="editPrescription.emit(prescription)">
                  Editar
                </button>
              }
            </li>
          }
        </ul>
      } @else {
        <p class="prescriptions-section__empty">Sin recetas en esta atención.</p>
      }
    </section>
  `,
  styles: `
    .prescriptions-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .prescriptions-section__header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
    }

    .prescriptions-section__title {
      font-size: var(--fs-md);
      font-weight: 600;
      color: var(--blue-950);
      margin: 0;
    }

    .prescriptions-section__new {
      min-height: 44px;
    }

    .prescriptions-section__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .prescriptions-section__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      padding: var(--space-sm);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
    }

    .prescriptions-section__info {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      min-width: 0;
    }

    .prescriptions-section__meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-xs) var(--space-sm);
      font-size: var(--fs-sm);
    }

    .prescriptions-section__status {
      display: inline-flex;
      align-items: center;
      min-height: 1.5rem;
      padding: 0 var(--space-xs);
      border-radius: var(--radius-sm);
      font-size: var(--fs-xs);
      font-weight: 600;
    }

    .prescriptions-section__status--draft {
      background-color: var(--gold-100);
      color: var(--gold-700);
    }

    .prescriptions-section__status--issued {
      background-color: var(--teal-100);
      color: var(--teal-700);
    }

    .prescriptions-section__code {
      font-weight: 700;
      color: var(--blue-900);
    }

    .prescriptions-section__diagnosis {
      color: var(--color-text-muted);
    }

    .prescriptions-section__medications {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text);
    }

    .prescriptions-section__edit {
      min-height: 44px;
    }

    .prescriptions-section__empty {
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
      margin: 0;
    }
  `,
})
export class PrescriptionsSectionComponent {
  readonly prescriptions = input<Prescription[]>([]);
  readonly isLoading = input<boolean>(false);
  readonly loadError = input<string | null>(null);
  readonly canCreate = input<boolean>(false);
  readonly canUpdate = input<boolean>(false);
  readonly hasDiagnoses = input<boolean>(false);

  readonly newPrescription = output<void>();
  readonly editPrescription = output<Prescription>();
  readonly retryLoad = output<void>();

  medicationNames(prescription: Prescription): string {
    return prescription.items.map((item) => item.medicationName).join(', ');
  }
}
