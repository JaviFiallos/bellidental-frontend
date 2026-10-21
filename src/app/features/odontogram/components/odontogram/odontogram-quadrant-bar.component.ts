import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  SegmentedComponent,
  SegmentedOption,
} from '../../../../shared/components/segmented/segmented.component';

@Component({
  selector: 'bd-odontogram-quadrant-bar',
  standalone: true,
  imports: [SegmentedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="odontogram-quadrant-bar">
      <bd-segmented
        [options]="quadrantOptions"
        label="Cuadrante"
        [value]="selectedQuadrant()"
        (valueChange)="quadrantChange.emit($event)"
      />
      <p class="odontogram-orientation">{{ orientationText() }}</p>
    </div>
  `,
  styles: `
    .odontogram-quadrant-bar {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      margin-bottom: 0.25rem;
    }

    .odontogram-orientation {
      margin: 0;
      font-size: var(--fs-xs);
      color: var(--slate-500);
      text-align: center;
    }
  `,
})
export class OdontogramQuadrantBarComponent {
  readonly selectedQuadrant = input.required<1 | 2 | 4 | 3>();
  readonly orientationText = input.required<string>();

  readonly quadrantChange = output<1 | 2 | 4 | 3>();

  readonly quadrantOptions: SegmentedOption<1 | 2 | 4 | 3>[] = [
    { value: 1, label: '18–11' },
    { value: 2, label: '21–28' },
    { value: 4, label: '48–41' },
    { value: 3, label: '31–38' },
  ];
}
