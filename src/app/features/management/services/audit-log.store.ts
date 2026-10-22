import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '../../../core/api/api.models';
import { AuditLogEntry, AuditLogQuery } from '../models/audit.models';
import { User } from '../models/user.models';
import { AuditApi } from './audit.api';
import { UsersApi } from './users.api';

@Injectable()
export class AuditLogStore {
  private readonly auditApi = inject(AuditApi);
  private readonly usersApi = inject(UsersApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly entries = signal<AuditLogEntry[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly page = signal<number>(0);
  readonly totalPages = signal<number>(0);
  readonly totalElements = signal<number>(0);
  readonly size = 50;

  readonly users = signal<User[]>([]);
  readonly loadingUsers = signal<boolean>(false);
  readonly patientName = signal<string | null>(null);

  private lastQuery: AuditLogQuery | null = null;

  loadUsers(): void {
    if (this.users().length > 0 || this.loadingUsers()) return;
    this.loadingUsers.set(true);
    this.usersApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.loadingUsers.set(false);
        },
        error: () => {
          this.loadingUsers.set(false);
        },
      });
  }

  load(query: AuditLogQuery): void {
    this.lastQuery = query;
    this.loading.set(true);
    this.error.set(null);

    this.auditApi
      .list({ ...query, size: query.size ?? this.size })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.entries.set(page.content);
          this.page.set(page.number);
          this.totalPages.set(page.totalPages);
          this.totalElements.set(page.totalElements);

          if (query.patientId) {
            const entryWithPatient = page.content.find(
              (e) => e.patientId === query.patientId && !!e.patientName
            );
            if (entryWithPatient?.patientName) {
              this.patientName.set(entryWithPatient.patientName);
            }
          } else {
            this.patientName.set(null);
          }

          this.loading.set(false);
        },
        error: (err: ApiError) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }

  reload(): void {
    if (this.lastQuery) {
      this.load(this.lastQuery);
    }
  }
}
