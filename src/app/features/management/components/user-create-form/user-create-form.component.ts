import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { CreateUserRequest } from '../../models/user.models';
import { generateTemporaryPassword, MIN_PASSWORD_LENGTH } from '../../domain/user-display';

/**
 * Alta de una cuenta de secretaria (el rol es fijo). Los odontólogos se dan de alta en Profesionales y reciben su
 * cuenta con «Dar acceso», para que siempre queden vinculados a un profesional. Presentacional.
 */
@Component({
  selector: 'bd-user-create-form',
  standalone: true,
  imports: [AlertComponent, FieldComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="user-create-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <p class="user-create-form__note">
        Se crea con el rol Secretaria. Los odontólogos se registran en Profesionales y reciben su cuenta con «Dar acceso».
      </p>

      <bd-field label="Correo" fieldId="user-email" [required]="true" [error]="emailError()">
        <input
          id="user-email"
          class="input"
          type="email"
          autocomplete="off"
          formControlName="email"
          [attr.aria-invalid]="emailError() !== null"
        />
      </bd-field>

      <bd-field
        label="Nombre de usuario"
        fieldId="user-username"
        [error]="usernameError()"
        hint="Si lo dejas vacío se usa la parte del correo antes de @."
      >
        <input
          id="user-username"
          class="input"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          formControlName="username"
          [attr.aria-invalid]="usernameError() !== null"
        />
      </bd-field>

      <bd-field
        label="Contraseña temporal"
        fieldId="user-temporary-password"
        [required]="true"
        [error]="passwordError()"
      >
        <div class="user-create-form__password">
          <input
            id="user-temporary-password"
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

      @if (errorMessage(); as message) {
        <bd-alert variant="error" [message]="message" />
      }

      <div class="user-create-form__actions">
        <button type="submit" class="btn btn-accent" [disabled]="saving()">
          {{ saving() ? 'Creando…' : 'Crear secretaria' }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="cancelled.emit()">Cancelar</button>
      </div>
    </form>
  `,
  styles: `
    .user-create-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      box-sizing: border-box;
    }

    .user-create-form__note {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .user-create-form .input {
      min-height: 44px;
      width: 100%;
      box-sizing: border-box;
    }

    .user-create-form__password {
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

    .user-create-form__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);

      .btn {
        min-height: 44px;
      }
    }
  `,
})
export class UserCreateFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<CreateUserRequest>();
  readonly cancelled = output<void>();

  private readonly attempted = signal<boolean>(false);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    username: ['', [Validators.maxLength(60)]],
    temporaryPassword: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
  });

  emailError(): string | null {
    const control = this.form.controls.email;
    if (!this.showErrors(control.invalid, control.touched)) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Escribe el correo.';
    }
    if (control.hasError('email') || control.hasError('maxlength')) {
      return 'Escribe un correo válido de hasta 150 caracteres.';
    }
    return null;
  }

  usernameError(): string | null {
    const control = this.form.controls.username;
    return control.hasError('maxlength') && control.touched
      ? 'Máximo 60 caracteres.'
      : null;
  }

  passwordError(): string | null {
    const control = this.form.controls.temporaryPassword;
    if (!this.showErrors(control.invalid, control.touched)) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Escribe una contraseña temporal.';
    }
    if (control.hasError('minlength')) {
      return `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    return null;
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
    const username = raw.username.trim();
    this.submitted.emit({
      email: raw.email.trim(),
      temporaryPassword: raw.temporaryPassword,
      roles: ['SECRETARIA'],
      ...(username ? { username } : {}),
    });
  }

  private showErrors(invalid: boolean, touched: boolean): boolean {
    return invalid && (touched || this.attempted());
  }
}
