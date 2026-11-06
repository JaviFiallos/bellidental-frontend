import { ChangeDetectionStrategy, Component, inject, input, OnInit, output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { FieldComponent } from '../../../../shared/components/field/field.component';
import { UpdateUserRequest, User } from '../../models/user.models';

/** `Validators.required` no rechaza un texto de solo espacios. */
function notBlank(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() === '' ? { required: true } : null;
}

/**
 * Edición del correo y del nombre de usuario de una cuenta. Presentacional: sale con `submitted` (solo los campos que
 * cambiaron) y `cancelled`.
 */
@Component({
  selector: 'bd-user-edit-form',
  standalone: true,
  imports: [AlertComponent, FieldComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="user-edit-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <bd-field
        label="Correo"
        fieldId="user-edit-email"
        [required]="true"
        [error]="emailError()"
        hint="Si cambias el correo, la persona deberá ingresar con el nuevo."
      >
        <input
          id="user-edit-email"
          class="input"
          type="email"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          formControlName="email"
          [attr.aria-invalid]="emailError() !== null"
        />
      </bd-field>

      <bd-field label="Nombre de usuario" fieldId="user-edit-username" [required]="true" [error]="usernameError()">
        <input
          id="user-edit-username"
          class="input"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          formControlName="username"
          [attr.aria-invalid]="usernameError() !== null"
        />
      </bd-field>

      @if (errorMessage(); as message) {
        <bd-alert variant="error" [message]="message" />
      }

      <div class="user-edit-form__actions">
        <button type="submit" class="btn btn-primary" [disabled]="saving() || !canSave()">
          {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="cancelled.emit()">Cancelar</button>
      </div>
    </form>
  `,
  styles: `
    .user-edit-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      box-sizing: border-box;
    }

    .user-edit-form .input {
      min-height: 44px;
      width: 100%;
      box-sizing: border-box;
    }

    .user-edit-form__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);

      .btn {
        min-height: 44px;
      }
    }
  `,
})
export class UserEditFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  readonly user = input.required<User>();
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<UpdateUserRequest>();
  readonly cancelled = output<void>();

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [notBlank, Validators.email, Validators.maxLength(150)]],
    username: ['', [notBlank, Validators.maxLength(60)]],
  });

  ngOnInit(): void {
    this.form.setValue({
      email: this.user().email,
      username: this.user().username,
    });
  }

  emailError(): string | null {
    const control = this.form.controls.email;
    if (!this.showErrors(control)) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Escribe el correo.';
    }
    return 'Escribe un correo válido de hasta 150 caracteres.';
  }

  usernameError(): string | null {
    const control = this.form.controls.username;
    if (!this.showErrors(control)) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Escribe el nombre de usuario.';
    }
    return 'Máximo 60 caracteres.';
  }

  /** Válido y con al menos un cambio: sin cambios no hay petición (el backend rechaza `{}`). */
  canSave(): boolean {
    return this.form.valid && Object.keys(this.changedFields()).length > 0;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (!this.canSave()) {
      return;
    }
    this.submitted.emit(this.changedFields());
  }

  /** Solo los campos distintos a los actuales (tras `trim()`; el correo se compara sin mayúsculas). */
  private changedFields(): UpdateUserRequest {
    const raw = this.form.getRawValue();
    const email = raw.email.trim();
    const username = raw.username.trim();
    const request: UpdateUserRequest = {};
    if (email.toLowerCase() !== this.user().email.toLowerCase()) {
      request.email = email;
    }
    if (username !== this.user().username) {
      request.username = username;
    }
    return request;
  }

  private showErrors(control: AbstractControl): boolean {
    return control.invalid && (control.dirty || control.touched);
  }
}
