import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable } from 'rxjs';
import { ApiError } from '../../../core/api/api.models';
import { NotificationService } from '../../../core/services/notification.service';
import { Professional, ProfessionalsApi } from '../../professionals';
import {
  AssignableRole,
  CreateUserRequest,
  GrantAccessRequest,
  TemporaryPasswordNotice,
  User,
} from '../models/user.models';
import { UsersApi } from './users.api';

/** Panel lateral de la pantalla Usuarios: solo uno abierto a la vez. */
export type UsersPanel = 'create' | 'roles' | 'reset' | 'access';

/** Estado de la pantalla Usuarios. Se provee en la página (no es singleton). */
@Injectable()
export class UsersStore {
  private readonly usersApi = inject(UsersApi);
  private readonly professionalsApi = inject(ProfessionalsApi);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly users = signal<User[]>([]);
  readonly professionals = signal<Professional[]>([]);
  readonly professionalsByUserId = computed(() => indexProfessionalsByUserId(this.professionals()));
  readonly professionalsWithoutAccess = computed(() =>
    this.professionals().filter((professional) => professional.userId === null)
  );
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly activePanel = signal<UsersPanel | null>(null);
  readonly selectedUser = signal<User | null>(null);
  readonly selectedProfessional = signal<Professional | null>(null);
  readonly saving = signal<boolean>(false);
  readonly saveError = signal<string | null>(null);
  readonly busyUserId = signal<string | null>(null);
  readonly passwordNotice = signal<TemporaryPasswordNotice | null>(null);

  /** Carga cuentas y profesionales a la vez. */
  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({ users: this.usersApi.list(), professionals: this.professionalsApi.list() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ users, professionals }) => {
          this.users.set(users);
          this.professionals.set(professionals);
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
    this.openPanel('create');
  }

  openRoles(user: User): void {
    this.openPanel('roles');
    this.selectedUser.set(user);
  }

  openReset(user: User): void {
    this.openPanel('reset');
    this.selectedUser.set(user);
  }

  openAccess(professional: Professional): void {
    this.openPanel('access');
    this.selectedProfessional.set(professional);
  }

  closePanel(): void {
    this.saveError.set(null);
    this.activePanel.set(null);
    this.selectedUser.set(null);
    this.selectedProfessional.set(null);
  }

  dismissPasswordNotice(): void {
    this.passwordNotice.set(null);
  }

  create(request: CreateUserRequest): void {
    if (this.saving()) {
      return;
    }
    this.startSaving();

    this.usersApi
      .create(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.finishSaving();
          this.closePanel();
          this.passwordNotice.set({
            action: 'created',
            username: created.username,
            temporaryPassword: request.temporaryPassword,
          });
          this.notifications.success('Usuario creado');
          this.reloadUsers();
        },
        error: (err: ApiError) => this.failSaving(err, 'No se pudo crear el usuario'),
      });
  }

  updateRoles(roles: AssignableRole[]): void {
    const user = this.selectedUser();
    if (!user || this.saving()) {
      return;
    }
    this.startSaving();

    this.usersApi
      .updateRoles(user.id, { roles })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.finishSaving();
          this.users.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
          this.closePanel();
          this.notifications.success('Roles actualizados');
        },
        error: (err: ApiError) => this.failSaving(err, 'No se pudieron actualizar los roles'),
      });
  }

  resetPassword(temporaryPassword: string): void {
    const user = this.selectedUser();
    if (!user || this.saving()) {
      return;
    }
    this.startSaving();

    this.usersApi
      .resetPassword(user.id, { temporaryPassword })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (message) => {
          this.finishSaving();
          this.closePanel();
          this.passwordNotice.set({
            action: 'reset',
            username: user.username,
            temporaryPassword,
          });
          this.notifications.success(message);
        },
        error: (err: ApiError) => this.failSaving(err, 'No se pudo restablecer la contraseña'),
      });
  }

  grantAccess(request: GrantAccessRequest): void {
    const professional = this.selectedProfessional();
    if (!professional || this.saving()) {
      return;
    }
    this.startSaving();

    this.usersApi
      .grantAccess(professional.id, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.finishSaving();
          this.closePanel();
          this.passwordNotice.set({
            action: 'access',
            username: created.username,
            temporaryPassword: request.temporaryPassword,
          });
          this.notifications.success('Cuenta de acceso creada');
          this.load();
        },
        error: (err: ApiError) => this.failSaving(err, 'No se pudo crear la cuenta de acceso'),
      });
  }

  deactivate(user: User): void {
    this.changeActiveState(user, () => this.usersApi.deactivate(user.id), 'Usuario desactivado');
  }

  activate(user: User): void {
    this.changeActiveState(user, () => this.usersApi.activate(user.id), 'Usuario activado');
  }

  /** Abre un panel y limpia la selección anterior; quien llama fija luego la persona elegida. */
  private openPanel(panel: UsersPanel): void {
    this.saveError.set(null);
    this.selectedUser.set(null);
    this.selectedProfessional.set(null);
    this.activePanel.set(panel);
  }

  private startSaving(): void {
    this.saving.set(true);
    this.saveError.set(null);
  }

  private finishSaving(): void {
    this.saving.set(false);
  }

  private failSaving(err: ApiError, fallback: string): void {
    this.saving.set(false);
    this.saveError.set(err?.message || fallback);
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
