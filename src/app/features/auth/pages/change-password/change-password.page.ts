import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Eye, EyeOff, KeyRound } from 'lucide-angular';
import { AuthService } from '../../../../core/auth/auth.service';
import { ApiError } from '../../../../core/api/api.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { IconComponent, LucideIconData } from '../../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

type PasswordField = 'current' | 'new' | 'confirm';

const MIN_PASSWORD_LENGTH = 10;
const SUCCESS_MESSAGE = 'Contraseña actualizada.';

@Component({
  selector: 'bd-change-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, AlertComponent, FieldComponent, IconComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="change-password-page">
      <bd-page-header title="Cambiar contraseña" />

      <div class="card change-password-page__card">
        <form class="change-password-form" [formGroup]="passwordForm" (ngSubmit)="onSubmit()" novalidate>
          <bd-field
            label="Contraseña actual"
            fieldId="current-password"
            [required]="true"
            [error]="currentPasswordError()"
          >
            <div class="password-input-wrapper">
              <input
                #currentPasswordInput
                id="current-password"
                [type]="isVisible('current') ? 'text' : 'password'"
                class="input password-input"
                autocomplete="current-password"
                formControlName="currentPassword"
                [attr.aria-invalid]="!!currentPasswordError()"
              />
              <button
                type="button"
                class="password-toggle-btn"
                (click)="toggleVisibility('current')"
                [attr.aria-label]="isVisible('current') ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'"
              >
                <bd-icon [name]="visibilityIcon('current')" [size]="20" />
              </button>
            </div>
          </bd-field>

          <bd-field
            label="Nueva contraseña"
            fieldId="new-password"
            [required]="true"
            hint="Mínimo 10 caracteres."
            [error]="newPasswordError()"
          >
            <div class="password-input-wrapper">
              <input
                id="new-password"
                [type]="isVisible('new') ? 'text' : 'password'"
                class="input password-input"
                autocomplete="new-password"
                formControlName="newPassword"
                [attr.aria-invalid]="!!newPasswordError()"
              />
              <button
                type="button"
                class="password-toggle-btn"
                (click)="toggleVisibility('new')"
                [attr.aria-label]="isVisible('new') ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'"
              >
                <bd-icon [name]="visibilityIcon('new')" [size]="20" />
              </button>
            </div>
          </bd-field>

          <bd-field
            label="Repite la nueva contraseña"
            fieldId="confirm-password"
            [required]="true"
            [error]="confirmPasswordError()"
          >
            <div class="password-input-wrapper">
              <input
                id="confirm-password"
                [type]="isVisible('confirm') ? 'text' : 'password'"
                class="input password-input"
                autocomplete="new-password"
                formControlName="confirmPassword"
                [attr.aria-invalid]="!!confirmPasswordError()"
              />
              <button
                type="button"
                class="password-toggle-btn"
                (click)="toggleVisibility('confirm')"
                [attr.aria-label]="isVisible('confirm') ? 'Ocultar confirmación' : 'Mostrar confirmación'"
              >
                <bd-icon [name]="visibilityIcon('confirm')" [size]="20" />
              </button>
            </div>
          </bd-field>

          @if (successMessage(); as message) {
            <bd-alert variant="success" role="status" [message]="message" />
          }

          @if (errorMessage(); as message) {
            <bd-alert variant="error" [message]="message" />
          }

          <div class="change-password-form__actions">
            <button type="submit" class="btn btn-primary" [disabled]="isSaving()">
              <bd-icon [name]="keyIcon" [size]="18" />
              <span>{{ isSaving() ? 'Guardando…' : 'Guardar contraseña' }}</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  `,
  styles: `
    .change-password-page {
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding: var(--space-md);
      box-sizing: border-box;
    }

    .change-password-page__card {
      width: 100%;
      max-width: 28rem;
      box-sizing: border-box;
    }

    .change-password-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .change-password-form__actions .btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      width: 100%;
      min-height: 44px;
      justify-content: center;
    }

    .password-input-wrapper {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
    }

    .password-input {
      padding-right: 48px;
    }

    .password-toggle-btn {
      position: absolute;
      right: 0;
      top: 0;
      height: 100%;
      min-height: 44px;
      width: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--slate-500);
      border-radius: var(--radius-sm);
      transition: color var(--transition-fast);

      &:hover {
        color: var(--color-primary);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: -2px;
      }
    }
  `,
})
export class ChangePasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);

  private readonly currentPasswordInput = viewChild<ElementRef<HTMLInputElement>>('currentPasswordInput');

  readonly keyIcon: LucideIconData = KeyRound;

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required]],
    confirmPassword: ['', [Validators.required]],
  });

  readonly visibleFields = signal<Record<PasswordField, boolean>>({
    current: false,
    new: false,
    confirm: false,
  });
  readonly isSaving = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  isVisible(field: PasswordField): boolean {
    return this.visibleFields()[field];
  }

  visibilityIcon(field: PasswordField): LucideIconData {
    return this.isVisible(field) ? EyeOff : Eye;
  }

  toggleVisibility(field: PasswordField): void {
    this.visibleFields.update((fields) => ({ ...fields, [field]: !fields[field] }));
  }

  currentPasswordError(): string | null {
    const control = this.passwordForm.controls.currentPassword;
    if (!this.shouldShowError(control.touched)) return null;
    if (control.hasError('required')) return 'La contraseña actual es obligatoria.';
    return null;
  }

  newPasswordError(): string | null {
    const control = this.passwordForm.controls.newPassword;
    if (!this.shouldShowError(control.touched)) return null;
    if (control.hasError('required')) return 'La nueva contraseña es obligatoria.';
    if (this.newPasswordTooShort()) return 'Mínimo 10 caracteres.';
    if (this.isSameAsCurrent()) return 'La nueva contraseña debe ser distinta de la actual.';
    return null;
  }

  confirmPasswordError(): string | null {
    const control = this.passwordForm.controls.confirmPassword;
    if (!this.shouldShowError(control.touched)) return null;
    if (control.hasError('required')) return 'Repite la nueva contraseña.';
    if (this.passwordsDiffer()) return 'Las contraseñas no coinciden.';
    return null;
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.passwordForm.invalid || this.passwordsDiffer() || this.isSameAsCurrent() || this.newPasswordTooShort()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    if (this.isSaving()) return;

    this.isSaving.set(true);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.submitted.set(false);
        this.passwordForm.reset();
        this.successMessage.set(SUCCESS_MESSAGE);
        this.notifications.success(SUCCESS_MESSAGE);
      },
      error: (err: ApiError) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.message);
        this.currentPasswordInput()?.nativeElement.focus();
      },
    });
  }

  private shouldShowError(touched: boolean): boolean {
    return touched || this.submitted();
  }

  private newPasswordTooShort(): boolean {
    return this.passwordForm.controls.newPassword.value.length < MIN_PASSWORD_LENGTH;
  }

  private isSameAsCurrent(): boolean {
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    return newPassword.length > 0 && newPassword === currentPassword;
  }

  private passwordsDiffer(): boolean {
    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    return confirmPassword.length > 0 && newPassword !== confirmPassword;
  }
}
