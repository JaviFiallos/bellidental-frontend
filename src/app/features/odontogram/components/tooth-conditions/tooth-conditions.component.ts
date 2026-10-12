import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import {
  CreateFindingRequest,
  DentalCondition,
  DentalSymbol,
  FindingStatus,
  OdontogramCatalog,
  SurfaceCode,
} from '../../models/odontogram.models';
import { SymbolGlyphComponent } from '../symbol-glyph/symbol-glyph.component';
import {
  createRequest,
  effectiveStatus,
} from '../../domain/finding-request';
import { getSurfaceName } from '../../domain/surface-layout';
import { ToothMarks } from '../../domain/finding-symbol';
import { OtherNoteFormComponent } from './other-note-form.component';
import { PeriodontalGradesComponent } from './periodontal-grades.component';

@Component({
  selector: 'bd-tooth-conditions',
  standalone: true,
  imports: [
    SymbolGlyphComponent,
    OtherNoteFormComponent,
    PeriodontalGradesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="conditions" id="tooth-conditions-container">
      <!-- 1. En la cara -->
      <section class="conditions-group" aria-labelledby="surface-group-heading">
        <h4 id="surface-group-heading" class="conditions-group__title">
          {{ surfaceGroupTitle() }}
        </h4>

        @if (!selectedFace()) {
          <p class="conditions-group__hint">Elige una cara para registrar</p>
        }

        <div class="conditions-grid">
          @for (cond of surfaceConditions(); track cond.id) {
            @let effStatus = getEffectiveStatus(cond);
            @let sym = getSymbolForStatus(cond, effStatus);
            <button
              type="button"
              class="btn btn-outline condition-btn"
              [disabled]="saving() || !selectedFace()"
              (click)="onRegisterSurface(cond)"
            >
              @if (sym) {
                <bd-symbol-glyph
                  [shape]="sym.shape"
                  scope="SURFACE"
                  [color]="sym.color"
                  [secondaryColor]="sym.secondaryColor"
                  [filled]="sym.filled"
                  [lineStyle]="sym.lineStyle"
                />
              }
              <span>{{ cond.name }}</span>
            </button>
          }
        </div>
      </section>

      <!-- 2. Pieza completa -->
      <section class="conditions-group" aria-labelledby="tooth-group-heading">
        <h4 id="tooth-group-heading" class="conditions-group__title">Pieza completa</h4>

        <div class="conditions-grid">
          @for (cond of wholeToothConditions(); track cond.id) {
            @let effStatus = getEffectiveStatus(cond);
            @let sym = getSymbolForStatus(cond, effStatus);
            <button
              type="button"
              class="btn btn-outline condition-btn"
              [disabled]="saving()"
              (click)="onRegisterTooth(cond)"
            >
              @if (sym) {
                <bd-symbol-glyph
                  [shape]="sym.shape"
                  scope="TOOTH"
                  [color]="sym.color"
                  [secondaryColor]="sym.secondaryColor"
                  [filled]="sym.filled"
                  [lineStyle]="sym.lineStyle"
                />
              }
              <span>{{ cond.name }}</span>
            </button>
          }

          <!-- Botón "Otro…" -->
          @if (otherCondition(); as otherCond) {
            @let effStatus = getEffectiveStatus(otherCond);
            @let sym = getSymbolForStatus(otherCond, effStatus);
            <button
              type="button"
              class="btn btn-outline condition-btn"
              [class.active]="isOtherOpen()"
              [disabled]="saving()"
              (click)="toggleOther()"
            >
              @if (sym) {
                <bd-symbol-glyph
                  [shape]="sym.shape"
                  scope="TOOTH"
                  [color]="sym.color"
                  [secondaryColor]="sym.secondaryColor"
                  [filled]="sym.filled"
                  [lineStyle]="sym.lineStyle"
                />
              }
              <span>Otro…</span>
            </button>
          }
        </div>

        <!-- Desplegable "Otro…" con nota obligatoria -->
        @if (isOtherOpen()) {
          <bd-other-note-form
            #otherForm
            [saving]="saving()"
            (noteSubmitted)="onNoteSubmitted($event)"
            (cancel)="closeOther()"
          />
        }
      </section>

      <!-- 3. Periodontal -->
      <bd-periodontal-grades
        #periodontalGrades
        [mobilityCondition]="mobilityCondition()"
        [recessionCondition]="recessionCondition()"
        [currentMobilityGrade]="currentMobilityGrade()"
        [currentRecessionGrade]="currentRecessionGrade()"
        [saving]="saving()"
        (gradeSelected)="onRegisterPeriodontal($event.condition, $event.grade)"
      />
    </div>
  `,
  styles: `
    .conditions {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .conditions-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .conditions-group__title {
      margin: 0;
      font-size: var(--fs-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--slate-500);
    }

    .conditions-group__hint {
      margin: 0;
      font-size: var(--fs-xs);
      color: var(--slate-400);
      font-style: italic;
    }

    .conditions-grid {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
    }

    .condition-btn {
      min-height: 44px;
      min-width: 44px;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.65rem;
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--slate-700);
      background: var(--white);
      border: 1px solid var(--slate-300);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover:not(:disabled) {
        background: var(--slate-50);
        border-color: var(--slate-400);
      }

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      &.active {
        border-color: var(--blue-700);
        background: var(--blue-50);
      }
    }
  `,
})
export class ToothConditionsComponent {
  @ViewChild('otherForm') otherForm?: OtherNoteFormComponent;
  @ViewChild('periodontalGrades') periodontalGrades?: PeriodontalGradesComponent;

  readonly toothCode = input.required<number>();
  readonly selectedFace = input<SurfaceCode | null>(null);
  readonly selectedStatus = input<FindingStatus>('PENDING');
  readonly catalog = input<OdontogramCatalog | null>(null);
  readonly marks = input<ToothMarks | null>(null);
  readonly saving = input<boolean>(false);

  readonly registerFinding = output<CreateFindingRequest>();

  readonly isOtherOpen = signal<boolean>(false);

  readonly surfaceGroupTitle = computed<string>(() => {
    const face = this.selectedFace();
    if (!face) return 'En la cara';
    const sName = getSurfaceName(this.toothCode(), face);
    return `En la cara ${sName}`;
  });

  readonly surfaceConditions = computed<DentalCondition[]>(() => {
    const conds = this.catalog()?.conditions ?? [];
    return conds.filter((c) => c.category === 'DENTAL' && c.scope === 'SURFACE');
  });

  readonly wholeToothConditions = computed<DentalCondition[]>(() => {
    const conds = this.catalog()?.conditions ?? [];
    return conds.filter(
      (c) => c.category === 'DENTAL' && c.scope === 'TOOTH' && c.gradeMin == null && c.code !== 'OTHER'
    );
  });

  readonly otherCondition = computed<DentalCondition | null>(() => {
    const conds = this.catalog()?.conditions ?? [];
    return conds.find((c) => c.code === 'OTHER') ?? null;
  });

  readonly mobilityCondition = computed<DentalCondition | null>(() => {
    const conds = this.catalog()?.conditions ?? [];
    return conds.find((c) => c.code === 'MOBILITY' || (c.category === 'PERIODONTAL' && c.gradeMin === 0)) ?? null;
  });

  readonly recessionCondition = computed<DentalCondition | null>(() => {
    const conds = this.catalog()?.conditions ?? [];
    return conds.find((c) => c.code === 'RECESSION' || (c.category === 'PERIODONTAL' && c.gradeMin === 1)) ?? null;
  });

  readonly currentMobilityGrade = computed<number | null>(() => {
    return this.marks()?.mobility?.grade ?? null;
  });

  readonly currentRecessionGrade = computed<number | null>(() => {
    return this.marks()?.recession?.grade ?? null;
  });

  getEffectiveStatus(condition: DentalCondition): FindingStatus {
    return effectiveStatus(condition, this.selectedStatus());
  }

  getSymbolForStatus(condition: DentalCondition, status: FindingStatus): DentalSymbol | null {
    if (!condition.symbols) return null;
    return condition.symbols.find((s) => s.status === status) ?? condition.symbols[0] ?? null;
  }

  onRegisterSurface(condition: DentalCondition): void {
    const face = this.selectedFace();
    if (!face) return;
    const req = createRequest({
      toothCode: this.toothCode(),
      surfaceCode: face,
      condition,
      status: this.selectedStatus(),
    });
    this.registerFinding.emit(req);
  }

  onRegisterTooth(condition: DentalCondition): void {
    const req = createRequest({
      toothCode: this.toothCode(),
      condition,
      status: this.selectedStatus(),
    });
    this.registerFinding.emit(req);
  }

  toggleOther(): void {
    const next = !this.isOtherOpen();
    this.isOtherOpen.set(next);
    if (next) {
      setTimeout(() => this.otherForm?.focus());
    }
  }

  closeOther(): void {
    this.isOtherOpen.set(false);
  }

  onNoteSubmitted(note: string): void {
    const cond = this.otherCondition();
    if (!cond || !note) return;

    const req = createRequest({
      toothCode: this.toothCode(),
      condition: cond,
      status: this.selectedStatus(),
      notes: note,
    });
    this.registerFinding.emit(req);
    this.closeOther();
  }

  onRegisterPeriodontal(condition: DentalCondition, grade: number): void {
    const req = createRequest({
      toothCode: this.toothCode(),
      condition,
      status: 'DONE',
      grade,
    });
    this.registerFinding.emit(req);
  }

  focusPeriodontal(): void {
    this.periodontalGrades?.focusSection();
  }
}
