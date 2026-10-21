import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="coming-soon-container">
      <bd-page-header [title]="title" [subtitle]="taskSubtitle" />
      <div class="card coming-soon-card">
        <p class="text-muted">
          Esta pantalla aún no está disponible.
        </p>
      </div>
    </div>
  `,
  styles: `
    .coming-soon-container {
      width: 100%;
    }

    .coming-soon-card {
      padding: var(--space-xl);
      text-align: center;
    }
  `,
})
export class ComingSoonPage {
  private readonly route = inject(ActivatedRoute);

  readonly title = this.route.snapshot.data['title'] || 'Pantalla en construcción';
  readonly task = this.route.snapshot.data['task'] || '';
  readonly taskSubtitle = this.task ? `Pantalla en construcción (${this.task})` : 'Pantalla en construcción';
}
