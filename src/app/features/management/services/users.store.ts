import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable } from 'rxjs';
import { ApiError } from '../../../core/api/api.models';
import { NotificationService } from '../../../core/services/notification.service';
import { Professional, ProfessionalsApi } from '../../professionals';
import { CreatedUserNotice, CreateUserRequest, User } from '../models/user.models';
import { UsersApi } from './users.api';

/** Estado de la pantalla Usuarios. Se provee en la página (no es singleton). */
@Injectable()
export class UsersStore {
  private readonly usersApi = inject(UsersApi);
  private readonly professionalsApi = inject(ProfessionalsApi);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly users = signal<User[]>([]);
  readonly professionalsByUserId = signal<ReadonlyMap<string, Professional>>(new Map());
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly createOpen = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly saveError = signal<string | null>(null);
  readonly busyUserId = signal<string | null>(null);
  readonly createdNotice = signal<CreatedUserNotice | null>(null);

  /** Carga cuentas y profesionales a la vez. */
  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({ users: this.usersApi.list(), professionals: this.professionalsApi.list() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ users, professionals }) => {
          this.users.set(users);
          this.professionalsByUserId.set(indexProfessionalsByUserId(professionals));
          this.loading.set(false);
        },
        error: (err: ApiError) => {
          this.loading.set(false);
          this.error.set(err?.message || 'No se pudieron cargar los usuarios');
        },
      });
  }

  /** Recarga solo las cuentas (tras crear; los profesionales no cambian). */
  reloadUsers(): void {
    this.usersApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => this.users.set(users),
        error: (err: ApiError) =>
          this.notifications.error(err?.message || 'No se pudieron cargar los usuarios'),
      });
  }

  openCreate(): void {
    this.saveError.set(null);
    this.createOpen.set(true);
  }

  closeCreate(): void {
    this.saveError.set(null);
    this.createOpen.set(false);
  }

  dismissCreatedNotice(): void {
    this.createdNotice.set(null);
  }

  create(request: CreateUserRequest): void {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);

    this.usersApi
      .create(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.saving.set(false);
          this.createOpen.set(false);
          this.createdNotice.set({
            username: created.username,
            temporaryPassword: request.temporaryPassword,
          });
          this.notifications.success('Usuario creado');
          this.reloadUsers();
        },
        error: (err: ApiError) => {
          this.saving.set(false);
          this.saveError.set(err?.message || 'No se pudo crear el usuario');
        },
      });
  }

  deactivate(user: User): void {
    this.changeActiveState(user, () => this.usersApi.deactivate(user.id), 'Usuario desactivado');
  }

  activate(user: User): void {
    this.changeActiveState(user, () => this.usersApi.activate(user.id), 'Usuario activado');
  }

  private changeActiveState(
    user: User,
    request: () => Observable<User>,
    successMessage: string
  ): void {
    if (this.busyUserId() !== null) {
      return;
    }
    this.busyUserId.set(user.id);

    request()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.users.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
          this.busyUserId.set(null);
          this.notifications.success(successMessage);
        },
        error: (err: ApiError) => {
          this.busyUserId.set(null);
          this.notifications.error(err?.message || 'No se pudo cambiar el estado de la cuenta');
        },
      });
  }
}

function indexProfessionalsByUserId(professionals: Professional[]): ReadonlyMap<string, Professional> {
  const byUserId = new Map<string, Professional>();
  for (const professional of professionals) {
    if (professional.userId) {
      byUserId.set(professional.userId, professional);
    }
  }
  return byUserId;
}
