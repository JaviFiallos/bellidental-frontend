import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AlertComponent } from '../../../../shared/components/alert/alert.component';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SideSheetComponent } from '../../../../shared/components/side-sheet';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { UserCreateFormComponent } from '../../components/user-create-form/user-create-form.component';
import { UserTableComponent } from '../../components/user-table/user-table.component';
import { summarizeAccounts } from '../../domain/user-display';
import { User } from '../../models/user.models';
import { UsersStore } from '../../services/users.store';

@Component({
  selector: 'bd-users-page',
  standalone: true,
  imports: [
    AlertComponent,
    PageHeaderComponent,
    SideSheetComponent,
    SkeletonComponent,
    UserCreateFormComponent,
    UserTableComponent,
  ],
  providers: [UsersStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="users-page" [class.users-page--panel-open]="store.createOpen()">
      <bd-page-header title="Usuarios" [subtitle]="accountsSummary()">
        <button type="button" class="btn btn-accent" (click)="store.openCreate()">Nuevo usuario</button>
      </bd-page-header>

      @if (store.createdNotice(); as notice) {
        <div class="users-page__notice">
          <bd-alert variant="success" role="status">
            <span>
              Cuenta «{{ notice.username }}» creada. Contraseña temporal:
              <strong class="users-page__password">{{ notice.temporaryPassword }}</strong>.
              Entrégala a la persona; podrá cambiarla en «Cambiar contraseña». No se volverá a mostrar.
            </span>
            <button type="button" class="btn btn-ghost" (click)="store.dismissCreatedNotice()">Entendido</button>
          </bd-alert>
        </div>
      }

      @if (store.loading()) {
        <div class="users-page__skeleton" aria-busy="true">
          <bd-skeleton height="2.5rem" width="100%" />
          <bd-skeleton height="2.5rem" width="100%" />
          <bd-skeleton height="2.5rem" width="100%" />
        </div>
      } @else if (store.error(); as message) {
        <bd-alert variant="error" [message]="message">
          <button type="button" class="btn btn-primary" (click)="store.load()">Reintentar</button>
        </bd-alert>
      } @else {
        <bd-user-table
          [users]="store.users()"
          [professionalsByUserId]="store.professionalsByUserId()"
          [busyUserId]="store.busyUserId()"
          (deactivate)="onDeactivate($event)"
          (activate)="store.activate($event)"
        />
      }

      <bd-side-sheet
        [isOpen]="store.createOpen()"
        [titleId]="'user-create-title'"
        [fullscreenBelowMd]="true"
        (closed)="store.closeCreate()"
      >
        @if (store.createOpen()) {
          <div class="users-page__sheet">
            <div class="users-page__sheet-header">
              <h2 id="user-create-title" class="users-page__sheet-title">Nuevo usuario</h2>
            </div>
            <bd-user-create-form
              [saving]="store.saving()"
              [errorMessage]="store.saveError()"
              (submitted)="store.create($event)"
              (cancelled)="store.closeCreate()"
            />
          </div>
        }
      </bd-side-sheet>
    </section>
  `,
  styles: `
    @use '../../../../shared/styles/breakpoints' as bp;

    .users-page {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      min-width: 0;
      padding: var(--space-md);
      box-sizing: border-box;

      @include bp.bp-up(md) {
        padding: var(--space-lg);
      }

      &.users-page--panel-open {
        @include bp.bp-up('lg') {
          padding-inline-end: 26rem;
        }
      }
    }

    .users-page .btn {
      min-height: 44px;
    }

    .users-page__password {
      font-size: var(--fs-md);
      letter-spacing: 0.02em;
      color: var(--blue-950);
    }

    .users-page__skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .users-page__sheet {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .users-page__sheet-header {
      padding: 1.25rem 3rem 0.75rem 1.25rem;
      border-bottom: 1px solid var(--slate-100);
    }

    .users-page__sheet-title {
      margin: 0;
      font-size: var(--fs-lg);
      font-weight: 700;
      color: var(--blue-950);
    }
  `,
})
export class UsersPage {
  readonly store = inject(UsersStore);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly accountsSummary = computed(() => summarizeAccounts(this.store.users()));

  constructor() {
    this.store.load();
  }

  onDeactivate(user: User): void {
    this.confirmDialog
      .open({
        title: 'Desactivar usuario',
        message: `«${user.username}» no podrá iniciar sesión hasta que la actives de nuevo.`,
        confirmLabel: 'Desactivar',
        cancelLabel: 'Volver',
        tone: 'danger',
      })
      .subscribe((result) => {
        if (result.confirmed) {
          this.store.deactivate(user);
        }
      });
  }
}
