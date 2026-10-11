import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Appointment } from '../../features/appointments';
import { ClinicDatePipe } from '../../shared/pipes/clinic-date.pipe';
import { ClinicTimePipe } from '../../shared/pipes/clinic-time.pipe';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { Menu, Calendar, AlertCircle } from 'lucide-angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ClinicDatePipe, ClinicTimePipe, IconComponent],
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

  readonly menuToggle = output<void>();

  readonly menuIcon = Menu;
  readonly calendarIcon = Calendar;
  readonly errorIcon = AlertCircle;

  onMenuToggle(): void {
    this.menuToggle.emit();
  }
}
