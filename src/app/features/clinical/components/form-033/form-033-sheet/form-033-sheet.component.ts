import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'bd-form-033-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="form033-sheet"
      [class.form033-sheet--new-page]="startsNewPage()"
      [attr.data-page]="pageNumber()"
    >
      <div class="form033-sheet__body">
        <ng-content />
      </div>
      <footer class="form033-sheet__footer">
        <span class="form033-sheet__code">SNS-MSP / HCU-form.033 / 2008</span>
        <span class="form033-sheet__page-label">ODONTOLOGÍA ({{ pageNumber() }})</span>
      </footer>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }

    .form033-sheet {
      width: 210mm;
      min-height: 297mm;
      box-sizing: border-box;
      padding: 6mm 8mm 6mm 8mm;
      background-color: var(--form033-paper);
      color: var(--form033-ink);
      font-family: var(--form033-font);
      font-size: 7.5pt;
      line-height: 1.15;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1px solid var(--form033-border);
      box-shadow: var(--shadow-md);
      margin: 0 auto;
    }

    .form033-sheet__body {
      display: flex;
      flex-direction: column;
      gap: 1.5mm;
      flex: 1;
    }

    .form033-sheet__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1.5mm;
      font-size: 7pt;
      font-weight: 700;
      color: var(--form033-ink);
    }

    @media print {
      .form033-sheet {
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
        width: 210mm !important;
        height: 297mm !important;
        min-height: 297mm !important;
        max-height: 297mm !important;
        box-sizing: border-box !important;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .form033-sheet--new-page {
        break-before: page;
        page-break-before: always;
      }
    }
  `,
})
export class Form033SheetComponent {
  readonly pageNumber = input<number>(1);
  /** Las hojas 2 empiezan en una página nueva; la hoja 1 es la primera página del impreso. */
  readonly startsNewPage = input<boolean>(false);
}
