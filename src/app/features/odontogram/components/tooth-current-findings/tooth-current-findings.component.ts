import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { ClinicDatePipe } from '../../../../shared/pipes/clinic-date.pipe';
import {
  Finding,
  FindingStatus,
  OdontogramCatalog,
  SurfaceCode,
} from '../../models/odontogram.models';
import { SymbolGlyphComponent } from '../symbol-glyph/symbol-glyph.component';
import {
  getArch,
} from '../../domain/odontogram-layout';
import { isToothInSpan } from '../../domain/finding-symbol';
import { getConditionName, getFindingWhere } from '../../domain/finding-request';

interface CurrentFindingViewModel {
  finding: Finding;
  conditionName: string;
  where: string;
  statusLabel: string;
  isCurrentEncounter: boolean;
  scope: 'SURFACE' | 'TOOTH' | 'SPAN';
}

function isToothInFindingSpan(toothCode: number, finding: Finding): boolean {
  if (finding.endToothCode == null) return false;
  const toothArch = getArch(toothCode);
  const startArch = getArch(finding.toothCode);
  if (toothArch !== startArch) return false;

  return isToothInSpan(toothCode, {
    startCode: finding.toothCode,
    endCode: finding.endToothCode,
    arch: startArch,
    shape: 'SQUARES_LINE',
    color: '',
    lineStyle: 'SOLID',
    conditionName: '',
    status: finding.status,
  });
}

@Component({
  selector: 'bd-tooth-current-findings',
  standalone: true,
  imports: [SymbolGlyphComponent, ClinicDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="current-findings">
      <h4 class="current-findings__title">Vigente en la pieza</h4>

      @if (toothFindings().length === 0) {
        <p class="current-findings__empty">Sin hallazgos registrados</p>
      } @else {
        <ul class="current-findings__list" aria-label="Hallazgos vigentes en la pieza">
          @for (item of toothFindings(); track item.finding.id) {
            <li class="current-findings__item">
              <div class="current-findings__info">
                <bd-symbol-glyph
                  [shape]="item.finding.symbol.shape"
                  [scope]="item.scope"
                  [color]="item.finding.symbol.color"
                  [secondaryColor]="item.finding.symbol.secondaryColor"
                  [filled]="item.finding.symbol.filled"
                  [lineStyle]="item.finding.symbol.lineStyle"
                  [sampleText]="item.finding.grade != null ? '' + item.finding.grade : null"
                />
                <div class="current-findings__text">
                  <span class="current-findings__summary">
                    {{ item.conditionName }} · {{ item.where }} · {{ item.statusLabel }}
                  </span>
                  @if (item.isCurrentEncounter) {
                    <span class="badge badge-primary current-findings__badge">Esta atención</span>
                  } @else {
                    <span class="current-findings__date">
                      Registrado el {{ item.finding.createdAt | clinicDate }}
                    </span>
                  }
                </div>
              </div>

              @if (item.isCurrentEncounter && canVoid()) {
                <button
                  type="button"
                  class="btn btn-outline btn-sm current-findings__void-btn"
                  [disabled]="saving()"
                  (click)="onVoid(item.finding)"
                >
                  Anular
                </button>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .current-findings {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      padding-top: var(--space-sm);
      border-top: 1px solid var(--slate-200);
    }

    .current-findings__title {
      margin: 0;
      font-size: var(--fs-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--slate-500);
    }

    .current-findings__empty {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--slate-500);
      font-style: italic;
    }

    .current-findings__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .current-findings__item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      padding: 0.35rem 0.5rem;
      background: var(--slate-50);
      border-radius: var(--radius-sm);
      border: 1px solid var(--slate-200);
    }

    .current-findings__info {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      min-width: 0;
      flex: 1;
    }

    .current-findings__text {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }

    .current-findings__summary {
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--blue-950);
      word-break: break-word;
    }

    .current-findings__badge {
      align-self: flex-start;
      font-size: var(--fs-xs);
    }

    .current-findings__date {
      font-size: var(--fs-xs);
      color: var(--slate-500);
    }

    .current-findings__void-btn {
      min-height: 44px;
      min-width: 44px;
      padding: 0 var(--space-sm);
      font-size: var(--fs-xs);
      flex-shrink: 0;
    }
  `,
})
export class ToothCurrentFindingsComponent {
  readonly toothCode = input.required<number>();
  readonly findings = input<Finding[]>([]);
  readonly catalog = input<OdontogramCatalog | null>(null);
  readonly encounterFindingIds = input<Set<string>>(new Set());
  readonly canVoid = input<boolean>(false);
  readonly saving = input<boolean>(false);

  readonly voidClick = output<Finding>();

  readonly toothFindings = computed<CurrentFindingViewModel[]>(() => {
    const code = this.toothCode();
    const all = this.findings();
    const cat = this.catalog();
    const encIds = this.encounterFindingIds();

    const filtered = all.filter(
      (f) => f.toothCode === code || (f.endToothCode != null && isToothInFindingSpan(code, f))
    );

    return filtered.map((finding) => {
      const cond = cat?.conditions.find((c) => c.id === finding.conditionId);
      const conditionName = getConditionName(finding, cat);
      const where = getFindingWhere(finding);
      const statusLabel = finding.status === 'PENDING' ? 'Pendiente' : 'Realizado';
      const isCurrentEncounter = encIds.has(finding.id);

      const scope: 'SURFACE' | 'TOOTH' | 'SPAN' =
        cond?.scope ??
        (finding.surfaceCode ? 'SURFACE' : finding.endToothCode != null ? 'SPAN' : 'TOOTH');

      return {
        finding,
        conditionName,
        where,
        statusLabel,
        isCurrentEncounter,
        scope,
      };
    });
  });

  onVoid(finding: Finding): void {
    this.voidClick.emit(finding);
  }
}
