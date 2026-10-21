import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';
import { AuditHistoryDialogComponent, AuditHistoryDialogData } from '../components/audit-history-dialog/audit-history-dialog.component';
import { AuditHistoryRequest } from '../models/audit.models';
import { AuditApi } from './audit.api';

@Injectable({
  providedIn: 'root',
})
export class AuditHistoryDialogService {
  private readonly dialog = inject(Dialog);
  private readonly auditApi = inject(AuditApi);

  open(request: AuditHistoryRequest): void {
    this.dialog.open<void, AuditHistoryDialogData>(AuditHistoryDialogComponent, {
      data: {
        title: request.title,
        entries$: this.auditApi.history(request.entity, request.id),
      },
      role: 'dialog',
      ariaLabelledBy: 'audit-history-title',
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      width: 'min(40rem, 100vw)',
      maxHeight: '90vh',
    });
  }
}
