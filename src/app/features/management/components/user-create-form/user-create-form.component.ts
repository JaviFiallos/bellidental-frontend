import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { AssignableRole, CreateUserRequest } from '../../models/user.models';
import { generateTemporaryPassword, MIN_PASSWORD_LENGTH } from '../../domain/user-display';

/** Formulario de alta de cuenta. Presentacional: sale con `submitted` y `cancelled`. */
@Component({
  selector: 'bd-user-create-form',
  standalone: true,
  imports: [AlertComponent, FieldComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="user-create-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
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

      <fieldset class="user-create-form__roles" [attr.aria-invalid]="rolesError() !== null">
        <legend class="user-create-form__legend">
          Rol <span class="user-create-form__required" aria-hidden="true">*</span>
        </legend>
        <label class="user-create-form__check" for="user-role-odontologo">
          <input id="user-role-odontologo" type="checkbox" formControlName="odontologo" />
          Odontólogo
        </label>
        <label class="user-create-form__check" for="user-role-secretaria">
          <input id="user-role-secretaria" type="checkbox" formControlName="secretaria" />
          Secretaria
        </label>
        @if (rolesError(); as message) {
          <p id="user-roles-error" class="user-create-form__error" role="alert">{{ message }}</p>
        }
      </fieldset>

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
          {{ saving() ? 'Creando…' : 'Crear usuario' }}
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

    .user-create-form .input {
      min-height: 44px;
      width: 100%;
      box-sizing: border-box;
    }

    .user-create-form__roles {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      margin: 0;
      padding: 0;
      border: none;
      min-width: 0;
    }

    .user-create-form__legend {
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--color-text);
      padding: 0;
      margin-bottom: var(--space-xs);
    }

    .user-create-form__required {
      color: var(--color-danger);
    }

    .user-create-form__check {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      min-height: 44px;
      font-size: var(--fs-sm);
      cursor: pointer;

      input {
        width: 1.25rem;
        height: 1.25rem;
        margin: 0;
      }
    }

    .user-create-form__error {
      font-size: var(--fs-xs);
      color: var(--color-danger);
      margin: 0;
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
    odontologo: [false],
    secretaria: [false],
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

  rolesError(): string | null {
    return this.attempted() && this.selectedRoles().length === 0 ? 'Elige al menos un rol.' : null;
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
    const roles = this.selectedRoles();
    if (this.form.invalid || roles.length === 0) {
      return;
    }

    const raw = this.form.getRawValue();
    const username = raw.username.trim();
    this.submitted.emit({
      email: raw.email.trim(),
      temporaryPassword: raw.temporaryPassword,
      roles,
      ...(username ? { username } : {}),
    });
  }

  private selectedRoles(): AssignableRole[] {
    const raw = this.form.getRawValue();
    const roles: AssignableRole[] = [];
    if (raw.odontologo) {
      roles.push('ODONTOLOGO');
    }
    if (raw.secretaria) {
      roles.push('SECRETARIA');
    }
    return roles;
  }

  private showErrors(invalid: boolean, touched: boolean): boolean {
    return invalid && (touched || this.attempted());
  }
}
