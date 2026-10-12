import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  effect,
} from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { X } from 'lucide-angular';
import { IconComponent, LucideIconData } from '../icon/icon.component';

@Component({
  selector: 'bd-side-sheet',
  standalone: true,
  imports: [A11yModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div
        class="bd-side-sheet__backdrop"
        (click)="close()"
        aria-hidden="true"
      ></div>

      <div
        #panelElement
        class="bd-side-sheet"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId()"
        [attr.aria-label]="ariaLabel()"
        cdkTrapFocus
        cdkTrapFocusAutoCapture
        (keydown.escape)="close()"
      >
        <div class="bd-side-sheet__handle" aria-hidden="true"></div>

        <button
          type="button"
          class="bd-side-sheet__close-btn"
          aria-label="Cerrar panel"
          (click)="close()"
        >
          <bd-icon [name]="closeIcon" [size]="20" />
        </button>

        <div class="bd-side-sheet__content">
          <ng-content />
        </div>
      </div>
    }
  `,
  styles: `
    @use '../../styles/breakpoints' as bp;

    .bd-side-sheet__backdrop {
      position: fixed;
      inset: 0;
      background-color: color-mix(in srgb, var(--blue-950) 25%, transparent);
      z-index: 998;
      transition: opacity var(--transition-fast);
      animation: bdFadeIn 150ms ease-out;
    }

    .bd-side-sheet {
      position: fixed;
      z-index: 999;
      background-color: var(--white);
      box-shadow: var(--shadow-xl);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      outline: none;

      // Por defecto (< lg): Bottom sheet
      bottom: 0;
      left: 0;
      right: 0;
      top: auto;
      width: 100%;
      max-height: 85vh;
      border-top-left-radius: var(--radius-lg);
      border-top-right-radius: var(--radius-lg);
      animation: bdSlideUp 200ms cubic-bezier(0.16, 1, 0.3, 1);

      // En >= lg: Panel lateral derecho de 26rem sobre la grilla
      @include bp.bp-up('lg') {
        top: 0;
        bottom: 0;
        right: 0;
        left: auto;
        width: 26rem;
        max-height: 100vh;
        height: 100vh;
        border-radius: 0;
        border-left: 1px solid var(--slate-200);
        animation: bdSlideLeft 200ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      @media (prefers-reduced-motion: reduce) {
        animation: bdFadeIn 150ms ease-out;
      }
    }

    .bd-side-sheet__handle {
      width: 36px;
      height: 4px;
      background-color: var(--slate-300);
      border-radius: 9999px;
      margin: 8px auto 4px auto;
      flex-shrink: 0;

      @include bp.bp-up('lg') {
        display: none;
      }
    }

    .bd-side-sheet__close-btn {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      width: 44px;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: var(--slate-500);
      border-radius: var(--radius-sm);
      cursor: pointer;
      z-index: 2;

      &:hover {
        background-color: var(--slate-100);
        color: var(--slate-800);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
      }
    }

    .bd-side-sheet__content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    @keyframes bdFadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes bdSlideUp {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }

    @keyframes bdSlideLeft {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }
  `,
})
export class SideSheetComponent {
  readonly isOpen = input<boolean>(false);
  readonly titleId = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined);

  readonly closed = output<void>();

  readonly panelRef = viewChild<ElementRef<HTMLDivElement>>('panelElement');
  readonly closeIcon: LucideIconData = X;

  private previouslyFocusedElement: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const open = this.isOpen();
      if (open) {
        if (typeof document !== 'undefined') {
          this.previouslyFocusedElement = document.activeElement as HTMLElement | null;
        }
      } else {
        if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
          this.previouslyFocusedElement.focus();
          this.previouslyFocusedElement = null;
        }
      }
    });
  }

  close(): void {
    if (this.isOpen()) {
      if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
        this.previouslyFocusedElement.focus();
        this.previouslyFocusedElement = null;
      }
      this.closed.emit();
    }
  }
}
