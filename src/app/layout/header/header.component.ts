import {
  ChangeDetectionStrategy,
  Component,
  effect,
  HostListener,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Appointment } from '../../features/appointments';
import { Patient, PatientSearchComponent } from '../../features/patients';
import { ClinicDatePipe } from '../../shared/pipes/clinic-date.pipe';
import { ClinicTimePipe } from '../../shared/pipes/clinic-time.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { Menu, Calendar, AlertCircle, Search, X } from 'lucide-angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ClinicDatePipe, ClinicTimePipe, IconComponent, PatientSearchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly today = input.required<Date>();
  readonly nextAppointment = input<Appointment | null>(null);
  readonly showProfessional = input<boolean>(false);
  readonly hasError = input<boolean>(false);
  readonly isLoading = input<boolean>(false);
  readonly isDrawerOpen = input<boolean>(false);
  readonly isCompact = input<boolean>(false);

  // Buscador de pacientes
  readonly searchResults = input<Patient[]>([]);
  readonly isSearchLoading = input<boolean>(false);
  readonly searchError = input<string | null>(null);
  readonly searchQuery = input<string>('');
  readonly canRegisterPatient = input<boolean>(false);

  readonly menuToggle = output<void>();
  readonly searchQueryChange = output<string>();
  readonly patientSelected = output<Patient>();
  readonly registerPatient = output<string>();

  readonly patientSearchRef = viewChild(PatientSearchComponent);

  readonly isMobileSearchExpanded = signal<boolean>(false);

  readonly menuIcon = Menu;
  readonly calendarIcon = Calendar;
  readonly errorIcon = AlertCircle;
  readonly searchIcon = Search;
  readonly closeIcon = X;

  constructor() {
    effect(() => {
      if (!this.isCompact() && this.isMobileSearchExpanded()) {
        this.closeMobileSearch();
      }
    });
  }

  onMenuToggle(): void {
    this.menuToggle.emit();
  }

  onSearchQueryChange(text: string): void {
    this.searchQueryChange.emit(text);
  }

  onPatientSelected(patient: Patient): void {
    this.closeMobileSearch();
    this.patientSelected.emit(patient);
  }

  onRegisterPatient(query: string): void {
    this.closeMobileSearch();
    this.registerPatient.emit(query);
  }

  openMobileSearch(): void {
    this.focusSearch();
  }

  closeMobileSearch(): void {
    this.isMobileSearchExpanded.set(false);
  }

  focusSearch(): void {
    if (this.isCompact()) {
      this.isMobileSearchExpanded.set(true);
      setTimeout(() => {
        this.patientSearchRef()?.focusSearch();
      }, 0);
    } else {
      this.patientSearchRef()?.focusSearch();
      this.patientSearchRef()?.highlight();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isMobileSearchExpanded()) {
      this.closeMobileSearch();
    }
  }
}
