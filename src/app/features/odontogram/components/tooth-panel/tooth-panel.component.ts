import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  ViewChild,
} from '@angular/core';
import {
  CreateFindingRequest,
  DentalCondition,
  Finding,
  FindingStatus,
  OdontogramCatalog,
  SurfaceCode,
} from '../../models/odontogram.models';
import { getToothName } from '../../domain/tooth-names';
import { isUpperTooth } from '../../domain/surface-layout';
import { ToothMarks } from '../../domain/finding-symbol';
import {
  SegmentedComponent,
  SegmentedOption,
} from '../../../../shared/components/segmented/segmented.component';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { ToothConditionsComponent } from '../tooth-conditions/tooth-conditions.component';
import { ToothCurrentFindingsComponent } from '../tooth-current-findings/tooth-current-findings.component';

interface FaceOption {
  code: SurfaceCode;
  label: string;
  fullName: string;
}

@Component({
  selector: 'bd-tooth-panel',
  standalone: true,
  imports: [
    SegmentedComponent,
    AlertComponent,
    ToothConditionsComponent,
    ToothCurrentFindingsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="tooth-panel"
      role="region"
      aria-label="Panel de la pieza"
      (keydown.escape)="onEscape()"
    >
      @if (!selectedToothCode()) {
        <div class="tooth-panel__empty">
          <p class="tooth-panel__empty-text">
            Toca una cara o el número de una pieza para registrar
          </p>
        </div>
      } @else {
        <!-- Cabecera de la pieza -->
        <header class="tooth-panel__header">
          <div class="tooth-panel__title-box">
            <h3 class="tooth-panel__title">Pieza {{ selectedToothCode() }}</h3>
            <p class="tooth-panel__subtitle">{{ toothFullName() }}</p>
          </div>
          <button
            type="button"
            class="btn btn-outline btn-sm tooth-panel__close-btn"
            aria-label="Cerrar panel de la pieza"
            title="Cerrar (Esc)"
            (click)="clearSelection.emit()"
          >
            ✕
          </button>
        </header>

        <!-- Feedback de última acción (aria-live polite) -->
        @if (lastAction()) {
          <div class="tooth-panel__last-action" role="status" aria-live="polite">
            {{ lastAction() }}
          </div>
        }

        <!-- Error de acción -->
        @if (actionError()) {
          <bd-alert variant="error" [message]="actionError()!" />
        }

        <!-- Selector de Cara -->
        <section class="tooth-panel__section" aria-labelledby="face-section-heading">
          <div class="tooth-panel__section-header">
            <h4 id="face-section-heading" class="tooth-panel__section-title">Cara</h4>
            <button
              type="button"
              class="btn btn-outline btn-sm whole-tooth-btn"
              [class.active]="selectedFace() === null"
              [attr.aria-pressed]="selectedFace() === null"
              (click)="onSelectWholeTooth()"
            >
              Pieza completa
            </button>
          </div>
          <div class="tooth-panel__faces-row" role="group" aria-label="Caras de la pieza">
            @for (face of faceOptions(); track face.code + face.label; let i = $index) {
              <button
                #faceBtn
                type="button"
                class="btn btn-outline face-btn"
                [class.active]="selectedFace() === face.code"
                [attr.aria-pressed]="selectedFace() === face.code"
                [attr.aria-label]="face.fullName"
                [title]="face.fullName"
                (click)="onSelectFace(face.code)"
              >
                {{ face.label }}
              </button>
            }
          </div>
        </section>

        <!-- Selector de Estado: Pendiente / Realizado -->
        <section class="tooth-panel__section" aria-labelledby="status-section-heading">
          <h4 id="status-section-heading" class="tooth-panel__section-title">Estado</h4>
          <bd-segmented
            [options]="statusOptions"
            label="Estado"
            [value]="selectedStatus()"
            (valueChange)="statusChange.emit($event)"
          />
        </section>

        <!-- Condiciones (cara, pieza, periodontal) -->
        <bd-tooth-conditions
          #conditionsComponent
          [toothCode]="selectedToothCode()!"
          [selectedFace]="selectedFace()"
          [selectedStatus]="selectedStatus()"
          [catalog]="catalog()"
          [marks]="currentMarks()"
          [saving]="saving()"
          [canStartSpan]="selectedToothCode() !== null"
          [isSpanning]="isSpanning()"
          [activeSpanConditionId]="activeSpanConditionId()"
          (registerFinding)="registerFinding.emit($event)"
          (startSpan)="startSpan.emit($event)"
          (cancelSpan)="cancelSpan.emit()"
        />

        @if (isSpanning()) {
          <button
            type="button"
            class="btn btn-outline btn-sm tooth-panel__cancel-span-btn"
            (click)="cancelSpan.emit()"
          >
            Cancelar modo prótesis
          </button>
        }

        <!-- Hallazgos vigentes en la pieza -->
        <bd-tooth-current-findings
          [toothCode]="selectedToothCode()!"
          [findings]="findings()"
          [catalog]="catalog()"
          [encounterFindingIds]="encounterFindingIds()"
          [canVoid]="canVoid()"
          [canTreat]="canTreat()"
          [saving]="saving()"
          (voidClick)="voidFinding.emit($event)"
          (treatClick)="treatFinding.emit($event)"
        />
      }
    </div>
  `,
  styles: `
    .tooth-panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      background: var(--white);
      border: 1px solid var(--slate-200);
      border-radius: var(--radius-md);
      padding: var(--space-md);
      box-sizing: border-box;
      min-width: 18rem;
    }

    .tooth-panel__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 12rem;
      padding: var(--space-lg);
      text-align: center;
    }

    .tooth-panel__empty-text {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--slate-500);
      font-weight: 500;
    }

    .tooth-panel__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-xs);
      border-bottom: 1px solid var(--slate-200);
      padding-bottom: var(--space-xs);
    }

    .tooth-panel__title-box {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .tooth-panel__title {
      margin: 0;
      font-size: var(--fs-md);
      font-weight: 700;
      color: var(--blue-950);
    }

    .tooth-panel__subtitle {
      margin: 0;
      font-size: var(--fs-xs);
      color: var(--slate-500);
      font-weight: 500;
    }

    .tooth-panel__close-btn {
      min-height: 44px;
      min-width: 44px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--slate-500);
      border-color: transparent;

      &:hover {
        color: var(--slate-600);
        background: var(--slate-100);
      }
    }

    .tooth-panel__last-action {
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      background: var(--blue-50);
      border: 1px solid var(--blue-200);
      color: var(--blue-900);
      font-size: var(--fs-xs);
      font-weight: 600;
      animation: fadeIn var(--transition-fast) ease-in-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-2px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .tooth-panel__section {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .tooth-panel__section-title {
      margin: 0;
      font-size: var(--fs-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--slate-500);
    }

    .tooth-panel__section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-xs);
    }

    .whole-tooth-btn {
      min-height: 44px;
      padding: 0 0.75rem;
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--slate-600);
      border-radius: var(--radius-sm);
      white-space: nowrap;

      &.active,
      &[aria-pressed='true'] {
        background: var(--blue-800);
        color: var(--white);
        border-color: var(--blue-800);
      }
    }

    .tooth-panel__faces-row {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .face-btn {
      min-height: 44px;
      min-width: 44px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--slate-600);
      border-radius: var(--radius-sm);

      &.active,
      &[aria-pressed='true'] {
        background: var(--blue-800);
        color: var(--white);
        border-color: var(--blue-800);
      }
    }
  `,
})
export class ToothPanelComponent {
  @ViewChild('conditionsComponent') conditionsComponent?: ToothConditionsComponent;
  @ViewChild('faceBtn') firstFaceBtnRef?: ElementRef<HTMLButtonElement>;

  readonly selectedToothCode = input<number | null>(null);
  readonly selectedFace = input<SurfaceCode | null>(null);
  readonly selectedStatus = input<FindingStatus>('PENDING');

  readonly catalog = input<OdontogramCatalog | null>(null);
  readonly findings = input<Finding[]>([]);
  readonly currentMarks = input<ToothMarks | null>(null);
  readonly encounterFindingIds = input<Set<string>>(new Set());

  readonly canVoid = input<boolean>(false);
  readonly canTreat = input<boolean>(false);
  readonly saving = input<boolean>(false);
  readonly actionError = input<string | null>(null);
  readonly lastAction = input<string | null>(null);
  readonly isSpanning = input<boolean>(false);
  readonly activeSpanConditionId = input<number | null>(null);

  readonly faceChange = output<SurfaceCode | null>();
  readonly statusChange = output<FindingStatus>();
  readonly clearSelection = output<void>();
  readonly registerFinding = output<CreateFindingRequest>();
  readonly voidFinding = output<Finding>();
  readonly treatFinding = output<Finding>();
  readonly startSpan = output<DentalCondition>();
  readonly cancelSpan = output<void>();

  readonly statusOptions: SegmentedOption<FindingStatus>[] = [
    { value: 'PENDING', label: 'Pendiente (rojo)' },
    { value: 'DONE', label: 'Realizado (azul)' },
  ];

  readonly toothFullName = computed<string>(() => {
    const code = this.selectedToothCode();
    if (!code) return '';
    const raw = getToothName(code);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  });

  readonly faceOptions = computed<FaceOption[]>(() => {
    const code = this.selectedToothCode();
    if (!code) return [];
    const upper = isUpperTooth(code);
    const pos = code % 10;

    const pOrL: FaceOption = upper
      ? { code: 'L', label: 'P', fullName: 'Palatina' }
      : { code: 'L', label: 'L', fullName: 'Lingual' };

    const oOrI: FaceOption =
      pos <= 3
        ? { code: 'O', label: 'I', fullName: 'Incisal' }
        : { code: 'O', label: 'O', fullName: 'Oclusal' };

    return [
      { code: 'V', label: 'V', fullName: 'Vestibular' },
      pOrL,
      { code: 'M', label: 'M', fullName: 'Mesial' },
      { code: 'D', label: 'D', fullName: 'Distal' },
      oOrI,
    ];
  });

  onSelectFace(face: SurfaceCode): void {
    this.faceChange.emit(face);
  }

  onSelectWholeTooth(): void {
    this.faceChange.emit(null);
  }

  onEscape(): void {
    if (this.conditionsComponent?.isOtherOpen()) {
      return;
    }
    this.clearSelection.emit();
  }

  focusFirstFace(): void {
    this.firstFaceBtnRef?.nativeElement?.focus();
  }

  focusPeriodontal(): void {
    this.conditionsComponent?.focusPeriodontal();
  }
}
