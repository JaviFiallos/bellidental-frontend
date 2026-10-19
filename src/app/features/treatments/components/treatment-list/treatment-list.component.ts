import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PerformedTreatment } from '../../models/treatment.models';

/** Tratamientos registrados en la atención: tabla que se vuelve tarjetas en pantallas pequeñas. */
@Component({
  selector: 'bd-treatment-list',
  standalone: true,
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table class="treatment-list__table" aria-label="Tratamientos registrados en la atención">
      <thead>
        <tr>
          <th scope="col">Código</th>
          <th scope="col">Tratamiento</th>
          <th scope="col">Pieza</th>
          <th scope="col">Cant.</th>
          <th scope="col">Precio</th>
          <th scope="col">Total</th>
          @if (!isReadOnly()) {
            <th scope="col"><span class="treatment-list__sr-only">Acción</span></th>
          }
        </tr>
      </thead>
      <tbody>
        @for (item of items(); track item.id) {
          <tr>
            <td data-label="Código">{{ item.treatmentCode }}</td>
            <td data-label="Tratamiento">{{ item.treatmentName }}</td>
            <td data-label="Pieza">{{ toothLabel(item) }}</td>
            <td data-label="Cant.">{{ item.quantity }}</td>
            <td data-label="Precio">{{ item.price | money }}</td>
            <td data-label="Total" class="treatment-list__total">{{ item.total | money }}</td>
            @if (!isReadOnly()) {
              <td class="treatment-list__action">
                <button
                  type="button"
                  class="btn btn-outline treatment-list__void"
                  [disabled]="voiding()"
                  [attr.aria-label]="'Anular ' + item.treatmentCode + ' ' + item.treatmentName"
                  (click)="voidRequested.emit(item)"
                >
                  Anular
                </button>
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styleUrl: './treatment-list.component.scss',
})
export class TreatmentListComponent {
  readonly items = input<PerformedTreatment[]>([]);
  readonly isReadOnly = input<boolean>(false);
  readonly voiding = input<boolean>(false);

  readonly voidRequested = output<PerformedTreatment>();

  toothLabel(item: PerformedTreatment): string {
    if (item.toothCode === null) return '—';
    return item.surfaceCode ? `${item.toothCode} ${item.surfaceCode}` : `${item.toothCode}`;
  }
}
