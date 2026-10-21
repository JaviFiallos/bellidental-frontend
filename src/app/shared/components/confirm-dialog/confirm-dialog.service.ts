import { inject, Injectable } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ConfirmDialogComponent,
  ConfirmDialogOptions,
  ConfirmDialogResult,
} from './confirm-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class ConfirmDialogService {
  private readonly dialog = inject(Dialog);

  open(options: ConfirmDialogOptions): Observable<ConfirmDialogResult> {
    const dialogRef = this.dialog.open<ConfirmDialogResult, ConfirmDialogOptions>(
      ConfirmDialogComponent,
      {
        data: options,
        role: 'alertdialog',
        ariaLabelledBy: 'confirm-dialog-title',
        ariaDescribedBy: 'confirm-dialog-desc',
        hasBackdrop: true,
        backdropClass: 'cdk-overlay-dark-backdrop',
        disableClose: false,
      }
    );

    return dialogRef.closed.pipe(
      map((result) => result ?? { confirmed: false })
    );
  }
}
