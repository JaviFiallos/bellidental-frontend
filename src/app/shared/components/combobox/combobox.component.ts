import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  contentChild,
  input,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';

let nextComboboxId = 0;

@Component({
  selector: 'bd-combobox',
  standalone: true,
  imports: [NgTemplateOutlet, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './combobox.component.html',
  styleUrl: './combobox.component.scss',
})
export class ComboboxComponent<T> {
  private readonly uniqueId = `bd-combobox-${nextComboboxId++}`;

  readonly overlayPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
  ];

  readonly items = input<T[]>([]);
  readonly value = input<string>('');
  readonly placeholder = input<string>('');
  readonly isLoading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly actionLabel = input<string | null>(null);
  readonly minQueryLength = input<number>(2);

  // Template opcional para renderizar cada opción
  readonly customTemplate = contentChild(TemplateRef);

  readonly valueChange = output<string>();
  readonly selected = output<T>();
  readonly action = output<void>();

  readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('inputElement');

  readonly isOpen = signal<boolean>(false);
  readonly activeIndex = signal<number>(-1);

  readonly listboxId = `${this.uniqueId}-listbox`;

  // Número total de elementos interactivos (items + 1 si hay actionLabel y está visible)
  readonly totalSelectable = computed(() => {
    const itemCount = this.items().length;
    const hasAction = Boolean(this.actionLabel() && !this.isLoading());
    return itemCount + (hasAction ? 1 : 0);
  });

  readonly shouldShowOverlay = computed(() => {
    if (!this.isOpen()) return false;
    const q = this.value().trim();
    return q.length >= this.minQueryLength();
  });

  readonly activeDescendantId = computed(() => {
    const idx = this.activeIndex();
    if (idx < 0) return null;
    return `${this.listboxId}-opt-${idx}`;
  });

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const text = input.value;
    this.valueChange.emit(text);
    this.isOpen.set(true);
    this.activeIndex.set(-1);
  }

  onInputFocus(): void {
    if (this.value().trim().length >= this.minQueryLength()) {
      this.isOpen.set(true);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    const total = this.totalSelectable();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen()) {
          this.isOpen.set(true);
        } else if (total > 0) {
          const next = (this.activeIndex() + 1) % total;
          this.activeIndex.set(next);
          this.scrollActiveIntoView(next);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (!this.isOpen()) {
          this.isOpen.set(true);
        } else if (total > 0) {
          const current = this.activeIndex();
          const prev = current <= 0 ? total - 1 : current - 1;
          this.activeIndex.set(prev);
          this.scrollActiveIntoView(prev);
        }
        break;

      case 'Enter':
        if (this.isOpen()) {
          if (this.activeIndex() >= 0) {
            event.preventDefault();
            this.selectActive();
          } else if (this.items().length === 0 && this.actionLabel()) {
            event.preventDefault();
            this.triggerAction();
          }
        }
        break;

      case 'Escape':
        if (this.isOpen()) {
          event.preventDefault();
          event.stopPropagation();
          this.closeOverlay();
        }
        break;

      case 'Tab':
        this.closeOverlay();
        break;
    }
  }

  selectItem(item: T): void {
    this.selected.emit(item);
    this.closeOverlay();
  }

  triggerAction(): void {
    this.action.emit();
    this.closeOverlay();
  }

  closeOverlay(): void {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  focusInput(): void {
    this.inputRef()?.nativeElement.focus();
    this.inputRef()?.nativeElement.select();
  }

  private selectActive(): void {
    const idx = this.activeIndex();
    const items = this.items();
    if (idx >= 0 && idx < items.length) {
      this.selectItem(items[idx]);
    } else if (idx === items.length && this.actionLabel()) {
      this.triggerAction();
    }
  }

  private scrollActiveIntoView(index: number): void {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(`${this.listboxId}-opt-${index}`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }
}
