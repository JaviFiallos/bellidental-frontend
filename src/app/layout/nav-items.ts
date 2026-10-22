import {
  CalendarDays,
  Clock,
  CalendarCheck,
  ChartColumn,
  ClipboardList,
  History,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-angular';
import { LucideIconData } from '../shared/components/icon/icon.component';
import { Profile } from '../core/auth/auth.models';

export interface NavItem {
  label: string;
  icon: LucideIconData;
  route?: string;
  /** Activo solo con la ruta exacta (evita que "/consultorio" quede activo en sus subrutas). */
  exact?: boolean;
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
        { label: 'Mis citas', icon: CalendarCheck, route: '/consultorio', exact: true },
        { label: 'Mis atenciones', icon: History, route: '/consultorio/atenciones' },
        { label: 'Pacientes', icon: Users, isSearchAction: true },
      ];
    case 'DIRECTOR':
      return [
        { label: 'Mis citas', icon: CalendarCheck, route: '/consultorio', exact: true },
        { label: 'Mis atenciones', icon: History, route: '/consultorio/atenciones' },
        { label: 'Pacientes', icon: Users, isSearchAction: true },
        { label: 'Estadísticas', icon: ChartColumn, route: '/direccion/estadisticas' },
        { label: 'Auditoría', icon: ShieldCheck, route: '/direccion/auditoria' },
        { label: 'Usuarios', icon: UserCog, route: '/direccion/usuarios' },
        { label: 'Catálogo', icon: ClipboardList, route: '/direccion/catalogo' },
      ];
    default:
      return [];
  }
}

