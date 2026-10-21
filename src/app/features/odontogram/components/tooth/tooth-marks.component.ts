import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ToothMarkItem } from '../../domain/finding-symbol';

export interface RenderedToothMarkViewModel extends ToothMarkItem {
  crossPath: string;
  cx: number;
  cy: number;
  circleR: number;
  circleXPath: string;
  trianglePath: string;
  outerX: number;
  outerY: number;
  outerSize: number;
  innerX: number;
  innerY: number;
  innerSize: number;
  rectX: number;
  rectY: number;
  rectW: number;
  rectH: number;
}

@Component({
  selector: 'g[bdToothMarks]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (mark of marks(); track mark.conditionCode + mark.shape + mark.status) {
      @switch (mark.shape) {
        @case ('RECTANGLE') {
          <svg:rect
            [attr.x]="mark.rectX"
            [attr.y]="mark.rectY"
            [attr.width]="mark.rectW"
            [attr.height]="mark.rectH"
            [attr.fill]="mark.filled ? mark.color : 'none'"
            [attr.stroke]="mark.color"
            stroke-width="1.8"
            pointer-events="none"
          />
        }
        @case ('DOUBLE_SQUARE') {
          <svg:rect
            [attr.x]="mark.outerX"
            [attr.y]="mark.outerY"
            [attr.width]="mark.outerSize"
            [attr.height]="mark.outerSize"
            fill="none"
            [attr.stroke]="mark.color"
            stroke-width="1.8"
            pointer-events="none"
          />
          <svg:rect
            [attr.x]="mark.innerX"
            [attr.y]="mark.innerY"
            [attr.width]="mark.innerSize"
            [attr.height]="mark.innerSize"
            fill="none"
            [attr.stroke]="mark.color"
            stroke-width="1.8"
            pointer-events="none"
          />
        }
        @case ('TRIANGLE') {
          <svg:path
            [attr.d]="mark.trianglePath"
            fill="none"
            [attr.stroke]="mark.color"
            stroke-width="2.5"
            pointer-events="none"
          />
        }
        @case ('CIRCLE_CROSS') {
          <svg:circle
            [attr.cx]="mark.cx"
            [attr.cy]="mark.cy"
            [attr.r]="mark.circleR"
            fill="none"
            [attr.stroke]="mark.color"
            stroke-width="2.5"
            pointer-events="none"
          />
          <svg:path
            [attr.d]="mark.circleXPath"
            [attr.stroke]="mark.secondaryColor || mark.color"
            stroke-width="2.5"
            stroke-linecap="round"
            pointer-events="none"
          />
        }
        @case ('CROSS') {
          <svg:path
            [attr.d]="mark.crossPath"
            [attr.stroke]="mark.color"
            stroke-width="3.5"
            stroke-linecap="round"
            pointer-events="none"
          />
        }
      }
    }
  `,
})
export class ToothMarksComponent {
  readonly marks = input.required<RenderedToothMarkViewModel[]>();
}
