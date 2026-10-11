import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SessionStore } from '../../../../core/auth/session.store';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './placeholder.page.html',
  styleUrl: './placeholder.page.scss',
})
export class PlaceholderPage {
  private readonly sessionStore = inject(SessionStore);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.sessionStore.currentUser;
  readonly profile = this.sessionStore.profile;

  readonly profileLabel = computed(() => {
    const prof = this.profile();
    switch (prof) {
      case 'SECRETARIA':
        return 'Secretaria';
      case 'ODONTOLOGO':
        return 'Odontólogo';
      case 'DIRECTOR':
        return 'Director';
      default:
        return 'Sin perfil';
    }
  });

  logout(): void {
    this.authService.logout();
  }
}
