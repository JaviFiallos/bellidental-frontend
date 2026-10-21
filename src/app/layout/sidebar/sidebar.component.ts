import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavItem } from '../nav-items';
import { IconComponent, LucideIconData } from '../../shared/components/icon/icon.component';
import { KeyRound, LogOut } from 'lucide-angular';

export type SidebarMode = 'drawer' | 'icons' | 'full';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  readonly items = input.required<NavItem[]>();
  readonly userName = input.required<string>();
  readonly areaLabel = input.required<string>();
  readonly mode = input<SidebarMode>('full');

  readonly logout = output<void>();
  readonly searchRequested = output<void>();

  readonly logoutIcon: LucideIconData = LogOut;
  readonly accountIcon: LucideIconData = KeyRound;

  onLogout(): void {
    this.logout.emit();
  }

  onSearchClick(): void {
    this.searchRequested.emit();
  }
}
