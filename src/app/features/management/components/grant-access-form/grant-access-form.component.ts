import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { generateTemporaryPassword, MIN_PASSWORD_LENGTH } from '../../domain/user-display';
import { GrantAccessRequest } from '../../models/user.models';

/** Alta de cuenta para un profesional sin acceso. Presentacional: sale con `submitted` y `cancelled`. */
@Component({
  selector: 'bd-grant-access-form',
  standalone: true,
  imports: [AlertComponent, FieldComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="grant-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <bd-field label="Correo" fieldId="grant-email" [required]="true" [error]="emailError()">
        <input
          id="grant-email"
          class="input"
          type="email"
          autocomplete="off"
          formControlName="email"
          [attr.aria-invalid]="emailError() !== null"
        />
      </bd-field>

      <bd-field
        label="Contraseña temporal"
        fieldId="grant-temporary-password"
        [required]="true"
        [error]="passwordError()"
        [hint]="'Mínimo ' + minLength + ' caracteres.'"
      >
        <div class="grant-form__password">
          <input
            id="grant-temporary-password"
            class="input"
            type="text"
            autocomplete="new-password"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            formControlName="temporaryPassword"
            [attr.aria-invalid]="passwordError() !== null"
          />
          <button type="button" class="btn btn-outline" (click)="generatePassword()">Generar</button>
        </div>
      </bd-field>

      <p class="grant-form__note">Se crea con rol Odontólogo.</p>

      @if (errorMessage(); as message) {
        <bd-alert variant="error" [message]="message" />
      }

      <div class="grant-form__actions">
        <button type="submit" class="btn btn-accent" [disabled]="saving()">
          {{ saving() ? 'Creando…' : 'Crear acceso' }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="cancelled.emit()">Cancelar</button>
      </div>
    </form>
  `,
  styles: `
    .grant-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      box-sizing: border-box;
    }

    .grant-form .input {
      min-height: 44px;
      width: 100%;
      box-sizing: border-box;
    }

    .grant-form__note {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .grant-form__password {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);

      .input {
        flex: 1 1 10rem;
        min-width: 0;
      }

      .btn {
        min-height: 44px;
      }
    }

    .grant-form__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);

      .btn {
        min-height: 44px;
      }
    }
  `,
})
export class GrantAccessFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<GrantAccessRequest>();
  readonly cancelled = output<void>();

  readonly minLength = MIN_PASSWORD_LENGTH;

  private readonly attempted = signal<boolean>(false);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    temporaryPassword: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
  });

  emailError(): string | null {
    const control = this.form.controls.email;
    if (!control.invalid || !(control.touched || this.attempted())) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Escribe el correo.';
    }
    return 'Escribe un correo válido de hasta 150 caracteres.';
  }

  passwordError(): string | null {
    const control = this.form.controls.temporaryPassword;
    if (!control.invalid || !(control.touched || this.attempted())) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Escribe una contraseña temporal.';
    }
    return `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  generatePassword(): void {
    this.form.controls.temporaryPassword.setValue(generateTemporaryPassword());
  }

  submit(): void {
    this.attempted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const raw = this.form.getRawValue();
    this.submitted.emit({ email: raw.email.trim(), temporaryPassword: raw.temporaryPassword });
  }
}
