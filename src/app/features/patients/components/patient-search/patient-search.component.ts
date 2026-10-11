import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ComboboxComponent } from '../../../../shared/components/combobox/combobox.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { PhonePipe } from '../../../../shared/pipes/phone.pipe';
import { Patient } from '../../models/patient.models';
import { Search } from 'lucide-angular';

@Component({
  selector: 'app-patient-search',
  standalone: true,
  imports: [ComboboxComponent, IconComponent, PhonePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './patient-search.component.html',
  styleUrl: './patient-search.component.scss',
})
export class PatientSearchComponent {
  readonly query = input<string>('');
  readonly results = input<Patient[]>([]);
  readonly isLoading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly canRegister = input<boolean>(false);

  readonly queryChange = output<string>();
  readonly selected = output<Patient>();
  readonly register = output<string>();

  readonly comboboxRef = viewChild<ComboboxComponent<Patient>>('combobox');

  readonly searchIcon = Search;

  readonly actionLabel = computed(() => {
    if (!this.canRegister()) return null;
    const q = this.query().trim();
    if (q.length < 2) return null;
    // Solo ofrecer registrar si no hay resultados o si la secretaria lo desea
    if (this.results().length === 0) {
      return `Registrar paciente «${q}»`;
    }
    return null;
  });

  onQueryChange(text: string): void {
    this.queryChange.emit(text);
  }

  onPatientSelect(patient: Patient): void {
    this.selected.emit(patient);
  }

  onRegisterAction(): void {
    this.register.emit(this.query().trim());
  }

  focusSearch(): void {
    this.comboboxRef()?.focusInput();
  }
}
