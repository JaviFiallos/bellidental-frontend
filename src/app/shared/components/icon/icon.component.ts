import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideAngularComponent, LucideAngularModule } from 'lucide-angular';

export type LucideIconData = NonNullable<LucideAngularComponent['img']>;

@Component({
  selector: 'bd-icon',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lucide-icon
      [img]="name()"
      [size]="size()"
      [attr.aria-hidden]="isAriaHidden()"
      [attr.role]="role()"
      [attr.aria-label]="label()"
    />
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<LucideIconData>();
  readonly size = input<number>(20);
  readonly label = input<string | null>(null);

  readonly isAriaHidden = computed(() => (this.label() ? null : true));
  readonly role = computed(() => (this.label() ? 'img' : null));
}
