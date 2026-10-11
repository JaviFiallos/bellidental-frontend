import { CalendarDays, Clock, CalendarCheck, ChartColumn, ShieldCheck, Users } from 'lucide-angular';
import { LucideIconData } from '../shared/components/icon/icon.component';
import { Profile } from '../core/auth/auth.models';

export interface NavItem {
  label: string;
  icon: LucideIconData;
  route?: string;
  isSearchAction?: boolean;
}

export function getNavItemsForProfile(profile: Profile | null): NavItem[] {
  switch (profile) {
    case 'SECRETARIA':
      return [
        { label: 'Agenda', icon: CalendarDays, route: '/recepcion' },
        { label: 'Pacientes', icon: Users, isSearchAction: true },
        { label: 'Horarios', icon: Clock, route: '/recepcion/horarios' },
      ];
    case 'ODONTOLOGO':
      return [
        { label: 'Mis citas', icon: CalendarCheck, route: '/consultorio' },
        { label: 'Pacientes', icon: Users, isSearchAction: true },
      ];
    case 'DIRECTOR':
      return [
        { label: 'Mis citas', icon: CalendarCheck, route: '/consultorio' },
        { label: 'Pacientes', icon: Users, isSearchAction: true },
        { label: 'Estadísticas', icon: ChartColumn, route: '/direccion/estadisticas' },
        { label: 'Auditoría', icon: ShieldCheck, route: '/direccion/auditoria' },
      ];
    default:
      return [];
  }
}

