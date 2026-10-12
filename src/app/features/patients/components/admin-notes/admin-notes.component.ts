import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
  afterNextRender,
} from '@angular/core';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';

const NOTES_MAX_LENGTH = 1000;

@Component({
  selector: 'bd-admin-notes',
  standalone: true,
  imports: [AlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="admin-notes" aria-labelledby="admin-notes-title">
      <div class="admin-notes__header">
        <h2 id="admin-notes-title" class="admin-notes__title">Observaciones</h2>
        @if (canEdit() && !editing()) {
          <button #editButton type="button" class="btn btn-ghost admin-notes__edit" (click)="startEditing()">
            Editar observaciones
          </button>
        }
      </div>

      @if (editing()) {
        <div class="admin-notes__editor">
          <textarea
            #editor
            id="admin-notes-input"
            class="input admin-notes__textarea"
            rows="3"
            aria-labelledby="admin-notes-title"
            [attr.maxlength]="maxLength"
            [value]="draft()"
            (input)="onInput($event)"
            (blur)="commit()"
            (keydown)="onKeydown($event)"
          ></textarea>
          @if (saving()) {
            <p class="admin-notes__status" role="status">Guardando…</p>
          }
          @if (error()) {
            <bd-alert variant="error" [message]="error()" />
          }
        </div>
      } @else if (notes()?.trim()) {
        <p class="admin-notes__text">{{ notes() }}</p>
      } @else {
        <p class="admin-notes__empty">Sin observaciones</p>
      }
    </section>
  `,
  styles: `
    .admin-notes {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-lg);
      box-sizing: border-box;
    }

    .admin-notes__header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
    }

    .admin-notes__title {
      margin: 0;
      font-size: var(--fs-md);
      font-weight: 600;
      color: var(--blue-950);
    }

    .admin-notes__edit {
      min-height: 2.75rem;
      font-size: var(--fs-sm);
    }

    .admin-notes__text {
      margin: 0;
      white-space: pre-line;
      font-size: var(--fs-sm);
      line-height: var(--lh-normal);
      color: var(--color-text);
      overflow-wrap: anywhere;
    }

    .admin-notes__empty {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .admin-notes__editor {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .admin-notes__textarea {
      resize: vertical;
      min-height: 5rem;
      font-family: var(--font-body);
      font-size: var(--fs-sm);
      line-height: var(--lh-normal);
    }

    .admin-notes__status {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }
  `,
})
export class AdminNotesComponent {
  readonly notes = input<string | null>(null);
  readonly canEdit = input<boolean>(false);
  readonly saving = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly save = output<string>();

  readonly maxLength = NOTES_MAX_LENGTH;
  readonly editing = signal<boolean>(false);
  readonly draft = signal<string>('');
  private readonly awaitingResult = signal<boolean>(false);
  private readonly editor = viewChild<ElementRef<HTMLTextAreaElement>>('editor');
  private readonly editButton = viewChild<ElementRef<HTMLButtonElement>>('editButton');
  // Al cerrar con el teclado (Esc o Ctrl+Enter) el foco vuelve a "Editar observaciones"
  private returnFocusOnClose = false;
  private readonly injector = inject(Injector);

  constructor() {
    // Al terminar el guardado: sin error se sale de la edición; con error se queda abierta con el texto.
    effect(() => {
      if (!this.awaitingResult() || this.saving()) return;
      this.awaitingResult.set(false);
      if (!this.error()) {
        this.editing.set(false);
      }
    });

    effect(() => {
      if (this.editing() || !this.returnFocusOnClose) return;
      this.returnFocusOnClose = false;
      afterNextRender(() => this.editButton()?.nativeElement.focus(), { injector: this.injector });
    });
  }

  startEditing(): void {
    this.draft.set(this.notes() ?? '');
    this.editing.set(true);
    afterNextRender(() => this.editor()?.nativeElement.focus(), { injector: this.injector });
  }

  onInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.returnFocusOnClose = true;
      this.discard();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.returnFocusOnClose = true;
      this.commit();
    }
  }

  commit(): void {
    if (!this.editing() || this.awaitingResult()) return;

    const text = this.draft().trim();
    if (text === (this.notes() ?? '').trim()) {
      this.editing.set(false);
      return;
    }

    this.awaitingResult.set(true);
    this.save.emit(text);
  }

  private discard(): void {
    this.draft.set('');
    this.editing.set(false);
  }
}
