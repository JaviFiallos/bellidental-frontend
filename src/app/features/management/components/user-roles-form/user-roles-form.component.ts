import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { AssignableRole, User } from '../../models/user.models';

/** Cambio de roles de una cuenta. Presentacional: sale con `submitted` y `cancelled`. */
@Component({
  selector: 'bd-user-roles-form',
  standalone: true,
  imports: [AlertComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="roles-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <fieldset class="roles-form__roles" [attr.aria-invalid]="rolesError() !== null">
        <legend class="roles-form__legend">Roles</legend>
        @if (showDentistRole()) {
          <label class="roles-form__check" for="roles-odontologo">
            <input id="roles-odontologo" type="checkbox" formControlName="odontologo" />
            Odontólogo
          </label>
        } @else {
          <p class="roles-form__note">
            Para ser odontólogo, la cuenta debe estar vinculada a un profesional (Profesionales → «Dar acceso»).
          </p>
        }
        <label class="roles-form__check" for="roles-secretaria">
          <input id="roles-secretaria" type="checkbox" formControlName="secretaria" />
          Secretaria
        </label>
        @if (rolesError(); as message) {
          <p id="roles-error" class="roles-form__error" role="alert">{{ message }}</p>
        }
      </fieldset>

      @if (errorMessage(); as message) {
        <bd-alert variant="error" [message]="message" />
      }

      <div class="roles-form__actions">
        <button type="submit" class="btn btn-accent" [disabled]="saving()">
          {{ saving() ? 'Guardando…' : 'Guardar roles' }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="cancelled.emit()">Cancelar</button>
      </div>
    </form>
  `,
  styles: `
    .roles-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      padding: var(--space-md);
      box-sizing: border-box;
    }

    .roles-form__roles {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      margin: 0;
      padding: 0;
      border: none;
      min-width: 0;
    }

    .roles-form__note {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }

    .roles-form__legend {
      font-size: var(--fs-sm);
      font-weight: 500;
      color: var(--color-text);
      padding: 0;
      margin-bottom: var(--space-xs);
    }

    .roles-form__check {
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

    .roles-form__error {
      font-size: var(--fs-xs);
      color: var(--color-danger);
      margin: 0;
    }

    .roles-form__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);

      .btn {
        min-height: 44px;
      }
    }
  `,
})
export class UserRolesFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  readonly user = input.required<User>();
  /** La cuenta está vinculada a un profesional: solo entonces puede tener el rol Odontólogo. */
  readonly hasProfessional = input<boolean>(false);
  readonly saving = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly submitted = output<AssignableRole[]>();
  readonly cancelled = output<void>();

  private readonly attempted = signal<boolean>(false);

  readonly form = this.formBuilder.nonNullable.group({
    odontologo: [false],
    secretaria: [false],
  });

  ngOnInit(): void {
    this.form.setValue({
      odontologo: this.user().roles.includes('ODONTOLOGO'),
      secretaria: this.user().roles.includes('SECRETARIA'),
    });
  }

  /** Se muestra si puede tenerlo, o si ya lo tiene (para poder quitarlo). */
  showDentistRole(): boolean {
    return this.hasProfessional() || this.user().roles.includes('ODONTOLOGO');
  }

  rolesError(): string | null {
    return this.attempted() && this.selectedRoles().length === 0 ? 'Elige al menos un rol.' : null;
  }

  submit(): void {
    this.attempted.set(true);
    const roles = this.selectedRoles();
    if (roles.length === 0) {
      return;
    }
    this.submitted.emit(roles);
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
}
