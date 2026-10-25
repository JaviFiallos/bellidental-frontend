import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { A11yModule } from '@angular/cdk/a11y';
import { SessionStore } from '../../core/auth/session.store';
import { AuthService } from '../../core/auth/auth.service';
import { SidebarComponent, SidebarMode } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { getNavItemsForProfile } from '../nav-items';
import { NextAppointmentStore } from '../../features/appointments';
import { ProfessionalsApi } from '../../features/professionals';
import { Patient, PatientSearchStore } from '../../features/patients';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, A11yModule],
  providers: [NextAppointmentStore, PatientSearchStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout implements OnInit {
  private readonly sessionStore = inject(SessionStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly professionalsApi = inject(ProfessionalsApi);
  readonly nextAppointmentStore = inject(NextAppointmentStore);
  readonly patientSearchStore = inject(PatientSearchStore);

  readonly headerRef = viewChild(HeaderComponent);

  readonly isDrawerOpen = signal<boolean>(false);
  readonly windowWidth = signal<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Nombre del usuario (profesional si existe, o correo)
  readonly professionalName = signal<string | null>(null);

  readonly canRegisterPatient = computed(() => {
    return this.sessionStore.profile() === 'SECRETARIA';
  });

  readonly today = computed(() => this.nextAppointmentStore.today());

  readonly navItems = computed(() => getNavItemsForProfile(this.sessionStore.profile()));

  readonly userName = computed(() => {
    return this.professionalName() || this.sessionStore.currentUser()?.email || 'Usuario';
  });

  readonly areaLabel = computed(() => {
    const prof = this.sessionStore.profile();
    switch (prof) {
      case 'SECRETARIA':
        return 'Recepción';
      case 'ODONTOLOGO':
        return 'Consultorio';
      case 'DIRECTOR':
        return 'Dirección';
      default:
        return 'Clínica';
    }
  });

  readonly showProfessionalInHeader = computed(() => {
    return this.sessionStore.profile() === 'SECRETARIA';
  });

  readonly sidebarMode = computed<SidebarMode>(() => {
    const width = this.windowWidth();
    if (width < 900) {
      return 'drawer';
    }
    if (width < 1200) {
      return 'icons';
    }
    return 'full';
  });

  readonly isCompact = computed(() => this.sidebarMode() === 'drawer');

  @HostListener('window:resize')
  onResize(): void {
    if (typeof window !== 'undefined') {
      this.windowWidth.set(window.innerWidth);
      if (window.innerWidth >= 900 && this.isDrawerOpen()) {
        this.isDrawerOpen.set(false);
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isDrawerOpen()) {
      this.isDrawerOpen.set(false);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    // Atajos Ctrl+K y Cmd+K
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.focusSearch();
      return;
    }

    // Atajo / (solo si el foco no está en un input, textarea o contenteditable)
    if (event.key === '/') {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isInput =
        tagName === 'input' ||
        tagName === 'textarea' ||
        Boolean(target?.isContentEditable);

      if (!isInput) {
        event.preventDefault();
        this.focusSearch();
      }
    }
  }

  focusSearch(): void {
    this.headerRef()?.focusSearch();
  }

  onSearchQueryChange(text: string): void {
    this.patientSearchStore.setQuery(text);
  }

  onPatientSelected(patient: Patient): void {
    this.patientSearchStore.clear();
    this.router.navigate(['/pacientes', patient.id]);
  }

  onRegisterPatient(query: string): void {
    this.patientSearchStore.clear();
    this.router.navigate(['/pacientes/nuevo'], { queryParams: { q: query } });
  }

  ngOnInit(): void {
    this.loadProfessionalName();
    this.nextAppointmentStore.start();
    this.setupNavigationListener();
  }

  toggleDrawer(): void {
    this.isDrawerOpen.update((open) => !open);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  onLogout(): void {
    this.closeDrawer();
    this.authService.logout();
  }

  private loadProfessionalName(): void {
    const user = this.sessionStore.currentUser();
    const profile = this.sessionStore.profile();

    if ((profile === 'ODONTOLOGO' || profile === 'DIRECTOR') && user?.professionalId) {
      this.professionalsApi.getById(user.professionalId).subscribe({
        next: (prof) => {
          this.professionalName.set(prof.fullName);
        },
        error: () => {
          this.professionalName.set(null);
        },
      });
    }
  }

  private setupNavigationListener(): void {
    const sub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isDrawerOpen()) {
          this.isDrawerOpen.set(false);
        }
      });

    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
    });
  }
}

